# 0002 — Supabase als Backend (Ablösung von PHP/MySQL/IONOS)

**Status:** Entschieden (2026-09-19)

## Kontext

Die aktuelle App läuft auf einem selbstgebauten PHP-Backend (`api.php`, `auth.php`, `db.php` etc.) mit MySQL auf IONOS-Shared-Hosting. Für den Rewrite musste entschieden werden, ob dieses Backend weiterverwendet, ersetzt oder durch einen Backend-as-a-Service (BaaS) abgelöst wird — insbesondere im Hinblick auf echte Nutzer-Accounts (statt geteiltem Projekt-Passwort), Realtime-Fähigkeiten und die künftige Multi-Tenant-Ambition.

## Entscheidung

Migration von PHP/MySQL/IONOS zu **Supabase** (Postgres + Auth + Realtime + Edge Functions + pg_cron) — gewählt gegenüber Firebase.

Zwei Supabase-Projekte wurden bereits angelegt (Region Frankfurt/eu-central-1):
- `filmkritiker-dev` (aktive Entwicklung) — Project URL: `https://vketnadfeyovguikpaao.supabase.co`, Publishable Key: `sb_publishable_KFJgGHttxOlTEGMXrV6aYw_C8CdlO39` (unkritisch, Publishable/Anon-Tier-Key, kein Secret).
- `filmkritiker-prod` (reserviert, bleibt leer bis zur eigentlichen Datenmigration).

Beide Projekte konfiguriert mit: Data API ON, "Automatically expose new tables" OFF, "Enable automatic RLS" ON (secure-by-default — wichtig, da perspektivisch Daten anderer Tenants dort liegen könnten).

Secret-/Service-Role-Keys und DB-Passwörter werden Claude bewusst nicht mitgeteilt — die bleiben bei Robin im Passwort-Manager bzw. später in EAS-/Supabase-eigenen Secret-Stores (siehe ADR 0009).

**Hinweis (Repo-/Projekt-Umbenennung):** Die Supabase-Projekte hießen zum Zeitpunkt dieser Entscheidung noch `filmkritiker-dev`/`filmkritiker-prod`. Nach der späteren Umbenennung des gesamten Projekts auf die Marke "WatchCrew" (siehe ADR 0010) sollen auch diese Supabase-Projekte sowie das Sentry-Projekt von Robin selbst passend zu `watchcrew-dev`/`watchcrew-prod` umbenannt werden — das ist zum Zeitpunkt dieses Dokuments noch nicht bestätigt durchgeführt.

## Begründung

- **Postgres statt Firestore/NoSQL:** Das bestehende Datenmodell ist vollständig relational (Joins, personenbezogene Bewertungen pro Mitglied, Gruppenmitgliedschaften) — das passt zu Postgres, nicht zum Dokumentmodell von Firestore. Das war der Hauptgrund gegen Firebase.
- **Echtes Auth + Row Level Security:** Supabase liefert individuelle Nutzer-Accounts (statt des alten geteilten Projekt-Passworts, siehe ADR 0004) sowie RLS out-of-the-box — wichtig für die künftige Multi-Tenant-Ambition, wo Datenisolierung zwischen fremden Gruppen zwingend ist.
- **Realtime:** Reaktion auf DB-Änderungen (z. B. neue Bewertung eines anderen Mitglieds live im UI) ist mit Supabase Realtime direkt abgedeckt (siehe ADR 0006).
- **Kein eigener Server nötig:** Das resultierende Zielbild hat **keinen traditionellen Always-on-Server mehr** — Supabase (Postgres + Auth + Realtime + Edge Functions + pg_cron) deckt alles Serverseitige ab, Sentry dient nur der Crash-Berichterstattung.
- **Push-Notifications:** Laufen über Supabase DB-Webhook/Trigger → Edge Function → Expo Push API — keine separate FCM/APNs-Verkabelung nötig, da die App über Expo läuft.

## Konsequenzen

- Das alte PHP/IONOS-Backend (`filmkritiker`-Repo) bleibt **vollständig unangetastet und parallel live** als Backend der alten App, bis die neue App vollständig verifiziert ist (siehe ADR 0013 zur Migration).
- Die Migration der Produktionsdaten aus der aktuellen IONOS-MySQL-DB muss **rein lesend (Read-only-Export)** erfolgen — niemals ein Schreib-/Lösch-Zugriff gegen die Live-DB (identische harte Regel wie im alten Projekt, siehe `filmkritiker`-CLAUDE.md).
- Die TMDB/Streaming-Daten-Caching-Logik und der alte Cron-basierte Bulk-Refresh werden durch ein neues Cache-Aside-Pattern in einer Supabase Edge Function ersetzt (siehe ADR 0005).
- Alle produktionskritischen Secrets (Service-Role-Key, TMDB/Trakt-Keys) leben ausschließlich in Supabase Edge Function Secrets, niemals in der Mobile-App oder in EAS (siehe ADR 0009).
