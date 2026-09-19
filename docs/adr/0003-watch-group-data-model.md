# 0003 — Watch-Group-Datenmodell (Projekt-Ebene entfällt)

**Status:** Entschieden (2026-09-19)

## Kontext

Die aktuelle Codebase ist über das ursprüngliche Single-Family-Modell hinausgewachsen und hat ein Multi-Tenant-"Projekt"-System mit einer zusätzlichen Ebene über den Gruppen (`projects`/`project_groups`) bekommen. Für den Rewrite musste geklärt werden, ob dieses zweistufige Projekt→Gruppen-Modell übernommen wird, oder ob eine einfachere Struktur für die neue Multi-Tenant-Ambition ausreicht — inklusive der Frage, wie Mitgliedschaft, Rollen, Einladung und Lifecycle einer Gruppe funktionieren sollen.

## Entscheidung

Die **"Projekt"-Ebene (Multi-Tenant-Layer) wird vollständig fallengelassen.** Es existiert nur noch die **"Watch-Group"** als einzige teilbare/beitretbare Einheit (vormals die Unterebene unter "Projekt"). Ein Nutzer kann Mitglied mehrerer Watch-Groups sein.

**Rollen pro Watch-Group:**
- **Owner** — Ersteller der Gruppe; kann Gruppe umbenennen, Mitglieder entfernen, Invite-Link regenerieren/widerrufen; hat die Rechte, die früher der "Admin-Modus" hatte (z. B. TMDB-Bulk-Refresh, Test-Push) — jedoch: diese Admin-Funktionen wandern komplett aus der App heraus, siehe ADR 0012.
- **Member** — volle App-Nutzung, keine Admin-Rechte.

Bewusst nur diese zwei Rollen für v1 — keine feinere Rollengranularität (Promotion von Member zu Owner ist eine mögliche spätere Erweiterung, nicht v1).

**Beitritts-Mechanismen:**
1. **Teilbarer Invite-Link** (wiederverwendbar, kein Auto-Ablauf, Owner kann jederzeit widerrufen/regenerieren) — primärer Mechanismus, gedacht zum Teilen z. B. via WhatsApp.
2. **Manueller Beitritt via Gruppen-ID** als Fallback, unter Verwendung derselben nicht erratbaren UUID wie der Link (keine separate, erratbare ID) — nötig z. B. um eine soft-gelöschte, leere Gruppe wieder zu reaktivieren.

Kein öffentliches/formales E-Mail-Einladungssystem für v1 — der Link-basierte Invite deckt den Bedarf; könnte später ergänzt werden.

**Owner-Austritt:** Ownership geht automatisch und deterministisch an das dienstälteste verbleibende Mitglied über (keine manuelle Auswahl) — eine Gruppe ist niemals ohne Owner.

**Empty-Group-Lifecycle:** Wenn das letzte Mitglied eine Gruppe verlässt, wird die Gruppe samt Daten **2 Wochen lang soft-aufbewahrt** (über die Gruppen-ID wieder beitretbar, dem austretenden Nutzer in diesem Moment in einem klaren Warndialog angezeigt), bevor ein geplanter Job sie endgültig hart löscht.

## Begründung

- Die Projekt-Ebene war in der alten App eine Mehrfahrt-Infrastruktur, die für die eigentliche Nutzung (Familie mit zwei Gruppen: `all_three`, `robin_tobias`) keinen echten Mehrwert bot und nur zusätzliche Komplexität (Projekt-Login, Projekt-Passwort, `admin.php`/`setup.php`/`migrate.php`) erzeugte.
- Die künftige Multi-Tenant-/Marketing-Ambition wird durch **mehrere unabhängige Watch-Groups pro Nutzer** bereits abgedeckt — eine zusätzliche Projekt-Ebene darüber ist nicht nötig, um fremde Familien/Gruppen zu unterstützen.
- Ein deterministischer Owner-Nachfolgemechanismus (statt manueller Auswahl) vermeidet Kantenfälle, in denen eine Gruppe verwaist wirkt oder ein UI für Owner-Übergabe gebaut werden müsste.
- 2-Wochen-Soft-Delete balanciert zwei Anforderungen: kein versehentlicher, sofortiger Datenverlust bei einem kurzzeitigen "alle verlassen die Gruppe"-Moment, aber auch kein unbegrenztes Aufbewahren toter Daten.

## Konsequenzen

- Datenmodell und RLS-Policies in Supabase werden direkt auf "Watch-Group" als Kernentität ausgelegt, nicht auf ein zweistufiges Projekt→Gruppe-Modell.
- Die alten Backend-Konzepte `projects`/`project_groups`, `admin.php`, `setup.php`, `migrate.php` aus der PHP-App werden **nicht** in Supabase nachgebaut — sie betreffen ausschließlich die alte App und bleiben dort unangetastet.
- Es braucht einen geplanten Job (pg_cron + Edge Function) für die 2-Wochen-Hard-Delete-Logik verwaister Gruppen.
- Invite-Link und Group-ID-Beitritt müssen beide auf derselben nicht erratbaren UUID basieren — es gibt keine zusätzliche, kürzere/erratbare Gruppen-ID.
