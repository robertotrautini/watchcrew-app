# Code-Gesundheits-Analyse 2026-10-11

Reine Analyse, kein Code geändert, kein Commit. Werkzeuge nacheinander gelaufen (Pi, 8 GB).
Legende: **[M]** = gemessen (Tool/grep/wc), **[S]** = geschätzt/aus Code-Lektüre abgeleitet.
Nicht gelaufen: `tsc`, `jest`, Maestro (nicht Teil der Aufgabe; Zahlen zu Suites stammen aus Dateizählung).

## 0. Kurzfazit

- Insgesamt gesund: **keine** Zirkel-Imports [M], **kein** `any` im Code [M], nur 19 ESLint-Warnungen (nicht 55) [M], exakte Klon-Rate 0,24 % [M], keine ungenutzten `src/`-Dateien laut knip [M], Query-Keys zentral [M].
- Das Problem ist **nicht** Copy-Paste im Textsinn (jscpd findet kaum etwas), sondern **parallele Strukturen mit leichten Abweichungen** (Tagebuch vs. Watchlist, 4 Sheet-Drafts, 5 Filmografie-Modals) und **Token-Doppelungen** (Hex-Konstanten in TS neben Tailwind-Tokens).
- Größter Hebel: gemeinsame Basis für Tagebuch/Watchlist (Hook, Screen-Rahmen, Liste, Panel), ca. 300–400 Zeilen weniger [S] und vor allem keine Drift mehr (siehe 2.1).

## 1. Struktur

### 1.1 Verzeichnislayout [M]

| Ordner | Dateien | Zeilen |
|---|---|---|
| `src/app` (Expo-Router) | 28 | 5292 |
| `src/components` (ui 36, movie 20, entries 4, settings 6, tagebuch 3, watchlist 2, + 9 lose) | 82 | 8314 |
| `src/hooks` | 43 | 2770 |
| `src/lib` | 64 | 5311 |
| `src/stores` | 3 | 270 |
| `__tests__` | 202 | 27375 |

- `src/theme/` **existiert nicht** (in der Aufgabenstellung erwähnt). Theme liegt verteilt: `tailwind.config.js`, `src/global.css`, `src/lib/groupTheme.ts`, `src/lib/navTheme.ts`, `components/GroupThemeProvider.tsx`. Kein Fehler, aber "wo sind die Tokens" hat 4 Antworten.
- Lose Dateien in `src/components/` (9) vermischen Provider, Kontexte und Views (`parallaxContext.ts`, `tabSwitchContext.ts`, `ParallaxProvider.tsx`, `BackSwipeView.tsx`, `TabSwipeView.tsx`, `modalScreenLayout.tsx`, `animated-icon.tsx`).
- `components/movie/` ist Sammelordner: Detail-Teile (`MovieDetail*`, 9 Dateien), Listen-Karten (`DiaryEntryCard`, `DiaryPosterTile`, `WatchlistPosterCard`, `PosterCornerBadge`), Dialoge (`RatingDialog`, `PaymentModal`, `TrackerEntrySheet`). Tracker-Sheet liegt unter `movie/`, `CreateGroupSheet` unter `settings/`.

### 1.2 Größte Dateien [M] (alle > 300 Zeilen = Aufteil-Kandidaten, insgesamt 10)

| # | Datei:Zeile Start der Hauptfunktion | Zeilen | Befund |
|---|---|---|---|
| 1 | `src/app/(app)/(modals)/group-settings.tsx:80` | 616 | Eine Komponente ~536 Zeilen, 2 eslint-disable (`:132`, `:138`) |
| 2 | `src/app/(app)/(modals)/add-movie.tsx:88` | 607 | Eine Komponente ~520 Zeilen, 4 Modi (Film/Regie/Besetzung/Studio) inline |
| 3 | `src/components/movie/RatingDialog.tsx:128` | 516 | ~390 Zeilen Funktion, 7 useState, 2 eslint-disable |
| 4 | `src/app/(app)/(modals)/movie/[tmdbId].tsx:74` | 492 | ~420 Zeilen, Detail-Screen-Controller + View |
| 5 | `src/components/tagebuch/TagebuchEntryList.tsx` | 396 | 3 Modi (grid/list/cards) mit je eigener Row |
| 6 | `src/app/(app)/(modals)/settings.tsx:93` | 396 | Hub + Anzeigename-Flyout + Legal + Delete |
| 7 | `src/components/movie/MovieDetailActionsBar.tsx` | 385 | Aktionsleiste + Mutations + Dialoge |
| 8 | `src/components/ui/Select.tsx` | 341 | Messen/Overlay-Geometrie, 5 Pressable; Primitive, ok |
| 9 | `src/lib/listFilters.ts` | 334 | Filter-Modell, Labels, Defaults; logisch zusammenhängend |
| 10 | `src/app/(onboarding)/create-or-join-group.tsx` | 320 | |
| 11-20 | `watchlistLogic.ts` 294, `tracker.tsx` 292, `MovieGrid.tsx` 285, `tmdbProxy.ts` 271, `trackerLogic.ts` 263, `register.tsx` 255, `movieDetailMutations.ts` 252, `useTagebuchScreen.ts` 243, `groups.ts` 245, `WatchlistEntryList.tsx` 239 | | unkritisch |

### 1.3 Schichtung

| Prüfung | Ergebnis |
|---|---|
| Zirkuläre Imports (`madge --circular`, 221 Dateien) | **keine** [M] |
| Supabase-Aufrufe in Komponenten/Screens | Nur `src/app/join/[token].tsx:12,40` (`supabase.auth.getSession()`). Sonst alles in `lib/` und ein paar Auth/Realtime-Hooks. Sauber. [M] |
| Supabase direkt in Hooks | `useAuthGate`, `useCurrentUserId`, `useCurrentUserEmail`, `useQueryCacheLifecycle`, `usePushNotificationRouting`, `useGroupRealtimeSync` (Auth/Realtime, vertretbar) [M] |
| lib -> components | `src/lib/addMovieLogic.ts:1` importiert Typ `MovieGridItem` aus `components/movie/MovieGrid` (umgekehrte Abhängigkeit; Typ nach `lib` verlegen) [M] |
| lib vs hooks | Klare Linie: lib = Funktionen/Supabase, hooks = TanStack-Wrapper. Ausnahmen: `lib/movieDetailMutations.ts` + `hooks/useMovieDetailMutations.ts` (ok, gleiche Trennung), aber **5 `lib/movieDetail*.ts`-Dateien** (`movieDetail`, `Logic`, `Types`, `Navigation`, `EntryContext`, `Mutations`) und **3 Filter-Dateien** `entryFilters.ts` / `entryFiltering.ts` / `listFilters.ts` mit kaum unterscheidbaren Namen [M] |
| Namenskonventionen | Komponenten PascalCase, Hooks `useX`, lib camelCase. Ausreißer: `animated-icon.tsx` (kebab), `Brand.tsx` + `BrandLogo.tsx` nebeneinander, `Glass.tsx` enthält Layout-Tokens (Panel-Konstanten) statt Komponente. Test-IDs uneinheitlich: Tagebuch `tagebuch-view-mode-${mode}`, Watchlist `watchlist-view-mode-${mode}-button` (`TagebuchFilterPanel.tsx:49` vs `WatchlistFilterPanel.tsx:60`) [M] |

## 2. Duplikate

### 2.1 jscpd (`--min-lines 8 --min-tokens 60`) [M]

4 Klone, 52 Zeilen (0,24 %), alle in den Modal-Screens:

| Klon | Orte |
|---|---|
| 9 Z. | `collection/[collectionId].tsx:49-57` <-> `filmography/actor/[personId].tsx:36-44` |
| 12 Z. | `collection/[collectionId].tsx:54-65` <-> `similar/[tmdbId].tsx:57-68` |
| 12 Z. | `filmography/actor/[personId].tsx:23-34` <-> `filmography/director/[personId].tsx:27-38` |
| 19 Z. | `filmography/actor/[personId].tsx:34-52` <-> `filmography/director/[personId].tsx:38-56` |

