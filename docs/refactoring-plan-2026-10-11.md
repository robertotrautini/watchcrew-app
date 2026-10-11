# Refactoring-Plan 2026-10-11 (zur Freigabe)

Status: **Vorschlag, nichts umgesetzt.** Es wurde kein Code geändert, nichts committet, kein jest/tsc/Maestro gelaufen. Nach der Harten Regel (`CLAUDE.md`) startet kein Paket ohne Freigabe der Entscheidungen in Abschnitt 4.

Basis: `docs/code-health-2026-10-11.md` (Pakete 1-6), `docs/component-inventory-2026-10-11.json`, `docs/working-process.md`, `docs/style-guide.md` und die genannten Quelldateien (gelesen am 2026-10-11).

Legende: **[M]** = gemessen (wc, grep, eslint, Inventar-JSON, Dateien gelesen). **[S]** = geschätzt. Alle Zeilen-Ersparnisse und Aufwände sind **[S]**.

## 0. Abweichungen zum Code-Health-Report (Stand heute gemessen)

Seit dem Report ist Code geändert worden. Mehrere Report-Punkte sind schon erledigt oder anders:

| Punkt | Report | Heute [M] |
|---|---|---|
| ESLint-Warnungen | 19 (Report), 59 (Auftrag) | **22 Warnungen, 0 Fehler** (`npx eslint src`); 15 davon mit `--fix` behebbar. Die 59 sind nicht reproduzierbar, vermutlich älterer Stand. Neu gegenüber Report: `GLASS_EDGE` ungenutzt in `settings/streaming-services.tsx:14`, `userGroupsQuery` ungenutzt in `add-movie.tsx:72` und `studio/[companyId].tsx:40`, 3 ungenutzte Typen in `groups.ts:61,113,191` |
| `src/lib/colors.ts` (H2) | fehlt | **existiert** (`LIKE_HEART_COLOR`, `PLACEHOLDER_COLOR` = `#888888`, BG/TEXT/DANGER/SUCCESS/STAR_EMPTY). Rest von H2 (Grau-Icons, `#22c55e`, rgba) nicht geprüft |
| `showSuccessToast`/`showErrorToast` | ungenutzt | **nicht mehr vorhanden** (grep ohne Treffer) |
| `expo-web-browser`, `logo-glow.png`, `expo-logo.png`, `expo.icon/` | ungenutzt | `package.json` ohne `expo-web-browser`; `assets/images/` ohne die beiden PNGs. `expo.icon/` nicht erneut geprüft |
| `PANEL_SHADOW_HEIGHT`, `GLASS_ROW_/GLASS_SHEET_CLASSNAME` | Alias/ungenutzt | grep ohne Treffer (entfernt). `GLASS_EDGE` = `GLASS_INSET_EDGE` besteht weiter (`Glass.tsx:17,19`) |
| Skeleton-Kommentare | veraltet | nur noch `LoadingArea.tsx:8` ("Replaces the former skeleton"), ok |
| Tests `EntryFilterFlyout`, `EntryFilterPills`, `CreateGroupSheet` | fehlen | **existieren** (`__tests__/components/entries/`, `__tests__/components/settings/CreateGroupSheet.test.tsx`). Paket 3 des Reports (Tests als Netz) ist damit großteils erledigt |
| Größen | group-settings 616, add-movie 607, ... | group-settings **616**, movie/[tmdbId] **587**, RatingDialog **560**, add-movie **398**, settings **397**, TagebuchEntryList **394** (Dateizeilen). Der Auftrag nennt Funktionsgrößen (537/504/331/304/423); die Datei-Zeilen stehen oben |
| `eslint-disable` | 15 | 15 in 11 Dateien (unverändert); davon 8x Draft-Reset bei Sheets: `PaymentModal.tsx:86,90`, `RatingDialog.tsx:198,207`, `MovieDetailReleaseDateSheet.tsx:43,46`, `TrackerEntrySheet.tsx:48,52`; plus `group-settings.tsx:132,138` (Server-Sync, Gruppenwechsel) |

Konsequenz: P-H ist kleiner als im Report; P-E/P-B behalten ihren Umfang.

## 1. Ziel und Prinzipien

**Ziel:** weniger Code, ein Muster pro Aufgabe, keine Drift mehr zwischen Tagebuch/Watchlist und zwischen den Modal-Screens. Kein neues Feature, keine Optikänderung.

| Prinzip | Konkret |
|---|---|
| Weniger Code, ein Muster pro Aufgabe | Jede Paket-Basis ersetzt mehrere Varianten; Alt-Dateien werden gelöscht, nicht daneben gelassen |
| Keine optische Regression | Bewusste Angleichungen (z. B. Listenabstand) sind in Abschnitt 4 als Entscheidung gelistet; sonst Pixel-gleich. Handy-Screenshots vorher/nachher |
| TDD (red-green-refactor) | Pro Paket zuerst Charakterisierungstests für das bestehende Verhalten (grün), dann umbauen, Tests bleiben grün. Neue Basiskomponenten bekommen eigene Tests zuerst |
| Maestro/testIDs erhalten | Bestehende testIDs bleiben wörtlich (Flows und Tests hängen daran). Wo testIDs vereinheitlicht werden sollen, erst Entscheidung (4.3) und Flows im selben Commit anpassen |
| Speicher-Regel Pi | `jest` mit `maxWorkers: 2` (package.json), **nie parallel zu `tsc`**, nie zweiter Gesamtlauf (`working-process.md` Punkt 12) |
| Ein Paket nach dem anderen | Kein paralleles Bearbeiten zweier Pakete (gemeinsame Dateien, kein `git stash`) |
| Nach jedem Paket | `npx tsc --noEmit` dann `npx jest` (nacheinander), `scripts/maestro-all.sh --changed` (Vollauf bei Shared-Komponenten), Screenshots ansehen und senden, **ein Commit pro Paket** (nur nach Freigabe, `working-process.md` Punkt 7), Handy-Test |
| Prozess | Umsetzung per Subagent (Projektregel), Implementierungs-Subagents spawnen keine eigenen. Dieser Plan wurde ohne Subagent erstellt (Auftrag) |
| Doku mitpflegen | `docs/maestro-coverage.md`, `.maestro/areas.json`, `docs/code-health-r-items.md`, `docs/style-guide.md` bei jedem Paket aktuell halten |

## 2. Pakete

Aufwand: S < 0,5 Tag, M ca. 1 Tag, L > 1 Tag. Testrisiko: Hoch/Mittel/Niedrig. "Lauf" = ein Agenten-Durchgang inkl. tsc/jest.

### P-H Aufräumen (klein, zuerst)

