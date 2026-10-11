# Analyse des Legacy-DB-Dumps und Migrationsplan (Stand 2026-10-10)

Nur lesende Analyse. Keine DB-Verbindung, kein Import. Keine Secrets/PII in diesem Dokument
(nur Zählungen, Spaltennamen, Vornamen der Mitglieder, einzelne Filmtitel).

## 1. Fundort

- Datei: `/home/robin/programming/dbs15494983.sql`, 212 741 Bytes, 2018 Zeilen, mtime 2026-10-10 12:37.
- Liegt in `/home/robin/programming` direkt, das ist KEIN Git-Repo (`git rev-parse` schlägt fehl).
  Nicht in `watchcrew-app` und nicht im `filmkritiker`-Repo getrackt. Einziger Kandidat (keine weiteren Dumps gefunden;
  `/home/robin/legacy-export` existiert nicht). Empfehlung: Datei nie ins Repo kopieren; in `watchcrew-app/.gitignore`
  steht kein `*.sql`-Muster, also vorsorglich ergänzen, falls je ein Dump dort landet.

## 2. Dump-Kopf

- phpMyAdmin 4.9.11 SQL Dump (kein mysqldump-CLI), Server MySQL 8.0.36, PHP 7.4.33, erstellt 10. Okt 2026 10:37 (Serverzeit).
- Charset `utf8mb4` / `utf8mb4_general_ci`, `SET NAMES utf8mb4`. Kein Mojibake gefunden (0 Treffer auf typische `Ã..`/`â€`-Muster).
  Koreanische/chinesische/ungarische Titel sind korrekt UTF-8.
- `SET time_zone = "+00:00"`: alle TIMESTAMP-Werte sind UTC. DATE-Spalten haben keine Zeitzone.
- `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"`, `AUTOCOMMIT=0`, in einer Transaktion.
- Enthält CREATE TABLE, Indizes, FK-Constraints, AUTO_INCREMENT und einen View (`v_watchlist`). Daten als
  erweiterte INSERTs MIT Spaltenliste (complete-insert), 14 INSERT-Statements (movies in 3 Blöcken).
- Zeilen per Parser gezählt (alle Tupel haben korrekte Spaltenzahl); Gegenprobe über `AUTO_INCREMENT`
  (watchlist 257 -> 208 Zeilen, es wurde also gelöscht; members 7 -> 6; push 67 -> 2; genres 3586 -> 18).

## 3. Tabellen und Zeilenzahlen

| Tabelle | Zeilen | Hinweis |
|---|---|---|
| members | 6 | Robin, Tobias, Dad, Bebbo, Bini, Ann Katrin |
| groups | 4 | Alle Drei, Robin & Tobias, Bebbo & Bini, Alle |
| group_members | 8 | Alle Drei = Robin/Tobias/Dad; Robin & Tobias = Robin/Tobias; Bebbo & Bini = Bebbo/Bini; Alle = Ann Katrin |
| projects | 3 | Trautmann, Guberacs, Ann Katrin (Passwort-Hashes im Dump, werden NICHT migriert) |
| project_groups | 4 | Trautmann -> Alle Drei + Robin & Tobias; Guberacs -> Bebbo & Bini; Ann Katrin -> Alle |
| movies | 243 | 217 verschiedene tmdb_id |
| genres | 18 | lokale ids (nicht TMDB-ids) |
| movie_genres | 558 | |
| watchlist | 208 | Alle Drei 96, Robin & Tobias 108, Bebbo & Bini 2, Alle 2 |
| watchlist_ratings | 510 | pro Watchlist-Eintrag eine Zeile je Gruppenmitglied |
| rotation | 4 | Zeiger pro Gruppe (current_index 0/1), kein Gegenstück im neuen Schema |
| push_subscriptions | 2 | nicht migrieren (Web-Push-Endpoints) |
| v_watchlist | View | nicht migrieren |

Alte Tabellen `watched` / `watched_ratings` sind NICHT mehr im Dump (Single-Table-Migration lief schon).
Keine News-/Feature-Flag-/Audit-Tabellen.

## 4. Datenqualität

- Orphans / FK-Verletzungen: keine (watchlist->movies/groups, ratings->watchlist/members, movie_genres->movies/genres alles sauber;
  paid_by und Bewerter sind immer Mitglied der jeweiligen Gruppe; keine doppelten (movie,group)).
- Filme ohne tmdb_id: 0. Placeholder-Datum 2020-01-01: 0. `tmdb_id=0`: 0. Keine Filmliste zum Entscheiden nötig.
- tmdb_id-Duplikate: 17 tmdb_ids kommen in mehreren `movies`-Zeilen vor (max. 7x). Neues Schema hat `movies.tmdb_id UNIQUE`,
  also muss auf eine Zeile pro tmdb_id zusammengeführt werden. Nur 3 Filme (Drive my Car, The Place Beyond the Pines, Primetime)
  stehen in zwei Gruppen (Alle Drei + Robin & Tobias) auf der Watchlist; kein Konflikt in derselben Gruppe.
  Doppelte Zeilen unterscheiden sich teils inhaltlich (Laufzeit, Regie, Datum); zwei haben koreanischen/chinesischen
  Originaltitel statt deutschem/englischem (tmdb 1058424 "Hope", 1280738 "The Furious").
