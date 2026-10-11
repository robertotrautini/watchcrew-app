# 0015 — Feature-Flags pro Nutzer (Premium, Abos, kostenlose Freischaltungen)

**Status:** Zurückgestellt (Backlog), 2026-10-11 — Entscheidung vertagt; Entwurf bleibt gültig (siehe [backlog.md](../backlog.md)). Ursprünglich: Vorgeschlagen, noch nicht vom User bestätigt; es wird nichts implementiert, bevor die offenen Fragen am Ende beantwortet sind. Berührt [0002](0002-supabase-backend.md) (Supabase, Edge Functions), [0004](0004-auth-and-account-lifecycle.md) (Konto-Lebenszyklus), [0007](0007-client-tech-stack.md) (TanStack Query, Zustand, MMKV), [0009](0009-config-and-secrets.md) (Secrets) und [0012](0012-admin-scope-boundary.md) (kein Admin-Zweig in der App). Ändert nichts am Datenmodell aus [0003](0003-watch-group-data-model.md).

## Kontext

Geplant sind später In-App-Käufe/Abos (Marketing-Ambition, ADR 0002/0003) sowie kostenlose Freischaltungen für Freunde und Familie. Anforderung des Users:

- Pro Nutzer eine **Liste von Flags**, flexibel, beliebig viele verschiedene (`premium`, später z. B. `beta_stats`, `unlimited_groups`, ...).
- In der App **Trigger/Gates**, die Features je nach Flag ein- oder ausblenden.
- Der Owner/Admin (Robin) kann **einzelnen Personen** Flags setzen, z. B. `premium` kostenlos.

Randbedingungen aus dem Bestand:

- `public.profiles` (1:1 auf `auth.users`, `on delete cascade`) ist lesbar für alle `authenticated` (Anzeigenamen). Flags dürfen dort **nicht** mitlesbar werden.
- Schreibzugriff auf sensible Daten läuft über `service_role`/Edge Functions bzw. `SECURITY DEFINER`-Funktionen; Tabellen ohne Client-Schreibpolicy sind das etablierte Muster (z. B. `movies`, `profiles`-INSERT).
- RLS-Muster: `(select auth.uid())` in Policies, `SECURITY DEFINER`-Helper mit `set search_path = public` (ADR 0014).
- Client: Hooks über TanStack Query mit zentraler `queryKeys`-Factory (`src/lib/queryKeys.ts`, Vorbild `useOwnProfile`); der Query-Cache wird persistiert (`queryPersistence.ts`, `CACHE_SCHEMA_VERSION`). Realtime ist bereits über `supabase_realtime`-Publication im Einsatz.
- ADR 0012: In der Mobile-App gibt es **keinen Admin-UI-Zweig**. Flags zu vergeben ist Betreiberfunktion und gehört nicht in die Endnutzer-App.
- Zero-autonome-Entscheidungen-Regel: alle Punkte unten sind Vorschläge.

## Optionen

### Option A — Tabelle `user_feature_flags` (empfohlen)

Eine Zeile pro Nutzer und Flag.

```sql
create table public.user_feature_flags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  flag       text not null check (flag ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled    boolean not null default true,
  source     text not null default 'manual'
             check (source in ('manual', 'subscription', 'grant', 'promo')),
  expires_at timestamptz,            -- null = unbefristet
  note       text,                   -- z. B. "Familie Trautmann"
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, flag)
);

create index user_feature_flags_user_idx on public.user_feature_flags (user_id);

alter table public.user_feature_flags enable row level security;

-- Nutzer liest nur eigene Zeilen. KEINE insert/update/delete-Policy:
-- Clients koennen nichts schreiben (RLS verweigert per Default).
create policy "uff_select_own"
  on public.user_feature_flags
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Grants: authenticated nur SELECT; service_role alles (siehe
-- 20260930090000_grant_authenticated_service_role_table_privileges.sql).
revoke all on public.user_feature_flags from anon, authenticated;
grant select on public.user_feature_flags to authenticated;
grant all on public.user_feature_flags to service_role;
-- updated_at: BEFORE-UPDATE-Trigger wie bei user_movie_ratings.
-- Publication: user_feature_flags in supabase_realtime (replica identity full).
```

Wirksamkeit eines Flags = Zeile existiert **und** `enabled` **und** (`expires_at is null` oder `expires_at > now()`). Diese Logik steht an genau einer Stelle serverseitig (View/Funktion) und einmal gespiegelt im Client:

