# Code-Health: Refactoring-Vorschläge R1–R10

**Stand: Analyse vom 2026-10-03; Code hat sich seitdem stark geändert (Icon.tsx, Button-Icons, Switch, Toasts, Hintergrund/Parallax, Back-Swipe, Gruppenwechsel, Prettier-Lauf über ~55 Dateien) — vor Umsetzung je Punkt gegen den aktuellen Code prüfen.**

Quelle: `docs/code-health-report.html` (Branch main, ca. 151 uncommitted Änderungen zum Analysezeitpunkt, read-only). Alles Vorschläge; keine Umsetzung ohne Bestätigung (Hard Rule, nichts davon steht in `docs/adr/`).

## Fortschritt & Abschluss

| ID | Titel | Status (offen / in Arbeit / erledigt / verworfen) | Datum | Notiz/Commit/Dateien | Verifikation |
|---|---|---|---|---|---|
| R1 | Template-Altlasten entfernen | erledigt | 2026-10-05 | 17 Dateien + 11 Assets entfernt, areas.json bereinigt | tsc sauber, jest 171/1672 grün; kein Maestro (nur toter Code) |
| R2 | ESLint einrichten (oder Script entfernen) | erledigt (Setup) | 2026-10-05 | eslint-config-expo + eslint.config.js; 6 wirkungslose disables entfernt, 4 exhaustive-deps behoben; Rest-Findings offen (siehe Log) | tsc sauber, jest 171/1672 grün |
| R3 | Screens aufteilen (Controller-Hook + Subkomponenten) | offen | - | - | - |
| R4 | Gemeinsame Filter/Sort-Logik Tagebuch & Watchlist | offen | - | - | - |
| R5 | Zentrale Test-Setup-Datei + Mock-Helfer | erledigt | 2026-10-05 | globaler vector-icons-Mock, __tests__/helpers/ (mockRouter, mockCurrentUser, renderWithProviders), 68 Tests nach src-Struktur verschoben, Jest-Devdeps gepinnt | tsc sauber, jest 171/1672 grün; kein Maestro (nur Tests) |
| R6 | Query-Key-Factory | erledigt 2026-10-05 | - | - | - |
| R7 | Fehlerbehandlung & Sentry-Anbindung | offen | - | - | - |
| R8 | lib/ umstrukturieren | offen | - | - | - |
| R9 | i18n-Vorbereitung | offen | - | - | - |
| R10 | Farb- und Style-Konsolidierung | offen | - | - | - |
| QW | Quick Wins (Gruppe, 8 Punkte) | offen | - | - | - |

### Protokoll
Format: `- YYYY-MM-DD R<n>: was gemacht, Dateien, tsc/jest-Ergebnis, Maestro-Bereiche, Abweichungen vom Report`