- 35 Film-Zeilen hängen an keiner Watchlist (z.B. "Raw" 2017 doppelt, "Smile", "The Brutalist") -> nicht importieren.
- movies: release_date NULL 45 (38 davon auf Watchlists), 8 Filme mit Datum in der Zukunft (bis 2027-03-04, plausibel),
  overview leer 56, runtime NULL 43, director/director_id NULL 30, vote_average NULL 60, poster NULL 1 (tmdb 1214049 "The Courier").
- Poster-URLs: alle absolut `https://image.tmdb.org/t/p/w154/<datei>.jpg` (187) oder `.../w342/<datei>.jpg` (55), 1 NULL.
  Neues Schema speichert nur den Pfad `/datei.jpg` (`src/lib/tmdbImage.ts` baut die URL).
- Genres: 14 Filme ohne Genre (Legacy speicherte nur die auf die 18 deutschen Namen abbildbaren Genres).
- Zeitstempel: `added_at` 2026-03-16 bis 2026-10-07, hauptsächlich 20-21 Uhr UTC (= abends lokal). Einzelne ältere Werte exakt
  22:00/23:00 UTC (= Mitternacht lokal, stammen aus der Datumsumrechnung der Single-Table-Migration).
  `paid_at` (DATE) reicht zurück bis 2024-03-23, `seen_at` bis 2022-08-23, also älter als `added_at` (Altbestand wurde nachgetragen).
- watchlist paid: 25 von 208 mit `paid_by_member_id` (Tobias 13, Robin 10, Dad 2), immer zusammen mit `paid_at`; 183 ohne.
- ratings (510 Zeilen): je Mitglied Robin 204, Tobias 204, Dad 96, Bebbo/Bini/Ann Katrin je 2.
  Rating-Verteilung: NULL 357, 2.5=5, 3.0=30, 3.5=24, 4.0=56, 4.5=14, 5.0=24 (keine 0, keine Werte ausserhalb 0-5, passt zum CHECK).
  seen_at NULL 384 (gesehen 126), rated_at NULL 415, liked=1: 35. 354 Zeilen sind komplett leer (kein Rating, kein seen_at, nicht geliked).
  Auffälligkeiten: 30 Ratings ohne seen_at, 3 seen_at ohne Rating, 16 Likes ohne seen_at, 61 Ratings ohne rated_at (31 davon mit seen_at).
  Aussagekräftige Zeilen: 156 (510 - 354).

## 5. Neues Schema (Ziel)

`watch_groups` (id uuid, name, color_theme, invite_token, invite_enabled), `watch_group_members` (group_id, user_id -> auth.users,
role owner/member, joined_at), `movies` (tmdb_id unique), `genres` (tmdb_genre_id unique), `movie_genres`, `watchlist_entries`
(group_id, movie_id, added_at, added_by NOT NULL -> auth.users, paid_by_member_id -> auth.users, paid_at timestamptz,
release_date_override), `ratings` (watchlist_entry_id, member_id -> auth.users, rating numeric(2,1) 0-5, liked, seen_at date,
rated_at timestamptz; unique je Eintrag+Mitglied). `profiles` per Trigger beim Anlegen eines auth-Users
(display_name = E-Mail-Teil vor dem @, später änderbar).

Folgen für den Import:
- Alle Mitglieder-FKs zeigen auf `auth.users`: jedes Legacy-Mitglied, das Ratings/Zahlungen/added_by hat, braucht einen Auth-Account
  (ADR 0004: E-Mail + Passwort, Bestätigung aktiv).
- Es gibt kein Projekt-Konzept (ADR 0003): Gruppe ist die einzige teilbare Einheit.
- Die Trigger `trg_watchlist_entries_notify_new_entry` und `trg_ratings_notify_first_rating` (Migration 20260920150000) würden beim
  Massen-Insert Push-Events einreihen. Beim Import deshalb Trigger deaktivieren (z.B. `ALTER TABLE ... DISABLE TRIGGER` per
  Postgres-Verbindung als Owner) oder importieren, bevor jemand Push-Tokens registriert hat. Entscheidung nötig, siehe Fragen.
- `run_release_reminders` (pg_cron) schickt Erinnerungen für Filme mit Release-Datum in 14/7/1/0 Tagen und "newly_added" für
  Einträge der letzten 14 Tage: kurz nach Import könnten alte Einträge Erinnerungen auslösen. Mit zurückdatiertem `added_at` entfällt "newly_added".
- Neue Kataloge `movies`/`genres`/`movie_genres` haben keine INSERT-RLS für `authenticated`; Import läuft mit Service-Role (umgeht RLS).

## 6. Mapping Legacy -> Neu

