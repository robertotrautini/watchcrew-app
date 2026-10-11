# Plan: Bewertungen pro Nutzer und Film (`user_movie_ratings`)

Phasenplan zur Umsetzung von [ADR 0014](adr/0014-user-movie-ratings.md) (Status: Angenommen). Umsetzung per TDD (ADR 0008: red-green-refactor; Jest + RNTL, Maestro für E2E), Verifikation nach `docs/working-process.md` (`npx tsc --noEmit`, `npx jest`, `scripts/maestro-all.sh --changed`, Screenshots prüfen).

**Wichtig:** Betroffen ist ausschließlich die **DEV-Datenbank** (`watchcrew-dev`). Die Produktions-DB von WatchCrew existiert noch nicht mit Familiendaten; die Legacy-IONOS/MySQL-Datenbank wird nur lesend über den vorhandenen Dump angefasst (ADR 0013) und von keiner Phase hier verändert. Jede Prod-Anwendung braucht später separate Freigabe. Migrationen sind in den Phasen 0 und 4 getrennt, additiv zuerst, destruktiv zuletzt.

Voraussetzung vor Start: Antworten auf die offenen Punkte in ADR 0014 (insb. Konfliktregel, DELETE, Lesepfad, Push). Dieser Plan setzt die jeweils markierten Vorschläge voraus.

---

## Phase 0 — Schema + RLS (additiv) und Daten-Backfill

**Stand 2026-10-11: umgesetzt (Dateien im Repo); Anwendung auf DEV: NOCH NICHT erfolgt (Access-Token ohne Recht `database_write`; `supabase db push` bzw. `db query --linked` scheitern mit 403).** Entschieden: Zeile löschen statt zurücksetzen (DELETE-Policy), RPC `get_group_member_ratings` ja, Konfliktregel (neueste Bewertung, `liked` = ODER, `seen_at` = frühestes), Push dedupliziert (Phase 2), Realtime per Migration inkl. `REPLICA IDENTITY FULL`, Account-Löschung repariert (`added_by`/`paid_by_member_id` → NULL, `ratings.member_id` cascade). Migrationen: `20261011100000_user_movie_ratings.sql`, `20261011100100_user_movie_ratings_backfill.sql`, `20261011110000_account_deletion_fk_fixes.sql`, `20261011120000_realtime_publication.sql`. Tests: `__tests__/supabase/userMovieRatingsMigrations.test.ts` (Struktur), `supabase/tests/user_movie_ratings.sql` (manuell gegen DEV, endet mit ROLLBACK). Push-Trigger-Entwurf: `supabase/drafts/user_movie_ratings_push_trigger.sql`. Owner-Austritt ist eine separate Aufgabe. Hinweis Phase 1: `added_by` ist nun nullable (Anzeige/Typ anpassen).

**Ziel:** Neue Tabelle samt Sicherheitsregeln existiert und enthält die vorhandenen Bewertungen; die App nutzt sie noch nicht. Alte `ratings` bleibt unverändert, App läuft weiter.

**Dateien (neu):**
- `supabase/migrations/<ts>_user_movie_ratings.sql`: Tabelle, Indizes (`(movie_id, user_id)`, `watchlist_entries (movie_id, group_id)`, `watch_group_members (user_id, group_id)`), `updated_at`-Trigger, `can_read_user_movie_rating`, RLS-Policies, Grants (`authenticated`: select/insert/update; `service_role` wie in `20260930090000_...`), Aufnahme in `supabase_realtime`-Publication, optional RPC `get_group_member_ratings(p_group_id)` (security definer, Mitgliedschaft einmal prüfen).
- `supabase/migrations/<ts>_user_movie_ratings_backfill.sql` (oder separater Schritt im selben File): Backfill aus `ratings`.
- Kein Push-Trigger auf der neuen Tabelle in dieser Phase (sonst feuert der Backfill Benachrichtigungen); Trigger folgt in Phase 2.