```sql
create or replace function public.has_feature(p_user_id uuid, p_flag text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_feature_flags f
     where f.user_id = p_user_id and f.flag = p_flag and f.enabled
       and (f.expires_at is null or f.expires_at > now())
  );
$$;
-- Nicht an authenticated/anon freigeben, nur service_role + RLS-Policies
-- anderer Tabellen (die laufen als Definer-Kontext nicht noetig) -- Details Phase 1.
```

Pro:
- **Ablaufdatum** (`expires_at`) für Testzeiträume, befristete Geschenke und Abo-Laufzeiten, ohne Cron-Pflicht (Ablauf wird beim Lesen ausgewertet).
- **Quelle** (`source`) trennt manuelle Geschenke von Store-Abos: ein Store-Webhook (später) darf nur `source = 'subscription'`-Zeilen anfassen und überschreibt nie ein manuelles `premium`-Geschenk; Abo-Ende entzieht nur die Abo-Zeile.
- Historie/Audit-Minimum (`granted_by`, `note`, Zeitstempel); später ggf. Log-Tabelle ergänzbar.
- Beliebig viele Flags ohne Schemaänderung; Flags sind einfach Strings, bekannt ist nur die Registry im Code.
- Saubere RLS, Realtime-Filter auf `user_id`, `on delete cascade` mit dem Konto.

Contra: eine Tabelle mehr, eine Zusatzabfrage beim Start (klein, ein Row-Set pro Nutzer, gut cachebar).

### Option B — Spalte `profiles.feature_flags` (`jsonb` oder `text[]`)

Einfacher (keine neue Tabelle, Flags kommen mit dem Profil), aber:
- `profiles` ist für alle `authenticated` lesbar (ADR/Migration `profiles_select_authenticated`) — Flags wären für andere Nutzer sichtbar; man müsste Spalten-Privilegien/Views einführen oder die Policy umbauen.
- Der Client-UPDATE auf das eigene Profil (Anzeigename-Änderung) müsste per Spaltenprivileg/Trigger gegen Selbstvergabe von Flags abgesichert werden — eine häufige Fehlerquelle (jeder Nutzer macht sich selbst `premium`).
- Kein Ablauf, keine Quelle, keine Historie; Abo-Webhook und manuelles Geschenk kollidieren im selben Wert (jsonb ließe sich mit Metadaten aufblähen — dann ist es eine schlechtere Tabelle).
- Realtime/Updates auf `profiles` feuern bei jeder Profiländerung.

Nur sinnvoll, wenn nie Ablauf/Abos kommen. Das widerspricht dem Ziel.

### Option C — Remote-Config nur global (verworfen)

Ein globaler Konfigurationsdienst/Tabelle (`app_config`: Flag an/aus für alle) oder Fremddienst.
- Kann nicht "Person X bekommt `premium` kostenlos". Das Kernziel (pro Nutzer) ist nicht erfüllbar.
- Abos sind per Definition pro Nutzer.
- Ein globaler Kill-Switch ist trotzdem nützlich, aber ein anderes Problem (Feature für alle abschalten); kann später als Ergänzung (z. B. Registry-Default per Release oder eine kleine Tabelle) kommen, ersetzt A nicht.
- Fremder Remote-Config-Dienst: zusätzliche Abhängigkeit/Datenabfluss, ADR 0007/0011 müssten ergänzt werden, ohne Nutzen gegenüber Supabase.

## Empfehlung

**Option A.** Ablaufdatum und Quelle sind genau das, was ein späterer Store-Webhook braucht (Abo-Zeile anlegen/verlängern/entziehen, ohne manuelle Geschenke zu berühren), und die RLS-Trennung (Lesen eigene Zeilen, Schreiben nur Service-Role) ist einfach und sicher. Option B spart eine Tabelle, erkauft das aber mit Sichtbarkeits- und Selbstvergabe-Risiken und verbaut Abos.

## Client-Entwurf

### Zentrale Registry — `src/lib/featureFlags.ts`

Einzige Stelle, die Flag-Namen kennt. Die Datenbank hält beliebige Strings; die Registry gibt dem Client Typen, Defaults und Beschreibungen. Unbekannte Flags aus der DB werden ignoriert (vorwärtskompatibel).

```ts
export const FEATURE_FLAGS = {
  premium: {
    default: false,
    description: "Bezahl-/Freundes-Premium: schaltet alle Premium-Funktionen frei",
  },
  // weitere Flags kommen mit dem jeweiligen Feature
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
export const isKnownFlag = (f: string): f is FeatureFlag => f in FEATURE_FLAGS;
```

