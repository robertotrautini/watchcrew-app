# 0005 — TMDB/Streaming-Daten-Caching-Strategie

**Status:** Entschieden (2026-09-19)

## Kontext

Die alte App hatte einen Cron-basierten Bulk-Refresh (`cron-releases.php`) plus rein clientseitiges In-Memory-Caching ohne echte TTL für TMDB-Daten. Das war die tatsächliche Ursache eines bekannten Bugs: Streaming-Verfügbarkeitsdaten aktualisierten sich nicht zuverlässig, weil nur im Client-Speicher ohne Ablaufzeit gecacht wurde. Für den Rewrite musste eine neue, serverseitige Caching-Strategie für TMDB/Trakt-Daten (inkl. Streaming-Verfügbarkeit) entschieden werden, die dieses Problem strukturell behebt.

## Entscheidung

**Server-seitiges Cache-Aside-Pattern** innerhalb der TMDB/Trakt-Proxy Edge Function (ersetzt den alten Cron-basierten Bulk-Refresh):

- Bei einer Anfrage wird zunächst eine Supabase-Tabelle nach einem `last_fetched_at`-Zeitstempel geprüft.
- Innerhalb der TTL: gecachte Zeile zurückgeben (geteilt über die ganze Familie/Gruppe, nicht pro Gerät).
- Bei Ablauf: frisch von TMDB/Trakt laden, Zeile aktualisieren, frische Daten zurückgeben.

**TTL-Werte:**
- **24 Stunden** für Streaming-/Watch-Provider-Verfügbarkeit — das war die konkrete Ursache des alten "Streaming-Dienste aktualisieren sich nicht richtig"-Bugs (rein clientseitiges Caching ganz ohne TTL).
- **Statische Metadaten** (Laufzeit/Regie/Genres/Poster bereits erschienener Filme) brauchen praktisch keine echte TTL — unbegrenzt cachen, nur erneut abrufen, wenn ein Feld `null` ist (identisch zum heutigen Verhalten).

**Release-Date-Reminder-Push-Benachrichtigungen (14/7/1 Tag vorher + Tag selbst)** bleiben ein **separater, echter geplanter Job** (`pg_cron` + Edge Function) — das ist inhärent proaktiv und nicht über einen lazy Cache-Read auslösbar. Der Job wird aber deutlich schlanker als der alte Cron: er prüft nur noch anstehende Erscheinungstermine und verschickt Reminder, statt (wie früher) alles bulk-mäßig zu refreshen.

## Begründung

- Das Cache-Aside-Pattern mit expliziter TTL behebt den Bug strukturell: eine echte serverseitige Ablaufzeit statt eines unbegrenzten Client-Memory-Caches.
- 24h TTL für Streaming-Verfügbarkeit ist ein bewusster Kompromiss zwischen Aktualität (Streaming-Kataloge ändern sich nicht sekündlich) und API-Kosten/Rate-Limits gegenüber TMDB/Trakt.
- Teilen des Caches über die ganze Gruppe (statt pro Gerät) vermeidet redundante externe API-Calls, wenn mehrere Familienmitglieder denselben Film ansehen.
- Die Trennung von "lazy Cache-Refresh bei Zugriff" vs. "proaktiver geplanter Reminder-Job" ist notwendig, weil Reminder-Pushes auch ausgelöst werden müssen, wenn gerade niemand aktiv in der App ist und dadurch keinen Cache-Read triggert.

## Konsequenzen

- Es braucht eine neue Supabase-Tabelle (o. ä.) zur Ablage von `last_fetched_at` pro TMDB-Objekt/Datenart (z. B. pro Film für Metadaten, evtl. separat für Watch-Provider-Daten wegen der abweichenden TTL).
- Die TMDB/Trakt-Proxy-Logik lebt künftig in einer Supabase Edge Function statt in `tmdb.php` — die TMDB/Trakt-API-Keys werden ausschließlich in Supabase Edge Function Secrets abgelegt (siehe ADR 0009), niemals im Client.
- Der neue Reminder-Job ist funktional schmaler als der alte `cron-releases.php`-Cron (nur Release-Datum-Checks + Reminder-Versand, kein Bulk-Metadaten-Refresh mehr) — ein manueller "TMDB-Daten aktualisieren"-Button entfällt vollständig aus der App (siehe ADR 0012, Admin-Scope).
- Die konkreten TMDB/Trakt-Sonderlogiken der alten `tmdb.php` (DE+EN-Merge bei der Suche, deutsche Release-Date-Priorität Kino/Digital/TV, Genre-Mapping) sind funktional beizubehalten — siehe `docs/feature-inventory.md` Abschnitt 3 für die vollständige Verhaltens-Spezifikation, die in die neue Edge Function übernommen werden muss.