IDs deterministisch (UUIDv5), damit der Import wiederholbar ist (idempotent, `upsert on conflict`):
Ein fester Namespace (z.B. UUIDv5 von `watchcrew-legacy-import` unter dem DNS-Namespace, einmal festgelegt und im Skript fixiert);
Namen `group:<alte group_id>`, `entry:<alte watchlist.id>`, `rating:<watchlist.id>:<member_id>`, `movie:<tmdb_id>`, `genre:<tmdb_genre_id>`.
Auth-User-IDs werden NICHT per v5 erzeugt, sondern von Supabase vergeben (Mapping Mitglied -> user_id in einer lokalen Datei ausserhalb des Repos).

| Legacy | Neu | Transform |
|---|---|---|
| groups (4) | watch_groups | name übernehmen, `color_theme` Default `gold` (Fragen), invite_token Default |
| project_groups/projects | entfällt | nur zur Gruppenauswahl; Projekt-Passwörter verwerfen |
| group_members | watch_group_members | role=owner für Owner der Gruppe, sonst member; `joined_at` = frühester `added_at` der Gruppe oder Importzeit |
| members | auth.users + profiles | Name -> display_name; E-Mail/Passwort kommen vom Nutzer |
| movies (243) | movies | je tmdb_id eine Zeile (217); bei Duplikaten die vollständigste/neueste Zeile, Titel bevorzugt deutsch/lateinisch statt CJK; Filme ohne Watchlist-Eintrag weglassen (35) |
| movies.poster | movies.poster | Präfix `https://image.tmdb.org/t/p/w154|w342` abschneiden -> `/datei.jpg` |
| overview '' | NULL | leere Strings zu NULL |
| director_id (varchar im Parser) | integer | Cast |
| genres (18) | genres | per deutschem Namen -> tmdb_genre_id (s.u.); `name` übernehmen |
| movie_genres (558) | movie_genres | alte genre_id -> Name -> tmdb_genre_id -> neue genres.id; bei zusammengeführten Filmen Vereinigung der Genres |
| watchlist (208) | watchlist_entries | group/movie per Mapping; `added_at` UTC übernehmen; `added_by` = Gruppen-Owner (Default); `paid_by_member_id` -> user_id; `paid_at` (DATE) -> timestamptz, vorschlag 12:00 UTC am Tag, damit kein Tagesversatz in Europe/Berlin entsteht |
| watchlist_ratings (510) | ratings | nur die 156 nicht-leeren Zeilen; rating decimal(2,1) direkt, NULL bleibt NULL; `seen_at` DATE direkt; `liked` 0/1 -> boolean; `rated_at`: Original (UTC); wenn Rating vorhanden aber NULL -> Vorschlag `seen_at` 12:00 UTC, sonst NULL |
| rotation | entfällt | nicht abbildbar (kein Rotationskonzept im neuen Schema, siehe Fragen) |
| push_subscriptions | entfällt | Nutzer registrieren Expo-Push neu |

Genre-Mapping (alle 18 Namen passen exakt auf `TMDB_GENRE_MAP` in `supabase/functions/tmdb-proxy/tmdb-client.ts`, keine unpassenden):
Abenteuer 12, Action 28, Animation 16, Dokumentarfilm 99, Drama 18, Familie 10751, Fantasy 14, Historie 36, Horror 27, Komödie 35,
Kriegsfilm 10752, Krimi 80, Liebesfilm 10749, Musik 10402, Mystery 9648, Science Fiction 878, Thriller 53, Western 37.
(`TV-Film` 10770 kommt im Dump nicht vor.)

Filme ohne tmdb_id: keine (Liste leer). Fehlende Daten (45 ohne Datum, 43 ohne Laufzeit, 30 ohne Regie, 56 ohne Beschreibung,
14 ohne Genre, 1 ohne Poster) lassen sich optional über TMDB nachladen (Edge Function `upsert_movie`/Details); das ist eine Entscheidung.

Zeitzone: Dump ist UTC, daher keine Umrechnung nötig. Die IONOS-Servereinstellung betrifft nur den Export, der ausdrücklich auf +00:00 gesetzt ist.

Gruppen-Zuordnung (Vorschlag): Alle vier Gruppen werden zu einer WatchCrew-Gruppe, da sie echte Mitglieder und Daten haben bzw. zumindest Struktur.
Datenmenge: "Alle Drei" 96 + "Robin & Tobias" 108 Einträge sind der Kern. "Bebbo & Bini" (2) und "Alle" (Ann Katrin, 2 Einträge, keine Ratings)
sind fast leer.

Erwartete Zielzahlen bei Vorschlag "alle 4 Gruppen": 4 Gruppen, 8 Mitgliedschaften, 205 Filme (verschiedene tmdb_ids auf Watchlists), 208 Einträge,
156 Ratings, 6 Auth-Accounts.

## 7. Verdict

Anpassbar, keine harten Blocker. Struktur und Datenqualität sind gut (keine Orphans, keine Mojibake, alle Genres mappbar, alle Filme haben tmdb_id).
Offen sind nur Entscheidungen und Vorarbeiten: Auth-Accounts der Mitglieder, Owner/Gruppenauswahl, Behandlung der tmdb-Duplikate,
Push-Trigger beim Import, Weitergabe des Service-Role-Keys. Skript erst nach Antworten.