Reine Funktion `resolveFlags(rows, now)` (testbar): filtert `enabled` und nicht abgelaufene Zeilen (`expires_at > now`, Client-Uhr nur zur Anzeige/Cache-Auswertung; maßgeblich bleibt der Server), mischt auf die Registry-Defaults.

### Hooks

- `useFeatureFlags(userId)` — `useQuery` mit `queryKeys.featureFlags.byUser(userId)`; `queryFn` liest `user_feature_flags` des eigenen Nutzers (RLS filtert ohnehin) und liefert die aufgelöste Map `Record<FeatureFlag, boolean>`. Folgt `useOwnProfile` (`enabled: !!userId`).
- `useFeature(flag)` — dünner Selektor über `useFeatureFlags`, liefert `boolean` (nie `undefined`; siehe Ladezustand).
- Aktualität: (1) Refetch bei App-Fokus/-Vordergrund (TanStack `focusManager` ist laut ADR 0007-Setup ohnehin anzubinden, falls noch nicht geschehen), (2) Realtime-Abo auf `user_feature_flags` gefiltert nach `user_id` löst `invalidateQueries` aus — Flag-Vergabe erscheint ohne Neustart, Entzug ebenso. Realtime ist Komfort, Refetch bei Fokus die Absicherung. Tabelle in die `supabase_realtime`-Publication aufnehmen (wie `20261011120000_realtime_publication.sql`).
- Ablauf zur Laufzeit: `staleTime` kurz (z. B. Minuten); zusätzlich beim Auflösen `expires_at` gegen die Uhr prüfen, damit ein abgelaufenes Flag auch ohne Refetch ausgeht.

### Komponente `<FeatureGate flag fallback>`

```tsx
<FeatureGate flag="premium" fallback={<UpgradeHint />}>
  <PremiumStats />
</FeatureGate>
```

Rendert `children`, wenn `useFeature(flag)` wahr ist, sonst `fallback` (Default: nichts). Für nicht-visuelle Entscheidungen (Navigation, Aktionen) direkt `useFeature`. Styling über CSS-/NativeWind-Klassen, keine Inline-Styles.

### Ladezustand und Offline

- **Nie blockieren, nie flackern.** Solange keine Antwort da ist, gilt der gecachte Wert; ohne Cache der **Registry-Default** (für Premium-Features: `false`). Kein Spinner, keine Layout-Sprünge durch Gates: Premium-Bereiche starten "zu" und öffnen sich, wenn das Flag eintrifft; für bereits Freigeschaltete verhindert der persistierte Query-Cache (MMKV, `queryPersistence.ts`) das Flackern beim Kaltstart.
- **Offline:** letzter bekannter Stand aus dem persistierten Cache. Der Client erzwingt keine Sperre wegen fehlender Verbindung (kein Nutzer verliert offline sein bezahltes Feature). Ablauf wird anhand `expires_at` weiter lokal ausgewertet.
- `featureFlags` ist **persistiert** (nicht in `NON_PERSISTED_ROOTS`); bei Formatänderung `CACHE_SCHEMA_VERSION` anheben. Beim Logout wird der Cache wie bisher geleert (keine Flags des Vorgängers).
- Der Client-Gate ist **nur UX**, kein Sicherheitsmerkmal (siehe unten).

### Serverseitige Durchsetzung

Ein Gate, das nur die UI versteckt, schützt keine Kosten. Gilt ein Feature als kostenpflichtig oder verursacht es Kosten (TMDB-/Edge-Function-Last, Push-Volumen, Speicher, künftig AI), muss der Server das Flag prüfen:

- **Edge Functions:** Prüfung mit dem JWT des Aufrufers (`auth.getUser()`), dann `has_feature(user_id, flag)` per Service-Role-Client oder RPC; bei fehlendem Flag `403` mit stabilem Fehlercode (`feature_not_enabled`), den der Client freundlich behandelt.
- **RLS/Constraints** dort, wo ein Limit an Datenzeilen hängt (z. B. Anzahl Gruppen): Policy oder Trigger ruft `has_feature` (Definer-Funktion, kein Client-Zugriff nötig).
- Die Prüflogik (`enabled` und nicht abgelaufen) existiert genau einmal in SQL (`has_feature`); Client-`resolveFlags` spiegelt sie nur und bekommt dieselben Testfälle.
- Reine UI-Vorlieben ohne Kosten (z. B. Theme-Extras) dürfen nur clientseitig gegatet sein; das wird pro Flag in der Registry-Beschreibung vermerkt.

