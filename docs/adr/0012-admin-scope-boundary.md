# 0012 — Admin-/Entwickler-Funktionen: Scope-Grenze

**Status:** Entschieden (2026-09-19)

## Kontext

Die alte App hat einen versteckten "Admin-Modus" (`window.IS_ADMIN_SESSION`, separates `fk_admin`-Cookie): einen TMDB-Bulk-Refresh-Button, einen Test-Push-Button und weitere admin-only UI-Elemente in den Settings. Für den Rewrite musste entschieden werden, ob und in welcher Form dieses Konzept übernommen wird.

## Entscheidung

**Der alte "Admin-Modus" wird vollständig aus der Mobile-App entfernt** — auch nicht in reduzierter Form (die zunächztsweise erwogene Idee, wenigstens einen manuellen "TMDB-Refresh erzwingen"-Button zu behalten, wurde ebenfalls explizit verworfen).

Stattdessen werden **alle Entwickler-/Betreiber-Fähigkeiten** (gruppen-/nutzerübergreifende Übersicht, erzwungener Daten-Refresh, Löschungen, systemweites Einstellungsmanagement) in ein **separates, künftiges, außerhalb dieses Scopes liegendes Admin-Backend** verlagert — ein eigenständiges Web-Tool, das direkt mit Supabase spricht, ausschließlich für Robin als Entwickler. Dieses Admin-Backend ist **nicht Teil des Mobile-App-Rewrites**.

Die Mobile-App selbst bleibt rein endnutzer-orientiert. Die Owner/Member-Rollen pro Watch-Group (siehe ADR 0003) sind davon unberührt und unverändert gültig — das ist ein separates Konzept.

## Begründung

- Ein versteckter Admin-Modus innerhalb der Endnutzer-App ist ein architektonischer Kompromiss, der in einer echten, potenziell fremdgenutzten Multi-Tenant-App (Marketing-Ambition, siehe ADR 0002/0003) nicht mehr angemessen ist — er vermischt Endnutzer-Oberfläche mit Betreiber-Werkzeugen und wäre ein Risiko, sobald die App an fremde Familien/Gruppen geht.
- Der alte TMDB-Bulk-Refresh entfällt ohnehin strukturell durch das neue Cache-Aside-Pattern mit TTL (siehe ADR 0005) — es gibt für Endnutzer keinen legitimen Bedarf mehr, einen manuellen Massen-Refresh auszulösen, da die Daten durch die TTL-Logik ohnehin zuverlässig aktuell bleiben.
- Ein separates Admin-Backend erlaubt, Betreiber-Werkzeuge unabhängig von App-Store-Reviews/-Releases weiterzuentwickeln und sauber von der Endnutzer-Oberfläche zu trennen.

## Konsequenzen

- In der Mobile-App gibt es keinerlei admin-only UI-Zweig, kein Admin-Cookie/-Flag-Äquivalent, keinen TMDB-Bulk-Refresh-Button, keinen Test-Push-Button.
- Der Test-Push-Bedarf für Entwicklungszwecke (z. B. Push-Flow verifizieren) muss über andere Mittel abgedeckt werden (z. B. direkter Edge-Function-Aufruf/Supabase-Dashboard, Dev-Tooling außerhalb der App) — nicht über einen In-App-Button.
- Das künftige Admin-Backend ist explizit **out of scope** für dieses Rewrite-Projekt und wird nicht in den Meilensteinen dieses Repos geplant (siehe `docs/planning-report.html` für die aktuelle Meilenstein-Roadmap M0–M12, die dieses Admin-Backend entsprechend nicht enthält).
- Sollte während der Implementierung doch ein Bedarf für eine admin-nahe Funktion innerhalb der Mobile-App aufkommen, ist das ein Abweichen von dieser ADR und muss Robin explizit erneut vorgelegt werden (Zero-autonome-Entscheidungen-Regel).