## 8. Fragen vor dem Import (mit Empfehlung)

1. Welche der 6 Personen (Robin, Tobias, Dad, Bebbo, Bini, Ann Katrin) bekommen einen Account, und mit welcher E-Mail? Empfehlung: Robin, Tobias, Dad sofort; die anderen nur, wenn sie WatchCrew nutzen werden (sonst deren Ratings/Gruppen auslassen).
2. Welche Gruppen übernehmen? Empfehlung: "Alle Drei" und "Robin & Tobias" (Kern, 204 Einträge); "Bebbo & Bini" und "Alle" nur, wenn diese Personen Accounts bekommen.
3. Wer ist Owner jeder Gruppe (und damit Standard-`added_by`)? Empfehlung: Robin bei beiden Kerngruppen.
4. Sollen die Gruppen als zwei getrennte Gruppen bleiben (wie im Altsystem)? Empfehlung: ja, 1:1.
5. Ziel: erst Supabase dev als Probelauf, dann prod? Empfehlung: dev zuerst, prod erst nach Kontrolle.
6. Fehlende Metadaten (Datum, Laufzeit, Regie, Beschreibung, Genre) von TMDB nachladen? Empfehlung: ja, nur für die Lücken.
7. Doppelte Film-Zeilen (17 tmdb_ids): jeweils die vollständigste/neueste Zeile nehmen, Titel nicht CJK? Empfehlung: ja.
8. 35 Filme ohne Watchlist-Eintrag weglassen? Empfehlung: ja.
9. 354 leere Rating-Zeilen weglassen (nur 156 echte)? Empfehlung: ja.
10. Rating ohne `rated_at`: Ersatz = seen_at (12:00 UTC) oder NULL? Empfehlung: seen_at, sonst NULL.
11. `paid_at` (nur Datum) -> 12:00 UTC als Zeitstempel? Empfehlung: ja.
12. Farbthema der importierten Gruppen? Empfehlung: `gold`.
13. Push-Trigger beim Import abschalten (nötig, sonst Push-Events)? Empfehlung: ja, per Datenbank-Zugang oder Import vor Push-Registrierung; Release-Reminder-Job danach prüfen.
14. Rotation (wer wählt als Nächstes) übernehmen? Empfehlung: nein, gibt es im neuen Schema nicht.
15. Anonymisierung nötig (z.B. für Dev-Test)? Empfehlung: Dev mit Echtdaten ok, aber nur mit Testadressen; Zahlungen/Namen bleiben.
16. Zeitzone IONOS-Server: Dump ist explizit UTC, nur zur Bestätigung. Empfehlung: nichts nötig.
17. Service-Role-Key: wie liefern? Empfehlung: als Umgebungsvariable nur im aktuellen Terminal (nicht in Datei, nicht im Chat), Skript mit `--dry-run` als Standard.
18. Dump-Datei bei Abschluss löschen und `*.sql` in `.gitignore` ergänzen? Empfehlung: ja.

## 9. Entscheidungen 2026-10-10 (Nutzer, final)

- **Ziel:** nur das Dev-Supabase-Projekt (`vketnadfeyovguikpaao`, aus `app.config.ts`). Das Skript lehnt jede andere URL/Ref hart ab (`scripts/legacy-import/target.js`). Prod wird nie angefasst.
- **Accounts** existieren in Dev. Legacy Robin/Tobias/Dad werden im Apply per E-Mail-Lookup auf sie abgebildet. Die Zuordnung steht NICHT im Repo, sondern in `~/legacy-export/members-map.json` (ausserhalb, Modus 600); im Repo nur `scripts/legacy-import/members-map.example.json` ohne echte Adressen. Passwörter braucht der Import nicht.
- **Raus (spaeter migriert):** Bebbo, Bini, Ann Katrin, Gruppen "Bebbo & Bini" und "Alle", Projekt "Ann Katrin". **Rein:** "Alle Drei" (Farbe gold) und "Robin & Tobias" (Farbe red) mit Mitgliedern, Watchlist und Ratings von Robin/Tobias/Dad. Owner beider Gruppen und Standard-`added_by`: Robin. Gruppen bleiben getrennt (1:1).
- **tmdb-Duplikate:** je tmdb_id eine `movies`-Zeile (vollstaendigste, dann neueste Zeile gewinnt; Tie-Break Legacy-ID). Eintraege derselben Gruppe + desselben Films werden zu einem (unique(group, movie)); Regel siehe 9.2.
- **Weglassen:** Filme ohne Eintrag auf einer importierten Watchlist; leere Rating-Zeilen. "Leer" praezise: `rating IS NULL AND liked = 0 AND seen_at IS NULL` (`rated_at` wird ignoriert; im Dump hat keine leere Zeile ein `rated_at`).
- **rated_at:** Original; fehlt es bei vorhandenem Rating -> `seen_at` 12:00 UTC; ohne `seen_at` bleibt es NULL (Schema erlaubt NULL, kein now()-Fallback). Rows ohne Rating (nur Like/seen) bekommen kein `rated_at`. `paid_at` (DATE) -> timestamptz 12:00 UTC.
- **Titelsprache:** deutscher Titel, sonst englischer, nur wenn beides fehlt der Legacy-`name`. Der Dump enthaelt weder deutschen noch englischen Titel getrennt, nur `name`; die Aufloesung braucht daher TMDB im Apply. Das Schema hat nur EINE Spalte `movies.name` (kein Per-Sprache-Titel); der Proxy schreibt dort den `de-DE`-Titel. Spaetere "App-Sprache"-Anzeige braucht eine Schema-/Proxy-Aenderung (nicht Teil dieser Aufgabe).
- **Nicht migrieren:** Rotation, Projekt-Passwoerter, Push-Subscriptions. Apply bricht ab, wenn in Dev Zeilen in `push_tokens`/`push_subscriptions` stehen (Pruefung nur im Apply).
- **Poster:** Praefix `https://image.tmdb.org/t/p/wNNN` abschneiden. Platzhalterdatum 2020-01-01 -> NULL (Guard aktiv). IDs: deterministische UUIDv5 (Namespace = UUIDv5("watchcrew-legacy-import", DNS), fest im Skript), Reruns sind Upserts.
- **`*.sql` nicht global ignorieren:** `supabase/migrations/*.sql` muss getrackt bleiben. Der Dump bleibt unveraendert ausserhalb des Repos als Reset-Quelle.