Mit niedrigerer Schwelle (5 Zeilen/40 Tokens) zusätzlich: `useGroupSettings.ts` (Mutations-Gerüst, 5 Stellen), `useMovieDetailMutations.ts`, `MovieDetailActionsBar.tsx:346`, `RatingDialog.tsx:458`. Die 5 Filmografie-/Sammlung-/Ähnliche-Filme-Screens (88/92/159/116/149 Zeilen) sind Varianten desselben "Query -> MovieGrid + Badge + Navigation"-Musters. Navigation zum Detail ist hier 7-mal von Hand gebaut (`router.push({pathname:"/movie/[tmdbId]"...})` in actor `:73`, director `:77`, studio `:127`, collection `:99`, similar `:123,:133`, add-movie `:180,:190`), obwohl `lib/movieDetailNavigation.ts` existiert (nur für Tabs benutzt, `useTagebuchScreen.ts:209`, `useWatchlistScreen.ts:133`).

### 2.2 Manuelle Befunde (strukturelle Duplikate, jscpd findet sie nicht) [M gelesen, Einsparung S]

| Paar | Was ist gleich | Drift bereits sichtbar | Einsparung [S] |
|---|---|---|---|
| `useTagebuchScreen.ts` (243) vs `useWatchlistScreen.ts` (160) | Setup (Router, userId, activeGroup, Realtime, FocusedScreen, Members, Watchlist-Query, ViewMode-Pref, showTitles, useEntryFilters), Providers-Query nur bei Streaming-Filter, Pipeline filter -> search -> sort, `openEntry` + `navigateToMovieDetail`, isLoading/isError-Aggregation | Tagebuch hat Scope "Mein Tagebuch"; `openEntry` mit/ohne Gruppe | ~60–80 Z. in gemeinsamen Hook `useEntryScreenBase` |
| `tagebuch.tsx` (121) vs `watchlist.tsx` (127) | SafeAreaView + AppHeader + Panel + (Laden / Fehler / Providers-Laden / leer / keine Treffer / Liste in `PANEL_LIST_OVERLAP_CLASSNAME`) + `EntryFilterFlyout` | Fehler-Text `text-text-primary` (`tagebuch.tsx:46`) vs `text-danger` (`watchlist.tsx:51`); Padding `px-6` vs `px-4`/`px-8`; Fehlertext-Wortlaut | ~70 Z. in `EntryScreenFrame` |
| `TagebuchEntryList.tsx` (396) vs `WatchlistEntryList.tsx` (239) | `VIRTUALIZATION`-Konstante **wörtlich doppelt** (`Tagebuch:62`, `Watchlist:47`), `GRID_PLACEHOLDER`, `keyOfGridItem`, `useSortRemountKey`, `listKey`+`-c${gridColumns}`, FlatList-Gerüst je Modus, Memo-Rows mit `propsEqualIgnoringIndex` | Container-Padding `pb-8` (Tagebuch) vs `pb-3` (Watchlist); Karten/Grid-Abstand: `ItemSeparatorComponent` (Tagebuch) vs `gap-2/gap-3` (Watchlist); Grid-Separator `h-2` zusätzlich zu `columnWrapperStyle`; testIDs `tagebuch-entry-list` für alle 3 Modi vs `watchlist-list`/`watchlist-grid-or-cards` | ~80–100 Z. in `EntryFlatList` (Modus-Switch, Virtualisierung, Padding, Platzhalter) |
| `TagebuchFilterPanel.tsx` (59) vs `WatchlistFilterPanel.tsx` (73) | Gleiches `CollapsibleFilterPanel` + Search + `EntrySortRow` + `EntryFilterBar` + `ViewModeToggle` | `placeholderTextColor` `#888888` vs `#8b8b8b`; eingerückter `ViewModeToggle` (Prettier-Rest); `hasActiveFilters` anders berechnet (`activeFilterKeys` vs `hasActiveListFilters(f.stored)`) | ~40 Z. in `EntryFilterPanel` (Props: Prefix, sortFields, tab, actions) |
| `DiaryEntryCard` (119) vs `WatchlistPosterCard` (223) vs `DiaryPosterTile` (85) | Poster + Titel + Badge/Score; teils unterschiedliche Konstanten (`PLACEHOLDER_ICON_COLOR` `#8b8b8b` in `DiaryEntryCard.tsx:13` und `MovieGrid.tsx:34`) | Zwei Poster-Raster-Typen (Entry-Grid) plus drittes (`MovieGrid` für TMDB-Suche/Filmografie, eigener FlatList-Aufbau `MovieGrid.tsx:254` ohne die `VIRTUALIZATION`/Platzhalter-Logik) | gering; Zusammenführen lohnt nur für Poster-Placeholder + Badge |
| GlassTable-Zeilen vs Tracker-Tabelle (`tracker.tsx:188`, `ScrollView`) | Tracker nutzt nur Zell-Klassen aus `GlassTable` (`:20`), baut Tabelle selbst mit ScrollView | geringe Abweichung, vertretbar (nicht virtualisiert, kleine Datenmenge) | 0 |
| Sheet-Draft-Muster (Entwurf/Abbrechen/Speichern) in `RatingDialog`, `PaymentModal`, `TrackerEntrySheet`, `MovieDetailReleaseDateSheet`, `CreateGroupSheet` (+ `EntryFilterFlyout`) | `useEffect` setzt Entwurf beim Öffnen zurück (jeweils mit **2 eslint-disable**: `set-state-in-effect` + `exhaustive-deps`: `PaymentModal.tsx:86,90`, `RatingDialog.tsx:186,195`, `MovieDetailReleaseDateSheet.tsx:43,46`, `TrackerEntrySheet.tsx:48,52`); Footer mit `Button` Abbrechen/Speichern; "dirty"-Berechnung; Toast-Erfolg/Fehler | `CreateGroupSheet` setzt Entwurf per `handleCancel` statt Effekt | ~60–100 Z. + 8 eslint-disable; Hook `useSheetDraft(visible, key, initial)` + `<SheetFooter>` |
| Mutations-Hooks (Toast + Invalidate) | `useGroupSettings.ts` 7 Mutations (`:31,64,93,116,141,172,203`) mit gleichem Gerüst "throw-on-error -> invalidate -> showToast ok/err"; weitere in `useTrackerPayments`, `useSaveRating`, `useMovieDetailMutations`, `useUpdateDisplayName` | Toast mal im Hook (`useGroupSettings.ts:48`), mal in der Komponente (`PaymentModal.tsx:130`, `TrackerEntrySheet.tsx:69`, `settings.tsx:126`) | ~80 Z. mit `useAppMutation({invalidate, successMessage, errorMessage})` |

## 3. Toter Code

### 3.1 knip [M]

| Kategorie | Befund |
|---|---|
| Ungenutzte Dateien | In `src/`: **keine**. Sonst: `.maestro/subflows/shot.js`, `scripts/generate-logo-assets.js` (Skripte, vermutlich manuell/CLI, prüfen), 4 Supabase-Edge-Function-`index.ts` (Deno-Entrypoints = falsch positiv) |
| Ungenutzte Dependencies | `expo-web-browser` (kein Import, kein Plugin; **löschbar**). `expo-dev-client`, `expo-system-ui` laut depcheck "unused" -> Laufzeit-/Native-Abhängigkeiten ohne Import, **nicht löschen** (Dev-Client bzw. Android-Hintergrundfarbe) |
| Unlisted | `@expo/config` (nur `__mocks__`), `expo-updates` (`app.config.ts`), `@resvg/resvg-js` (nur `scripts/generate-logo-assets.js`) – devDependency-Hygiene |
| Ungenutzte Exporte `src/` (≈58) | Meist `export` ohne externe Nutzung (Konstanten): `Chip.tsx:18-28` (5), `Glass.tsx:31,43,62,64,68,78,86,87`, `MovieDetailCastRow.tsx:23-28` (6), `MovieDetailProviders.tsx:17-19`, `brandLogo.ts:14-23` (7), `backSwipe.ts`, `groupTheme.ts:66,89,154,174` (`isGroupThemeName`, `mixWithWhite`, `adjustLightness`, `STAR_YELLOW`), `queryPersistence.ts:45,64`, `Switch.tsx:63` (`FallbackSwitch`), `Text.tsx:18` (`withDefaultFont`), `Button.tsx:122` (`buttonHitSlop`), `homeRoute.ts:1`, `tabSwipe.ts:25` ... Teils nur für Tests exportiert (nicht automatisch tot) |
| Ungenutzte Typ-Exporte | 28 (z. B. `useMovieDetail.ts:24-28` Re-Exports, `groups.ts:11,61,113,191`, `usePreferencesStore.ts:18,27,46`) |
| Doppelte Exporte | `Glass.tsx`: `GLASS_EDGE`=`GLASS_INSET_EDGE` (identisch, 24 Nutzungen insgesamt), `PANEL_SHADOW_HEIGHT`=`PANEL_SHADOW_LAYERS` ("Kept as alias", `Glass.tsx:63`) |