| Feld | Inhalt |
|---|---|
| Ziel | Lint auf 0, tote Reste weg, Android-Gap-Risiko beseitigen, Doku-Drift bereinigen |
| Dateien | **ESLint (22 Warnungen [M])**: `array-type` in `add-movie.tsx:49`, `notifications.tsx:66,74`, `(tabs)/_layout.tsx:47`, `MovieGrid.tsx:74`, `useActiveGroup.ts:35`, `useGroupQuickSwitch.ts:15,17`, `useMyStreamingProviders.ts:14`, `usePushNotificationRouting.ts:51`, `gridPadding.ts:15` (`--fix`); `no-unused-vars` in `add-movie.tsx:72`, `studio/[companyId].tsx:40`, `streaming-services.tsx:14`, `groups.ts:61,113,191`; `import/no-duplicates` `addMovieLogic.ts:2,3`; `import/first` `legalLinks.ts:40`, `trackerLogic.ts:227`; unbenutzter Disable `BrandLogo.tsx:10` |
| | **`GLASS_EDGE`/`GLASS_INSET_EDGE`** zusammenlegen: `Glass.tsx:17,19`; Nutzer `Select.tsx:5,184,282`, `DateField.tsx:10,89`, `CreateGroupSheet.tsx:6,67`, `settings.tsx:18,382`, `group-settings.tsx:38,382`, `streaming-services.tsx:14,105`, `Glass.tsx:121,124` (Entscheidung 4.7: welcher Name bleibt) |
| | **`noHardcodedAccent`-Test** (`__tests__/theme/noHardcodedAccent.test.ts`) um Hex-Scan der Token-Dubletten (`#e05c6e`, `#888888`, `#8b8b8b`, `#0a0a0a`, `#e8e8e8`) mit Allowlist `src/lib/colors.ts`, `groupTheme.ts`, `global.css` erweitern. Vorher Ist-Messung nötig, welche Treffer legitim sind |
| | **Ungenutzte Funktionen**: `src/lib/addMovieLogic.ts` hat 6 Exporte (`mapSearchResultToGridItem:13`, `mapMovieLikeToGridItem:31`, `needsManualReleaseDate:46`, `findDuplicateRatedEntry:64`, `formatAverageRating:83`); vor dem Löschen je Export per grep auf Nutzung (src und `__tests__`) prüfen, nur wirklich unbenutzte entfernen. `GridSeparator`/`ItemSeparator` in `TagebuchEntryList.tsx:83,87` (genutzt in `:322,376`; entfallen erst mit P-C, hier **nicht** löschen) |
| | **Wrap-Rows mit className-Gap** (Android-Gap-Problem): `RatingDialog.tsx:411` (`flex-row flex-wrap gap-x-6`), `MovieDetailProviders.tsx:105` (`flex-row flex-wrap gap-x-3 gap-y-2`) und gleichartige `flex-wrap gap-2` in `EntryFilterPills.tsx:30,62,97`. Auf explizite Abstände (`mr-`/`mb-` an den Kindern) umstellen, falls das Verhalten auf dem Handy abweicht. Nur umbauen, wenn Pixel-gleich (siehe 4.8) |
| | **Doku**: `docs/code-health-r-items.md` (Stand R7-R10 einpflegen), Kopfhinweis "historisch" in `docs/performance-scroll-analysis.md` und `docs/interim-decisions.md`, `docs/backlog.md` (expo-blur abhaken), `style-guide.md` (Herz-Token statt `#e05c6e`, Sheet-Draft-Konvention nach P-E) |
| | **Jest-Teardown-Warnung**: Ursache erst identifizieren (welcher Test hält Timer/Handle offen, `--detectOpenHandles` nur einzeln, nicht im Gesamtlauf); Fix im Test-Setup, nicht per Timeout-Erhöhung |
| Vorher/Nachher | Keine neue Struktur, nur Entfernen/Angleichen |
| Ersparnis [S] | 40-80 Zeilen netto, Lint 22 auf 0 |
| Aufwand | S |
| Testrisiko | Niedrig: mechanisch; Tests laufen sowieso. Wrap-Row-Umbau ist das einzige visuelle Risiko |
| Neue/angepasste Tests | `noHardcodedAccent` erweitert; evtl. Test für `addMovieLogic`-Reste (bleibende Funktionen) |
| Maestro/areas | `--changed`; bei Wrap-Row-Umbau Flows `rating-cycle`, `movie-detail-full`. `areas.json`: keine Änderung |
| Rollback | Ein Commit; Revert |
| Abhängigkeiten | keine |
| Handy-Test | Ja, nur bei Wrap-Row-Umbau (Rating-Dialog, Anbieter-Zeile); sonst nein |

### P-A Modal-Screens zu EINER Basiskomponente (Schauspieler, Regie, Studio, Ähnliche Filme, Filmreihen)

**Status: erledigt 2026-10-11.** `MovieGridScreen.tsx` (176 Z.) + `ProviderFilteredMovieGrid.tsx` (26 Z.); Screens 603 auf 181 Z. (29/29/40/47/36). Gesamt 603 auf 383 Zeilen (-220), plus neuer Test `MovieGridScreen.test.tsx`. Abweichung vom Entwurf: Filter als `Grid`-Prop (`ProviderFilteredMovieGrid`) statt Hook, `useLibraryBadge` nicht extrahiert (Badge-Logik liegt in der Basis). testIDs und Optik unverändert.

