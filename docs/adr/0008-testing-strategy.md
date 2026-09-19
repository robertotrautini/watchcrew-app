# 0008 — Test-Strategie

**Status:** Entschieden (2026-09-19)

## Kontext

Die alte PWA nutzt Playwright für E2E-Tests — das funktioniert für native Mobile-Apps nicht (kein DOM). Für den Rewrite musste ein komplettes Test-Tooling (Unit/Komponente + E2E) sowie eine Build-Methodik (TDD ja/nein) und eine Mocking-Strategie für externe Abhängigkeiten (TMDB/Trakt, Supabase) neu festgelegt werden.

## Entscheidung

- **Build-Methodik: TDD** (Red-Green-Refactor), insbesondere für Datenschicht/Hooks/Business-Logik; UI bekommt zusätzlich Komponenten-/Snapshot-Tests obendrauf.
- **Unit-/Komponententests:** Jest + `jest-expo`-Preset + React Native Testing Library.
- **E2E-Tests:** Maestro — gewählt gegenüber Detox, trotz Detox' tieferer RN-Integration und geringerer Flakiness, wegen des niedrigeren Wartungsaufwands für einen Solo-Entwickler.
- **CI/CD (neues Repo):** GitHub Actions führt die Jest/RNTL-Testsuite automatisch bei jedem Push/PR aus. EAS-Builds werden manuell getriggert (`eas build`), nicht automatisiert — da es keinen Release-Zeitdruck gibt.
- **Mocking-Strategie:** Externe Netzwerkaufrufe (TMDB/Trakt, Supabase) werden in Jest-Unit-/Komponententests **gemockt** (schnell, deterministisch, keine Flakiness durch echte Netzwerk-/API-Verfügbarkeit) — echte Netzwerkaufrufe finden ausschließlich in den Maestro-E2E-Tests statt, die gegen die echte `watchcrew-dev`-Supabase-Umgebung laufen.

## Begründung

- Playwright entfällt strukturell, da native Apps kein DOM haben — Maestro wurde als der für einen Solo-Entwickler pragmatischste E2E-/Screenshot-Tool-Ersatz empfohlen.
- Maestro vs. Detox: Detox bietet tiefere native Integration und geringere Flakiness, verlangt dafür aber deutlich mehr laufenden Wartungsaufwand (native Build-Konfiguration, Synchronisationsmechanismen) — für ein Spare-Time-Solo-Projekt ohne Team, das diesen Aufwand tragen könnte, überwiegt Maestros geringere Betriebslast.
- TDD passt zum Anspruch, die Datenschicht/Business-Logik (Rating-Berechnung, Watchlist/Tagebuch-Übergang, Zahlungs-Logik etc.) robust und mit hoher Testabdeckung zu bauen, gerade weil viele dieser Regeln in der alten App über Jahre als Bugfixes einzeln nachgezogen wurden (siehe `docs/feature-inventory.md` Abschnitt 6) — TDD soll verhindern, dass dieselben Regressionen im Rewrite erneut auftreten.
- Gemockte externe Aufrufe in Unit-/Komponententests sind Standardpraxis für deterministische, schnelle Testläufe; echte Aufrufe ausschließlich in E2E-Tests gegen eine echte Dev-Umgebung stellen sicher, dass die tatsächliche Integration trotzdem verifiziert wird, ohne jeden einzelnen Unit-Test von externer API-Verfügbarkeit abhängig zu machen.
- Manuelle statt automatisierte EAS-Builds sind angemessen, solange es keinen festen Release-Rhythmus gibt (siehe Zeitplan-Hinweis: kein Deadline, Spare-Time-Projekt).

## Konsequenzen

- Jede neue Business-Logik-Funktion (insb. Datenschicht/Hooks) wird test-first entwickelt (Red-Green-Refactor).
- GitHub Actions muss ab Projektstart einen Jest/RNTL-Testlauf bei jedem Push/PR ausführen — CI-Konfiguration ist Teil des frühen Setups, nicht optional/nachgelagert.
- Die bekannten Bugfix-/Verhaltens-Constraints aus `docs/feature-inventory.md` Abschnitt 6 (z. B. `paid_at` nicht überschreiben, Nav-Stack-Reset bei Tab-Wechsel, personenbezogene `seenAt`-Felder, Push nur bei Erstbewertung) sollten direkt als Testfälle im neuen Projekt hinterlegt werden, um Regressionen zu verhindern.
- Maestro-Setup (Konfiguration, erste Flows) erfolgt erst, "sobald reale UI existiert" — kein Blocker für den frühen Projektstart, aber fester Bestandteil der Roadmap (siehe `docs/planning-report.html` für die Meilenstein-Zuordnung).
