# 0006 — Realtime- und Push-Verhalten

**Status:** Entschieden (2026-09-19)

## Kontext

Die alte App hat Push-Notifications über Web-Push/VAPID, aber kein echtes Realtime-Update-Verhalten (jede Mutation lädt strikt neu: API-Call → Cache invalidieren → View neu rendern, kein granulares optimistisches UI-Update, siehe `docs/feature-inventory.md` Abschnitt 5). Für den Rewrite musste entschieden werden, ob Supabase Realtime genutzt wird (ursprüngliche "keep it simple"-Empfehlung war zunächst dagegen, wegen befürchtetem Mehraufwand) und wie sich Realtime-Updates und Push-Benachrichtigungen je nach App-Zustand des Empfängers zueinander verhalten sollen.

## Entscheidung

**Supabase Realtime wird für v1 genutzt** — die ursprüngliche "keep it simple, erstmal ohne Realtime"-Empfehlung wurde revidiert, nachdem der tatsächliche Implementierungsaufwand als moderat (nicht "wahnsinnig aufwendig") eingeschätzt wurde, gerade in Kombination mit TanStack Query.

**Koordiniertes Verhalten zwischen Realtime-Update und Push-Benachrichtigung**, abhängig vom App-Zustand des jeweils empfangenden Nutzers:

| Zustand des Empfängers | Verhalten |
|---|---|
| App im Vordergrund **und** gerade auf dem betroffenen Screen | Stilles Live-UI-Update, **keine** Push-Benachrichtigung |
| App im Vordergrund, aber auf einem **anderen** Screen | In-App-Toast |
| App im Hintergrund/geschlossen | Echte Push-Benachrichtigung (wie bisher geplant) |

Alle drei Fälle sind für v1 bestätigt im Scope.

## Begründung

- Die Kombination Supabase Realtime + TanStack Query macht das Cache-Invalidierungsmuster, das die alte App ohnehin schon (wenn auch manuell per Re-Fetch) verfolgt, mit vertretbarem Zusatzaufwand "live" — der ursprünglich befürchtete hohe Aufwand hat sich bei genauerer Betrachtung nicht bestätigt.
- Die dreistufige Unterscheidung (still update / Toast / Push) vermeidet zwei UX-Probleme der naiven Alternativen: (a) redundante Push-Benachrichtigungen für Inhalte, die der Nutzer gerade sowieso live sieht, und (b) das Verpassen einer Änderung, weil der Nutzer zwar in der App, aber auf einem anderen Screen ist und ohne Push/Toast nichts davon mitbekäme.

## Konsequenzen

- Jeder Screen, der von einer anderen Person geänderte Daten anzeigen kann (z. B. Watchlist, Tagebuch, Tracker), muss sowohl einen Supabase-Realtime-Subscription-Handler als auch eine Bestimmung des eigenen aktuellen Fokus-Zustands (Vordergrund + aktueller Screen vs. Vordergrund + anderer Screen vs. Hintergrund) besitzen, um zwischen den drei Verhaltensweisen zu unterscheiden.
- Die serverseitige Push-Trigger-Logik der alten App (neuer Watchlist-Eintrag, Erstbewertung, Release-Reminder — siehe `docs/feature-inventory.md` Abschnitt 4.2) bleibt inhaltlich Vorbild für die neuen Edge-Function-Trigger, läuft aber künftig über Supabase DB-Webhook/Trigger → Edge Function → Expo Push API statt über VAPID/Web-Push.
- Das bestehende Verhalten "Push nur bei Erstbewertung (NULL→Wert), nicht bei nachträglicher Korrektur" (siehe `docs/feature-inventory.md` Abschnitt 2.6 und 6) ist als Business-Regel 1:1 zu übernehmen, unabhängig vom neuen Transportweg.
- Deep-Linking von Push-Benachrichtigungen in den richtigen Screen/Tab/Gruppe/Film läuft künftig über Expo Router statt über das alte `sw.js`-`postMessage`-Muster.
