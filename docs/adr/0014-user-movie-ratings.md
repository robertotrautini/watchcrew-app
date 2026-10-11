# 0014 — Bewertungen sind pro Nutzer und Film, nicht pro Gruppen-Eintrag

**Status:** Angenommen (2026-10-11, Entscheidungen vom User bestätigt; Phase 0 umgesetzt) — ergänzt [0003](0003-watch-group-data-model.md) (Watch-Group als einzige teilbare Einheit); ändert dort nichts an Rollen, Beitritt oder Lifecycle, nur an der Zuordnung von Bewertungsdaten.

## Kontext

Heute hängt eine Bewertung an einem **Gruppen-Eintrag**: `public.ratings` hat `watchlist_entry_id` (FK auf `watchlist_entries`, `on delete cascade`) und `member_id`, eindeutig über `(watchlist_entry_id, member_id)`. `watchlist_entries` ist wiederum eindeutig über `(group_id, movie_id)`.

Konsequenz: Ist ein Nutzer Mitglied zweier Gruppen und derselbe Film liegt in beiden, existieren zwei voneinander unabhängige Bewertungen (Sterne, Like, `seen_at`) desselben Nutzers für denselben Film. Das ist fachlich falsch — ein Nutzer hat einen Film gesehen und eine Meinung dazu, unabhängig davon, in welcher Gruppe er ihn gerade ansieht. Folgeprobleme:

- Doppelte Pflege: Bewertung in Gruppe A ist in Gruppe B nicht sichtbar; "gesehen" muss mehrfach gesetzt werden.
- Widersprüche möglich (4,5 Sterne in A, 3 Sterne in B).
- Wird ein Film aus einer Gruppe entfernt, **cascadet** `ratings` mit und die Bewertung ist weg, obwohl sie dem Nutzer gehört, nicht der Gruppe. Gleiches bei Hard-Delete einer leeren Gruppe.
- Ein gruppenübergreifendes "Mein Tagebuch" ist mit dem heutigen Modell nicht sauber möglich.
- Die Legacy-App hatte genau zwei Gruppen (`all_three`, `robin_tobias`) mit großer Filmüberlappung; der Legacy-Import (`scripts/legacy-import/transform.js`) muss deshalb schon heute Duplikate innerhalb einer Gruppe zusammenführen und produziert bei Mehrfach-Gruppen-Filmen getrennte Bewertungen.

Nicht betroffen: Zahlungsdaten (`paid_by_member_id`, `paid_at`) und `release_date_override` — diese sind bewusst gruppenspezifisch und bleiben am Eintrag.

## Entscheidung

Vom User bestätigt:

1. **Eine Wahrheit pro Nutzer und Film.** Neue Tabelle `public.user_movie_ratings` mit Schlüssel `(user_id, movie_id)` hält `rating`, `liked`, `seen_at`, `rated_at` und Zeitstempel. Gruppenansichten lesen die Bewertungen der Mitglieder über `movie_id` aus dieser Tabelle. Ein Film in mehreren Gruppen hat damit automatisch dieselbe Bewertung und denselben "gesehen"-Status.
2. **Sichtbarkeit ohne Opt-in.** Tritt ein Nutzer einer Gruppe bei, sind seine vorhandenen Bewertungen für Filme dieser Gruppe sofort für alle Mitglieder sichtbar. Sichtbarkeit ergibt sich allein aus "gemeinsame Gruppe, die den Film in `watchlist_entries` hat" — es gibt keine Freigabe-Tabelle und keinen Schalter.
3. **Entfernen aus einer Gruppe löscht nur den Gruppen-Eintrag** (`watchlist_entries`). Die Bewertung des Nutzers bleibt bestehen. Wird der Film (in derselben oder einer anderen Gruppe) wieder hinzugefügt, ist die Bewertung sofort wieder da.
4. **Zahlungsdaten bleiben gruppenspezifisch** am `watchlist_entries`-Eintrag (`paid_by_member_id`, `paid_at`), ebenso `release_date_override`.
5. **"Mein Tagebuch" kann künftig gruppenübergreifend** alle eigenen Bewertungen zeigen. Quelle ist die Tabelle `user_movie_ratings`, auch für Filme ohne Gruppen-Eintrag.

### Schema-Skizze

Skizze, kein finales Migrationsskript. Namens- und Typkonventionen folgen `ratings` (`numeric(2,1)`, `check 0..5`).