## Admin-Weg

Passend zu ADR 0012 (kein Admin-UI in der App): zunächst **SQL im Supabase-Dashboard** (SQL-Editor, Service-Role-Kontext). Snippets:

```sql
-- Flag setzen (unbefristet, kostenlos)
insert into public.user_feature_flags (user_id, flag, source, note)
select id, 'premium', 'grant', 'Freund Max'
  from auth.users where email = 'max@example.com'
on conflict (user_id, flag) do update
  set enabled = true, source = 'grant', expires_at = null,
      note = excluded.note, updated_at = now();

-- Mit Ablauf (30 Tage Test)
insert into public.user_feature_flags (user_id, flag, source, expires_at, note)
select id, 'premium', 'promo', now() + interval '30 days', 'Testmonat'
  from auth.users where email = 'max@example.com'
on conflict (user_id, flag) do update
  set enabled = true, source = 'promo',
      expires_at = excluded.expires_at, note = excluded.note, updated_at = now();

-- Entziehen (Zeile behalten, Historie bleibt)
update public.user_feature_flags
   set enabled = false, updated_at = now()
 where flag = 'premium'
   and user_id = (select id from auth.users where email = 'max@example.com');

-- Uebersicht
select u.email, f.flag, f.enabled, f.source, f.expires_at, f.note
  from public.user_feature_flags f join auth.users u on u.id = f.user_id
 order by u.email, f.flag;
```

(Anmerkung: bei `granted_by` im Dashboard-Kontext `null`, da dort kein `auth.uid()` existiert.)

Später (nicht Teil dieser Entscheidung, keine Festlegung):
- Das in ADR 0012 vorgesehene separate Admin-Backend (Web-Tool) bekommt eine Flag-Verwaltung (Nutzer suchen, Flags vergeben/entziehen).
- **Store-Webhook** (z. B. ein Abo-Dienst wie RevenueCat o. ä., ob und welcher ist offen) → Edge Function, schreibt/löscht ausschließlich Zeilen mit `source = 'subscription'` und setzt `expires_at` aus der Abo-Laufzeit. Die Tabelle ist darauf vorbereitet; der Dienst wird in einem eigenen ADR entschieden (inkl. ADR 0010 Store-Setup, ADR 0011 Datenschutz).

## Gruppenebene (offen)

Unklar, ob "Familie/Gruppe bekommt Feature" gebraucht wird (z. B. Premium einer Person gilt für alle Mitglieder ihrer Gruppen, oder Feature gehört der Watch-Group). ADR 0003 sagt: Watch-Group ist die einzige teilbare Einheit, ein Gruppenfeature läge also nahe. Zwei Wege, noch nicht entschieden:
- (a) **Abgeleitet:** Nutzer hat Feature, wenn eigenes Flag **oder** Flag eines Mitglieds seiner Gruppe mit `shareable`-Markierung (Registry). Keine neue Tabelle, aber Sichtbarkeits-/Missbrauchsfragen (wer zahlt für wen).
- (b) **Eigene Tabelle `group_feature_flags`** (analog A, `group_id` statt `user_id`).
Vorschlag: zunächst nur Nutzerebene; Gruppenebene erst, wenn ein konkretes Feature es braucht. Das Schema von A blockiert keinen der beiden Wege.

## Datenschutz und Account-Löschung

- `user_id` → `auth.users` mit `on delete cascade`: Kontolöschung (ADR 0004, Edge Function `delete-account`, Inaktivitäts-Cleanup) entfernt alle Flag-Zeilen automatisch. `granted_by` → `on delete set null`, damit das Löschen des Vergebenden nichts blockiert (Muster der Fix-Migration `20261011110000_account_deletion_fk_fixes.sql`).
- Flags sind personenbezogene Daten (Zuordnung zu einem Konto, bei Abos Zahlungsbezug): im Datenschutztext (ADR 0011) erwähnen; Auskunft/Export enthält die eigenen Zeilen. `note` ist Freitext des Betreibers → keine sensiblen Angaben, nur interne Notiz, nie in den Client geladen (Client-`select` listet Spalten explizit ohne `note`; alternativ Spaltenprivileg).
- Bei künftigen Abos: Store-Kaufdaten verbleiben beim Store/Webhook-Dienst; Löschung des Kontos entzieht dort nicht automatisch das Abo (Hinweis im Löschdialog, eigenes ADR).
- Andere Nutzer können fremde Flags nie lesen (RLS), anders als Anzeigenamen.