| Feld | Inhalt |
|---|---|
| Ziel | 5 Screens (88/92/159/149/116 Zeilen [M]) teilen dieselbe Kette: Params prüfen, Gruppe/Watchlist laden, Query, Items mappen, Laden/Fehler, `MovieGrid`. Inventar-Ähnlichkeit: actor/director 1,0; actor/similar 1,0; studio zu den anderen 0,84; collection zu den anderen 0,82 und 0,69 zu studio [M]. jscpd findet 4 Klone in diesen Dateien [M] |
| Dateien | `app/(app)/(modals)/filmography/actor/[personId].tsx`, `.../director/[personId].tsx`, `.../studio/[companyId].tsx`, `similar/[tmdbId].tsx`, `collection/[collectionId].tsx`; `lib/addMovieLogic.ts:31` (`mapMovieLikeToGridItem` existiert schon und wird in den Screens **nicht** genutzt: die Item-Zuordnung ist 4x von Hand: actor `:36-42`, studio `:70-77`, collection `:49-55`); `lib/movieDetailNavigation.ts`; `components/movie/MovieGrid.tsx` |
| Reale Unterschiede [M] | (a) Studio: `useInfiniteQuery`, Dedupe über Seiten, "Mehr laden"-Button (`:140-154`), kein Fortschritt/Filter. (b) Actor/Director: Fortschrittskopf `computeFilmographyProgress`, `streamingFilter={null}`. (c) Similar/Collection: Streaming-Kategorie-Filter (`useMoviesProviders`, `filterByProviderCategory`). (d) Collection: Titelzeile über dem Grid (`:93`), `getBadge` nur mit `activeGroupId`. (e) Similar: `router.replace` plus Gruppenkontext-Params (`:98-138`), alle anderen `router.push` ohne Kontext. (f) Fehler-testIDs uneinheitlich: `*-screen-error` (actor/director/studio, auch bei Query-Fehler) vs `*-screen-error-data` (similar/collection, Query-Fehler) vs `*-screen-error` (ungültige Params). Fehlertexte je Screen eigen |
| Vorher/Nachher | **Neu:** `components/movie/MovieGridScreen.tsx` (View + Zustände + Grid) mit Props: `testIDPrefix` (z. B. `actor-filmography-screen`), `title?`, `query: { isLoading, isError }`, `items: MovieGridItem[]`, `invalidParams?: string` (Text), `errorText`, `emptyMessage`, `onPressItem(item)` oder `navigation: "push" \| "replace"`, optional `progress`, `streamingFilter`, `footer`. **Neu:** Hook `useLibraryBadge()` (Watchlist-Query, `currentUserId`, `getBadge`) und `useStreamingCategoryFilter(items)` (State, Provider-Query, `filterByProviderCategory`). Die 5 Screens schrumpfen auf Datenquelle plus Props (je ca. 25-45 Zeilen). Studio behält `useStudioFilmography` plus `footer` |
| Detail-Navigation | Alle über `navigateToMovieDetail*` (`lib/movieDetailNavigation.ts`); `replace` vs `push` und Gruppenkontext bleiben pro Screen wie heute (Entscheidung 4.2 bestätigt das) |
| Ersparnis [S] | 150-220 Zeilen (5 Screens ca. 600 auf ca. 250 plus Basis ca. 120) |
| Aufwand | M |
| Testrisiko | Mittel: 5 Screen-Tests (`ActorFilmography`, `DirectorFilmography`, `StudioFilmography`, `SimilarMovies`, `Collection` unter `__tests__/screens/`) hängen an testIDs und Texten; Mocks der Hooks bleiben, weil die Hooks bleiben. Hauptgefahr: `router.replace`/`push`-Erwartungen, `getBadge`-Bedingung in Collection |
| Neue/angepasste Tests | Zuerst Charakterisierung: Test pro Screen auf Zustände (invalid, loading, error, empty, data) und Navigationsart. Neu: `__tests__/components/movie/MovieGridScreen.test.tsx`; `useLibraryBadge`-Test |
| Maestro/areas | Bereich `movie-detail` (`areas.json:145-177`, deckt filmography/similar/collection ab), Flows `movie-collection`, `movie-detail-full`, `add-movie-modes`, `back-navigation`, `deeplinks`. `coverage.md` ohne Änderung, falls testIDs gleich bleiben |
| Rollback | Ein Commit; Revert stellt alte Screens her |
| Abhängigkeiten | Keine harte; `ScreenState` (Fehler/Leer-Vereinheitlichung aus Report M2) wird hier als Teil der Basis gebaut, nicht separat |
| Handy-Test | Ja: je ein Screen pro Typ (Schauspieler, Studio mit "Mehr laden", Ähnliche Filme mit Filter, Filmreihe) |

### P-E Gemeinsames DraftSheet (Entwurf/Abbrechen/Speichern)

**Status: erledigt 2026-10-11.** `ui/DraftSheet.tsx` (180 Z., `DraftSheet` + `DraftSheetForm`, Remount statt Effekt-Reset, Entscheidung 4: `key`). Umgestellt: RatingDialog, PaymentModal, TrackerEntrySheet, MovieDetailReleaseDateSheet, CreateGroupSheet; neu `settings/DisplayNameSheet.tsx` (84 Z.) aus `settings.tsx`. `EntryFilterFlyout` geprueft, anderes Muster (Anwenden/Zuruecksetzen), nicht umgestellt. Zeilen vorher/nachher der betroffenen Dateien: 1554 auf 1525 (-29; Rating 560 auf 541, Payment 195 auf 185, Tracker 174 auf 187, Release 109 auf 92, Create 119 auf 109, settings 397 auf 327, plus DisplayNameSheet 84), `group-settings.tsx` -3 (`createSheetKey` entfallen). Mit der neuen Basis (180) netto +151: die Plan-Schaetzung 60-100 Zeilen Ersparnis wurde nicht erreicht, Gewinn ist ein Muster und kein Effekt-Reset mehr. 4 `eslint-disable react-hooks/set-state-in-effect` entfernt (Rating, Payment, Tracker, Release); 3 bleiben bewusst (`group-settings.tsx` x2: Namens-Sync, kein Sheet; `usePushPermissionStatus.ts`: async Lookup). Neuer Test `DraftSheet.test.tsx` (15 Tests). Payment/Tracker haben unveraendert KEIN Abbrechen (Optik identisch).

| Feld | Inhalt |
|---|---|
| Ziel | Das Muster "Entwurf beim Öffnen zurücksetzen, Footer Abbrechen/Speichern, Loading, Fehler-Toast" einmal bauen; 8 `eslint-disable` fallen weg |
| Betroffene Sheets (einzeln) [M] | (1) `RatingDialog.tsx` (560 Z.; Effekt `:198-208`, 7 useState, Modi watchlist/diary/direct, Löschen-Bestätigung). (2) `PaymentModal.tsx` (195; Effekt `:86-91`). (3) `TrackerEntrySheet.tsx` (174; Effekt `:48-53`, Schlüssel `entryId` statt `visible`). (4) `MovieDetailReleaseDateSheet.tsx` (109; Effekt `:43-47`). (5) `CreateGroupSheet.tsx` (119; setzt Entwurf per `handleCancel`, kein Effekt, kein Disable). (6) **Anzeigename-Sheet** in `settings.tsx:315-359` (State `:103-105`, `openDisplayNameSheet:112`, Speichern `:119-126`): **in eigene Komponente `components/settings/DisplayNameSheet.tsx` extrahieren**. (7) `EntryFilterFlyout.tsx` (214): ähnlich, aber Filter-Entwurf; im Report als Teil des Musters genannt, hier **nur prüfen**, nicht zwingend |
| Vorher/Nachher | **Neu:** Hook `useSheetDraft<T>(open, resetKey, initial)` liefert `[draft, setDraft, reset]`; setzt den Entwurf **ohne Effekt** zurück, durch "Zustand anpassen während des Renderns" (`resetKey`-Vergleich) oder durch Montage/Remount per `key` (genaue Technik ist Entscheidung 4.4; Vorgabe: kein `set-state-in-effect`). **Neu:** `components/ui/SheetFooter.tsx` mit Props `onCancel`, `onSave`, `saveLabel`, `saveDisabled`, `loading`, `destructive?` (zerstörende Aktion immer rechts, `style-guide.md` "Aktionsreihen"). Optional `useSheetSave` (mutateAsync, Fehler-Toast, Schließen). Sheets behalten ihren Inhalt |
| Ersparnis [S] | 60-100 Zeilen, minus 8 `eslint-disable` |
| Aufwand | M bis L (RatingDialog allein ist komplex; empfohlen in 2 Läufen: erst die 4 kleinen Sheets plus Anzeigename, dann RatingDialog) |
| Testrisiko | Mittel bis Hoch bei RatingDialog: Entwurfs-Verhalten ist dokumentiert ("nicht über Öffnen/Schließen bewahren", `RatingDialog.tsx:~185-190`); falsche Reset-Zeitpunkte brechen stille Zustände. Mittel bei den anderen |
| Neue/angepasste Tests | Zuerst `useSheetDraft`-Test (Reset bei Öffnen, Reset bei Schlüsselwechsel, kein Leak zwischen Filmen) und `SheetFooter`-Test; vorhandene `RatingDialog.test`, `PaymentModal.test`, `MovieDetailReleaseDateSheet.test`, `CreateGroupSheet.test`, `Tracker.test` (TrackerEntrySheet nur indirekt), `Settings.test` (Anzeigename) bleiben als Netz. Fehlend: eigener Test für `TrackerEntrySheet` (heute nur über Tracker-Test): vorab ergänzen |
| Maestro/areas | Flows `rating-cycle`, `tracker-payment`, `movie-detail-full`, `settings-edit`, `create-test-group`/`group-settings-edit`; `components/ui/**` löst im `--changed` den Vollauf aus (`SheetFooter` liegt dort): Vollauf einplanen |
| Rollback | Zwei Commits sind sinnvoll (kleine Sheets / RatingDialog); jeweils Revert |
| Abhängigkeiten | Nach P-H (Lint 0). Unabhängig von P-A. Nutzt Primitive `Sheet` (`ui/Sheet.tsx`, 230 Z.) unverändert |
| Handy-Test | Ja, zwingend vor P-B: Bewertung anlegen/ändern/löschen, Zahlung, Release-Datum, Anzeigename, Gruppe anlegen |