- 2026-10-05 R1: entfernt: components/{external-link,hint-row,web-badge,animated-icon.web,themed-text,themed-view}.tsx, animated-icon.module.css, ui/collapsible.tsx, hooks/{use-theme,use-color-scheme,use-color-scheme.web,useMovieProviders}.ts, constants/theme.ts (+ leeres constants/), __tests__/useMovieProviders.test.tsx, assets/images/{react-logo*,tutorial-web,expo-badge*}.png, assets/images/tabIcons/. animated-icon.tsx behalten (Splash-Overlay). .maestro/areas.json: tote Pfade entfernt. tsc sauber, jest 171 Suites/1672 Tests grün. Abweichung: Deps unangetastet; expo-symbols/expo-glass-effect/expo-device nun ungenutzt (Entscheidung User), @expo/ui bleibt (Switch.tsx).
- 2026-10-05 R1 (Nachtrag Deps): expo-symbols, expo-glass-effect, expo-device per npm uninstall entfernt (0 Importe, kein Config-Plugin; expo-symbols/-glass-effect sind reguläre dependencies von expo-router und bleiben transitiv installiert; expo-device von keinem Paket gefordert). @expo/ui bleibt.
- 2026-10-05 R2: eslint + eslint-config-expo (dev) + eslint.config.js (flat). Baseline 425 Findings (38 Errors, 387 Warnings): import/first 56, no-require-imports 282, array-type 24, no-unused-vars 13, exhaustive-deps 8, no-duplicates 4, display-name 3, no-unescaped-entities 4, no-var 1, no-undef 2, react-hooks/refs 18, set-state-in-effect 6, immutability 3, purity 1, 6 unused-disable. Behoben: 6 wirkungslose eslint-disable (buttonIcons.test, useGroupRealtimeSync.test, GlassBlur x2, RatingDialog:166, PaymentModal:80), 4 exhaustive-deps (streaming-services providers, tracker groupMembers, watchlist streamingAvailability via useMemo). Offen/gemeldet: 4 exhaustive-deps in Test-Mocks (useFocusEffect-Mock, absichtlich []), RatingDialog/PaymentModal set-state-in-effect (riskant, unverändert), react-hooks/refs (Toast/Sheet/FadeInItem/useTabSwitchState), no-inline-styles nicht in Expo-Config. Danach 425 -> 421 Findings (38 Errors, 383 Warnings). tsc sauber, jest 171 Suites/1672 Tests grün.
- 2026-10-05 R5: (1) Globaler `@expo/vector-icons`-Mock `__mocks__/@expo/vector-icons.js` (MaterialIcons -> View mit allen Props; Root-`__mocks__` wirkt automatisch wie der bestehende mmkv-Mock, kein setupFiles/jest.setup.ts noetig); 22 identische lokale Mocks entfernt. Behalten: Icon.test.tsx (braucht echte glyphMap). Switch.test.tsx und theme/highlightFollowsTheme.test.tsx pruefen die echte Icon-Farbe (Style) und nutzen `jest.unmock("@expo/vector-icons")`. (2) `__tests__/helpers/`: `mockRouter.ts` (`mockRouter`, `createExpoRouterMock(overrides)`, `resetMockRouter`), `mockCurrentUser.ts` (`mockCurrentUserId`, `currentUserIdModule()`), `renderWithProviders.tsx` (`createQueryWrapper`, `renderWithProviders`, `renderHookWithProviders`, `createTestQueryClient`). Migriert: expo-router-Mock in 20 Tests, useCurrentUserId-Mock in 17 Tests, createWrapper in 13 Hook-Tests. Nicht migriert (abweichendes Verhalten): expo-router mit Link/Redirect/Stack-Capture/Theme (Login, routeIndex, layouts, modalHeaderTheme, tabsLayoutTheme, usePushNotificationRouting, Collection/SimilarMovies/MovieDetail mit mockUseRouter(), AppHeader, highlightFollowsTheme, join-token, create-or-join-group), useCurrentUserId mit festem Wert (navigationStack, ActiveGroupModals, useGroupQuickSwitch), restliche createWrapper-/QueryClient-Varianten (useUserGroups-aehnliche mit setup()/queryClient-Rueckgabe, useTrackerPayments, useUpdateDisplayName, useCompanySearch). Redundante mmkv-Mocks in 5 Tests entfernt (useActiveGroup, SettingsStreamingServices, Settings, SettingsDisplay, Tagebuch); behalten: usePreferencesStore + mmkvStorage (pruefen den Storage ueber geteilte Map). (3) 68 Root-Tests nach Quellstruktur verschoben: hooks/ (use*), stores/ (usePreferencesStore, useFocusedGroupScreen), lib/, layouts/ (appLayoutPushWiring, modalsLayout, navigationStack, tabsLayout, tabsLayoutTheme), components/ (ActiveGroupThemeProvider, GroupThemeProvider), components/ui/ (Button, Sheet, StarRating, buttonIcons), app/ (routeIndex), config/ (appConfig). Relative Imports/`__dirname`-Pfad angepasst, Pfadverweise in src-Kommentaren, docs/style-guide.md und Test-Kommentaren aktualisiert (historische docs/interim-decisions.md unveraendert). `.maestro/areas.json` ignoriert `__tests__/**`, keine Aenderung noetig. (4) package.json: Jest-Devdeps von `*` auf installierte Versionen gepinnt (`jest` 29.7.0, `jest-expo` 57.0.5, `@testing-library/react-native` 14.0.1, `@types/jest` 30.0.0), Wurzel-Eintrag in package-lock.json entsprechend. tsc sauber, jest 171 Suites/1672 Tests gruen. Abweichungen: `jest.testPathIgnorePatterns` um `<rootDir>/__tests__/helpers/` ergaenzt (noetig, sonst laufen die Helper als Suites; ueber den freigegebenen Pin hinaus, minimal); Dateien per `git mv` verschoben (Rename im Index gestaged, nicht committet); Helper-Imports stehen als erste Zeile der Testdateien (import/first-Warnungen wie bisher); jest.resetModules-Tests (Settings, Tagebuch) laufen mit den Helpern gruen. Kein Maestro-Lauf (reine Test-Aenderung, kein App-Code).
- 2026-10-05 R6: neu `src/lib/queryKeys.ts` (`queryKeys`: userGroups/ownProfile/groupDetails/groupMembers/groupNames/watchlist mit `.all` + `.byUser/.byGroup/.byIds`, pushSubscription.byGroupUser, movieDetail, movieProviders, similarMovies, collection, director/actor/studioFilmography, providersList, streamingProviders, movieSearch/personSearch/companySearch). Alle Inline-Keys in 24 Hooks + join/[token].tsx ersetzt; Key-Werte identisch (queryKey[0]-Roots/NON_PERSISTED_ROOTS unveraendert, JSON-sicher). Neu `__tests__/lib/queryKeys.test.ts` (Werte-Guard); 10 Hook-Tests nutzen Factory, queryPersistence-/queryCacheLifecycle-Tests bewusst mit Literalen. tsc sauber, jest 172 Suites/1676 Tests gruen. Kein Maestro (Key-Werte unveraendert).