### 3.2 Ungenutzte Hilfsfunktion [M]

`src/lib/toast.ts:49-62` definiert `showSuccessToast`/`showErrorToast`; **0 Aufrufer außerhalb von toast.ts**, stattdessen 24 Stellen `showToast(msg, { variant: ... })`. Entweder nutzen oder löschen.

### 3.3 Assets [M]

`assets/` = 3,2 MB, 28 Dateien. Im Code/Config **nicht referenziert**:

| Datei | Größe | Hinweis |
|---|---|---|
| `images/logo-glow.png` | 332 KB | nirgends |
| `images/expo-logo.png` | 3 KB | Template-Rest |
| `expo.icon/` (icon.json, `Assets/grid.png` 54 KB, `expo-symbol 2.svg`) | ~60 KB | Template-Rest (iOS-Icon-Composer); prüfen ob EAS/iOS das Verzeichnis braucht |
| `images/cinema-bg.jpg` | 427 KB | nur Quelle für `scripts/generate-bg-assets.py`; Runtime nutzt `cinema-bg-baked.jpg` (418 KB). Behalten (Quelle), aber ggf. aus App-Bundle heraushalten – wird nur gebündelt, wenn `require`d, also kein Bundle-Effekt |

### 3.4 Veraltete Reste [M]

| Suche | Ergebnis |
|---|---|
| `expo-blur` / `BlurView` / `GlassBlur` | In `src/`: **keine**; nur Test-Beschreibungen (`GlassTable.test.tsx:109`, `DiaryEntryCard.test.tsx:20`). Dependency entfernt. Backlog-Eintrag "expo-blur im nächsten Native-Build entfernen" (`docs/backlog.md`) prüfen, ob erledigt |
| `Skeleton` | Nur noch Kommentare: `Chip.tsx:17`, `MovieDetailProviders.tsx:16`, `MovieDetailCastRow.tsx:22` ("shared with skeleton chips") – Kommentare veraltet |
| `GLASS_*` | 11 Konstanten, alle genutzt außer `GLASS_ROW_CLASSNAME` und `GLASS_SHEET_CLASSNAME` (je 1 Treffer = nur Definition), Duplikat `GLASS_EDGE`/`GLASS_INSET_EDGE`; `GLASS_TAB_BAR_STYLE` dupliziert Token-Werte (`Glass.tsx:50-54`, "keep in sync") |
| Alte `ratings`-Tabelle im Client | Kein `from('ratings')`/`"ratings"`-Zugriff mehr in `src/` [M]. Das Feld `entry.ratings` ist der abgeleitete Client-Typ (`watchlistTypes.ts`), also kein Altpfad. Backlog: "Phase 4: alte `ratings`-Tabelle entfernen" ist serverseitig |
| TODO/FIXME/HACK/@deprecated | **0** in `src/` [M]; ein "Kept as alias" (`Glass.tsx:63`) |
| `cheap`-Prop (Glass-Cheap-Modus) | Kein Rest in Code; nur Doku |

## 4. Styles / Design-System

### 4.1 Hartkodierte Farben [M]

Insgesamt 72 Hex-/rgba-Treffer in `src/`; `groupTheme.ts` (11) ist legitime Ableitungsquelle. Der Rest (≈45 Code-Zeilen):

| Muster | Orte | Soll |
|---|---|---|
| `LIKE_HEART_COLOR = "#e05c6e"` **4-mal definiert** | `DiaryEntryCard.tsx:12`, `PosterCornerBadge.tsx:20`, `MovieDetailTitleRow.tsx:22`, `StarRating.tsx:32` | Token `like-heart` existiert schon in `tailwind.config.js` -> eine TS-Konstante (z. B. in `lib/colors` aus dem Config-Wert) |
| `placeholderTextColor` 21 Stellen, zwei Werte | `#888888` (16×: login, register, forgot, callback, add-movie ×3, settings, CreateGroupSheet, TagebuchFilterPanel ...) vs `#8b8b8b` (5×: Watchlist-Panel, tracker `:161`, streaming-services `:106` ...) | ein Token `PLACEHOLDER_COLOR`; bzw. gemeinsame `GlassInput`-Komponente (GLASS_INPUT_CLASSNAME wird 16× + GLASS_SEARCH 7× verwendet) |
| Grau-Icons `#888888`/`#8b8b8b`/`#a8a8a8` | `EmptyState.tsx:7`, `SettingsRow.tsx:11`, `DiaryEntryCard.tsx:13`, `MovieGrid.tsx:34`, `Select.tsx:181`, `[tmdbId].tsx:331`, `RatingDialog.tsx:452`, `MovieDetailCastRow.tsx:111`, `MovieDetailMetaRow.tsx:78`, `MovieDetailActionsBar.tsx:114`; `text-secondary` = `#a8a8a8` existiert als Token | Icon-Farb-Tokens (`ICON_COLORS.muted/secondary/onAccent`) |
| Weitere Duplikate zu Tailwind-Tokens | `#e8e8e8` (text-primary): `Button.tsx:130-131`, `Switch.tsx:15`, `Toast.tsx:16`, `ViewModeToggle.tsx:13`, `navTheme.ts:11`; `#0a0a0a` (bg-primary): `Button.tsx:129`, `Switch.tsx:17`, `ViewModeToggle.tsx:12`, `EntryFilterBar.tsx:10`, `(modals)/_layout.tsx:38`, `navTheme.ts:10`; `#e5675a` = `danger-text`: `Button.tsx:61`; `#5fcf8a` = `success-text`: `Toast.tsx:15`; `#575757` = `star-empty`: `StarRating.tsx:29`; `#22c55e` `PosterCornerBadge.tsx:21` (**kein Token**) | `src/lib/colors.ts` mit TS-Spiegel der Tokens + Test `noHardcodedAccent` erweitern (existiert: `__tests__/theme/noHardcodedAccent.test.ts`) |
| rgba | `Glass.tsx:51-52` (Tab-Bar, dupliziert Token), `Sheet.tsx:229`, `navTheme.ts:12`, `Button.tsx:134` | in Token-Datei |

Warum TS-Konstanten nötig sind (begründet): Icon-`color`, `placeholderTextColor`, React-Navigation-Themes, Switch-Native-Props nehmen keine className. Das erklärt die Konstanten, nicht deren Mehrfach-Definition.

### 4.2 Inline-Styles [M]

31 `style={...}` in 18 Dateien + 4 Dateien mit `StyleSheet.create` (`animated-icon`, `SegmentedControl`, `Select`, `Sheet`). **Fast alle in `components/ui/` bzw. Root-Dekor**, d. h. Primitives: animierte Werte (`Toast.tsx:174`, `FadeInItem.tsx:82`, `Sheet.tsx:160-178`), gemessene Geometrie (`Select.tsx:200-282`, `KeyboardInsetView.tsx:28`), dynamische Breite/Farbe (`BrandLogo.tsx:53`, `MovieGrid.tsx:215` Fortschritts-%, `SegmentedControl.tsx:74`, `tracker.tsx:253` Payer-Farbe), `StyleSheet.absoluteFill`. Begründbar (Reanimated/Layout-Messung/laufzeit-dynamische Werte; NativeWind kann diese nicht). **Keine** Inline-Styles in Screens außer `tracker.tsx:253` (dynamische Spielerfarbe). `GRID_COLUMN_WRAPPER_STYLE` (`gridPadding.ts`) ist `columnWrapperStyle`-Pflicht (kein className-Pendant). Wertung: Projektregel eingehalten; kein Handlungsbedarf außer optional `AppBackground.tsx:91` (`#000000` dim, könnte `bg-black` + `opacity-` sein).

### 4.3 Wiederholte className-Kombinationen [M]