```sql
create table public.user_movie_ratings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  movie_id   uuid not null references public.movies(id) on delete cascade,
  rating     numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  liked      boolean not null default false,
  seen_at    date,
  rated_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- Gruppenlesepfad: "alle Bewertungen zu diesen Filmen" (movie_id vorne).
create index user_movie_ratings_movie_user_idx
  on public.user_movie_ratings (movie_id, user_id);

-- Unterstützt die Sichtbarkeitsprüfung (Film in Gruppe X, Mitglied in Gruppe X).
create index watchlist_entries_movie_group_idx
  on public.watchlist_entries (movie_id, group_id);
create index watch_group_members_user_group_idx
  on public.watch_group_members (user_id, group_id);

-- updated_at pflegen (Trigger BEFORE UPDATE, setzt updated_at = now()).
```

`watch_group_members` hat bereits den PK `(group_id, user_id)`; der Index `(user_id, group_id)` deckt die Gegenrichtung ab. `ratings` (alt) bleibt bis zur Abschaltung unverändert bestehen (siehe Plan, `docs/plan-user-movie-ratings.md`).

### RLS-Regeln

- **Schreiben:** nur die eigene Zeile. `INSERT`/`UPDATE` mit `user_id = (select auth.uid())` in `using` und `with check`. Ein Gruppen-Eintrag ist für das Schreiben **nicht** Voraussetzung (Bewertung ohne Gruppen-Eintrag ist erlaubt, siehe Entscheidung 5).
- **Lesen:** eigene Zeile **oder** Zeile eines Nutzers, mit dem der Leser mindestens eine Gruppe teilt, in der der Film in `watchlist_entries` liegt.
- **Löschen:** entschieden: eigene Zeile per `DELETE`-Policy (`umr_delete_own`, `user_id = (select auth.uid())`). Zurücksetzen/Löschen einer Bewertung = Zeile **löschen**; der Film gilt dann in **allen** Gruppen als nicht gesehen/nicht bewertet. (Die alte `ratings` hatte keine DELETE-Policy, Zurücksetzen war ein `UPDATE`.)

Die Lesebedingung als `SECURITY DEFINER`-Helper, analog zu `is_group_member`/`is_group_owner` (verhindert RLS-Rekursion auf `watch_group_members`/`watchlist_entries`):

```sql
create or replace function public.can_read_user_movie_rating(p_user_id uuid, p_movie_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_user_id = (select auth.uid())
      or exists (
        select 1
          from public.watchlist_entries we
          join public.watch_group_members me
            on me.group_id = we.group_id and me.user_id = (select auth.uid())
          join public.watch_group_members them
            on them.group_id = we.group_id and them.user_id = p_user_id
         where we.movie_id = p_movie_id
      );
$$;

alter table public.user_movie_ratings enable row level security;

create policy "umr_select_own_or_shared_group"
  on public.user_movie_ratings for select to authenticated
  using (public.can_read_user_movie_rating(user_id, movie_id));

create policy "umr_insert_own"
  on public.user_movie_ratings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "umr_update_own"
  on public.user_movie_ratings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "umr_delete_own"
  on public.user_movie_ratings for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_movie_ratings to authenticated;
```

**Performance:** Die Funktion ist `STABLE` und wird je Kandidatenzeile ausgewertet; `p_user_id = auth.uid()` kurzschließt den Eigenfall, der Fremdfall läuft als Index-Join über `watchlist_entries (movie_id, group_id)` und `watch_group_members` (beide Seiten per PK/Index). Bei Familiengruppengröße (wenige Mitglieder, einige hundert Filme) ist das unkritisch. Für den Massenlesepfad einer Gruppenansicht wird zusätzlich ein RPC `get_group_member_ratings(p_group_id uuid)` vorgeschlagen (prüft Mitgliedschaft **einmal** und joint `watchlist_entries × watch_group_members × user_movie_ratings` direkt), statt N× die Policy-Funktion zu bezahlen. Die Policy bleibt trotzdem die Sicherheitsgrenze für direkte Tabellenzugriffe. `auth.uid()` wird als `(select auth.uid())` geschrieben, damit Postgres den Wert einmal pro Statement auswertet.

### Realtime-Auswirkung