## Tests

TDD nach ADR 0008:
- **RLS-Test** (Muster `supabase/tests/user_movie_ratings.sql` + `__tests__/supabase/*Migrations.test.ts`): Nutzer A liest eigene Zeilen; A sieht keine Zeilen von B; `insert`/`update`/`delete` als `authenticated` schlagen fehl (auch Selbstvergabe `premium`); `service_role` darf; `unique (user_id, flag)` greift; Konto-Löschung cascadet; `has_feature` für aktiv / `enabled = false` / abgelaufen / zukünftiger Ablauf / fehlend.
- **Unit:** `resolveFlags` (Defaults, `enabled`, Ablauf, unbekannte Flags ignoriert, Grenzfall `expires_at == now`).
- **Hook-Tests:** `useFeatureFlags`/`useFeature` (Default ohne Daten, Cache-Wert vor Netz, Fehler → letzter Stand statt Sperre, Invalidierung bei Realtime-Event, `await render`/`fireEvent` laut RNTL-Hinweis), `<FeatureGate>` rendert Children/Fallback, kein Flackern (kein Zwischenzustand "undefined").
- **Edge-Function-Test:** Aufruf ohne Flag → `403 feature_not_enabled`, mit Flag → ok.
- **Maestro:** erst, wenn ein echtes gegatetes Feature existiert (Flow setzt/entzieht das Flag per Service-Role-Skript und stellt den Teststand wieder her).

## Phasenplan

0. **ADR bestätigen**, offene Fragen klären (kein Code).
1. **Schema:** Migration additiv (Tabelle, Index, RLS, Grants, `updated_at`-Trigger, Publication, `has_feature`) + RLS-Tests. Auf DEV deployen (Standing Approval für additive Migrationen); PROD gesondert.
2. **Client-Kern:** `featureFlags.ts` (Registry, `resolveFlags`), `queryKeys.featureFlags`, `useFeatureFlags`/`useFeature`, `<FeatureGate>`, Realtime-/Fokus-Refetch, Tests. Noch keine sichtbaren Gates (Registry mit `premium` als Platzhalter).
3. **Erstes echtes Gate** bei einem konkreten Premium-Feature (Feature noch zu definieren) inkl. serverseitiger Prüfung, Maestro-Flow, Doku `docs/maestro-coverage.md`.
4. **Admin-Komfort:** SQL-Snippets in `docs/` ablegen; später Admin-Backend (ADR 0012).
5. **Abos:** eigenes ADR (Store-Anbieter, Webhook, Preis/Plan-Mapping auf Flags), Edge Function schreibt `source = 'subscription'`.

## Offene Fragen an den User (max. 6)

1. **Option A bestätigen?** (Tabelle `user_feature_flags` mit Ablauf/Quelle; B und C verworfen wie oben.)
2. **Wer ist "Admin"?** Nur Robin per SQL/Dashboard (wie vorgeschlagen), oder soll es später einen Admin-Screen/ein Web-Tool geben und wann (ADR 0012 sagt: außerhalb der App)?
3. **Gruppenebene:** Soll "Familie/Gruppe bekommt Feature" von Anfang an möglich sein (Weg a oder b) oder zunächst nur Nutzerebene?
4. **Welche Features sollen hinter `premium` oder anderen Flags liegen?** Erstes konkretes Gate festlegen (bestimmt auch, ob serverseitige Durchsetzung in Phase 3 nötig ist). Reicht ein einziges Flag `premium`, oder mehrere feingranulare?
5. **Default-Verhalten ohne Cache/Netz:** Premium-Features zu (Vorschlag) oder offen? Und: Soll ein Nutzer sehen, dass er ein Flag hat/hatte (z. B. "Premium bis 12.12." in den Einstellungen) — dann wäre `expires_at` und `source` im Client sichtbar.
6. **Abos:** Ist In-App-Kauf überhaupt für v1 geplant, oder zunächst nur manuelle Freischaltung? (Entscheidet, ob Phase 5 und `source = 'subscription'` jetzt im Schema stehen müssen — Vorschlag: ja, kostet nichts.)

## Kurzempfehlung

Option A bauen, aber nur Phasen 1 und 2 (Schema, RLS, Client-Kern) vorbereiten; kein sichtbares Gate, bevor ein konkretes Premium-Feature feststeht. Vergabe vorerst per SQL im Dashboard. Serverseitige Prüfung (`has_feature`) von Anfang an mitbauen, damit spätere kostenverursachende Features nicht nur clientseitig gesperrt sind.