| Kombination | Anzahl | Vorschlag |
|---|---|---|
| `flex-1 items-center justify-center px-4/px-6/px-8` (Leer-/Fehler-/Lade-Zentrierung) | 14 + 5 + 4 + 6 (`flex-1 justify-center px-6`) mit drei verschiedenen px-Werten | `CenteredMessage`/`EmptyState` einheitlich (EmptyState existiert, wird aber nur 1× in `group-settings.tsx:315` genutzt) |
| `text-center text-danger` / `text-sm text-danger` | 13 / 12 | `ErrorText` |
| `text-sm text-text-secondary` / `text-text-secondary` | 14 / 17 | evtl. `Text variant="secondary"` |
| `font-title text-lg text-accent-light`, `font-title text-xl text-text-primary` | 5 / 4 | Typografie-Varianten (`Text variant="title"`) |
| Arbitrary Pixelwerte in className | `pt-[24px]`, `pt-[20px]` (`Glass.tsx`, bewusst, an Konstanten gekoppelt), vereinzelt `w-[52px]`, `w-[44px]`, `w-[260px]`, `h-[22px]`, `text-[10px]` | gering |

### 4.4 Typografie, Abstände, Icons [M]

- Typografie: `font-title` 23×, `font-sans-semibold` 9×, `font-sans` 6×, `font-display` 1×. `MOVIE_TITLE_FONT/TEXT` zentral (`movieTitle.ts`), aber `font-title` auch direkt in ≈20 Klassen-Strings (nicht über die Konstante). Tailwind definiert 8 Display-/Italic-Fonts, davon nur `font-display` 1× genutzt.
- Panel-/Listen-Abstände: gut zentralisiert in `Glass.tsx:62-87` (`PANEL_*`), aber **Liste-unten-Padding (`pb-3` vs `pb-8`), Separator-Mechanismus (gap vs Separator-Komponente) und Header-Gap** sind pro Liste hart codiert (siehe 2.2). `GRID_COLUMN_GAP = 4` (`gridPadding.ts`) vs `gap-2` (8) im Watchlist-Grid-Container (`WatchlistEntryList.tsx`): zwei Wahrheiten für Grid-Abstand.
- Icons: `Icon`-Komponente mit Größen-Tokens (`S/SM/M/...`); Farbe immer per Prop mit Hex (siehe 4.1), kein Icon-Farb-Token.

## 5. Funktionale Vereinheitlichung

| Thema | Zustand [M] | Empfehlung |
|---|---|---|
| Dropdowns | `Select` 7× (Tracker-Payer, Sheets), `SegmentedControl` 2× (Settings Spalten, Scope), `Chip` 10× (Filter, Pills) | Rollen sind unterscheidbar (Auswahl aus vielen / 2–4 Optionen / Mehrfach-Filter); nur dokumentieren |
| Sheets/Modals | `Sheet` (7 Nutzer) + `ConfirmDialog` (6 Nutzer); **nur 1** RN-`Modal` (in `Select.tsx:221`, bewusst Overlay). Keine wilden Eigen-Modals | gut |
| Buttons | `Button` 46×, `IconButton` 14×, `Chip` 10×; rohe `Pressable` nur in Primitives (Select 5, Chip 2, Sheet 2), in Screens: `login.tsx` 2, `add-movie.tsx` 2, `RatingDialog` 2, `MovieDetailCastRow` 2, `EntryFilterBar` 2, `TagebuchEntryList` 2 (Karten-Wrapper) | `login.tsx`, `add-movie.tsx`, `RatingDialog.tsx` auf `Button`/`IconButton` prüfen |
| Toast | 24 Aufrufe `showToast(.., {variant})`; `showSuccessToast/showErrorToast` ungenutzt; Ort des Aufrufs wechselt (Hook vs. Komponente) | eine Konvention (empfohlen: im Mutations-Hook) und Helfer nutzen oder löschen |
| Fehler-/Lade-/Leerzustände | `LoadingArea` überall; Fehler: je Screen handgebaut, 9 verschiedene Formulierungen/Farben (`tagebuch.tsx:48` primary, `watchlist.tsx:51` danger, `tracker.tsx:133`, Filmografien, `add-movie.tsx:452,508`); Leer: `EmptyState` nur 1× genutzt, sonst Eigenbau | `ScreenState`-Komponente (loading/error/empty/noResults) |
| Query-Keys | Zentral in `queryKeys.ts`, keine freien Arrays [M]. Zwei Stile: Objekt mit `.all/.byX` (userGroups, watchlist, ...) vs Flat-Funktion (movieDetail, search) | ok; nur Doku-Satz |
| Datumsformatierung | `dateFormat.ts` (2 Funktionen), `localDate.ts`, `ratingLogic.ts` (`isoCandidate`-Parsing), `watchlistDateBadge.ts`; `new Date(x).getTime()` Vergleichs-Boilerplate 12× in `trackerLogic.ts:37,38,105,136,145,158,253`, `group-settings.tsx:164`, `entrySorting.ts:127` | `toTime(iso)`-Helper |
| Navigation zum Film-Detail | Tabs über `navigateToMovieDetail`; 7 Modal-Stellen von Hand (siehe 2.1) | alle über `lib/movieDetailNavigation.ts` |
| Raster/Platzhalter | `padToFullRows` in Entry-Listen, **nicht** in `MovieGrid` (eigener Aufbau) | prüfen, ob gleiche Spaltenlogik/Preferences gelten sollten |

## 6. Typen / Qualität

| Metrik | Wert [M] |
|---|---|
| `any` (Typ-Annotation / `as any`) | **0** in `src/` (3 Treffer sind Wörter in Kommentaren/Generic-Namen) |
| `@ts-ignore` / `@ts-expect-error` | **0** |
| `eslint-disable` | 15 in 11 Dateien: 8 × `set-state-in-effect`+`exhaustive-deps` bei Draft-Reset (siehe 2.2), `FadeInItem.tsx:70,78`, `ParallaxProvider.tsx:33`, `usePushPermissionStatus.ts:26`, `no-require-imports` (`BrandLogo.tsx:10`, `Switch.tsx:27`) |
| `as never` / `as unknown as` | 15 (Route-Casts, Style-Casts: `settings.tsx:188`, `TabSwipeView.tsx:46`, `TabBarButton.tsx:17`) |
| ESLint-Lauf `npx eslint src` | **19 Warnungen, 0 Fehler** (die genannten 55 sind überholt): `array-type` 11 (`add-movie.tsx:59`, `notifications.tsx:66,74`, `_layout.tsx:46`, `MovieGrid.tsx:87`, `useActiveGroup.ts:35`, `useGroupQuickSwitch.ts:15,17`, `useMyStreamingProviders.ts:14`, `usePushNotificationRouting.ts:51`, `gridPadding.ts:15`), `no-unused-vars` 3 (`add-movie.tsx:93`, `studio/[companyId].tsx:40`, `streaming-services.tsx:13`), `import/no-duplicates` 2 (`addMovieLogic.ts:2,3`), `import/first` 2 (`legalLinks.ts:40`, `trackerLogic.ts:227`), 1 ohne Regel (`BrandLogo.tsx:10`, unbenutzter disable) |
| Tests | 211 Test-Dateien (`*.test.*`, 202 unter `__tests__`, ~27.400 Zeilen; Test-Code ≈ 1,2× Produktivcode `src` 21.957 Zeilen). Gelaufen wurde jest nicht; Dokumentation nennt 189 Suites (`performance-scroll-analysis.md:113`, veraltet) |
| Untestet (Dateiname taucht in keinem Test auf; Heuristik [S], Screens oft indirekt über Screen-Tests abgedeckt) | `useTagebuchScreen.ts`, `useWatchlistScreen.ts` (indirekt via `Tagebuch.test`/`Watchlist.test`), `useQueryCacheLifecycle.ts`, `ParallaxProvider.tsx`, `TrackerEntrySheet.tsx` (nur über Tracker-Test), `CreateGroupSheet.tsx`, `EntryFilterFlyout.tsx`, `EntryFilterPills.tsx`, `TagebuchFilterPanel`, `WatchlistFilterPanel`, `TagebuchScopeSwitch`, `SegmentedControl`, `SettingsColumnsRow`, `SettingsBackBar`, `PanelShadow`, `EmptyState`, `lib/passwordRules.ts`, `lib/homeRoute.ts`. Bedeutsam: **Filter-Flyout und Pills** (komplexe UI, kein Test) und `passwordRules` (Sicherheitslogik) |
| Maestro | 22 Flows; `docs/maestro-coverage.md` führt alle Flows (kein Flow fehlt in der Matrix). Bekannte `partial`/`not automatable`: Registrieren absenden, Passwort-Reset, Gruppe beitreten, Konto löschen bestätigen, Rechtliches (externer Browser) |
| Test-Doku-Drift | `docs/interim-decisions.md` verweist auf 12 inzwischen verschobene Testpfade (z. B. `__tests__/Sheet.test.tsx`, jetzt `__tests__/components/ui/`) |