### Abschlusskriterien
Pro Punkt gilt als erledigt (Definition of Done):
- `npx tsc --noEmit` sauber
- `npx jest` grün
- relevanter Maestro-Bereich grün (`scripts/maestro-all.sh --changed` bzw. `--area <name>`)
- Docs aktualisiert (u. a. `docs/maestro-coverage.md`, `.maestro/areas.json` falls betroffen)
- Status-Zeile oben auf `erledigt` mit Datum gesetzt
- Protokoll-Eintrag geschrieben

Wenn ALLE gewählten Punkte erledigt sind, Schlusszeile ergänzen: `Abschluss: <datum>, Ergebnis, offene Punkte`.

### Planung nächste Charge
R1, R2, R5, R6 (vom User zum Start freigegeben, Reihenfolge wie im Report), danach R4+R3, R8, danach R7/R10/R9. Jeder Punkt braucht vor der Umsetzung die Bestätigung des Users (CLAUDE.md Hard Rule), außer den ersten vier (R1, R2, R5, R6), deren Start freigegeben ist.

## Scorecard

| Bereich | Note | Kern |
|---|---|---|
| Typsicherheit | 8/10 | tsc sauber, 0 ts-ignore, nur 3 any + 4 as unknown as in src |
| Architektur / Schichten | 7/10 | 0 Zyklen, klare lib/hooks/components-Trennung; 1 Screen mit direktem supabase-Import, 1 lib->components-Import |
| Dateigröße / Komplexität | 4/10 | Screens bis 560 Zeilen, Komponentenfunktionen bis ca. 467 Zeilen, 30 Hooks in einem Screen |
| Dead Code / Template-Reste | 3/10 | 7 ungenutzte Template-Dateien, 7 ungenutzte Assets, ca. 8 ungenutzte/Peer-Deps |
| Tests | 7/10 | 155 Dateien / 1303 Tests, Test:Src = 1,26; aber 262 jest.mock, kein zentrales Setup, keine Snapshots |
| Tooling (Lint/CI) | 3/10 | Kein ESLint (keine Config, kein Paket) obwohl `npm run lint` und 11 eslint-disable existieren |
| Styling-Konsistenz (NativeWind) | 6/10 | 577 className vs. 47 style={}; ca. 29 in toten Template-Dateien, Rest meist dynamisch (legitim) |
| Fehlerbehandlung / i18n | 5/10 | Kein ErrorBoundary, Sentry nur in lib/sentry.ts; deutsche Strings hartcodiert, keine i18n-Lib |