### 9.1 Dry-run-Ergebnis (Phase 1, offline, gegen den echten Dump; keine PII)

Aufruf: `node scripts/legacy-import/cli.js --dump <dump> --members-map ~/legacy-export/members-map.json` (Plan nach `~/legacy-export/plan.json`, Modus 600).

| Tabelle | Legacy | geplant | uebersprungen |
|---|---|---|---|
| profiles (display_name-Update) | 6 | 3 | 3 Mitglieder nicht migriert |
| watch_groups | 4 | 2 | 2 Gruppen nicht migriert |
| watch_group_members | 8 | 5 | 3 |
| movies | 243 | 201 | 3 Duplikat-Zeilen zusammengefuehrt, 35 auf keiner Watchlist, 4 nur auf ausgeschlossenen Gruppen |
| genres | 18 | 18 | 0 |
| movie_genres | 558 | 484 | 69 Film nicht geplant, 5 Duplikat nach Merge |
| watchlist_entries | 208 | 204 (96 + 108) | 4 ausgeschlossene Gruppen, 0 Kollisionen |
| ratings | 510 | 154 | 350 leer, 6 Mitglied/Gruppe ausgeschlossen |

- **Zusammengefuehrte Eintraege (gleiche Gruppe + tmdb_id): 0**, Konflikte: 0. Die 17 tmdb-Duplikate betreffen fast nur ungenutzte Film-Zeilen; geplant werden 3 Duplikat-Zeilen gemerged (Drive My Car, The Place Beyond the Pines, Primetime: je ein Film, in zwei Gruppen je ein Eintrag).
- **rated_at:** 29 Ratings aus `seen_at` 12:00 UTC abgeleitet, 30 Ratings ohne `seen_at` bleiben `rated_at = NULL`.
- **Luecken in den 201 geplanten Filmen (aus TMDB zu fuellen):** release_date 37, runtime 14, director 3, director_id 3, overview 35, vote_average 37, poster 0, ohne Genre 2. Titel: 0 CJK-Legacy-Namen unter den geplanten Filmen.
- **Schema-Validierung:** 0 Fehler, 0 Warnungen (NOT NULL, unique, FKs, Enums, Rating 0-5 in 0,5-Schritten, Typen).
- **Hinweis Zahlen:** Die 354 leeren Rating-Zeilen der Analyse waren inkl. 4 Zeilen ausgeschlossener Mitglieder; im Import-Umfang sind es 350. 154 statt 156 Ratings, weil 2 echte Ratings ausgeschlossenen Mitgliedern gehoeren.

### 9.2 Regeln fuer zusammengefuehrte Eintraege (Vorschlag, bisher ohne Treffer)

Ueberlebender Eintrag = aeltester `added_at`. Zahlung: erster Eintrag mit Zahlung, Konflikt melden, wenn mehrere unterschiedliche. Ratings je Mitglied: Zeile mit Rating bevorzugt, dann neuestes `seen_at`/`rated_at`; `liked` = ODER; Konflikt melden bei unterschiedlichem Rating/seen_at.

### 9.3 Apply-Entwurf (nicht implementiert)