### P-B Filter-Panels und Pillen auf gemeinsame Basis

**Status: erledigt 2026-10-11.** Ähnlichkeit per Code-Lektüre geprüft: Panels real zu ca. 90 % gleich, Unterschiede nur Props (`tab`, Prefix, Sortfelder, aktive Filter, ViewMode-Button-testIDs, `actions`); `hasActiveFilters` beider Berechnungen ist äquivalent (`hasActiveListFilters` ruft intern `activeFilterKeys`), daher eine Berechnung. Neu `entries/EntryFilterPanel.tsx` (103 Z.); `TagebuchFilterPanel` (60) und `WatchlistFilterPanel` (74) gelöscht, Screens rufen das Panel direkt (Watchlist übergibt den Hinzufügen-`IconButton` als `actions`). Pillen: `PillRow` + `PillItem` in `EntryFilterPills.tsx`, die drei Exporte bleiben dünne Wrapper (API/testIDs unverändert); die Ähnlichkeit war real (identischer Container + Chip), Unterschiede nur Daten-Mapping. Zeilen vorher/nachher (`wc -l`): Panels+Pillen+beide Screens 480 (60+74+111+116+119) auf 478 (103+111+127+137), also netto -2 und keine echte Ersparnis (Plan-Schätzung 60-90 nicht erreicht: das Panel zählt die Prop-Verdrahtung in den Screens, die Pillen gewinnen durch `PillRow` nichts an Zeilen); Gewinn ist ein Muster statt zwei driftender Kopien. Neue Tests `EntryFilterPanel.test.tsx` (10, beide Tabs) und `PillRow` in `EntryFilterPills.test.tsx`. testIDs und Optik unverändert. tsc/jest (232 Suiten, 2530 Tests)/eslint grün.

| Feld | Inhalt |
|---|---|
| Ziel | `TagebuchFilterPanel` (60 Z.) und `WatchlistFilterPanel` (74 Z.) sind zu ca. 90 % gleich (Inventar 0,78); die drei Pillen-Komponenten in `entries/EntryFilterPills.tsx` (111 Z.) wiederholen dasselbe `View flex-row flex-wrap gap-2` plus `Chip` [M] |
| Echte Unterschiede [M] | Watchlist: Hinzufügen-`IconButton` in `actions` (`:100-108`), testID-Schema `watchlist-view-mode-${mode}-button` vs `tagebuch-view-mode-${mode}`; `hasActiveFilters`: Tagebuch aus `activeFilterKeys(...).length > 0`, Watchlist aus `hasActiveListFilters(f.stored, "watchlist")`; Sortierfelder `DIARY_SORT_FIELDS` vs `WATCHLIST_SORT_FIELDS`; Filter-Quelle `screen.activeFilters` vs `f.filters`; Tagebuch hat zusätzlich `TagebuchScopeSwitch` (außerhalb des Panels). Einrückungs-Rest bei `ViewModeToggle` in beiden Dateien. (`placeholderTextColor` ist inzwischen beidseitig `PLACEHOLDER_COLOR`, Drift erledigt.) |
| Vorher/Nachher | **Neu:** `components/entries/EntryFilterPanel.tsx`, Props: `tab: "diary" \| "watchlist"`, `testIDPrefix`, `sortFields`, `filters` (aktiv), `genreNamesById`, `viewMode`, `onViewModeChange`, `viewModeButtonTestID`, `actions?`, plus das `filters`-Objekt des Hooks. Die zwei alten Panels werden gelöscht, die Tab-Screens rufen `EntryFilterPanel` direkt. **Pillen:** `PillRow`-Basis (Container + testID + Chip-Liste) in `EntryFilterPills.tsx`; die drei Exporte bleiben als dünne Wrapper, **API und testIDs unverändert** (nur intern vereinfacht) |
| Ersparnis [S] | 40-60 Zeilen (Panel) plus 20-30 (Pillen) |
| Aufwand | S bis M |
| Testrisiko | Mittel: Panel ist heute nur über `Tagebuch.test`/`Watchlist.test` und Flows abgedeckt (`EntryPanelLayout.test`, `EntryFilterPills.test` existieren). testIDs `*-filter`, `*-search-input`, `*-view-mode-*` hängen in Flows (`tagebuch-filter-sort`, `watchlist-filter-sort`) |
| Neue/angepasste Tests | Neu: `EntryFilterPanel.test.tsx` (beide Tabs: testIDs, `hasActiveFilters`, Hinzufügen-Button nur Watchlist). Vorher: Charakterisierungstest für `hasActiveFilters`-Gleichheit beider Berechnungen (wenn sie abweichen, ist das ein Fund, Entscheidung 4.3) |
| Maestro/areas | Flows `tagebuch-filter-sort`, `watchlist-filter-sort`, `watchlist-add-remove` (Hinzufügen-Button); Bereiche der Tabs |
| Rollback | Ein Commit |
| Abhängigkeiten | Idealerweise **vor** P-C (P-C nutzt `EntryFilterPanel`); falls Entscheidung 4.3 die testID-Namen vereinheitlicht, gehört sie hierher |
| Handy-Test | Ja: Panel auf/zu, Suche, Sortierung, Filter-Flyout, Ansichtswechsel in beiden Tabs |

### P-C Gemeinsame Entry-Basis für Tagebuch und Watchlist (größter Hebel)