Gesamteindruck: solide, typsichere, gut getestete Codebasis mit sauberem Abhängigkeitsgraphen. Schulden: große Screen-Komponenten, Template-Altlasten, fehlendes Linting, Test-Mock-Duplikation. Nichts akut gefährlich.

## R1 · Template-Altlasten entfernen
- Impact: mittel · Aufwand: S
- Warum: ca. 29 der 47 Inline-Styles, 5+ ungenutzte Komponenten, 7 Assets, 3 Deps (expo-symbols, ggf. @expo/ui, expo-glass-effect) und verwirrende Parallel-Theme-Welt (constants/theme.ts).
- Dateien: components/{external-link,hint-row,web-badge,animated-icon.web,themed-text,themed-view}.tsx, animated-icon.module.css, ui/collapsible.tsx, hooks/use-theme.ts, use-color-scheme*.ts, constants/theme.ts, hooks/useMovieProviders.ts + Test, Assets (react-logo*, tutorial-web, tabIcons, expo-badge*).
- Ansatz: Liste mit dem Nutzer abstimmen (z. B. Web-Target ja/nein entscheidet über animated-icon.web), löschen, tsc + jest laufen lassen, danach Deps prüfen.

## R2 · ESLint einrichten (oder Script entfernen)
- Impact: hoch · Aufwand: S-M
- Warum: `npm run lint` ist faktisch tot, 11 eslint-disable sind wirkungslos, exhaustive-deps-Verstöße (RatingDialog, PaymentModal u. a.) werden nicht geprüft, die RNTL-await-Regel ließe sich per Regel erzwingen.
- Ansatz: eslint-config-expo (Expo-Standard) als Vorschlag, anschließend react-hooks/exhaustive-deps und Inline-Style-Regel (react-native/no-inline-styles) prüfen. Tool-Wahl braucht Freigabe.