**Backfill-Konfliktregel (VORSCHLAG, bestätigen):** Gruppiert nach `(member_id, we.movie_id)` über `ratings ⨝ watchlist_entries`:
1. Zeilen mit nicht-NULL `rating` vor Zeilen ohne Rating,
2. dann neuestes `rated_at`, dann neuestes `seen_at` (`ratings` hat kein `updated_at`; `rated_at` ist der Ersatz),
3. dann deterministischer Tie-Break (`ratings.id`).
Gewinnerzeile liefert `rating`, `rated_at`; `liked = bool_or(liked)` über alle Zeilen; `seen_at` = neuestes nicht-NULL `seen_at` (Alternative: frühestes — bestätigen). Das entspricht der Logik, die `scripts/legacy-import/transform.js` heute innerhalb einer Gruppe für zusammengeführte Einträge anwendet (Rating-Zeile zuerst, dann `seen_at`/`rated_at` absteigend). Vor dem Insert ein **Konfliktbericht** (Query, die Fälle mit abweichendem `rating` oder `seen_at` je `(user, movie)` listet) ausführen und nur Zahlen/Film-IDs ausgeben (keine PII im Chat/Log); Backfill nur nach Sichtung.

**Tests (TDD):**
- DB-/SQL-Tests lassen sich im Repo bisher nur über Supabase CLI/Skripte ausführen; Vorschlag: SQL-Prüfskript (Rolle wechseln, `set local request.jwt.claims`) unter `supabase/` ablegen und per `scripts/` aufrufbar machen — **neu und im Plan zu entscheiden** (ADR 0008 sieht nichts Konkretes für DB-Tests vor; Entscheidung Robin).
- Kontrollfälle: Nutzer A/B in gemeinsamer Gruppe mit Film → B sieht A; Film nicht in gemeinsamer Gruppe → nicht sichtbar; fremde Zeile schreiben → Fehler; eigene Zeile ohne Gruppen-Eintrag schreiben → ok; Beitritt macht Zeile sichtbar; Eintrag löschen → Zeile bleibt, aber für andere unsichtbar, solange Film in keiner gemeinsamen Gruppe liegt.
- Backfill: Zeilenanzahl = `count(distinct (member_id, movie_id))` aus `ratings`⨝`watchlist_entries`; Stichproben pro Konfliktfall.
- Jest: nur falls Migration per Textprüfung abgesichert werden soll (analog bestehender Tests); sonst nicht.

**Maestro:** keine Änderung (keine App-Änderung). Smoke `--smoke` nach `supabase db push` auf DEV als Sanity-Check.

**Risiken:**
- Policy-Performance (Funktion je Zeile) und Realtime-Auswertung → Indizes, RPC, `EXPLAIN` an DEV.
- Konfliktfälle im Backfill → Bericht/Review.
- Publication wird heute vermutlich im Dashboard gepflegt (nicht im Repo) → Zustand vorher prüfen.

**Rollback:** Migration rein additiv: `drop table public.user_movie_ratings cascade; drop function can_read_user_movie_rating; drop index ...;` — alte `ratings` ist unberührt. Backfill ist idempotent (`on conflict do nothing` bzw. vorher `truncate`).

---

## Phase 1 — Lese-Pfade

**Stand 2026-10-11: Code umgesetzt (Phase 1+2 zusammen), tsc/jest/eslint grün; Handy-Prüfung offen.** `useGroupWatchlist` lädt Einträge (ohne `ratings(*)`) und RPC `get_group_member_ratings` parallel und merged per `attachMemberRatings` (`src/lib/entrySelectors.ts`, einzige Stelle mit Kenntnis der Ratings-Struktur) in `entry.ratings` (Form: `member_id, rating, liked, seen_at, rated_at`; `id`/`watchlist_entry_id` entfallen). Kein eigener Query-Key: Ratings leben im Watchlist-Query, Invalidierung über `queryKeys.watchlist.all`. `CACHE_SCHEMA_VERSION` = 3. `added_by` ist `string | null`; Tracker zeigt bei NULL-Zahler "Ehemaliges Mitglied".