## 7. Performance / Robustheit

| Punkt | Befund |
|---|---|
| FlatList-Parameter | Entry-Listen: `windowSize 9`, `maxToRenderPerBatch 6`, `updateCellsBatchingPeriod 30`, `removeClippedSubviews false`, `initialNumToRender` 20 (list) / 12 (grid) / 8 (cards) [M]; Memo-Rows mit `propsEqualIgnoringIndex`; `key`-Remount bei Sortierung/Spalten. `MovieGrid.tsx:254` setzt **keine** Tuning-Parameter (Default `windowSize 21`), `keyExtractor`/Platzhalter eigenständig [M]. Bei Filmografien mit 100+ Filmen kann das ruckeln [S] |
| Re-Render-Muster | Tab-Hooks liefern neue Objekte pro Render, Listen bekommen Einzel-Props (gut). `useWatchlistScreen` ruft `baseWatchlistEntries.map(...)` für Provider-IDs bei jedem Render (nicht memoisiert, `:96`), `useTagebuchScreen` analog (`diaryEntries.map`) -> neues Array pro Render; ob `useMyStreamingProviders` es sortiert/hasht, nicht geprüft [S]. React Compiler ist aktiv (`app.config.ts: reactCompiler: true`), daher viel Memo-Boilerplate evtl. verzichtbar |
| `select('*')` | 8 Stellen [M]: `watchlist.ts:42` (`streaming_availability_cache`), `pushTokens.ts:59`, `groups.ts:19,124,145,219` (`watch_group_members`, `watch_groups`). Tabellen klein (Gruppen/Mitglieder) -> geringes Risiko; `streaming_availability_cache` evtl. mit JSON-Spalten -> gezielt auswählen [S]. Watchlist-Query nutzt explizite Konstante `WATCHLIST_ENTRY_SELECT` (gut) |
| Realtime | `useGroupRealtimeSync` hört auf alle sichtbaren `user_movie_ratings`-Änderungen (RLS filtert), Topic-Deduplizierung dokumentiert (`:36-67`); wird in Tagebuch, Watchlist (und evtl. Tracker) aufgerufen -> Topic-Sharing zwingend, schon bedacht |
| Cache-Version | `CACHE_SCHEMA_VERSION = "3"` (`queryPersistence.ts:34`), Buster = App-Version + Schema [M]. Regel im Kommentar vorhanden; keine automatische Prüfung bei Key-/Shape-Änderung [S] |
| Bundle/Assets | `assets/` 3,2 MB; gebündelt: `splash-bg.png` 594 KB (nur Splash-Overlay), `cinema-bg-baked.jpg` 418 KB, 12 Logo-PNGs je ≈ 100 KB (6 Themes × 2 Varianten, ≈ 1,2 MB) [M]. Optimierungs-Potenzial ≈ 0,5–1 MB durch Logo-Dedup (Tint zur Laufzeit oder SVG; das Logo ist bereits als `brandLogo.ts`-SVG-Geometrie vorhanden) [S]. Ungenutzt: `logo-glow.png` 332 KB (nicht gebündelt) |
| Sonstiges | `expo-web-browser` ungenutzt = unnötiges Native-Modul im Binary |

## 8. Dokumentation

| Dokument | Befund |
|---|---|
| `docs/performance-scroll-analysis.md` | Kopf (Z. 3) sagt "Reine Code-Analyse, nichts geändert", Abschnitte 1–7 beschreiben Zustand **vor** allen Fixes (BlurView pro Karte, `windowSize 21`, Tagebuch nicht virtualisiert). Erst Nachtrag 4 (Z. 160–162) sagt "Blur komplett entfernt; ältere Abschnitte oben beschreiben den Zustand davor". Aktuelle Werte (9/6/30) stehen nur im Code-Kommentar `WatchlistEntryList.tsx:44`, Doku nennt 11/8 (Z. 125). Empfehlung: Kopf-Hinweis "historisch" + Kurzfassung des Ist-Zustands oben |
| `docs/style-guide.md` | Im Wesentlichen aktuell (kein Blur, flache Fläche, 3\|4 Spalten, kein Skeleton). Nennt `#e05c6e` Herz (`:196`) statt Token `like-heart`. Offen: Hinweis, dass `GLASS_INSET_EDGE` = `GLASS_EDGE` (Doppelung) und `GLASS_ROW_CLASSNAME`/`GLASS_SHEET_CLASSNAME` ungenutzt sind. Keine Erwähnung der Sheet-Draft-Konvention |
| `docs/interim-decisions.md` | 2617 Zeilen, größtes Dokument. 5 tote Quellverweise (einer davon Pfad-Fragment aus Zitat): `settings/delete-account.tsx`, `ui/GlassBlur.tsx`, `lib/changelog.ts`, `lib/columnSort.ts`, `supabase/realtime-js/...`, plus 12 alte Testpfade `__tests__/<name>.test.*`. Einträge zu GlassBlur/Changelog/Skeleton sind historisch; Vorschlag: Kopfzeile "Einträge enthalten historische Zustände" und Archiv-Teil |
| ADRs | 0014 "Angenommen (2026-10-11, Phase 0 umgesetzt)" passt zum Code (`user_movie_ratings`, kein `ratings`-Zugriff im Client). 0015 "Zurückgestellt (Backlog)" passt zu `docs/backlog.md`. Alle anderen "Entschieden (2026-09-19)". Konsistent |
| `docs/backlog.md` | Eintrag "`expo-blur` entfernen im nächsten nativen Build" ist im Code/package.json bereits erledigt -> Eintrag prüfen/abhaken |
| `docs/code-health-r-items.md` | R7, R8 (lib umstrukturieren), R9, R10 (Farb-/Style-Konsolidierung), QW weiterhin "offen"; deckt sich mit Funden 1.3 und 4.1. Neuer Stand sollte dort eingepflegt werden |
| `CLAUDE.md` | Stimmt mit Code überein (Stack, Regeln). Hinweis: Memory-Eintrag "CLAUDE.md: Subagent-Pflicht" und `working-process.md` Punkt 1 gelten; diese Analyse lief auf ausdrücklichen User-Wunsch ohne Subagents |
| `docs/working-process.md` | 37 Zeilen, aktuell; Punkt 12 (jest/tsc nie gleichzeitig) wurde eingehalten |
| `README.md` | 11 Zeilen, nicht geprüft auf Inhalt |

## 9. Priorisierte Maßnahmenliste

Aufwand: S < 0,5 Tag, M ≈ 1 Tag, L > 1 Tag. Einsparung = grobe Zeilen netto [S].

### Hoch

| # | Maßnahme | Aufwand | Nutzen | Risiko |
|---|---|---|---|---|
| H1 | Gemeinsame Entry-Basis: `useEntryScreenBase` (Hook), `EntryScreenFrame` (Lade/Fehler/Leer/NoResults + Overlap-Container + Flyout), `EntryFlatList` (Modi-Switch, VIRTUALIZATION, Platzhalter, Padding), `EntryFilterPanel` | L | −300…400 Z., beendet Drift (pb-3/pb-8, gap/Separator, Fehlerfarbe, Placeholder-Farbe, testID-Namen) | mittel: viele testIDs/Maestro-Flows (Tagebuch/Watchlist) hängen daran; Tests `Tagebuch`, `Watchlist`, `*EntryListMemo`, Layout-Tests |
| H2 | Token-Spiegel `src/lib/colors.ts` (aus Tailwind-Tokens), `LIKE_HEART_COLOR` 4→1, `PLACEHOLDER_COLOR` 21 Stellen, Grau-/Icon-Farben, `GLASS_TAB_BAR_STYLE` ableiten; `noHardcodedAccent`-Test auf Hex ausweiten | M | −40 Z., ein Wahrheitspunkt | niedrig; visuell identisch bis auf `#888888`→`#8b8b8b`-Angleichung (Entscheidung nötig: welcher Grauwert) |
| H3 | Sheet-Draft-Basis: `useSheetDraft(visible, key, initial)` + `SheetFooter` (Abbrechen/Speichern/dirty) in 5 Sheets | M | −60…100 Z., −8 eslint-disable | mittel: RatingDialog (komplex, 516 Z.), PaymentModal, TrackerEntrySheet, ReleaseDateSheet; Maestro `rating-cycle`, `tracker-payment`, `movie-detail-full` |