## R3 · Screens aufteilen (Controller-Hook + Subkomponenten)
- Impact: hoch · Aufwand: L
- Warum: 6 Screens mit 330-470 Zeilen in einer Funktion, bis 30 Hooks; schwer zu lesen, zu testen, review-feindlich.
- Dateien: add-movie.tsx, tagebuch.tsx, group-settings.tsx, tracker.tsx, watchlist.tsx, movie/[tmdbId].tsx, danach RatingDialog.tsx.
- Ansatz: pro Screen View-State in hooks/useXScreen.ts bzw. lib/*Logic.ts (Muster existiert mit watchlistLogic), JSX in Abschnitts-Komponenten (Header, Filterleiste, Liste, Sheets). Zuerst tagebuch + watchlist gemeinsam (R4).

## R4 · Gemeinsame Filter/Sort-Logik für Tagebuch & Watchlist
- Impact: mittel · Aufwand: M
- Warum: parallele Helfer (deriveAvailableGenreIds/getDistinctGenreIds, sortOptionLabel x2, Genre-/Jahr-Pill-Ableitung, Such-Pipeline) und doppelte formatPlainDate (watchlist/tracker).
- Ansatz: lib/entryFilters.ts (Genre/Jahr/Suche) und lib/dateFormat.ts als Sammelpunkt für die 5 verstreuten Datumsformatierer; evtl. generischer useEntryFilters()-Hook. Bestehende Tests (watchlistLogic.test, Tagebuch.test) bleiben Sicherheitsnetz.

## R5 · Zentrale Test-Setup-Datei + Mock-Helfer
- Impact: mittel · Aufwand: M
- Warum: 20 identische MaterialIcons-Mocks, 29x expo-router, 16x useCurrentUserId, mmkv trotz globalem Mock nochmals 7x; jede API-Änderung betrifft dutzende Testdateien.
- Ansatz: jest.setup.ts (setupFiles) mit globalem @expo/vector-icons-Mock, ggf. __mocks__/@expo/vector-icons.js plus __tests__/helpers/ (renderWithProviders, mockRouter, mockCurrentUser). Gleichzeitig __tests__/ nach src spiegeln (71 Root-Dateien in hooks/, lib/, layouts/ sortieren).

## R6 · Query-Key-Factory
- Impact: mittel · Aufwand: S-M
- Warum: 43 Inline-Keys, "watchlist" 11x; 28 invalidateQueries-Stellen; queryPersistence.ts filtert per queryKey[0]-String (NON_PERSISTED_ROOTS).
- Ansatz: lib/queryKeys.ts mit typisierten Funktionen; schrittweise ersetzen, Tests (Hooks) fangen Tippfehler.

## R7 · Fehlerbehandlung & Sentry-Anbindung
- Impact: mittel · Aufwand: M
- Warum: kein ErrorBoundary, Fehler enden in console.warn (7 Stellen) statt in Sentry.
- Ansatz: Expo-Router-ErrorBoundary-Export im Root-Layout; dünner lib/logger.ts (warn -> Sentry-Breadcrumb/captureException). Entscheidung zu Verhalten (Toast vs. Screen) liegt beim Nutzer.

## R8 · lib/ umstrukturieren
- Impact: mittel · Aufwand: M
- Warum: 51 flache Dateien mit 4 Verantwortlichkeiten; tmdbProxy.ts mit 28 Importeuren mischt Typen und Client; addMovieLogic.ts importiert aus components/movie/MovieGrid.
- Ansatz: Unterordner lib/data/ (groups, watchlist, profile, ...), lib/logic/, lib/infra/ (sentry, mmkv, connectivity, persistence), lib/types/; Typen aus tmdbProxy.ts abspalten; MovieGrid-Typ nach lib. Reine Verschiebung, keine Logikänderung.

## R9 · i18n-Vorbereitung
- Impact: niedrig (jetzt) · Aufwand: L
- Warum: ca. 141 hartcodierte deutsche Zeilen, verteilt auf Screens, Hooks und lib. Je später, desto teurer.
- Ansatz: erst Entscheidung über Bibliothek/Konvention (ADR), dann pro Screen migrieren. Nicht ohne Freigabe starten.

## R10 · Farb- und Style-Konsolidierung
- Impact: niedrig · Aufwand: S-M
- Warum: 78 Farb-Literale außerhalb groupTheme, absoluteFill-Styles, Template-Farben in app.config.ts (#208AEF, #E6F4FE).
- Ansatz: Tokens aus tailwind.config.js nutzen, absoluteFill -> absolute inset-0, Splash-/Icon-Hintergrund auf App-Farbe setzen (Branding-Entscheidung beim Nutzer).

## Quick Wins (je unter 1 Stunde)
1. Template-Dateien und ungenutzte Assets löschen (R1).
2. @expo/ui und expo-glass-effect prüfen/entfernen; expo-device klären.
3. Veraltete TODO-Kommentare in supabase/functions/tmdb-proxy/tmdb-client.ts:37,67 korrigieren.
4. Jest-Dev-Pakete von "*" auf konkrete Versionen pinnen.
5. Globalen @expo/vector-icons-Mock via __mocks__/ anlegen und 20 lokale Mocks entfernen.
6. hooks/useMovieProviders.ts (ungenutzt) löschen oder mit useMoviesProviders zusammenführen.
7. Doppeltes formatPlainDate (watchlist.tsx:78, tracker.tsx:48) nach lib ziehen.
8. src/app/join/[token].tsx:37: supabase.auth.getSession() hinter vorhandenen Hook/lib-Helper (z. B. useCurrentUserId) legen.

## Vorgeschlagene Reihenfolge
1. R1 Aufräumen (macht alle Folgeanalysen sauberer).
2. R2 ESLint (Sicherheitsnetz vor großen Refactorings).
3. R5 Test-Setup (reduziert Aufwand bei R3/R4).
4. R6 Query-Key-Factory (klein, entkoppelt Hooks).
5. R4 + R3 Tagebuch/Watchlist zuerst, dann restliche Screens.
6. R8 lib-Umstrukturierung (nach Screen-Refactor, weniger Merge-Konflikte).
7. R7 Fehlerbehandlung, R10 Styles, R9 i18n nach Priorisierung und ADR.

Hinweis aus dem Report: Refactorings vorzugsweise erst nach Commit/Merge des damaligen Working-Tree-Stands starten; kein git stash mit parallelen Agents, keine rekursive Subagent-Delegation.