**Ziel:** Alle Anzeigen lesen Bewertungen aus `user_movie_ratings`; die App-interne Form (`entry.ratings: Rating[]`) bleibt vorerst erhalten, um die Änderungsfläche klein zu halten. Schreiben läuft noch auf `ratings` — deshalb in dieser Phase **Dual-Write oder Feature-Brücke nötig** (siehe Risiken); Empfehlung: Phase 1 und 2 im selben Release.

**Dateien (betroffen):**
- `src/lib/watchlist.ts`: `WATCHLIST_ENTRY_SELECT` ohne `ratings(*)`; neue Funktion `getGroupMemberRatings(groupId)` (RPC oder Tabellenabfrage `.in("movie_id", ids)` + Mitglieder-IDs).
- `src/lib/watchlistTypes.ts`: `Rating`-Typ ohne `id`/`watchlist_entry_id` bzw. Adapter (`member_id` ← `user_id`).
- `src/hooks/useGroupWatchlist.ts`: Ergebnis der Rating-Abfrage in `entries[].ratings` einmischen (reiner Merge in `src/lib/watchlistLogic.ts`, getestet) oder eigener Hook `useGroupRatings(groupId)`.
- `src/lib/queryKeys.ts`: neuer Key (z. B. `groupRatings.byGroup(groupId)`), `CACHE_SCHEMA_VERSION` in `queryPersistence.ts`/`mmkvStorage.ts` anheben (Key-Werte sind persistiert).
- Konsumenten, die `entry.ratings` lesen (Typ bleibt, daher meist nur Prüfung): `src/lib/watchlistLogic.ts`, `listFilters.ts`, `entryFilters.ts`, `columnSort.ts`, `diaryDisplay.ts`, `trackerLogic.ts` (Zeile ~48), `addMovieLogic.ts` (Duplikat-Hinweis, "bereits gesehen" — künftig auch Filme ohne Gruppen-Eintrag erkennbar, falls gewünscht), `src/components/movie/MovieDetailRatingsSection.tsx`, `MemberRatingRow.tsx`, `MovieDetailTitleRow.tsx`, `src/components/tagebuch/TagebuchEntryList.tsx`, `src/components/watchlist/WatchlistEntryList.tsx`, `WatchlistSortSheet.tsx`, `src/app/(app)/(modals)/movie/[tmdbId].tsx`, `src/components/movie/RatingDialog.tsx`, `PaymentModal.tsx`.

**Tests (zuerst rot):**
- `__tests__/lib/watchlist*.test.ts` (neue Abfrage, Fehlerpfad `{ data, error }`), `__tests__/hooks/useGroupWatchlist.test.tsx` (Merge, Cache-Form JSON-sicher), `__tests__/lib/watchlistLogic*.test.ts` (Merge-Funktion: Film ohne Bewertung, mehrere Mitglieder, Mitglied ohne Zeile), bestehende Tests für Tracker/Diary/Filter/Sort unverändert grün halten (Beweis, dass die Form stabil bleibt), `__tests__/lib/queryKeys*`-Test falls vorhanden, `__tests__/lib/mmkvStorage.test.ts` (Schema-Version).
- Screen-Tests: `__tests__/screens/MovieDetail.test.tsx` u. a. nur bei Formänderung.

**Maestro:** `--changed` (Bereiche Watchlist, Tagebuch, Tracker, Detail); Flows `watchlist-filter-sort`, `tagebuch-filter-sort`, `movie-detail-full`, `tracker-payment`. Testzustand wie in CLAUDE.md wiederherstellen.

**Risiken:**
- PostgREST-Embed nicht möglich → zweiter Request erhöht Latenz/Flackern (zwei Teilladezustände). Mitigation: gemeinsamer Loading-State, RPC mit einem Roundtrip.
- Backfill-Stand vs. Live-Schreibvorgänge auf alter Tabelle driften auseinander, wenn Phase 1 vor Phase 2 ausgerollt wird (→ im selben Release oder Backfill vor Release wiederholen).
- Persistierter Cache alter Form → Schema-Version anheben.

**Rollback:** Lese-Pfad per Git revertieren (alte `ratings(*)`-Abfrage). Daten unverändert.