### Mittel

| # | Maßnahme | Aufwand | Nutzen | Risiko |
|---|---|---|---|---|
| M1 | Navigation: alle 7 Modal-Stellen auf `navigateToMovieDetail*`; Typ `MovieGridItem` nach `lib` | S | −20 Z., eine Wahrheit | niedrig |
| M2 | `ScreenState`/`CenteredMessage` (Lade/Fehler/Leer) + `ErrorText`; EmptyState überall | M | −80 Z., einheitliche Texte/Farben | niedrig–mittel (Texte in Tests/Maestro) |
| M3 | Filmografie-Modals (actor/director/studio/collection/similar) auf `MovieGridScreen`-Basis | M | −150 Z. (5 Screens à ~110 → ~40) | mittel: 5 Screen-Tests |
| M4 | `useAppMutation` + einheitliche Toast-Stelle; `showSuccessToast/ErrorToast` nutzen | M | −80 Z. | mittel (Hooks-Tests vielfältig) |
| M5 | Große Komponenten teilen: `group-settings.tsx`, `add-movie.tsx`, `movie/[tmdbId].tsx`, `RatingDialog.tsx`, `settings.tsx` je in Controller-Hook + Sektionen | L | Wartbarkeit (kein Zeilengewinn) | mittel–hoch |
| M6 | `MovieGrid` an Entry-Grid-Konventionen (Virtualisierungs-Tuning, Platzhalter) angleichen | S | Scroll-Performance bei langen Filmografien [S] | niedrig |
| M7 | Tests ergänzen: `EntryFilterFlyout`, `EntryFilterPills`, `passwordRules`, `CreateGroupSheet` | M | Absicherung vor H1/H3 | niedrig |

### Niedrig

| # | Maßnahme | Aufwand | Nutzen | Risiko |
|---|---|---|---|---|
| N1 | Toten Code entfernen: `expo-web-browser`, Template-Assets (`logo-glow.png`, `expo-logo.png`, `expo.icon/`?), `showSuccessToast`-Duplikat-Entscheidung, Alias `PANEL_SHADOW_HEIGHT`, `GLASS_INSET_EDGE`, ungenutzte `export`s (≈58+28), veraltete Skeleton-Kommentare | S | −100 Z., −1 Native-Modul | niedrig (Native-Modul braucht neuen Build) |
| N2 | 19 ESLint-Warnungen beheben (`array-type` automatisch fixbar) | S | Lint 0 | sehr niedrig |
| N3 | Logo-PNGs (12×≈100 KB) durch SVG/Laufzeit-Tint ersetzen | M | −1 MB Bundle [S] | mittel (Branding/Splash) |
| N4 | `lib/` umbenennen/gruppieren (`entry*`, `movieDetail*`), `src/theme/` anlegen und Tokens bündeln | M | Navigierbarkeit (R8/R10) | mittel (viele Importe, aber mechanisch) |
| N5 | `select('*')` in `groups.ts`, `pushTokens.ts`, `watchlist.ts:42` auf Spaltenliste | S | minimal | niedrig |
| N6 | Doku bereinigen (siehe 8) | S | Vertrauen in Docs | keins |

## 10. Vorschlag: 6 Refactoring-Pakete (Reihenfolge)

| Pkt | Paket | Inhalt | Betroffene Dateien (Auswahl) | Testrisiko | Vorlauf |
|---|---|---|---|---|---|
| 1 | **Toter Code + Doku** (N1, N2, N6) | Löschen/Aufräumen, Lint 0, Doku-Kopfhinweise, Backlog abhaken | `package.json`, `assets/**`, `Glass.tsx`, `Chip.tsx`, `toast.ts`, 8 Dateien mit Lint-Fund, `docs/*.md` | niedrig: `tsc` + `jest`; Maestro nur wenn Native-Dependency entfällt (neuer Build) | keiner |
| 2 | **Token-Bereinigung** (H2) | `lib/colors.ts`, Placeholder/Heart/Grau, Test erweitern | `DiaryEntryCard`, `PosterCornerBadge`, `MovieDetailTitleRow`, `StarRating`, 21 Placeholder-Stellen, `Button`, `Switch`, `Toast`, `navTheme`, `Glass` | niedrig; Maestro `--changed` (cross-cutting: `src/components/ui/**` -> Vollauf) | Entscheidung `#888888` vs `#8b8b8b` |
| 3 | **Tests als Netz** (M7) | Lücken vor Umbau schließen | neue Tests für `EntryFilterFlyout/Pills`, `passwordRules`, `CreateGroupSheet` | keiner | Paket 1 |
| 4 | **EntryList/EntryScreen-Basis Tagebuch+Watchlist** (H1, M6, M1-Teil) | Hook-Basis, Frame, FlatList-Basis, Panel | `useTagebuchScreen`, `useWatchlistScreen`, `tagebuch.tsx`, `watchlist.tsx`, `TagebuchEntryList`, `WatchlistEntryList`, `*FilterPanel`, `MovieGrid` | hoch: Screen-/Memo-Tests, testIDs; Maestro `tagebuch`, `watchlist`, Vollauf (Shared) | Paket 3; Entscheidung welche Drift gilt (Padding, Separator, testID) |
| 5 | **Gemeinsame Sheet-Draft-Komponente** (H3) | `useSheetDraft`, `SheetFooter` | `RatingDialog`, `PaymentModal`, `TrackerEntrySheet`, `MovieDetailReleaseDateSheet`, `CreateGroupSheet`, `Sheet.tsx` | mittel–hoch: Dialog-Tests, Maestro `rating`, `tracker`, `movie-detail`, `group-settings` | Paket 3 |
| 6 | **Modal-Screens + Mutations + Zustände** (M1–M4) | `MovieGridScreen`, Navigation, `ScreenState`, `useAppMutation` | 5 Filmografie-/Ähnliche-Screens, `useGroupSettings`, `useTrackerPayments`, `useSaveRating`, `useMovieDetailMutations`, Screens-Fehlerzustände | mittel; Maestro `movie-detail`, `add-movie`, `group-settings`, `settings` | Pakete 4/5 (damit `ScreenState` in Basis wiederverwendet wird) |

Danach optional: M5 (große Komponenten aufteilen), N3 (Logos), N4 (Ordner/Theme).

## 11. Was gemessen vs. geschätzt wurde

- **Gemessen:** Dateigrößen (`wc`), Zirkel (madge), Klone (jscpd), tote Exporte/Dependencies (knip, depcheck), ESLint-Lauf, grep-Zählungen (Hex, Inline-Style, any, disable, showToast, Navigation, select), Asset-Größen und -Referenzen, Test-Dateizählung, Doku-Pfadprüfung.
- **Geschätzt:** alle Zeileneinsparungen, Performance-Aussagen (MovieGrid-Default-Fenster, Provider-Array-Neubildung), Bundle-Potenzial, "indirekt getestet"-Einschätzung, Aufwand S/M/L.
- **Nicht ausgeführt:** `tsc`, `jest`, Maestro, Profiling; knip-Ergebnisse für Supabase-/Skript-Ordner wurden nicht weiter verifiziert (Deno/CLI-Entrypoints).

## Status 2026-10-11 (nach Refactoring-Paketen)

Abgleich gegen Git-Stand und Code (git log, ls, grep), nicht nur gegen die Doku. Nicht gelaufen: tsc, jest, eslint, Maestro. Spalte V: **C** = im Code/Git geprueft, **D** = aus Doku/Bericht uebernommen, **C+D** = teils geprueft. Grundlage der Punkte: Maßnahmenliste (Abschnitt 9), Pakete 1-6 (Abschnitt 10), `docs/refactoring-plan-2026-10-11.md`, `docs/code-health-r-items.md`, `docs/backlog.md`, `docs/component-inventory-2026-10-11.json`. Visuelle Fassung: Artifact 'Refactoring Status'.

**Kennzahlen:** 21 umgesetzt, 6 bewusst gestrichen/so gelassen, 35 offen (davon 4 Hoch, 11 Mittel, 20 Niedrig; 3 davon nur teilweise erledigt).