- Dev-Daten koennen bereits `movies`/`genres` mit zufaelligen UUIDs enthalten (z. B. Maestro-Film The Matrix, tmdb 603): Apply muss bestehende Zeilen ueber `tmdb_id` / `tmdb_genre_id` aufloesen und deren IDs verwenden statt der v5-IDs. Mit dem Reset (9.4) entfaellt das Problem.
- Trigger `trg_watchlist_entries_notify_new_entry` / `trg_ratings_notify_first_rating` reihen Push-Events ein: kein Problem, solange keine Tokens/Subscriptions existieren (wird vorab geprueft).
- Luecken fuellen: `upsert_movie` legt nur NEUE Filme an und kehrt bei vorhandenem Film sofort zurueck (kein Update). Gaps bei vorhandenen Legacy-Zeilen lassen sich damit nicht fuellen. Optionen (Frage an den Nutzer): (a) Aktionen `details`/`credits` des Proxys lesen und Luecken per Service-Role-Update selbst schreiben; (b) Proxy um eine Update-Aktion erweitern (Codeaenderung). Titel: `details` nutzt nur `de-DE`; TMDB liefert dort bei fehlender Uebersetzung den Originaltitel, ein englischer Fallback braucht einen zweiten `en-US`-Aufruf (Proxy-Aenderung oder direkter Aufruf mit eigenem Key, der nur in Edge-Secrets liegt).
- **Proxy-Auth:** `tmdb-proxy/index.ts` prueft selbst nichts; es gibt keinen `[functions.tmdb-proxy]`-Eintrag in `supabase/config.toml`, also gilt der Supabase-Default `verify_jwt = true`: ein gueltiges JWT (User-Session) genuegt, innen laeuft alles mit dem Service-Role-Client (aus `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` der Function-Umgebung). Der TMDB-Key (`TMDB_API_KEY`) liegt nur in den Edge-Function-Secrets (ADR 0009), also nur ueber den Proxy nutzbar.

### 9.4 Entwurf: `reset-dev-data` (Zusatzentscheidung 2026-10-10, NICHT ausgefuehrt)

Nutzer: in Dev duerfen alle Fachdaten geloescht werden, nur Nutzer (`auth.users`, `profiles`) bleiben. Nur Dev, nie Prod.

**Betroffene Tabellen (aus den Migrationen):** `watch_groups`, `watch_group_members`, `movies`, `genres`, `movie_genres`, `watchlist_entries`, `ratings`, `release_reminder_log` (FK auf watchlist_entries, cascade), `movie_metadata_cache`, `streaming_availability_cache` (reine Caches, ohne FK; Loeschen unkritisch, sie fuellen sich neu; optional).
**Bewusst NICHT geloescht:** `auth.*`, `profiles` (inkl. `inactivity_warning_sent_at`), `push_tokens`, `push_subscriptions` (cascade auf `watch_groups`; werden vom Apply ohnehin als Abbruchgrund geprueft, deshalb vorher leer/leeren lassen), `email_notification_log`.
**Reihenfolge (FK-sicher, gezielte DELETEs statt TRUNCATE, innerhalb einer Transaktion, mit Service-Role/Postgres-Verbindung):**
1. `ratings`, 2. `release_reminder_log`, 3. `watchlist_entries`, 4. `movie_genres`, 5. `watch_group_members`, 6. `watch_groups` (cascade auf Rest wie `push_subscriptions`), 7. `movies`, 8. `genres`, 9. optional die zwei Cache-Tabellen.
Begruendung gegen `TRUNCATE ... CASCADE`: kaskadiert ungezielt in jede Tabelle mit FK (z. B. `push_subscriptions`, spaetere Tabellen) und umgeht Zeilen-Trigger; gezielte DELETEs sind explizit und die Reihenfolge ist pruefbar. Beim Loeschen von `watch_group_members` feuert `trg_watch_group_members_owner_succession` (harmlos, Gruppe wird danach geloescht); `empty_group_hard_delete` ist ein eigener Mechanismus.
**Sicherheitsgelaender:** (1) `assertDevTarget` (Ref-Check) vor jeder Verbindung; (2) Pflicht-Flag `--reset-confirm=vketnadfeyovguikpaao`, sonst kein Reset; (3) Zeilenzahlen aller betroffenen Tabellen vor und nach dem Reset ausgeben, Abbruch ohne Loeschen, wenn `push_tokens`/`push_subscriptions` Zeilen haben; (4) Reset nur, wenn im selben Lauf der Probelauf (Validierung: 0 Fehler) erfolgreich war und `plan.json` frisch erzeugt wurde; (5) alles in einer Transaktion (Rollback bei Fehler); (6) Reset-Umfang explizit auflisten und bestaetigen lassen.
**Auswirkung auf die Maestro-Testdaten (Frage an den Nutzer, nicht entschieden):** Ein Reset loescht auch die "Maestro Test Gruppe" samt Daten (Tagebuch: Inception + The Dark Knight bewertet; Watchlist: Hokum, evtl. Interstellar; Tracker-Eintraege). Danach brechen: `tracker-payment` (Inception), `movie-collection` (tippt "The Dark Knight"), `add-movie-modes`/`movie-detail`/`watchlist-open-detail`/`watchlist-filter-sort`/`rating-cycle`/`watchlist-add-remove`/`theme-tour` (brauchen die Gruppe bzw. Seed-Filme), `group-settings-edit` und `theme-tour` (erwarten "Maestro Test Gruppe"), `onboarding-explore` (Gruppe nicht mehr vorhanden -> anderer Pfad). Der Maestro-Account (Auth-User) bleibt erhalten, aber ohne Gruppe. Vorschlaege: (a) Reset schliesst die Maestro-Gruppe (und deren Filme/Eintraege/Ratings) per Allowlist aus; (b) Reset komplett, danach `create-test-group` und Seed-Filme wieder anlegen; (c) Maestro-Gruppe vorher exportieren und danach zurueckschreiben. Bei (a) muessen Filme der Maestro-Gruppe im Reset erhalten bleiben (tmdb-Konflikte beim Import pruefen, z. B. Inception/Matrix, wenn auch im Legacy-Bestand).