---

## Phase 2 — Schreib-Pfade

**Stand 2026-10-11: App-Code umgesetzt; SQL-Paket `docs/dev-apply-phase2.sql` (Push-Trigger-Umzug) vorbereitet, NICHT angewendet; `send-push` NICHT geändert (kein Deno zum Testen), Dedupe-Änderung dort beschrieben am Ende der SQL-Datei.** `saveRating` = Upsert `(user_id,movie_id)` (ohne Inhalt: Zeile löschen), `resetRating`/Bewertung löschen = Zeile löschen, `toggleLike` = Upsert nur `liked` bzw. Update `liked=false`. Zahlung unverändert an `watchlist_entries`; Payment-only-Save nach Löschen über `skipRating`. Mutationen invalidieren `queryKeys.watchlist.all` (alle Gruppen). Realtime: Abo auf `user_movie_ratings` (ungefiltert, Client-Filter über `movie_id` im Watchlist-Cache der aktiven Gruppe), Abo auf `ratings` entfernt. Alt-Tabelle `ratings` wird nicht mehr beschrieben, nicht gelöscht.

**Ziel:** Alle Schreibvorgänge gehen auf `user_movie_ratings` (Upsert auf `(user_id, movie_id)`); alte `ratings` wird nicht mehr beschrieben.

**Dateien (betroffen):**
- `src/lib/movieDetailMutations.ts`: `saveRating`, `resetRating`, `toggleLike` — `onConflict: "user_id,movie_id"`, Parameter `movieId` statt `watchlistEntryId`/`existingRatingId`. `savePayment`, `deletePayment`, `deleteWatchlistEntry`, `addToWatchlist`, `setWatchlistEntryReleaseDate` bleiben unverändert (Entscheidungen 3/4). Nach Eintragslöschung keine Rating-Löschung.
- `src/lib/ratingLogic.ts`: `buildRatingUpsertPayload` baut `{ user_id, movie_id, rating, liked, seen_at, rated_at }`; Typ `RatingUpsertPayload` anpassen.
- `src/hooks/useSaveRating.ts`, `src/hooks/useMovieDetailMutations.ts` (`useToggleLike`): Invalidierung der Rating-Queries **aller** Gruppen (Prefix-Key), da ein Film in mehreren Gruppen liegen kann; `["watchlist", groupId]` weiter invalidieren, wenn Zahlung geschrieben wird.
- `src/components/movie/RatingDialog.tsx`, `MovieDetailActionsBar.tsx`: "Direkt bewerten" auf Filme ohne Gruppen-Eintrag unverändert (Eintrag wird weiterhin angelegt) — keine Änderung des Ablaufs.
- `src/lib/realtimeSync.ts`, `src/hooks/useGroupRealtimeSync.ts`: Abonnement auf `user_movie_ratings`; clientseitiger Filter über `movie_id` ∈ Movie-IDs des Watchlist-Caches der aktiven Gruppe (statt `watchlist_entry_id`); Invalidierung des Rating-Keys.
- `supabase/migrations/<ts>_user_movie_ratings_push_trigger.sql`: `notify_first_rating` auf die neue Tabelle (Gruppenermittlung via `watch_group_members` × `watchlist_entries`), Alt-Trigger auf `ratings` entfernen. Edge Function `send-push` nur anpassen, falls das Payload-Format sich ändert (nicht anfassen ohne Entscheidung zu offenem Punkt 4).
- Optional: DELETE-Policy, falls Offener Punkt 2 so entscheidet.

**Tests:**
- `__tests__/lib/movieDetailMutations.test.ts` (Payload-Form, `onConflict`, kein Delete), `__tests__/lib/ratingLogic.test.ts`, `__tests__/hooks/useSaveRating.test.tsx` und `useMovieDetailMutations.test.tsx` (Invalidierungs-Keys, Fehlerpfad), `__tests__/hooks/useGroupRealtimeSync.test.tsx` und `__tests__/lib/realtimeSync.test.ts` (Klassifizierung/Filter über `movie_id`), Komponententests `RatingDialog`/`MovieDetailActionsBar`.
- Neuer Fall: zweite Gruppe mit demselben Film wird nach Bewertung invalidiert; Film aus Gruppe entfernen lässt Bewertung unberührt (Mutation löscht nur `watchlist_entries`).
- DB: Push-Trigger — erste Bewertung feuert einmal je betroffener Gruppe, Korrektur feuert nicht, Backfill/Seed feuert nicht.