Wichtig: Das Ziel 'weniger Code' wurde in P-B (-2), P-C (+126), P-E (+151) und P-G (ca. +465 Zeilen) nicht erreicht. Gewinn ist je ein Muster statt driftender Kopien, nicht weniger Zeilen. Nur P-A sparte (-220).

### A. Umgesetzt

| ID | Bereich | Punkt | Beleg | V |
|---|---|---|---|---|
| A01 | Pakete | P-H Glass wird Surface, GlassTable wird DataTable | 4b3efd1 | C |
| A02 | Pakete | P-H Lint 22 auf 0, ungenutzte Exporte weg | 4b3efd1 | C+D |
| A03 | Pakete | P-H Doku-Kopfhinweise und Backlog abgehakt | 4b3efd1, 49b3038 | C |
| A04 | Pakete | P-A Modal-Screens auf MovieGridScreen | 8319a5b | C |
| A05 | Pakete | P-E DraftSheet fuer Entwurf/Abbrechen/Speichern | b8ced63 | C |
| A06 | Pakete | P-B EntryFilterPanel und PillRow | a8a0ca5 | C |
| A07 | Pakete | P-C useEntryScreen, EntryList, EntryScreenFrame | daf3947 | C |
| A08 | Pakete | P-G Grosse Seiten aufgeteilt, useAppMutation, Navigation | 487a57b, 04e63b4 | C |
| A09 | Pakete | useAppMutation und einheitliche Toast-Stelle | 487a57b, 04e63b4 | C |
| A10 | Pakete | Detail-Navigation an einer Stelle | 8319a5b, 04e63b4 | C |
| A11 | Tokens | Hex-Duplikate zentral in src/lib/colors.ts | b014fcc | C |
| A12 | Aufraeumen | expo-blur und Blur-Flaechen entfernt | b50fc3a | C |
| A13 | Aufraeumen | Skeletons durch LoadingArea ersetzt | 90ab8bc | C |
| A14 | Aufraeumen | Toast-Helfer showSuccessToast/showErrorToast gelöscht | b014fcc | C |
| A15 | Aufraeumen | expo-web-browser entfernt | b014fcc | C |
| A16 | Aufraeumen | Template-Assets und Alias-Konstanten entfernt | b014fcc | C |
| A17 | Aufraeumen | Tote Module, Template-Dateien, Zyklus-/any-Hygiene | R1 2026-10-05 | D |
| A18 | Tests | Tests fuer Flyout, Pills, CreateGroupSheet, passwordRules, homeRoute | 3e41250 | C |
| A19 | Tooling | R2 ESLint, R4 gemeinsame Filter-Logik, R5 Test-Setup, R6 Query-Keys | 2026-10-05 (Protokoll in code-health-r-items.md) | D |
| A20 | Tooling | R7 Teil 1: Sentry angebunden | 69f5a6f | C |
| A21 | Backlog | Backlog-Punkte expo-blur / expo-web-browser (Code) | 4b3efd1 | C |

### A. Bewusst gestrichen / so gelassen

| ID | Punkt | Begruendung | V |
|---|---|---|---|
| A22 | P-D Karten und Badges zusammenlegen: gestrichen | User-Entscheidung. DiaryEntryCard, WatchlistPosterCard, DiaryPosterTile haben verschiedene Inhalte; PosterTmdbBadge ist schon ein duenner Wrapper. Zusammenlegen gaebe viele Modus-Props bei 0-40 Zeilen Ersparnis. (Entscheidung 4.6, User) | D |
| A23 | P-F Tracker-Tabelle auf DataTable: gestrichen | User-Entscheidung. Tracker baut die Tabelle selbst (nicht virtualisiert, kleine Datenmenge, dynamische Zahlerfarbe); Nutzen nur Konsistenz, Optikrisiko. Code unveraendert. (Entscheidung 4.5, User) | D |
| A24 | P-G: add-movie-Modi, Rating-Draft, settings-Gruppen nicht weiter zerlegt | Modi-Panels teilen State und Pick-Raster-Muster; useRatingDraft wuerde nur verschieben; Leave-Abschnitt waere ein Wrapper ohne Verantwortung. Nur Hook-Auslagerung. (Begruendung im Plan, P-G) | D |
| A25 | Inline-Styles in ui-Primitives belassen | 31 style={} fast nur in Primitives (Reanimated, gemessene Geometrie, dynamische Werte); NativeWind kann das nicht. Projektregel eingehalten. (Bericht 4.2: kein Handlungsbedarf) | D |
| A26 | Select / SegmentedControl / Chip, Sheet / ConfirmDialog: Rollen so lassen | Rollen sind unterscheidbar (viele Optionen / 2-4 Optionen / Mehrfachfilter). Nur ein RN-Modal (Select, bewusst). Query-Key-Stile (Objekt vs Funktion) nur dokumentieren. (Bericht 5: nur dokumentieren) | D |
| A27 | Tracker nutzt keine GlassTable-Header (Zell-Konstanten reichen) | Abweichung als vertretbar bewertet, Einsparung 0. (Bericht 2.2) | D |

### B. Noch offen


**Hoch**

| ID | Punkt | Aufwand | Nutzen | Risiko | Naechster Schritt | V |
|---|---|---|---|---|---|---|
| B01 | Handy-/Maestro-Pruefung aller Pakete (Vollauf) | M | Sieben Commits ohne Geraetebeleg; Regression bei Scroll-Performance oder Dialogen waere unbemerkt. | Niedrig (nur Pruefung) | scripts/maestro-all.sh (Vollauf) auf dem Pixel 6 Pro, Screenshots ansehen, danach Handy-Scrolltest auf grosser Liste. | D |
| B02 | Phase-2-SQL (Push-Trigger) und Phase-0-Migrationen auf DEV anwenden | S | Push fuer neue Bewertungen funktioniert nur mit dem Umzug; Voraussetzung fuer Phase 3. | Mittel (DEV-DB, idempotentes SQL) | Robin: SQL im Dev-SQL-Editor ausfuehren (phase0, dann phase2) oder Token mit database_write bereitstellen; danach Push-Test. | D |
| B03 | Rechte-Entziehen-SQL, Token loeschen (IMPORT-SCHRITTE.md) | S | Verhindert dauerhaft zu weite service_role-Rechte auf DEV. | Niedrig | Schritte 1-5 aus IMPORT-SCHRITTE.md ausfuehren, nach dem Import Schritt 6 (revoke) und Token loeschen; Datei danach loeschen oder committen. | C |
| B04 | Phase 3: Legacy-Import auf neue Rating-Struktur umstellen | L | Ohne Umbau fuehrt der Import auf die Alt-Tabelle, die kein Client mehr liest. | Mittel (Datenimport, DEV-only, Dry-run zuerst) | Plan Phase 3 umsetzen (TDD, Dry-run), Trigger deaktivieren, erst dann --apply nach Freigabe. | D |

**Mittel**