### 9.5 Phase 2: Apply (implementiert, NICHT ausgefuehrt; Stand 2026-10-10)

**Umgesetzt** in `scripts/legacy-import/` (`apply.js`, `importer.js`, `reset.js`, `gapFill.js`, `verify.js`, `restClient.js`, `memoryBackend.js`, `serviceKey.js`, `retry.js`, `filters.js`), Tests in `__tests__/scripts/legacyImport/` (Fakes fuer DB/Auth/Proxy, kein Netzwerk).

**Ablauf von `--apply`** (alles im selben Lauf: Plan wird neu aus dem Dump gebaut und validiert, 0 Fehler Pflicht):
1. Preflight: Ref-Guard (nur `vketnadfeyovguikpaao`), Service-Key laden, Zugriffsprobe (`count`) auf alle beteiligten Tabellen, `push_tokens`/`push_subscriptions` muessen leer sein (sonst Abbruch ohne Schreiben), die drei Auth-User per E-Mail ueber die Auth-Admin-API aufloesen (Fehlermeldungen nennen nur "Robin/Tobias/Dad", nie E-Mails), `profiles`-Zeilen muessen existieren.
2. `profiles.display_name` -> `Robin` / `Tobias` / `Dad` (aus dem Plan).
3. Optional `--reset-dev-data --reset-confirm=vketnadfeyovguikpaao` (siehe unten).
4. Bestehende `movies`/`genres` mit gleicher `tmdb_id`/`tmdb_genre_id`, aber anderer UUID (z. B. Maestro-Filme), werden unveraendert wiederverwendet (IDs im Plan umgeschrieben; deren `movie_genres` werden nicht angefasst).
5. Upserts in FK-Reihenfolge, Batches a 100, 3 Retries mit Backoff bei 429/5xx/Netzwerk: `watch_groups` (nur id/name/color_theme; Invite-Felder = Schema-Default), `watch_group_members` (`joined_at` = frueuester `added_at` der Gruppe), `movies` und `genres` und `movie_genres` (insert-only, `ignore-duplicates`: ein Rerun ueberschreibt nie vom Proxy gefuellte Titel/Daten), `watchlist_entries` (`added_by` = Robin), `ratings`. Fehlermeldungen: Tabelle, Batch-Nr., HTTP-Status, Postgres-Code; Zeilendaten und E-Mails werden nie ausgegeben.
6. Metadaten/Titel: Action `refresh_movie` des `tmdb-proxy` (Vertrag: `docs/tmdb-proxy-refresh-contract.md`, nur Service-Role, `fillGapsOnly: true`) fuer **alle** importierten Filme (201), weil die Titelregel Deutsch -> Englisch -> Legacy-Name serverseitig in genau dieser Action steckt; nur Filme mit Luecken (Dry-run: 37/35/37/14/3/2 je Feld, 58 Filme gesamt): `--refresh-scope gaps`. Concurrency 2, Retry mit Backoff, 404 (`tmdb_not_found`) wird nicht wiederholt. Fortschritt in `~/legacy-export/gapfill-progress.json` (nur tmdb-IDs, Modus 600): derselbe Befehl nochmal ueberspringt fertige Filme.
7. Verifikation: Zeilen pro Tabelle in der DB gegen den Plan, Stichproben (ein Rating-Wert, eine Zahlung, ein Titel), ohne personenbezogene Daten.

**Exit-Codes:** 0 ok, 1 Verifikation weicht ab / Fehler, 3 nur einzelne Proxy-Aufrufe endgueltig fehlgeschlagen (erneut starten, setzt fort).

**`--dry-run` (Standard)** fuehrt exakt diesen Code mit In-Memory-Fakes aus (DB mit PK/Unique/FK/Cascade-Nachbildung, Fake-Auth, Fake-Proxy): zeigt Reihenfolge, Zaehler und Verifikation, sendet nichts. Mit dem echten Dump: 2 Gruppen, 5 Mitglieder, 201 Filme, 18 Genres, 484 movie_genres, 204 Eintraege, 154 Ratings, alles "OK".