**Maestro:** `rating-cycle` (bestehend, erweitert), `movie-detail`, `movie-detail-full`, `watchlist-add-remove` (Entfernen + Wieder-Hinzufügen: Bewertung sofort da — **neuer Schritt mit Screenshot**), `tracker-payment`. Neuer Flow `rating-shared-across-groups.yaml`: Film in zwei Gruppen, Bewertung in A setzen, in B prüfen, aufräumen (nur selbst angelegte Daten, nie `clearState`; Testgruppe wird mit dem Handy des Users geteilt → nur eigene Einträge löschen). Voraussetzung: zweite Testgruppe (Entscheidung Robin). `.maestro/areas.json` und `docs/maestro-coverage.md` aktualisieren.

**Risiken:**
- Trigger-Umbau: doppelte oder fehlende Pushes (offener Punkt 4).
- Nutzer ohne Gruppen-Eintrag schreiben Zeilen → `rated_at`-Semantik für "erste Bewertung" unverändert halten.
- Cache-Invalidierung vergessen → veraltete Anzeige in anderer Gruppe.
- Laufende alte App-Versionen (EAS-Build auf dem Handy) schreiben noch in `ratings` → nur DEV, mit einem koordinierten Build; Alt-Tabelle bis Phase 4 behalten, optional Brücken-Trigger `ratings → user_movie_ratings` für die Übergangszeit (nur wenn nötig).

**Rollback:** App-Revert + Alt-Push-Trigger wiederherstellen (Migration als eigene, reversible Datei halten). Neue Zeilen in `user_movie_ratings` können per Re-Backfill zurück nach `ratings` gespiegelt werden, falls Revert nach Nutzung nötig ist (Skript vorab bereitstellen).

---

## Phase 3 — Legacy-Import anpassen

**Ziel:** `scripts/legacy-import` erzeugt Bewertungen direkt für `user_movie_ratings`. Nur lesend gegen den Dump, schreibend nur gegen DEV (ADR 0013, Dry-run zuerst, Dump behalten).

**Dateien:** `scripts/legacy-import/transform.js` (Block "ratings": Gruppierung nach `(user, canonical movie)` über **alle** Gruppen statt je `survivor|member`; Konfliktregel wie Phase 0; Konfliktbericht um "Gruppen-übergreifend" erweitern), `importer.js` (Tabelle, `onConflict: "user_id,movie_id"`, Reihenfolge), `ids.js` (deterministische ID entfällt oder `legacyId` über `(user,movie)`; PK ist zusammengesetzt), `validate.js` (Unique/FK/Checks für neue Form), `verify.js`, `reset.js` (`COUNT_TABLES`, Reset-Regel: Löschung der Bewertungen nicht mehr über `watchlist_entry_id`, sondern über User/Movie der behaltenen Daten), `memoryBackend.js` (Tabellen-/PK-/FK-Definition), `cli.js` (Berichtszeilen).

**Tests:** `__tests__/scripts/legacyImport/transform.test.js`, `backends.test.js`, `reset.test.js`, `cli.test.js`, `ids.test.js`, `gapFillVerify.test.js`, Fixture `__tests__/helpers/legacyDumpFixture.js` um Film in beiden Gruppen mit abweichender Bewertung erweitern. Zuerst Dry-run gegen In-Memory-Backend.

**Maestro:** keiner. Nach Import auf DEV Stichproben-Verify (Zählung, Beispiel-Rating) + `--smoke`.

**Risiken:** Konflikte zwischen den beiden Legacy-Gruppen (`all_three`, `robin_tobias`) — echte Datenentscheidung; bereits vorhandene DEV-Daten (Reset ist laut Memory genehmigt, nicht für Prod); Doppelimport (Idempotenz via PK).