| ID | Punkt | Aufwand | Nutzen | Risiko | Naechster Schritt | V |
|---|---|---|---|---|---|---|
| B05 | MovieGrid an Entry-Grid-Konventionen angleichen (Report M6) | S | Fluessigeres Scrollen in Filmografie/Aehnliche/Suche. | Niedrig | VIRTUALIZATION-Konstante aus EntryList wiederverwenden, Scrolltest am Geraet. | C |
| B06 | MovieGridItem-Typ nach lib/ verschieben | S | Schichten sauber, R8-Vorarbeit. | Niedrig (Typ-Umzug) | Typ nach lib/movieGridTypes.ts (Name zu bestaetigen), vier Importe anpassen, tsc. | C |
| B07 | Wrap-Rows mit className-Gap ohne Screenshot-Beleg (teilweise) | S | Kein Layoutbruch auf dem Handy, falls Gap fehlt. | Mittel (visuell) | Per Handy-Screenshot pruefen; nur bei Abweichung auf mr-/mb- umstellen (Regel 4.8: nur mit Beleg). | C |
| B08 | ScreenState / CenteredMessage / ErrorText fuer Lade-, Fehler-, Leerzustaende | M | Einheitliche Texte und Farben, weniger Duplikat. | Niedrig-Mittel (Texte in Tests/Maestro) | Pruefen, ob die zwei Basen (MovieGridScreen, EntryScreenFrame) reichen; sonst gemeinsame Komponente, Texte vorher abstimmen. | C |
| B09 | R7: ErrorBoundary und zentrale Fehlerbehandlung | M | Abstuerze zeigen sich in Sentry statt im Nichts. | Mittel | Entscheidung Verhalten, dann Expo-Router-ErrorBoundary im Root-Layout plus duenner Logger. | C |
| B10 | 'Film bereits gesehen'-Warnung im Detail/Hinzufuegen | M | Schutz vor Doppelt-Hinzufuegen bereits bewerteter Filme. | Niedrig | Entscheiden, ob zurueck (Detail-Ansicht statt Add-Movie?), dann Dialog ueber DraftSheet/ConfirmDialog. | C |
| B11 | Direkt-Bewerten: Speichern ohne Sterne, Vorbefuellung aus anderer Gruppe | S | Klares Verhalten statt stiller Annahme. | Niedrig | Beide Fragen an Robin stellen und im interim-decisions.md festhalten (Harte Regel). | D |
| B12 | Edge Function send-push: Dedupe pro Empfaenger | M | Keine doppelten Pushes. | Mittel (Deploy, kein Test lokal) | Aenderung nach SQL-Beschreibung umsetzen, nach Phase-2-SQL, auf DEV deployen (Standing-Approval fuer DEV). | D |
| B13 | Journal persistent machen (Pi) | S | Absturzursachen nachvollziehbar. | Niedrig | Robin: Datei anlegen (Inhalt in working-process.md), journald neu starten. | D |
| B14 | Fehlende Einzel-Tests | S | Netz fuer spaetere Umbauten. | Niedrig | TrackerEntrySheet-Test zuerst; Rest nur wenn die Dateien angefasst werden. | C |
| B15 | Doku-Altlasten bereinigen | S | Docs bleiben vertrauenswuerdig. | Keins | R3-Zeile auf erledigt (P-C/P-G), Scorecard datieren, interim-decisions Archivteil anlegen. | C |

**Niedrig**

| ID | Punkt | Aufwand | Nutzen | Risiko | Naechster Schritt | V |
|---|---|---|---|---|---|---|
| B16 | Restliche grosse Dateien teilen (Report M5 Rest) | L | Wartbarkeit, kein Zeilengewinn. | Mittel-Hoch | Nur bei Bedarf; zuerst MovieDetailActionsBar (Aktionen + Mutationen + Dialoge). | C |
| B17 | useDirectRate / useGroupPushSubscription bewusst nicht auf useAppMutation (teilweise) | S | Einheitlicheres Gerüst. | Mittel (Verhalten) | Entscheiden: onSettled-Option in useAppMutation oder so lassen und im Style-Guide begruenden. | C |
| B18 | 3 verbleibende eslint-disable set-state-in-effect (teilweise) | S | Letzte Disables weg. | Mittel (stille Zustandsfehler) | Nur angehen mit Test; Namens-Sync evtl. per key-Remount wie DraftSheet. | C |
| B19 | Jest-Teardown-Warnung 'worker failed to exit gracefully' | S | Sauberer CI-Lauf. | Niedrig | Verdaechtige Tests einzeln mit --detectOpenHandles laufen lassen (nie parallel zu tsc). | C |
| B20 | Restliche Hex-Literale und Grau-Icon-Token | S | Ein Wahrheitspunkt fuer Icon-Farben. | Niedrig | ICON_COLORS in colors.ts, Allowlist im Guard-Test anpassen; Branding-Frage Splash-Hintergrund an Robin. | C |
| B21 | R8 lib/ umstrukturieren, src/theme anlegen | M | Navigierbarkeit. | Mittel (viele Importe, mechanisch) | Nach MovieGridItem-Umzug; Namensschema abstimmen (Harte Regel). | C |
| B22 | Logo-PNGs (12 x ca. 100 KB) durch SVG/Laufzeit-Tint ersetzen | M | ca. 1 MB weniger Bundle [Schaetzung]. | Mittel (Branding/Splash) | Nur nach Branding-Entscheidung. | C |
| B23 | select('*') durch Spaltenlisten ersetzen | S | Minimal. | Niedrig | Spalten je Stelle festlegen, Typen pruefen. | C |
| B24 | toTime(iso)-Helper | S | Weniger Boilerplate. | Niedrig | Helper in dateFormat.ts, Stellen ersetzen. | C |
| B25 | Quick Wins QW3 und QW8 | S | Kleine Hygiene. | Niedrig | Kommentare korrigieren, getSession hinter lib-Helper. | C |
| B26 | R9 i18n-Vorbereitung | L | Spaetere Mehrsprachigkeit. | Mittel | ADR zu Bibliothek/Konvention vorbereiten. | D |
| B27 | expo-blur / expo-web-browser noch im nativen Binary | S | Kleineres Binary. | Niedrig | Mit dem naechsten nativen Build (lokal ca. 4 h oder EAS ab 2026-11-01) erledigt sich das von selbst. | D |
| B28 | Tab-Swipe-Pager | M | UX. | Mittel | Mit naechstem nativen Build bewerten. | D |
| B29 | Tracker-Spaltensortierung | M | UX. | Niedrig | Erst Entscheidung, ob P-F-Tabelle dafuer noetig ist. | D |
| B30 | Maestro-Flows 'Bewertung in mehreren Gruppen' | S | Abdeckung der gruppenuebergreifenden Bewertungen. | Niedrig | Zweite Testgruppe anlegen (Test-Gruppe ist mit dem Handy geteilt). | D |
| B31 | Phase 4: alte ratings-Tabelle entfernen | M | Aufraeumen der DB. | Hoch (destruktiv) | Erst nach Phase 3 und Vollauf; separate Freigabe. | D |
| B32 | Feature-Flags pro Nutzer (ADR 0015, zurueckgestellt) | L | Premium/Freischaltungen spaeter. | Mittel | Erst wieder aufgreifen, wenn ein konkretes Gate feststeht. | D |
| B33 | Meilenstein-Reste M12 / User-Konten | L | Release. | Hoch (extern) | Vor Release Stand pruefen. | D |
| B34 | Auth-Screens: Gemeinsamkeiten pruefen (Inventar-Gruppe 9) | S | Moeglicher gemeinsamer Auth-Rahmen. | Niedrig-Mittel (Auth-Flows) | Erst lesen und bewerten, ob echte Duplikate; Ergebnis ist evtl. 'so lassen'. | D |
| B35 | BackSwipeView / TabSwipeView pruefen (Inventar-Gruppe 10) | S | Evtl. gemeinsame Gesten-Basis. | Mittel (Gesten, nur am Geraet testbar) | Zusammen mit dem Tab-Swipe-Pager bewerten. | D |

### Komponenten-Kandidatengruppen (10)

Gruppierung aus dem Inventar abgeleitet (similarPairs, clusters, tagebuchWatchlistPairs); das Inventar-Artifact selbst war nicht lesbar.

| # | Gruppe | Stand | Beleg | V |
|---|---|---|---|---|
| 1 | Filmografie-/Sammlung-/Aehnliche-Modals (5 Screens) | umgesetzt | P-A 8319a5b | C |
| 2 | Tagebuch-/Watchlist-Filterpanel | umgesetzt | P-B a8a0ca5 | C |
| 3 | Filter-Pillen (Genre, Jahr, Anbieter) | umgesetzt | P-B a8a0ca5, PillRow | C |
| 4 | Tagebuch-/Watchlist-Hooks, Listen, Screens | umgesetzt | P-C daf3947 (Handy-Scrolltest offen) | C |
| 5 | Sheets mit Entwurf (Rating, Payment, Tracker, Release, CreateGroup) | umgesetzt | P-E b8ced63 | C |
| 6 | Karten und Kacheln (DiaryEntryCard, WatchlistPosterCard, DiaryPosterTile) | gestrichen | P-D, User-Entscheidung | D |
| 7 | Badges (PosterCornerBadge, PosterTmdbBadge, TmdbBadge) | gestrichen | P-D, bewusst Wrapper | D |
| 8 | Tracker-Tabelle vs DataTable | gestrichen | P-F, User-Entscheidung | D |
| 9 | Auth-Screens (login, register, forgot-password, auth/callback, Aehnlichkeit 0,61-0,83) | offen | In keinem Plan-Paket; Inventar-Treffer, nicht bewertet | C |
| 10 | BackSwipeView / TabSwipeView (Aehnlichkeit 0,83) | offen | In keinem Plan-Paket; Inventar-Treffer, nicht bewertet | C |
