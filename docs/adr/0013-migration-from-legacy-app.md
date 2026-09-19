# 0013 — Migration von der Legacy-App (High-Level)

**Status:** Entschieden auf High-Level; Details folgen in einer späteren Phase (2026-09-19)

## Kontext

WatchCrew ersetzt langfristig die bestehende PWA "Filmkritiker Trautmanns" (PHP/MySQL auf IONOS) für die Familie Trautmann. Die eigentlichen Migrationsdetails (Datenmapping, Cutover-Mechanik, Rollback-Plan) sind zum jetzigen Planungszeitpunkt noch nicht final ausgearbeitet — sie werden erst in einer späteren Projektphase konkretisiert. Diese ADR hält die bereits fest entschiedenen **Grundregeln** für diese spätere Phase fest, damit sie nicht verloren gehen, auch wenn die Detailplanung noch aussteht.

## Entscheidung

Folgende Grundregeln für die künftige Migration stehen bereits fest:

1. **Nur lesender Export von der Produktions-Datenbank.** Es findet zu keinem Zeitpunkt ein schreibender oder löschender Zugriff auf die alte IONOS/MySQL-Produktionsdatenbank statt — die Migration liest die bestehenden Daten aus, verändert die Quelle aber nicht.
2. **Alte App/DB bleibt bis zur Verifizierung parallel unangetastet live.** Die bestehende `filmkritiker`-App und ihr IONOS/PHP/MySQL-Backend laufen vollständig unverändert weiter und bleiben die aktive Live-App für die Familie, bis die neue WatchCrew-App vollständig verifiziert ist.
3. **Downtime-freier Cutover angestrebt.** Der eigentliche Wechselzeitpunkt von der alten zur neuen App soll die Familiennutzung nicht unterbrechen — nicht zwingend über echtes Live-Dual-Write, aber es braucht eine durchdachte Strategie, damit beim Umschalten keine Nutzungslücke entsteht.

## Begründung

- Diese drei Regeln spiegeln dieselbe harte Grundregel wider, die bereits im bestehenden `filmkritiker`-Projekt gilt (siehe `filmkritiker`-CLAUDE.md: "NEVER access the production database... destructively") — sie wird hier bewusst auf das neue Projekt übertragen, damit während der Migration keine Unsicherheit über den Umgang mit der Produktionsdatenbank entsteht.
- Ein paralleler, unangetasteter Weiterbetrieb der alten App ist die risikoärmste Absicherung gegen Datenverlust oder Nutzungsausfall, falls sich während der WatchCrew-Verifizierungsphase noch Probleme zeigen.
- Downtime-Freiheit ist ein explizit genanntes Ziel Robins für den Familienbetrieb — die App wird aktiv von drei Personen im Alltag genutzt, ein harter Cutover mit Ausfallzeit wäre für diese Nutzergruppe unnötig störend.

## Konsequenzen

- Die eigentliche Migrationslogik (Datenmapping von MySQL-Schema auf Supabase/Postgres-Schema, Umgang mit Legacy-Feldern wie dem `2020-01-01`-Datums-Platzhalter, Zuordnung alter Cookie-Nutzer zu neuen Supabase-Auth-Accounts, etc.) ist **noch nicht entschieden** und wird als eigene Planungsrunde nachgezogen, sobald diese Phase ansteht — diese ADR ist bewusst kein vollständiger Migrationsplan.
- Bis zur finalen Migrationsplanung darf am bestehenden `filmkritiker`-Repo/-Deploy/-DB nichts verändert werden, was über den normalen Weiterbetrieb der alten App hinausgeht.
- Sobald die Detailplanung für die Migration ansteht, sollte sie insbesondere `docs/feature-inventory.md` (funktionale Spezifikation der Altdaten-Bedeutung, z. B. Watchlist/Tagebuch-Single-Table-Modell, personenbezogene Felder) sowie die übrigen ADRs (insb. 0002 Supabase-Schema, 0003 Watch-Group-Modell, 0004 Auth) als Grundlage heranziehen, um das Mapping alt→neu konsistent zu diesen bereits getroffenen Entscheidungen zu gestalten.
- Ein konkreter Rollback-Plan für den Fall, dass sich nach dem Cutover doch noch Probleme zeigen, ist Teil der noch ausstehenden Detailplanung, nicht dieser High-Level-ADR.