**Rollback:** `reset.js` auf DEV; Dump ist erhalten (unveränderliche Quelle); alter Importer per Git.

---

## Phase 4 — Alte `ratings` entfernen (separate, destruktive Migration)

**Voraussetzungen:** Phasen 0–3 verifiziert (Jest, Maestro Vollauf, Datenabgleich `ratings` ≙ `user_movie_ratings`), kein Code liest/schreibt `ratings` (`rg "ratings\b"` über `src`, `scripts`, `supabase/functions`), kein Build in Umlauf nutzt die alte Tabelle, ausdrückliche Freigabe von Robin (destruktiv).

**Dateien:** `supabase/migrations/<ts>_drop_ratings.sql` (Drop Trigger/Funktion `notify_first_rating` alt, `drop table public.ratings`), Kommentare in `20260921110000_empty_group_hard_delete.sql`-Folgedokumentation nicht ändern (Migrationen sind historisch); `docs/feature-inventory.md`/ADR 0014 Status auf "Entschieden" setzen, ADR 0003 mit Verweis ergänzen; Typ-Reste `Rating`-Altfelder aufräumen.

**Tests:** `npx tsc --noEmit`, `npx jest`, vollständige Maestro-Suite (`scripts/maestro-all.sh`), Edge-Function-Tests falls vorhanden.

**Risiken:** Unwiederbringlicher Datenverlust der Alttabelle → vorher Dump/Export der Tabelle (z. B. `pg_dump -t ratings` von DEV) sichern.

**Rollback:** Wiederherstellung aus dem Dump (Tabelle + Policies + Trigger aus den Ursprungsmigrationen); deshalb Migration nicht vor Phase-2-Stabilisierung ausrollen.

---

## Phase 5 — Gruppenübergreifendes Tagebuch ("Alle Gruppen"-Modus)

**Ziel:** "Mein Tagebuch" kann alle eigenen Bewertungen anzeigen (Entscheidung 5), auch Filme ohne Gruppen-Eintrag. Neues Feature, eigener Zuschnitt (UI-Entscheidungen vor Umsetzung mit Robin klären — CLAUDE.md "Hard Rule").

**Dateien:** `src/lib/watchlist.ts` (neue Abfrage `getOwnRatings(userId)` mit `movies(*)`-Embed — hier gibt es einen echten FK `movie_id → movies`, Embed funktioniert), neuer Hook (z. B. `useOwnDiary`), `src/lib/queryKeys.ts`, `src/hooks/useTagebuchScreen.ts`, `src/components/tagebuch/*` (Modus-Umschalter "Diese Gruppe / Alle Gruppen"; Panel-Zustand laut Flow-Regeln), `diaryDisplay.ts`, ggf. Zustand in Zustand/MMKV (Umschalter-Persistenz — Entscheidung nötig). Zahlungsanzeige im Alle-Gruppen-Modus: keine Gruppe aktiv → Zahlung ausblenden oder pro Gruppe (offener Punkt 8).

**Tests:** Hook-Test (eigene Zeilen inkl. Film ohne Gruppen-Eintrag), Logik-Test (Sortierung/Filter über `seen_at`), Komponenten-Test des Umschalters, `__tests__/hooks/useTagebuchScreen*`.

**Maestro:** `tagebuch-filter-sort` erweitern oder neuer Flow `tagebuch-all-groups` mit Screenshots beider Modi; Testzustand zurücksetzen (Tagebuch "Mein Tagebuch" + Karten + Panel geschlossen). Coverage-Doku/`areas.json` pflegen.

**Risiken:** Datenmenge (Paginierung bei vielen Bewertungen), Verwirrung bei Filmen, die in der aktiven Gruppe nicht liegen (Detailansicht ohne Gruppenkontext, Zahlung/Entfernen nicht anwendbar → Actions-Bar-Zustände prüfen), Polster/Kontrast in Dark/Theme-Tour.