**Status: erledigt 2026-10-11 (ein Commit statt drei).** Neu: `hooks/useEntryScreen.ts` (209 Z., generisch, Strategie je Tab: `useSource`, `activeFilters`, `filter`, `deriveOptions`, `openEntry`), `components/entries/EntryList.tsx` (133 Z., Renderer-Props je Modus, EINE `VIRTUALIZATION`-Konstante, Remount-Key, Spaltenzahl, Platzhalter, Padding; `GridSeparator`/`ItemSeparator` entfallen, Abstand per `gap`) und `components/entries/EntryScreenFrame.tsx` (123 Z., Laden/Fehler/Streaming-Laden/Leer/Keine Treffer/Listen-Container/Flyout). `useTagebuchScreen`/`useWatchlistScreen` und `TagebuchEntryList`/`WatchlistEntryList` bleiben als duenne Huellen mit unveraenderter Rueckgabe-/Prop-API (Aufrufer, Panel-Typen und Tests bleiben stabil; direktes Ersetzen brachte keinen Vorteil). Drift angeglichen: Listenabstand wie Watchlist (Tagebuch `pb-8` -> Tabelle `pb-3`, Karten/Raster ohne Bottom-Padding, `gap-3`/`gap-2` statt Separatoren), Fehlerfarbe `text-danger` und `px-4` fuer beide, Streaming-Laden `px-8` fuer beide. testIDs unveraendert. Zeilen vorher/nachher (`wc -l`): Hooks 243+160, Listen 394+239, Screens 116+119 = 1271 vorher; nachher Hooks 183+99 (+209 `useEntryScreen`), Listen 305+168 (+133 `EntryList`), Screens 87+90 (+123 `EntryScreenFrame`) = 1397, also netto +126: KEINE Zeilenersparnis (Schaetzung 250-350 nicht erreicht, weil die Zeilenrenderer je Tab bleiben und die Strategie-Schnittstellen/Doku Zeilen kosten); Gewinn: ein Ort fuer Pipeline, Virtualisierung, Padding, Zustaende statt zwei driftender Kopien. Neue Tests: `useEntryScreen.test.tsx` (7), `EntryList.test.tsx` (8), `EntryScreenFrame.test.tsx` (5). Handy-Pruefung (Scroll-Test, 3 Modi, beide Tabs) steht noch aus.

| Feld | Inhalt |
|---|---|
| Ziel | Parallele Strukturen vereinen und die Drift beenden |
| Dateien [M] | `hooks/useTagebuchScreen.ts` (243), `hooks/useWatchlistScreen.ts` (160), `app/(app)/(tabs)/tagebuch.tsx` (116), `watchlist.tsx` (119), `components/tagebuch/TagebuchEntryList.tsx` (394), `components/watchlist/WatchlistEntryList.tsx` (239), (aus P-B) `EntryFilterPanel`, `lib/gridPadding.ts`, `ui/Glass.tsx` (`PANEL_LIST_*`) |
| Gleich [M] | Setup (Router, `useCurrentUserId`, `useActiveGroup`, `useGroupRealtimeSync`, `useRegisterFocusedGroupScreen`, Members, Watchlist-Query, Pref-Viewmode, `showTitlesInGrid`, `useEntryFilters`), Providers-Query nur bei `myStreaming`, Pipeline filtern, suchen, sortieren, `openEntry` + `navigateToMovieDetail`, `isLoading`/`isError`. Listen: `VIRTUALIZATION` wörtlich doppelt (`TagebuchEntryList.tsx:64`, `WatchlistEntryList.tsx:50`), 3 Modi, Memo-Rows, Remount-Key bei Sortierung/Spalten, Platzhalter-Zellen |
| Drift heute [M] | Fehlerfarbe `text-text-primary` (`tagebuch.tsx:48`) vs `text-danger` (`watchlist.tsx:~51`); Fehler-Padding `px-6` vs `px-4`; Fehlertext "Fehler beim Laden des Tagebuchs." vs "Die Watchlist konnte nicht geladen werden."; Listenabstand unten `pb-8` (`TagebuchEntryList.tsx:323,354,377`) vs `pb-3` (`WatchlistEntryList.tsx:190`); Item-Abstand `ItemSeparatorComponent` vs `gap-2`/`gap-3` (`WatchlistEntryList.tsx:215-216`); testIDs `tagebuch-entry-list` für alle Modi vs `watchlist-list`/`watchlist-grid-or-cards`; Zähler `tagebuch-loading` vs `watchlist-loading`. Auftragsvorgabe: **Listenabstand folgt der Watchlist-Variante (`pb-3`, gap)** |
| Vorher/Nachher | **Hook:** `hooks/useEntryScreen.ts` (generisch) mit Strategie-Parametern: `tab`, `useEntries()` (Quelle: Watchlist-Split vs Diary/MyDiary/Scope), `filterFn`, `scopeAware`, `openEntry`-Strategie, `viewModePref`. `useTagebuchScreen`/`useWatchlistScreen` bleiben als dünne Hüllen (öffentliche Rückgabeform bleibt, Tests bleiben), nur Strategien. **Frame:** `components/entries/EntryScreenFrame.tsx` (SafeAreaView, AppHeader, Panel-Slot, Laden/Fehler/Providers-Laden/Leer/Keine-Treffer/Liste im `PANEL_LIST_OVERLAP_CLASSNAME`, Flyout). **Liste:** `components/entries/EntryList.tsx` mit Renderern: `renderGridItem`, `renderListRow`, `renderCard` (Tagebuch: Diary-Karten, Watchlist: Poster-Karten) und **einer** `VIRTUALIZATION`-Konstante in `lib/` oder `entries/`. Pro Modus Padding/Gap aus einer Stelle. Tagebuch-Besonderheiten (Scope-Switch, `groupMemberIds`, `displayNameById`, `starColor`) bleiben Strategie-Props |
| Ersparnis [S] | 300-400 Zeilen laut Report; eigene Schätzung nach Lektüre: 250-350 |
| Aufwand | L (2-3 Läufe: Hook, Frame, Liste getrennt, je ein Commit) |
| Testrisiko | Hoch: `Tagebuch.test`, `Watchlist.test`, `TagebuchEntryListMemo.test`, `WatchlistEntryListMemo.test`, `EntryPanelLayout.test`, `GridColumns.test` hängen an Struktur/testIDs; Memo-Vergleich (`propsEqualIgnoringIndex`) ist Performance-kritisch (Scroll-Analyse); Hook-Rückgabeform ist von Panels typisiert (`ReturnType<typeof useTagebuchScreen>`) |
| Neue/angepasste Tests | Vorher Charakterisierung: Zustände (laden/Fehler/leer/keine Treffer/Liste) pro Tab, Modi (grid/list/cards), Sortierung-Remount. Nach Umbau: `useEntryScreen`, `EntryScreenFrame`, `EntryList` eigene Tests; die zwei Memo-Tests zusammenführen oder anpassen |
| Maestro/areas | Bereiche der Tabs (`areas.json:124` u. a.), Flows `tagebuch-filter-sort`, `watchlist-filter-sort`, `watchlist-open-detail`, `watchlist-add-remove`, `tabs-tour`; wegen Shared-Komponenten **Vollauf**. `maestro-coverage.md`/`areas.json`: neue Pfade `components/entries/EntryList*`, `EntryScreenFrame`, `hooks/useEntryScreen.ts` aufnehmen |
| Rollback | Ein Commit je Teilschritt (Hook, Frame, Liste) |
| Abhängigkeiten | Nach P-B (Panel); P-E nicht nötig. Entscheidungen 4.3 (Drift) vorher klären |
| Handy-Test | Ja, zwingend, mit Scroll-Test auf großer Liste (Performance-Regression) in allen 3 Modi beider Tabs |

