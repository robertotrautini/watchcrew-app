# 0004 — Auth-Methode und Account-Lifecycle

**Status:** Entschieden (2026-09-19)

## Kontext

Die alte App nutzt Cookie-basierte Auth mit einem geteilten Projekt-Passwort plus Namens-Dropdown zur Nutzerauswahl — kein individuelles Passwort pro Person. Für den Rewrite musste entschieden werden: (1) welches Auth-Modell und welche Login-Methode zum Einsatz kommen, (2) wie mit inaktiven Accounts umgegangen wird, und (3) wie Account-Löschung (App-Store-Pflicht) funktioniert.

## Entscheidung

**Echte individuelle Supabase-Auth-Accounts** pro Person (nicht mehr das alte Modell aus geteiltem Projekt-Passwort + Namens-Dropdown).

**Login-Methode für v1: E-Mail + Passwort** (nicht Magic-Link — Robin lehnt die zusätzliche UX-Hürde von Einmalcodes/-links ab; auch noch kein OAuth). Google (und später Apple, sobald Google Apples verpflichtendes "Sign in with Apple"-Requirement triggert) sind als spätere Ergänzung geplant, nicht Teil von v1.

**E-Mail-Bestätigung vor Erstlogin: aktiv** (Supabase-Default) — schützt vor gefälschten/vertippten E-Mail-Adressen und Zufallsnutzern über Invite-Links, kleine einmalige Reibung für echte Nutzer.

**Inaktivitäts-basiertes Account-Ablaufen (neues Feature, gab es in der alten App nicht):** Wenn ein Nutzer über 1 Jahr nicht eingeloggt war (Supabase Auth trackt `last_sign_in_at` bereits nativ — kein eigenes Tracking nötig), sendet ein geplanter Job eine Warn-E-Mail ("dein Account wird in 14 Tagen gelöscht"); erfolgt danach weiterhin kein Login innerhalb dieser 14-Tage-Frist, löscht ein Cleanup-Job den Account. Benötigt einen geplanten Supabase-Job (pg_cron + Edge Function) sowie den Versand transaktionaler E-Mails (entweder Supabases eigenes Auth-E-Mail-System oder ein Drittanbieter wie Resend — zum Zeitpunkt dieser Entscheidung noch nicht final festgelegt, bei Bedarf erneut vorlegen).

**Account-Löschung (App Store Guideline 5.1.1, verpflichtend, nicht optional):** Eine "Konto löschen"-Option muss in den In-App-Settings existieren und eine echte, vollständige Löschung durchführen (keine bloße Deaktivierung). Diese Löschung komponiert mit den bereits definierten Gruppen-Lifecycle-Regeln (Owner-Transfer / 2-Wochen-Soft-Delete bei letztem Mitglied, siehe ADR 0003) statt eigene neue Logik zu benötigen.

## Begründung

- Individuelle Accounts sind die Grundvoraussetzung für Row Level Security und die Multi-Tenant-Ambition — das alte "ein Projekt-Passwort für alle"-Modell skaliert nicht auf fremde Familien/Gruppen und bietet keine echte Zugriffskontrolle pro Person.
- E-Mail+Passwort statt Magic-Link ist eine explizite UX-Präferenz von Robin (keine technische Notwendigkeit) — vermeidet den zusätzlichen Schritt "auf E-Mail warten, Link/Code holen" bei jedem Login.
- OAuth (Google/Apple) wird bewusst verschoben, um v1 klein zu halten; Apple-Login wird erst relevant, sobald Google-Login eingeführt wird (Apples Plattform-Regel dazu).
- Inaktivitäts-Ablauf ist ein neues, in der alten App nicht vorhandenes Feature — sinnvoll für Datenschutz/Hygiene bei einer App mit potenziell vielen fremden Nutzern (Multi-Tenant-Zukunft), verursacht aber in der Familienrunde selbst kaum Reibung, da die Familie die App aktiv nutzt.
- Account-Löschung ist keine Design-Entscheidung im engeren Sinn, sondern eine Store-Compliance-Pflicht (Apple Guideline 5.1.1) — ohne sie wird die App im App Store abgelehnt.

## Konsequenzen

- Supabase Auth (E-Mail/Passwort, E-Mail-Bestätigung on) ist der einzige Login-Weg für v1; OAuth-Provider-Integration ist explizit ausgeklammert und muss bei Bedarf separat vorgelegt/entschieden werden.
- Es braucht zwei neue geplante Supabase-Jobs: (1) Inaktivitäts-Warnung + Löschung nach 1 Jahr + 14 Tage Gnadenfrist, (2) 2-Wochen-Hard-Delete verwaister Gruppen (ADR 0003) — beide potenziell im selben pg_cron/Edge-Function-Muster.
- Die Entscheidung, ob transaktionale E-Mails über Supabase selbst oder einen Drittanbieter wie Resend laufen, ist noch offen und muss vor Implementierung dieses Features explizit bestätigt werden (Zero-autonome-Entscheidungen-Regel, siehe CLAUDE.md).
- Die In-App-Settings brauchen einen expliziten "Konto löschen"-Flow, der echte Löschung (nicht Soft-Deaktivierung) auslöst und mit der Gruppen-Owner-Transfer-/Soft-Delete-Logik zusammenspielt.