**Rollback:** Feature-Revert; keine Schemaänderung nötig.

**Umsetzung (Stand 2026-10-11, ohne Commit):** Kein neuer Umschalter, sondern der vorhandene Scope-Schalter bekommt die neue Bedeutung: "Mein Tagebuch" (`my_diary`, bleibt Standard) = alle Filme, die ich je bewertet (Rating > 0) oder mit `seen_at` markiert habe, gruppenübergreifend und auch ohne Gruppen-Eintrag; "Gruppe" (`group`) = wie bisher die Filme der aktiven Gruppe, die irgendjemand bewertet hat. testIDs `tagebuch-scope-my_diary|group` unverändert.
- Daten: `getMyDiaryRows(userId)` (`src/lib/watchlist.ts`) liest `user_movie_ratings` + eingebettetes `movie:movies(*, movie_genres(...))` (`movies` ist für alle Authenticated lesbar), seitenweise per `range` (1000er-Limit). `useMyDiary(userId)` (`queryKeys.myDiary.byUser`) cached die Rohzeilen (JSON-sicher), `select` mappt über `mapMyDiaryRows` (`src/lib/myDiary.ts`) auf die Eintragsstruktur: Id `my-<movieId>`, `group_id ""`, keine Zahlung, `ratings=[meine Zeile]`. So gelten Selektoren/Filter/Sortierung/Karten/Grid/Liste unverändert (Bewertung Ø = eigene Bewertung, Likes = eigenes Herz).
- Invalidierung: `useSaveRating`, `useResetRating`, `useToggleLike` invalidieren zusätzlich `queryKeys.myDiary.all`; `useGroupRealtimeSync` invalidiert bei jedem `user_movie_ratings`-Event `myDiary.byUser(<user_id der Zeile>)` (No-op ohne Cache, trifft also nur den eigenen Cache, auch für Filme ohne Gruppen-Eintrag).
- Filter in "Mein Tagebuch": Genre, Jahr (eigenes `seen_at`), Mag ich, Streaming (Provider-Cache pro tmdb_id, funktioniert ohne Gruppe). "Alle bewertet"/"Fehlt noch" nur in "Gruppe": im Flyout wird der Abschnitt "Bewertungsstand" ausgeblendet, ein gespeicherter Wert wird in "Mein Tagebuch" weder angewendet noch als Chip gezeigt.
- Detail: Tippen öffnet bei Film in der aktiven Gruppe das Detail im Gruppenkontext (`source=diary`, echte Entry-Id); sonst ohne Gruppen-Params (`navigateToMovieDetailWithoutGroup`, mit `movieJson` für Sofort-Anzeige) -> vorhandene Logik "kein Gruppenkontext": Aktionen "Zur Watchlist"/"Direkt bewerten" (legt den Eintrag in der aktiven Gruppe an), keine Zahlung/Löschen. Einschränkung: Ohne Gruppen-Eintrag zeigt das Detail die eigene Bewertung nicht an und sie ist nur über "Direkt bewerten" änderbar.
- Sternfarbe: unverändert die Themenfarbe der aktiven Gruppe (im Plan/ADR war kein neutrales Gold entschieden).
- Offen: Maestro-Flow `tagebuch-all-groups` (Film in zweiter Gruppe/ohne Gruppe) nicht angelegt, `tagebuch-filter-sort` unverändert.

---

## Querschnitt

- **Reihenfolge:** 0 → (1+2 zusammen) → 3 → Stabilisierung → 4 → 5. Phase 5 kann nach 2 parallel zu 3/4 laufen.
- **Definition of Done je Phase:** `tsc` + `jest` grün, relevante Maestro-Bereiche grün, Screenshots geprüft und an Robin gesendet, `docs/maestro-coverage.md` + `.maestro/areas.json` aktuell, Fortschritt in `docs/interim-decisions.md` festhalten.
- **Nicht-Ziele:** keine Änderung von Rollen/Beitritt/Lifecycle (ADR 0003), keine Änderung der Zahlungslogik, keine Prod-/Legacy-DB-Zugriffe.