### P-D Karten und Badges (prüfen, was wirklich zusammenlegbar ist)

| Feld | Inhalt |
|---|---|
| Ziel | Nur zusammenlegen, was identisch ist |
| Befund [M] | `DiaryEntryCard` (117 Z., Karte Tagebuch), `WatchlistPosterCard` (223 Z., Karte und Grid-Kachel der Watchlist), `DiaryPosterTile` (85 Z., Grid-Kachel Tagebuch): unterschiedliche Inhalte (Score-Pille, Mitglieder-Sterne, Provider-Badge, Datum). Gemeinsam nur Poster-Platzhalter-Icon (`PLACEHOLDER_COLOR` jetzt zentral) und Titel. **`PosterTmdbBadge` (21 Z.) ist bereits ein dünner Wrapper um `ui/TmdbBadge` (44 Z.)** und gibt nur die Eck-Position vor: kein Doppelcode |
| Vorschlag | **Badges: so lassen** (Wrapper ist die Absicht, `style-guide.md` benennt sie als zwei Wege: "Corner badges on tiles only go through this and PosterCornerBadge"). **Karten: so lassen**, begründet: Zusammenlegen erzeugt eine Komponente mit vielen Modus-Props, die Lesbarkeit sinkt und die Ersparnis ist gering (Report: "gering"). Möglich und klein: gemeinsames `PosterImage` (Poster + Platzhalter + Radius) falls P-C beim Bauen der Renderer Duplikate zeigt. Wird erst dann entschieden |
| Ersparnis [S] | 0-40 Zeilen |
| Aufwand | S (nur Prüfung nach P-C) |
| Testrisiko | Niedrig bis Mittel (nur falls `PosterImage` extrahiert wird: `DiaryEntryCard.test`, `DiaryPosterTile.test`, `WatchlistPosterCard.test`, `PosterTmdbBadge.test`) |
| Neue Tests | nur bei Extraktion |
| Maestro/areas | Bereiche Tagebuch/Watchlist, Screenshots Karten und Grid prüfen |
| Rollback | Ein Commit |
| Abhängigkeiten | Nach P-C |
| Handy-Test | Nur falls etwas extrahiert wird |

### P-F Tracker-Tabelle auf GlassTable-Bausteine umstellen

| Feld | Inhalt |
|---|---|
| Ziel | Tracker baut Tabelle selbst (`tracker.tsx:184-266`, `ScrollView` + eigener Header `:190-`), nutzt nur die Zell-Konstanten `TABLE_TITLE_CELL`/`TABLE_DATE_CELL` aus `GlassTable` (`tracker.tsx:22`). `GlassTable.tsx` (129 Z.) bietet `GlassTableHeader`, `GlassTableHeaderCell`, `GlassTableRow`, `GlassTableHeaderIconCell` |
| Befund [M] | Tracker-Header: Zellen mit eigenen Klassen (`flex-1`, `w-24`, `w-28`), `text-sm text-text-secondary`; Zeile: Pressable ohne `GlassTableRow`; farbiger Zahler-Punkt über Inline-Style (`:253`, legitim dynamisch). Report bewertet "geringe Abweichung, vertretbar, Einsparung 0" |
| Vorher/Nachher | Header/Zeilen auf `GlassTableHeader`/`GlassTableRow` umstellen; die Spaltenbreiten bleiben tracker-lokal. Risiko: `GlassTableRow` setzt `py-3`, Eckenlogik für letzte Zeile (`isLast`) und Border; Tracker hat `Glass`-Container mit `px-3 pb-1 pt-3` – kleine optische Abweichungen möglich |
| Ersparnis [S] | 10-30 Zeilen. **Nutzen ist vor allem Konsistenz, kaum Code.** Empfehlung: **nur machen, wenn Entscheidung 4.5 "ja"** |
| Aufwand | S |
| Testrisiko | Mittel: `Tracker.test.tsx`, Flow `tracker-payment` (Zeilen-testIDs, Zahlungs-Flyout), `GlassTable.test.tsx`; Maestro-Flow löscht/ändert Zahlungen (nur Selbst-Angelegtes, `working-process.md` 4a) |
| Neue Tests | Charakterisierung: Tracker-Header-testID `tracker-table-header`, Zeilen-testIDs bleiben. Optik per Screenshot vorher/nachher |
| Maestro/areas | Bereich `tracker` (`areas.json:70`), Flow `tracker-payment`; `GlassTable` in `components/ui/**`: Vollauf |
| Rollback | Ein Commit |
| Abhängigkeiten | Keine; nach P-E sinnvoll (PaymentModal/TrackerEntrySheet im selben Bereich schon stabil) |
| Handy-Test | Ja (Screenshot-Vergleich vorher/nachher) |

### P-G Große Seiten aufteilen, Gruppen-Mutations-Gerüst, Navigation

**Status: erledigt 2026-10-11 (2 Commits).** Zeilen vorher/nachher (`wc -l`, Dateizeilen):

| Datei | vorher | nachher | ausgelagert nach |
|---|---|---|---|
| `group-settings.tsx` | 613 | 175 | `hooks/useGroupSettingsScreen.ts` (267), `settings/Group{Switcher,Name,Theme,Invite,Members}Section.tsx` (56/59/69/66/89); Leave-Button und die 4 Dialoge bleiben im Screen |
| `movie/[tmdbId].tsx` | 587 | 255 | `hooks/useMovieDetailScreen.ts` (375), `movie/MovieDetailContent.tsx` (96) |
| `RatingDialog.tsx` | 541 | 436 | `movie/Rating{SeenAt,GroupRatings,Payment}Section.tsx` (78/69/57), `buildOtherRatingRows` getestet |
| `add-movie.tsx` | 397 | 281 | `hooks/useAddMovieScreen.ts` (168) |
| `settings.tsx` | 327 | 212 | `settings/DeleteAccountDialog.tsx` (98), `settings/SettingsLegalGroup.tsx` (57) |
| `useGroupSettings.ts` | 220 | 176 | neu `hooks/useAppMutation.ts` (59) |
| `useMovieDetailMutations` / `useSaveRating` / `useTrackerPayments` / `useUpdateDisplayName` | 164 / 141 / 96 / 31 | 136 / 131 / 88 / 29 | auf `useAppMutation` |

Summe der Screens/Dialoge: 2465 auf 1359, dazu neue Dateien 1663 Zeilen (inkl. `useAppMutation`), die Mutations-Hooks schrumpfen um 92: netto ca. +465 Zeilen, KEINE Zeilenersparnis (wie im Plan erwartet). Gewinn ist Wartbarkeit: Verhalten (Hook) und Layout (Route) getrennt, Abschnitte einzeln benennbar, 7+ Mutationen ohne wiederholtes Gerüst, ein Ort fuer Toast+Invalidierung. Ehrliche Einschränkung: die Controller-Hooks (`useMovieDetailScreen` 375, `useGroupSettingsScreen` 267) sind selbst gross, weil sie die verschobene Logik 1:1 enthalten (kein Verhalten geändert, bewusst nicht weiter zerlegt); sie geben ein breites Objekt zurück, das ist die Kosten der Trennung.