**Reset (`reset.js`)** per PostgREST (kein Multi-Statement-Transaction moeglich): gezielte DELETEs in FK-Reihenfolge `ratings` -> `watchlist_entries` -> `movie_genres` -> `watch_group_members` -> `watch_groups` -> `movies` -> `genres` (`release_reminder_log` faellt per Cascade mit; Caches, `auth.*`, `profiles`, Push-Tabellen bleiben). **Nicht atomar, aber wiederholbar** (berechnet jedes Mal "alles ausser Allowlist"). Allowlist (Entscheidung 2026-10-10): Gruppe mit dem Namen `Maestro Test Gruppe` (ID wird zur Laufzeit aufgeloest) samt Mitgliedern, Eintraegen, Ratings und den davon referenzierten `movies`/`genres`/`movie_genres`. Zeilenzahlen vorher/nachher werden ausgegeben; nach dem Loeschen wird geprueft, dass genau die Allowlist uebrig ist. Abbruch ohne Loeschen, wenn die Allowlist > 150 Zeilen pro Typ hat (Schutz der URL-Filter).

**Blocker/Vorschlag (NICHT entschieden, braucht Nutzerentscheidung): fehlende `service_role`-Rechte.** Migration `20260930090000` hat `service_role` nur auf `movies`, `genres`, `movie_genres`, Caches (volle CRUD) und `profiles`/`push_tokens` (nur SELECT) gegeben. Es fehlen: `SELECT/INSERT/UPDATE/DELETE` auf `watch_groups`, `watch_group_members`, `watchlist_entries`, `ratings`; `UPDATE` auf `profiles`; `SELECT` auf `push_subscriptions`. `BYPASSRLS` ersetzt keine GRANTs, der Import (und der Reset) scheitert sonst mit `42501`. Der Preflight erkennt das (Zugriffsprobe) und verweist auf diesen Abschnitt. Optionen:
- (A) Befristet, empfohlen: GRANTs im Supabase SQL Editor (Rolle `postgres`) setzen, importieren, danach per REVOKE entfernen. Kein Eintrag in `supabase/migrations/`, kein dauerhaftes Recht.
- (B) Dauerhafte additive Migration (dieselben GRANTs) - konsistent mit dem Zweck von `20260930090000`, aber bleibende Schreibrechte fuer `service_role` auf Nutzerdaten.
- (C) Import ueber eine direkte Postgres-Verbindung statt REST (braucht DB-Passwort, neue Abhaengigkeit `pg`; nicht gewaehlt).

```sql
-- Vorschlag, NICHT ausgefuehrt. Option A: im SQL Editor des Dev-Projekts vor dem Import
grant insert, update, delete, select on public.watch_groups, public.watch_group_members, public.watchlist_entries, public.ratings to service_role;
grant update on public.profiles to service_role;
grant select on public.push_subscriptions to service_role;
-- nach dem Import wieder entziehen:
revoke insert, update, delete, select on public.watch_groups, public.watch_group_members, public.watchlist_entries, public.ratings from service_role;
revoke update on public.profiles from service_role;
revoke select on public.push_subscriptions from service_role;
```
Optionale atomare Reset-Alternative (SQL Editor, ersetzt `--reset-dev-data`; ebenfalls nur Vorschlag): eine Transaktion mit denselben DELETEs, `where` jeweils `not in (select ...)` der Maestro-Allowlist; Vorteil: alles-oder-nichts. Nicht implementiert, weil der REST-Reset wiederholbar ist.

### 9.6 Befehle (Apply-Anleitung)

1. Grants setzen (siehe 9.5, Option A) - Entscheidung des Nutzers.
2. Service-Key einmalig in eine private Datei legen (eigenes Terminal; der Key erscheint weder auf dem Bildschirm noch in der History):
   ```bash
   umask 077
   read -rs -p "Dev service-role key: " K; printf '%s' "$K" > ~/legacy-export/service-key; unset K; echo
   chmod 600 ~/legacy-export/service-key
   ```
   Alternativ pro Terminal-Sitzung: `read -rs SUPABASE_SERVICE_ROLE_KEY; export SUPABASE_SERVICE_ROLE_KEY`. Der Key wird nie als CLI-Wert akzeptiert.
3. Probelauf (Standard, offline): `node scripts/legacy-import/cli.js --dump /home/robin/programming/dbs15494983.sql --members-map ~/legacy-export/members-map.json`
4. Echter Lauf (Reset + Import):
   ```bash
   node scripts/legacy-import/cli.js --apply --reset-dev-data --reset-confirm=vketnadfeyovguikpaao \
     --service-key-file ~/legacy-export/service-key \
     --dump /home/robin/programming/dbs15494983.sql --members-map ~/legacy-export/members-map.json
   ```
   Ohne Reset: `--reset-dev-data --reset-confirm=...` weglassen (reiner idempotenter Upsert). Bei Exit-Code 3 denselben Befehl wiederholen.
5. Aufraeumen: `shred -u ~/legacy-export/service-key`; Grants wieder entziehen (9.5).

**Rollback / neu aufsetzen:** Der Dump bleibt unveraendert ausserhalb des Repos. Rollback = `--apply --reset-dev-data --reset-confirm=...` (loescht alle Fachdaten ausser der Maestro-Allowlist) und danach erneuter Import, oder nur Reset. Nicht rueckgaengig gemacht werden `profiles.display_name` (vorher: E-Mail-Praefix bzw. frueher gesetzter Name; ueber die App-Einstellungen aenderbar). Filme, die der Proxy beim Import aktualisiert hat, bleiben aktualisiert (gewollt).