- Die Tabelle muss in die `supabase_realtime`-Publication aufgenommen werden (die heutigen Migrationen enthalten dazu nichts; wie `ratings` aktuell publiziert wird, ist im Repo nicht ersichtlich und muss vor Phase 2 geprüft werden).
- `user_movie_ratings` hat **keine** `group_id`. Wie schon bei `ratings` ist kein serverseitiger Gruppenfilter möglich; `useGroupRealtimeSync` müsste weiter alle sichtbaren Änderungen empfangen und clientseitig prüfen, ob `movie_id` in der Watchlist-Cache-Menge der aktiven Gruppe liegt (bisher: `watchlist_entry_id`). Realtime wertet die SELECT-Policy je Event und Abonnent aus — die Helper-Funktion läuft dort ebenfalls; bei Familiengrößen akzeptabel, bei größerem Wachstum beobachten.
- Eine Bewertung wirkt jetzt in **allen** Gruppen, die den Film haben. Der Client muss deshalb bei einem Rating-Event die Bewertungs-Queries aller Gruppen invalidieren, nicht nur der aktiven.
- Sichtbarkeitsänderungen ohne Rating-Event (Beitritt/Austritt, Film hinzugefügt/entfernt) erzeugen kein `user_movie_ratings`-Event. Hier greifen die vorhandenen `watchlist_entries`-Events bzw. explizite Invalidierung beim Beitritt.
- Der Push-Trigger `notify_first_rating` (aus `20260920150000_push_notifications.sql`) hängt heute an `ratings` und nutzt `watchlist_entry_id` → `group_id`. Er muss auf die neue Tabelle umgezogen werden und je Gruppe benachrichtigen, in der der Nutzer Mitglied ist und der Film einen Eintrag hat (Details und Dedupe-Frage siehe offene Punkte). Der Client-Klassifikator `classifyRatingsChange` (INSERT = "erste Bewertung") passt nur noch, wenn die erste Bewertung weiterhin als INSERT der Zeile entsteht; ein Like vor der ersten Bewertung legt die Zeile bereits an — das Problem existiert heute identisch.

## Begründung

- Das Domänenmodell stimmt: Bewertung und "gesehen" gehören der Person und dem Film, nicht dem Verteilungskanal Gruppe.
- Eine Quelle der Wahrheit eliminiert Divergenz per Konstruktion, ohne Synchronisationscode, der fehlschlagen könnte.
- Entfernen aus einer Gruppe darf keine persönlichen Daten vernichten (Entscheidung 3).
- Voraussetzung für das gruppenübergreifende Tagebuch (Entscheidung 5).
- Die Sichtbarkeitsregel ist aus bestehenden Daten ableitbar (`watchlist_entries` + `watch_group_members`) und braucht keine zusätzliche Freigabeverwaltung.

## Konsequenzen

- Neue Migration (additiv) mit Tabelle, Indizes, Helper, RLS, Grants, `updated_at`-Trigger, Publication; Datenmigration aus `ratings` (Konfliktregel im Plan).
- Lese- und Schreibpfade der App wechseln von `ratings(*)` (verschachtelt am Watchlist-Eintrag) auf `user_movie_ratings` über `movie_id`. PostgREST kann nicht verschachtelt einbetten, weil zwischen `watchlist_entries` und `user_movie_ratings` kein direkter FK besteht (beide verweisen nur auf `movies`); es braucht eine zweite Abfrage, ein RPC oder eine View.
- `useSaveRating`, `toggleLike`, `resetRating` benötigen `movie_id` statt `watchlist_entry_id`; Invalidierung verlagert sich von `["watchlist", groupId]` auf gruppenübergreifende Keys. Persistierte Query-Keys: `CACHE_SCHEMA_VERSION` anheben (siehe `queryKeys.ts`).
- Der Legacy-Import schreibt `user_movie_ratings` statt `ratings`; Cross-Gruppen-Konflikte treten dort neu auf (Plan, Phase 3). Betrifft nur die DEV-Datenbank; die Produktions-/Legacy-DB wird weiterhin ausschließlich lesend (ADR 0013) und nicht im Rahmen dieser Änderung angefasst.
- Bewertungen überleben Gruppen-Hard-Delete (ADR 0003) und Eintragslöschung; sie verschwinden nur mit dem Konto (`on delete cascade` auf `auth.users`) oder mit dem Film aus `movies`.
- Verlässt ein Nutzer eine Gruppe, sehen die übrigen Mitglieder seine Bewertungen dort nicht mehr (kein gemeinsamer Gruppenbezug mehr); seine Bewertungen bleiben ihm.
- Datenschutz-/Erwartungseffekt: Beitritt gibt automatisch alle vorhandenen Bewertungen zu Filmen der Gruppe frei (bewusste Entscheidung 2). Beitrittsdialog bzw. Datenschutztext (ADR 0011) sollte dies erwähnen.
- Grund-ADR 0003 bleibt gültig; ein Verweis auf diesen ADR wird beim Annehmen dort ergänzt.

## Alternativen