Mutations-Gerüst: `useAppMutation({ mutationFn, invalidateKeys, successToast, errorToast, onSuccess, onError })` (Reihenfolge: invalidieren, `onSuccess`, Toast). Eingesetzt in `useGroupSettings` (7), `useMovieDetailMutations` (4, Toasts von `useAddToWatchlist`/`useSetReleaseDateOverride` hierhin), `useSaveRating` (2), `useTrackerPayments` (2), `useUpdateDisplayName`. Neuer Test `useAppMutation.test.tsx` (4). Bewusst NICHT umgestellt: `useDirectRate` (invalidiert in `onSettled`, auch bei Fehler, weil die Bewertung trotz Fehler gespeichert sein kann: andere Semantik), `useGroupPushSubscription` (zwei Mutationen mit Query-Optimistik/Statusabhängigkeit), Toasts in `RatingDialog`/`PaymentModal`/`TrackerEntrySheet`/`settings` (situationsabhängig, am Aufrufer gelassen, Konvention im Style-Guide).

Navigation: neu `navigateToMovieDetailWithContext(router, target, "push" | "replace")` in `lib/movieDetailNavigation.ts` (optionaler Gruppenkontext); genutzt in `MovieGridScreen` (3 Stellen), `add-movie` (2) und `usePushNotificationRouting`. Kein handgebautes `/movie/[tmdbId]` mehr ausser in `movieDetailNavigation.ts`. Nicht erledigt: Typ `MovieGridItem` nach `lib/` (Umkehr-Import `addMovieLogic.ts`), nicht Teil dieses Auftrags.

Bewusst NICHT aufgeteilt: die Modi-Panels von `add-movie.tsx` (Film/Person/Studio): sie teilen State (`query`, Auswahl) und das Pick-dann-Raster-Muster mit unterschiedlichen Queries; Zerlegung in `AddMovieModePanel`-Teile brächte viele Props ohne klarere Verantwortung, daher nur Hook-Auslagerung. `RatingDialog`: Sterne/Herz-Zeile, Löschen-Entwurf und Speichern/Direkt-Speichern bleiben im Body (eng verzahnter Draft-State mit den Mutationen, `useRatingDraft` würde nur verschieben). `settings.tsx`: Profil-/App-Gruppen bleiben, bestehen nur aus `SettingsGroup`/`SettingsRow`. Leave-Abschnitt in `group-settings` (ein Button) als Komponente wäre Wrapper ohne Verantwortung. Prüfung: tsc 0 Fehler, jest (Gesamtlauf), eslint 0. Maestro-Handy-Prüfung steht aus; `areas.json` um die neuen Dateien ergänzt.

| Feld | Inhalt |
|---|---|
| Ziel | Wartbarkeit, keine Zeilen-Ersparnis erwartet. Teile in benannte Komponenten/Hooks mit klarer Verantwortung |
| Teil 1 Aufteilung [M Größen, S Schnitt] | **`group-settings.tsx`** (616 Z., eine Komponente ab `:80`, 2 Disables `:132,138`): Hook `useGroupSettingsScreen` (State, Rename-Sync, Dialoge, Berechtigungen) plus Sektionen `GroupNameSection`, `GroupThemeSection`, `GroupInviteSection`, `GroupMembersSection`, `GroupLeaveSection`. **`MovieDetailScreen`** (`movie/[tmdbId].tsx`, 587 Z., Komponente ab `:84`): Controller-Hook `useMovieDetailScreen` plus Layout; `movieDetail*.ts` existiert schon (5 lib-Dateien). **`add-movie.tsx`** (398 Z.): 4 Modi (Film/Regie/Besetzung/Studio) in `AddMovieModePanel`-Teile plus Hook `useAddMovieSearch`. **`settings.tsx`** (397 Z.): Anzeigename-Sheet (P-E), `LegalSection`-Liste (`:72`), Konto-löschen-Dialog (`:~350-396`) in Teilkomponenten. **`RatingDialog.tsx`** (560 Z.): Sektionen `RatingStarsSection`, `SeenAtSection`, `PaymentSection`, `GroupRatingsSection` plus `useRatingDraft` (nach P-E) |
| Teil 2 Mutations-Gerüst | `hooks/useGroupSettings.ts` (220 Z.): 7 Mutationen mit identischem Aufbau "throw bei Fehler, invalidate, Toast": `useRenameGroup:28`, `useSetGroupTheme:61`, `useSetInviteEnabled:90`, `useRegenerateInviteToken:113`, `useRemoveMember:138`, `useLeaveGroup:169`, `useCreateGroup:200`. **Neu:** `useAppMutation({ mutationFn, invalidate, successMessage?, errorMessage? })` in `hooks/`; später auch `useTrackerPayments`, `useSaveRating`, `useMovieDetailMutations`, `useUpdateDisplayName`. Toast-Ort heute gemischt (Hook `useGroupSettings.ts:48`, Komponente `PaymentModal.tsx:130`, `TrackerEntrySheet.tsx:69`, `settings.tsx:126`): Konvention vorab (Entscheidung 4.6) |
| Teil 3 Navigation | Alle Filmdetail-Navigationen auf `navigateToMovieDetail*`: Von-Hand-Stellen [M]: `add-movie.tsx:153,163`, `collection:100`, `similar:124,134`, `studio:128`, `director:78`, `actor:74` (außer `add-movie` alle in P-A erledigt), plus `usePushNotificationRouting.ts:87`. Typ `MovieGridItem` von `components/movie/MovieGrid` nach `lib/` (Umkehr-Import in `addMovieLogic.ts:1`) |
| Ersparnis [S] | Mutationen 60-80 Zeilen; Aufteilung ca. 0 (verschiebt nur) |
| Aufwand | L (5 Seiten plus Mutations-Gerüst: 4-6 Läufe, in 3 Commits) |
| Testrisiko | Mittel bis Hoch: Seiten-Tests `GroupSettings.test`, `MovieDetail.test`, `AddMovie.test`, `Settings.test`, `RatingDialog.test`; Hook-Tests der Mutationen vielfältig; reine Verschiebung, aber viele Mocks hängen an Importpfaden |
| Neue Tests | Charakterisierung vor jedem Schnitt; `useAppMutation`-Test (Erfolg/Fehler/Invalidate/Toast); Sektionen testen nur bei neuer Logik |
| Maestro/areas | `group-settings-edit`, `settings-edit`, `movie-detail*`, `add-movie-modes`, `rating-cycle`; Bereiche `group-settings`, `settings`, `movie-detail`, `add-movie`, `rating`; `areas.json`-Pfade der neuen Dateien ergänzen |
| Rollback | Ein Commit je Seite/Teil |
| Abhängigkeiten | Nach P-E (RatingDialog/Settings-Sheet) und P-A (Navigation); Mutationen unabhängig |
| Handy-Test | Ja je Seite (Gruppeneinstellungen komplett durchspielen, Detailseite, Hinzufügen) |