- **Beibehalten (Bewertung pro Gruppen-Eintrag):** verworfen — die oben beschriebenen Widersprüche und Datenverluste bleiben.
- **Kopieren per Trigger (Bewertung bleibt am Eintrag, ein Trigger spiegelt Änderungen in die Einträge desselben Nutzers/Films anderer Gruppen):** verworfen. Mehrere Wahrheiten mit Sync-Pflicht; Rekursions-/Loop-Risiko zwischen Triggern; Race Conditions bei gleichzeitigen Schreibvorgängen; ein neu angelegter Eintrag müsste per zweitem Trigger initial befüllt werden; Konflikte beim ersten Abgleich sind unlösbar ohne Regel; Löschen eines Eintrags löscht die Bewertung weiterhin (Entscheidung 3 nicht erfüllbar); gruppenloses Tagebuch (5) bleibt unmöglich; Realtime/Push würden pro Kopie feuern (Mehrfach-Benachrichtigungen). Mehr Komplexität bei schlechteren Garantien.
- **Bewertung am `movies`-Datensatz (Array/JSON pro Film):** verworfen — RLS pro Nutzer nicht sauber ausdrückbar, Schreibkonflikte auf einem geteilten Katalogdatensatz (`movies` wird nur vom Service-Role geschrieben).
- **Explizite Freigabe je Gruppe (Opt-in):** verworfen von User (Entscheidung 2); zusätzliche Tabelle und UI ohne Nutzen für die Zielgruppe.

## Offene Punkte — Antworten (2026-10-11)

1. **Konfliktregel Backfill:** bestätigt: neueste Bewertung gewinnt (Zeile mit Rating zuerst, dann neuestes `rated_at`, dann neuestes `seen_at`, dann `ratings.id`), `liked` = ODER über alle Zeilen, `seen_at` = FRÜHESTES. Konfliktbericht als `NOTICE` vor dem Insert (Migration `20261011100100_user_movie_ratings_backfill.sql`); idempotent (`on conflict do nothing`). Da die DEV-Daten ohnehin neu importiert werden, genügt dieser einfache Backfill.
2. **Löschen:** Zeile **löschen** (DELETE-Policy für die eigene Zeile). Film gilt danach in allen Gruppen als nicht gesehen/nicht bewertet.
3. **Lesepfad:** RLS **plus** RPC `get_group_member_ratings(p_group_id)` (SECURITY DEFINER, prüft Mitgliedschaft einmal; Nicht-Mitglieder erhalten eine leere Menge).
4. **Push bei erster Bewertung:** pro Empfänger **einmal dedupliziert**. Umsetzung in Phase 2 (Entwurf: `supabase/drafts/user_movie_ratings_push_trigger.sql`; Dedupe braucht eine Anpassung von `send-push`). Alt-Trigger auf `ratings` bleibt bis Phase 2 unverändert, auf der neuen Tabelle liegt in Phase 0 kein Trigger (Backfill soll nicht feuern).
5. **"Gesehen"-Semantik:** Eine Zeile existiert nur, solange sie Inhalt hat (Rating, Like oder `seen_at`); der Backfill überspringt leere Zeilen. Gesehen = `seen_at` oder `rating` gesetzt; reine Like-Zeilen gelten nicht automatisch als gesehen (UI-Details in Phase 1).
6. **Account-Löschung:** Bewertungen verschwinden mit dem Konto (`on delete cascade`). Reparatur in `20261011110000_account_deletion_fk_fixes.sql`: `watchlist_entries.added_by` (jetzt nullable) und `paid_by_member_id` → `ON DELETE SET NULL`, `ratings.member_id` → `ON DELETE CASCADE`. Alle übrigen FK auf `auth.users` kaskadierten bereits. **Anzeige-Folgen in Phase 1:** Typ `added_by: string` → `string | null` (`src/lib/watchlistTypes.ts`); Stellen, die "hinzugefügt von"/`paid_by_member_id` anzeigen, müssen NULL ("ehemaliges Mitglied"/keine Angabe) behandeln.
7. **Publication/Realtime:** per Migration (`20261011120000_realtime_publication.sql`): `watchlist_entries`, `ratings`, `user_movie_ratings` idempotent in `supabase_realtime`, dazu `REPLICA IDENTITY FULL` (Filter auf `group_id` und DELETE-Events brauchen die Altwerte).
8. **Tagebuch-Definition:** weiterhin offen (Phase 5).

**Separate Aufgabe (nicht Teil dieses ADR):** Austritt des Owners / Owner-Nachfolge (ADR 0003) ist gesondert zu klären.