## 3. Empfohlene Reihenfolge

| # | Paket | Begründung | Grobe Läufe [S] | Handy-Test vor Weiter |
|---|---|---|---|---|
| 1 | P-H Aufräumen | klein, risikoarm, Lint 0 als saubere Basis; Doku-Stand korrigiert | 1 | nur bei Wrap-Row-Umbau |
| 2 | P-A Modal-Screens | klar abgrenzbar, nutzt schon existierende Helfer (`mapMovieLikeToGridItem`, `navigateToMovieDetail`), mittleres Risiko, sichtbare Ersparnis; löst Navigation-Teil von P-G | 2 | Ja |
| 3 | P-E DraftSheet | entfernt 8 Lint-Disables, bereitet RatingDialog-Teilung vor; Netz-Tests vorher ergänzen | 2-3 | Ja |
| 4 | P-B Panel/Pillen | kleiner Vorlauf für P-C, isoliert | 1 | Ja |
| 5 | P-C Entry-Basis | größter Hebel, höchstes Risiko, daher erst nach Übung aus 2-4 und mit Entscheidungen 4.3 | 3-4 | Ja, mit Scroll-Test |
| 6 | P-D Karten/Badges | nur Prüfung nach P-C | 0-1 | nur bei Änderung |
| 7 | P-F Tracker-Tabelle | optional, geringer Nutzen, Optikrisiko | 1 | Ja |
| 8 | P-G Große Seiten + Mutationen | länger, braucht stabilere Basis (E, A) | 4-6 | Ja je Seite |

Gesamt grob **15-20 Agenten-Läufe [S]**, plus je Paket tsc, jest, Maestro (`--changed`, Vollauf bei P-E/P-C/P-F). Reihenfolge nach Risiko steigend, P-G zuletzt, weil es keine Zeilen spart.

Abhängigkeitsgraph: P-H unabhängig; P-A unabhängig; P-E vor P-G (RatingDialog, Settings); P-B vor P-C; P-C vor P-D; P-F frei, nach P-E empfohlen.

## 4. Entscheidungen für den User (max. 8)

| # | Frage | Empfehlung |
|---|---|---|
| 4.1 | Reihenfolge wie in Abschnitt 3 (H, A, E, B, C, D, F, G) ok? Oder zuerst P-C (größter Hebel)? | Reihenfolge wie vorgeschlagen: kleine, risikoarme Pakete zuerst |
| 4.2 | Die 5 Modal-Screens wirklich auf **eine** Basiskomponente `MovieGridScreen`? Bleiben `replace` (Ähnliche Filme) und Gruppenkontext-Params und die Collection-Titelzeile erhalten? | Ja, eine Basis; die Unterschiede (replace/push, Titel, Filter, Mehr laden) als Props. Navigationsart bleibt exakt wie heute |
| 4.3 | Drift Tagebuch/Watchlist angleichen: Listenabstand = Watchlist-Variante (`pb-3`, gap); Fehlerfarbe `text-danger` und ein Fehlerstil in beiden; testIDs vereinheitlichen (z. B. `*-view-mode-${mode}`)? testID-Umbenennung bricht Flows/Tests | Abstand und Fehlerfarbe ja (sichtbar nur minimal); testIDs **nicht** umbenennen (nur intern vereinheitlichen), sonst Flows/Coverage-Doku mitändern. Falls doch: alles im selben Commit |
| 4.4 | Technik für das DraftSheet: Entwurf ohne Effekt zurücksetzen per **Render-Phase-Anpassung** (`resetKey`-Vergleich) oder per **Remount mit `key`** (Inhalt als eigene Komponente, State dadurch frisch)? | Remount mit `key` (einfachste Regel, keine Disables); nur wo Entwurf Parent-State braucht, Render-Phase-Variante |
| 4.5 | Tracker-Tabelle auf `GlassTable` umstellen oder so lassen? (Ersparnis klein, Optikrisiko) | So lassen; nur umstellen, wenn Ihr Konsistenz höher gewichtet. Dann P-F streichen |
| 4.6 | Karten (`DiaryEntryCard`/`WatchlistPosterCard`/`DiaryPosterTile`) und Badges zusammenlegen oder getrennt lassen? Und Toast-Konvention (Erfolg/Fehler im Mutations-Hook oder in der Komponente)? | Karten und Badges getrennt lassen (P-D = nur Prüfung); Toast **im Mutations-Hook** (`useAppMutation`), Ausnahmen begründet |
| 4.7 | `GLASS_EDGE` vs `GLASS_INSET_EDGE`: welcher Name bleibt? Und `noHardcodedAccent`-Test auf die Hex-Dubletten erweitern? | Name `GLASS_EDGE` behalten (häufiger genutzt), `GLASS_INSET_EDGE` löschen; Test erweitern mit Allowlist `colors.ts`/`groupTheme.ts` |
| 4.8 | Maestro-Vollauf am Handy: nach jedem Paket oder nur nach P-E, P-C, P-F und am Schluss? Wrap-Row-Umbau (Android-Gap): auf `mr-`/`mb-` jetzt umstellen oder erst wenn auf dem Handy etwas auffällt? | Vollauf nach P-E, P-C, P-F und am Ende; sonst `--changed`. Wrap-Rows umstellen, aber nur mit Screenshot-Beleg (Gap in `flex-wrap` ist auf Android unzuverlässig) |

## 5. Nicht-Ziele

| Nicht Ziel | Anmerkung |
|---|---|
| Neue Features | keine |
| Optikänderungen | ausgenommen die in 4.3 genehmigte Angleichung von Abstand/Fehlerfarbe |
| Neue Bibliotheken / Stack-Änderungen | nein (ADRs gelten) |
| Datenmodell, Supabase, Migration | unberührt |
| `lib/`-Umbenennung (`entry*`, `movieDetail*`), `src/theme/`, Logo-PNG-Ersatz | gehören zu Report N3/N4, nicht in diesen Plan |
| `select('*')`-Änderungen | Report N5, nicht in diesem Plan |
| Performance-Optimierung `MovieGrid` (Virtualisierung, Report M6) | ausgeklammert; kann in P-A/P-C als Folgeschritt beschlossen werden |
| Testabdeckung insgesamt erhöhen | nur Tests, die ein Paket absichern |

## 6. Gemessen / geschätzt

- **Gemessen:** ESLint-Lauf (22 Warnungen), Dateizeilen (`wc`), Zeilenbelege in diesem Dokument (grep/Lesen), Unterschiede der 5 Modal-Screens (diff/Lesen), Panel-Unterschiede, existierende Tests/Flows (ls), erledigte Report-Punkte (grep).
- **Geschätzt:** alle Zeilen-Ersparnisse, Aufwand S/M/L, Lauf-Anzahl, Testrisiko-Bewertungen, Komponenten-Props der neuen Basen (Skizzen, nicht final).
- **Nicht gelaufen:** `tsc`, `jest`, Maestro. Die 59 Lint-Warnungen aus dem Auftrag sind nicht reproduzierbar (heute 22).
