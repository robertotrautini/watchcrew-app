# Performance-Analyse: Scrollen / Swipe-Animationen (Pixel 6 Pro, Dev-Client)

Stand: 2026-10-10. Reine Code-Analyse (nichts gemessen, nichts geaendert). Alle Aussagen zu Gewinn sind Schaetzungen aus dem Code, keine Profiler-Messung.

## Ausgangslage (Stack)

- RN 0.86.3 (New Architecture ist ab RN 0.82 Pflicht, Hermes Standard), Expo 57, React 19.2, Reanimated 4.5.1 + react-native-worklets 0.10.1, gesture-handler 2.32, expo-image 57, expo-blur 57. Kein FlashList/LegendList/Pager-View installiert (`package.json`).
- React Compiler ist an (`app.config.ts:77`), memoisiert Komponenten automatisch, hilft aber nicht, wenn sich ein Prop pro Render aendert (siehe Punkt 6).
- Scroll-Handler: keiner. `useParallaxScroll()` liefert ein leeres Objekt (`src/components/parallaxContext.ts:52-61`). Das Parallax-Thema ist also KEIN vertikales Scroll-Parallax mehr, sondern nur horizontaler Hintergrund-Versatz beim Tab-Wechsel, komplett auf UI-Thread (Reanimated `useAnimatedStyle`, `AppBackground.tsx:45-52`). Kein setState pro Scroll-Event. Gut.
- Swipe-Navigation: Gesture-Handler Pan mit Worklets (`TabSwipeView.tsx:113-134`), `onUpdate` laeuft auf UI-Thread, nur Commit/Cancel via `runOnJS`. Technisch korrekt.

## Wie viel erklaert der Dev-Modus?

Dev-Build (Metro, `__DEV__`) = unminifiziertes JS, zusaetzliche Warnungen/Checks, React-Dev-Build (deutlich langsamerer Reconciler, ~2-4x JS-Zeit), Reanimated/Worklets Dev-Checks, NativeWind-Laufzeit-Style-Berechnung ohne Optimierungen. Hermes-Bytecode ist im Dev-Client nicht vorkompiliert (JS wird per Metro geliefert und geparst).

Faustregel: Dev ist bei JS-lastigen Pfaden (Mount von 200 Karten, Tab-Wechsel-Re-Render) etwa 2-4x langsamer als Release. UI-Thread-/native Arbeit (Blur, Bilddekodierung, Compositing, Gesten-Worklets) ist im Dev-Modus NICHT langsamer. Deshalb: Ruckeln waehrend des reinen Scrollens (UI/RenderThread) wird vom Dev-Modus kaum erklaert, Haenger beim Tab-Wechsel / Listen-Mount / Tap (JS-Thread) zu einem guten Teil (geschaetzt 50-70%).

Empfehlung zur Verifikation: einmal Release-APK (lokaler Build, siehe `docs/local-build-pi.md`) auf dem Pixel gegentesten, bevor man Aufwand in JS-Optimierungen steckt. Punkt 1 und 2 unten sind aber release-relevant.

## Ranking der Ursachen

Legende Gewinn: Einschaetzung fuer gefuehlte Fluessigkeit. Aufwand: S < 1h, M = halber Tag, L > 1 Tag. "Neue Dep": braucht neue Abhaengigkeit (laut Projektregel Freigabe noetig).

### 1. Jede Karte/Zeile ist ein Live-BlurView (expo-blur, dimezis) - GROESSTER Verdacht

- `src/components/ui/Glass.tsx:125-136`: `Glass` rendert IMMER `GlassBlur`. `Card` (`Card.tsx:42`) -> `Glass` -> `GlassBlur` (`GlassBlur.tsx:121-139`) mit `<BlurView blurMethod="dimezisBlurView" blurTarget=glassBlurTargetRef intensity=100>` (max. Radius 25px).
- Der Doc-Kommentar in `Glass.tsx:54-56` sagt "cards/rows stay plain tinted fills (performance)" - der Code tut das Gegenteil. Jede `DiaryEntryCard`, `DiaryPosterTile`, `WatchlistPosterCard` (Card) und jede Watchlist-Listenzeile (`WatchlistEntryList.tsx:232`, direkt `GlassBlur`) ist ein eigener BlurView. Tagebuch Listenmodus nutzt eine `Glass`-Huelle (1 BlurView), Karten/Grid je Eintrag einen.
- Auf Android rendert die dimezis-Implementierung bei jedem Draw den BlurTarget (hier: das 1920x1280-Foto samt `mixBlendMode`) in eine Bitmap und blurt sie pro BlurView-Instanz. Viele sichtbare BlurViews, die sich beim Scrollen bewegen, bedeuten pro Frame N Blur-Passes auf der GPU/RenderThread. Das ist unabhaengig vom Dev-Modus und der wahrscheinlichste Grund fuer "ruckelt beim Scrollen".
- Zusaetzlich unsichtbarer Mehrwert: der Blur zeigt nur das statische Hintergrundfoto (Listeninhalt wird nicht geblurt, `GlassBlur.tsx:38-42`), d.h. visuell fast identisch mit einem etwas helleren Tint.
- Fix: fuer Karten/Zeilen in Listen `enabled={false}` bzw. Glass-Variante ohne BlurView (nur `bg-bg-glass` Fallback bzw. leicht angepasster Tint), Blur nur fuer wenige grosse Flaechen (Tab-Bar, Sheets, Header, Toast). Optional: ein einziger Blur-Layer hinter der Liste statt pro Karte.
- Gewinn: sehr hoch (vermutlich der Hauptteil). Aufwand: S (Prop/Variante, Tests/Maestro-Screenshots anpassen). Neue Dep: nein. Hinweis: aendert den Look minimal -> Designentscheidung, laut Projektregel mit dem User bestaetigen (Tint-Wert anpassen, damit es gleich aussieht).

### 2. Tagebuch: ScrollView + `.map()` ueber ALLE Eintraege (keine Virtualisierung)

- `src/components/tagebuch/TagebuchEntryList.tsx:169-181` (ScrollView) mit `GridView` (19), `ListView` (67), `CardsView` (126): rendert alle ~200 Eintraege gleichzeitig.
- Pro Karten-Eintrag: `FadeInItem` (Animated.View) + Pressable + Card(Glass+BlurView+Tint-View) + expo-image + Titel/Datum + pro Mitglied `MemberRatingRow` mit `StarRating` (5 MaterialIcons-Glyph-Texte) + 2 Badges + Icons. Bei 4 Mitgliedern grob 40-60 native Views je Karte -> 200 Karten = 8.000-12.000 Views, 200 BlurViews, 200 Bild-Instanzen, 200 laufende Fade-Animationen beim Mount.
- Folge: langer Mount (JS: im Dev-Modus mehrere Sekunden), hoher Speicher, Layout/Draw-Kosten pro Frame auch fuer nicht sichtbare Karten (Android zeichnet zwar Offscreen-Views nicht, aber Hierarchie-Traversal, Bild-Decoder und Blur-Targets fuer alle).
- Fix: `FlatList` (wie Watchlist) mit `keyExtractor`, `initialNumToRender` ~8, `windowSize` ~7-9, `maxToRenderPerBatch` ~6, `removeClippedSubviews` (Android), Grid via `numColumns=3` + `padToFullRows` (Helfer existiert bereits in `src/lib/gridPadding.ts`). Listenmodus: je Zeile als FlatList-Item statt eine grosse Glass-Huelle (Rundung nur oben/unten wie in der Watchlist-Liste).
- Gewinn: sehr hoch (Mount + Scroll + Speicher). Aufwand: M (drei Ansichten umbauen, Tests und Maestro-Flows `tagebuch-*` anpassen). Neue Dep: nein (RN FlatList).

### 3. FadeInItem: pro Item eigene Animation, Replay bei jedem Tab-Wechsel fuer ALLE Items

- `src/components/ui/FadeInItem.tsx:327-362`: jedes Item startet `Animated.timing` (useNativeDriver true - gut) mit Stagger bis 320 ms, bei Tab-Wechsel (`epoch`) `opacity.setValue(0)` + neue Animation fuer jedes gemountete Item (`:349-355`).
- Tagebuch (Punkt 2) hat alle 200 Items gemountet -> 200 `setValue(0)` + 200 native Animationen im selben Moment wie der Tab-Wechsel/die Hintergrund-Animation (600 ms). `TabSwitchContext` wird von jedem FadeInItem konsumiert (`useContext`), also re-rendert jedes Item aller besuchten Tabs bei jedem Epoch-Wechsel (Tab-Screens bleiben gemountet).
- Bei FlatList (Watchlist) animiert zudem jedes beim Scrollen neu gemountete Item von Opacity 0 -> 1 mit bis zu 320 ms Stagger ("Pop-in" beim Scrollen). Das kann sich wie Ruckeln/Nachladen anfuehlen, ist aber gewollte Designsprache (`docs/style-guide.md` Motion).
- Fix: Tab-Wechsel-Replay nur fuer die ersten ~10 sichtbaren Items (index-Cap, `index > 12` -> sofort sichtbar, kein Context-Konsum), oder Replay als EINE Opacity auf dem Listen-Container statt pro Item (ein Animated.Value / ein Shared Value). Beim Scrollen gemountete Items (index > Cap) ohne Fade.
- Gewinn: hoch bei Tab-Wechsel (genau das "Swipe-Animation fuehlt sich traege an"). Aufwand: S-M. Neue Dep: nein. Design-Aspekt: Motion-Verhalten leicht geaendert -> mit User abstimmen.

### 4. Listenelemente: Watchlist-FlatList ohne Tuning, Row nicht memoisiert, jede Zeile baut neue Objekte

- `src/components/watchlist/WatchlistEntryList.tsx:225-258` und `:264-295`: Defaults (`initialNumToRender` 10, `windowSize` 21, kein `removeClippedSubviews`, kein `getItemLayout`), `renderItem` inline.
- `withEffectiveReleaseDate(item)` (`:284`) erzeugt pro Render ein neues Objekt -> selbst bei memoisierter Karte wuerde die Memoisierung brechen; `onPress={() => onOpenEntry(item)}` neue Closure pro Render; `ratedCountFor(item)` filtert pro Render.
- `windowSize` 21 bedeutet bis zu 10 Bildschirme vor/zurueck gemountet; fuer Karten mit Blur (Punkt 1) zu viel.
- Fix: `windowSize` ~5-7, `initialNumToRender` ~8, `maxToRenderPerBatch` ~5, `removeClippedSubviews`; Zeilenkomponente `React.memo` mit stabilen Props (Entry-Objekt, `streamingAvailability`, `onOpenEntry` stabil per `useCallback` im Screen-Hook; Effective-Release-Date innerhalb der Karte berechnen statt Objekt zu bauen). Grid-Karten haben feste Hoehe (aspect 2/3, Spaltenbreite bekannt) -> `getItemLayout` fuer Grid moeglich, fuer Karten-Modus nicht (variable Hoehe durch Overview).
- Gewinn: mittel. Aufwand: S-M. Neue Dep: nein.

### 5. Bilder: expo-image ohne Cache-/Recycling-/Placeholder-Konfiguration, kein Prefetch

- `DiaryEntryCard.tsx:53-59`, `DiaryPosterTile.tsx:67-74`, `WatchlistPosterCard.tsx:115-120,176-182`: `source={{ uri }}` (neues Objekt pro Render, bei Compiler-Memo ok), kein `cachePolicy` (Default "disk" - passt), kein `recyclingKey`, `transition`, `placeholder`/Blurhash, kein `priority`, `allowDownscaling` Default true.
- Positiv: expo-image (Disk+Memory-Cache), `buildTmdbImageUrl` nutzt `w342` (`src/lib/tmdbImage.ts:12-24`). Anzeigegroessen: Karte 96dp breit (~270px) und Grid-Kachel ~110dp (~310px) -> w342 passt gut, w185 waere fuer die Karte (96dp) zu unscharf auf 2,6x-Display; Gewinn durch kleinere Variante gering. Hintergrundfoto `assets/images/cinema-bg.jpg` 1920x1280 wird voll dekodiert (~10 MB Bitmap) und mit `mixBlendMode: "luminosity"` + opacity 0.6 gezeichnet (`AppBackground.tsx:61-83`).
- Risiken: ohne `recyclingKey`/Platzhalter flackert es beim Wiederverwenden, harter Pop-in beim Bildladen waehrend des Scrollens; mit 200 Bildern in der ScrollView (Punkt 2) werden alle Downloads/Decodes gleichzeitig angestossen.
- Hintergrund: `mixBlendMode` zwingt Android zu einem Offscreen-Layer; das Foto ist statisch, daher Kosten nur bei Tab-Swipe (der Layer bewegt sich mit translateX). Einmal vorab mit Luminosity-Look bake-n (vorberechnetes graues/abgedunkeltes JPG in Zielaufloesung ~1080 hoch) wuerde Blend + grosse Dekodierung sparen. Asset-Aenderung = Designentscheidung (Look muss identisch bleiben).
- Gewinn: mittel (Bilder), niedrig-mittel (Hintergrund). Aufwand: S (Props) / M (Hintergrund-Asset). Neue Dep: nein.

### 6. Parent-Re-Render rendert alle Karten neu (`screen`-Objekt als Prop, Funktionen pro Render neu)

- `useTagebuchScreen` gibt jedes Mal ein neues Objekt zurueck und neue Funktionen `ownRating`/`openEntry` (`useTagebuchScreen.ts:158-193`); `TagebuchEntryList` bekommt `screen` komplett (`tagebuch.tsx:73`). Jede Aenderung im Screen-Hook (Suchtext tippen, Filterpanel auf/zu, Sort-Sheet, Query-Refetch-Status) re-rendert alle 200 Karten inkl. `members.map(...)` mit neuen Arrays (`TagebuchEntryList.tsx:147-156`) und `entry.ratings.find` pro Mitglied und Karte. Der React Compiler kann das nicht retten, weil `screen` jedes Mal neu ist.
- Zusaetzlich `useGroupWatchlist.select: toGroupWatchlistData` (`useGroupWatchlist.ts:116`) ist modul-stabil (gut), erzeugt aber bei jeder Daten-Aenderung eine neue `Map` + Entry-Array-Referenz; Realtime `invalidateQueries` (`useGroupRealtimeSync.ts:224`) und 2 min staleTime (`queryClient.ts:26`) refetchen bei Fokus/Reconnect: das Ergebnis ist strukturell geteilt (TanStack Structural Sharing), aber der neue `Map` aus `select` bricht die Identitaet von `streamingAvailability` -> Watchlist-Sortierung/-Liste rechnet neu. Tracker, Tagebuch und Watchlist haben jeweils eigene Subscriptions auf dieselbe Query (3 Observer, alle Tabs bleiben gemountet): ein Cache-Update re-rendert alle drei Tabs, auch die nicht sichtbaren.
- Fix: Item-Komponente `DiaryEntryRow` (`React.memo`) mit primitiven/stabilen Props (Entry, userId, starColor, `displayNameById`, `groupMemberIds`, `onOpenEntry` per `useCallback`); Mitgliederzeilen im Item berechnen; `select` memoisieren (z.B. `useCallback` + Map aus stabilem Array) oder Map nicht in `select` bauen. Nicht fokussierte Tabs: `freezeOnBlur`/`useIsFocused` oder Queries nur im fokussierten Tab beobachten.
- Gewinn: mittel (spuerbar beim Tippen/Filtern/Realtime-Update, weniger beim reinen Scrollen). Aufwand: M. Neue Dep: nein.

### 7. Tab-Swipe: nur der Hintergrund folgt dem Finger, Inhalt wechselt hart nach Abschluss

- `TabSwipeView.tsx:136-142` + `expo-router/js-tabs` (`(tabs)/_layout.tsx:195`): Pan verschiebt nur `tabProgress` (Hintergrund-Parallax). Der Tab-Inhalt bewegt sich waehrend der Geste nicht; erst nach Loslassen `router.navigate(...)` (JS-Thread, Re-Render von Tabs + `useSegments`-Konsumenten, FadeIn-Replay aus Punkt 3). Das fuehlt sich verzoegert an, weil der Wechsel bis nach `onEnd` -> `runOnJS(commit)` -> Navigation -> Mount/Re-Render wartet. Im Dev-Modus verstaerkt die JS-Last (Punkt 2/3/6) die Latenz erheblich, besonders beim ersten Besuch eines Tabs (Lazy-Mount von bis zu 200 Karten).
- `useSegments()` in `TabSwipeView` (`:86`) und `TabsLayout` (`:169`) re-rendert den Tab-Container bei jeder Navigation; `gesture` wird dabei per `useMemo` neu gebaut (Deps `commit`, `snapBack` aendern sich mit `current`), was den Gesture-Handler pro Navigation neu konfiguriert (kleiner Effekt).
- Der Hintergrund-Parallax selbst ist sauber (UI-Thread), 600 ms Tween (`parallax.ts:17`) laenger als die FadeIn-Dauer 220 ms + 320 ms Stagger -> wirkt gemessen am Inhalt "traege".
- Fix kurzfristig: Punkte 2/3 (JS-Last beim Tab-Mount), Tabs vorab mounten (`lazy: false` in screenOptions fuer die 3 Tabs, dann erster Wechsel ohne Mount-Kosten; dafuer hoeherer Start-Aufwand), `TAB_PAN_DURATION_MS` pruefen (Designwert).
- Fix langfristig: echter Pager (Inhalt folgt dem Finger) = `react-native-pager-view` oder `react-native-tab-view` (NEUE Dep, Freigabe noetig; ADR 0007 Navigation-Entscheidung betroffen) oder eigene Reanimated-Translate-Animation der Tab-Screens (keine neue Dep, grosse Aenderung, Gefahr fuer Maestro-Flows).
- Gewinn: kurzfristig mittel, langfristig hoch fuer Gefuehl. Aufwand: S (Preload) / L (Pager). Neue Dep: nein (kurzfristig) / ja (Pager).

### 8. Kleinere Punkte

- `MaterialIcons` pro Stern (`StarRating`, `Icon.tsx`): jeder Stern ist ein Text-Glyph-View; in Karten-Ansicht 5 x Mitglieder x Karten. Mit Virtualisierung (Punkt 2) unkritisch. Optional: Sterne als ein Text mit Glyph-String oder SVG pro Zeile.
- `ListView` im Tagebuch: `Pressable` pro Zeile ohne Memo, 4 Text-Views pro Zeile - leichtgewichtig, aber in einer einzigen `Glass`-Huelle (1 BlurView, grosse Flaeche, bewegt sich beim Scrollen) -> mit Punkt 2 mitloesen.
- NativeWind-Laufzeit: `className` wird zur Laufzeit in Styles uebersetzt (Dev deutlich teurer als Release). Viele dynamische Template-Strings (`WatchlistEntryList.tsx:238-240`) erzeugen pro Render neue Klassen-Strings.
- Query-Persist (`PersistQueryClientProvider`, MMKV): serialisiert bei Cache-Aenderungen das komplette Cache-JSON (200 Eintraege x Ratings/Genres). Throttle pruefen (`queryPersistence.ts`); JS-Thread-Spitzen nach Realtime-Updates moeglich. Gewinn gering, nur bei Verdacht messen.
- Sentry (`@sentry/react-native`) im Dev-Client: pruefen, ob `initSentry` Tracing/UserInteraction/Stall-Tracking aktiviert (`src/lib/sentry.ts`), sonst kein Effekt. Nicht gefunden: kein `tracesSampleRate`-Treffer per Grep in `src`.

## Positiv (kein Handlungsbedarf)

- Kein setState im Scroll, keine Scroll-Handler, Parallax/Swipe auf UI-Thread (Reanimated/Worklets), FadeIn mit `useNativeDriver: true`.
- expo-image statt RN Image, TMDB-Groesse `w342` passend, Hermes + New Architecture aktiv, React Compiler an.
- Watchlist nutzt bereits FlatList mit `keyExtractor`; Platzhalter-Padding fuer Grid vorhanden.

## Empfohlene Reihenfolge

| # | Massnahme | Gewinn | Aufwand | Neue Dep |
|---|-----------|--------|---------|----------|
| 1 | BlurView pro Karte/Zeile entfernen (Glass/Card ohne Blur, Tint angleichen) | sehr hoch | S | nein |
| 2 | Tagebuch auf FlatList umbauen (3 Ansichten) | sehr hoch | M | nein |
| 3 | FadeInItem: Replay/Stagger nur fuer erste ~10 Items, Context-Konsum reduzieren | hoch | S-M | nein |
| 4 | FlatList-Tuning (windowSize, initialNumToRender, removeClippedSubviews) + memoisierte Row-Komponenten mit stabilen Props | mittel | S-M | nein |
| 5 | expo-image: recyclingKey, Platzhalter/transition; Hintergrundfoto vorab abdunkeln (kein mixBlendMode) | mittel | S-M | nein |
| 6 | Screen-Hook-Objekte/Closures stabilisieren, nicht fokussierte Tabs nicht neu rendern | mittel | M | nein |
| 7 | Tab-Preload (`lazy:false`); echter Pager nur nach Freigabe | mittel / hoch | S / L | nein / ja |

Vorab (Aufwand S, keine Aenderung): Release-Build auf dem Pixel 6 Pro gegenpruefen, um den Dev-Anteil zu isolieren; optional `adb shell dumpsys gfxinfo <pkg> framestats` oder Perf-Monitor (RN Dev-Menu) waehrend Scrollen: hohe UI-Thread-Zeit = Blur/Compositing (Punkt 1), hohe JS-Zeit = Re-Render (Punkte 2/3/6).

Hinweis zur Projektregel: Punkte 1, 3, 5 und 7 aendern Optik/Motion und sind laut `CLAUDE.md` (Hard Rule) vor Umsetzung mit dem User zu bestaetigen. Punkt 2, 4, 6 sind reine Struktur-Refactorings, brauchen aber Anpassung von Tests/Maestro-Flows (testIDs `tagebuch-entry-*`, `tagebuch-entry-list` beibehalten).

## Umgesetzt (2026-10-10, Punkte 2, 4, 6, 3)

Nicht angefasst: #1 (Blur, `Glass.tsx`), #5, #7 (Tab-Swipe/Pager). Keine neuen Dependencies. tsc, jest (189 Suites, 1828 Tests) und eslint gruen; kein Maestro-Lauf (manueller Test durch den Nutzer).

- **#2 Tagebuch virtualisiert:** `src/components/tagebuch/TagebuchEntryList.tsx` nutzt jetzt je Ansicht eine `FlatList` (cards: 1 Spalte, grid: `numColumns=3` mit `w-[30%]`-Kacheln wie vorher, list: Header als `ListHeaderComponent` + eine Zeile pro Item). `initialNumToRender` 6/5/14, `windowSize` 7, `maxToRenderPerBatch` 5, `removeClippedSubviews`. Abstand 12px per `ItemSeparatorComponent` (vorher `gap-3`). testIDs unveraendert (`tagebuch-entry-list`, `tagebuch-entry-<id>`, `-press-`, `-seen-date-`, `-list-*`, `-grid-title-`). Parallax-Spread (`useParallaxScroll`, aktuell leer, UI-Thread-Handler) bleibt auf der Liste. Listenmodus: die eine grosse `Glass`-Huelle (1 BlurView) wurde durch pro Zeile eine `GlassBlur`-Flaeche mit gemeinsamem Rahmen (border-x, oben/unten gerundet) ersetzt, gleiche Tint-Tokens; minimale optische Abweichung moeglich (Rahmen/Blur pro Zeile statt ueber alles).
- **#4 Watchlist:** `WatchlistEntryList.tsx`: `windowSize` 7 (vorher 21), `initialNumToRender` 14/5/6 (list/grid/cards), `maxToRenderPerBatch` 5, `removeClippedSubviews`. Zeilen als `React.memo`-Komponenten (`WatchlistListRow`, `WatchlistPosterRow`) mit stabilen Props; `withEffectiveReleaseDate`/`ratedCountFor` laufen innerhalb der Zeile (React Compiler cached sie je `item`), Platzhalter-Element und keyExtractor sind Modul-Konstanten. `getItemLayout` bewusst nicht gesetzt (Kartenhoehe variabel).
- **#6 Re-Render:** `TagebuchEntryList` bekommt statt des `screen`-Objekts explizite Props (`entries`, `mode`, `userId`, `starColor`, `showTitlesInGrid`, `groupMemberIds`, `displayNameById`, `onOpenEntry`); `useTagebuchScreen` gibt `userId` statt der Closure `ownRating` zurueck. Zeilen sind memoisiert und berechnen Mitglieder/Eigenbewertung selbst. React Compiler ist aktiv (per `babel-plugin-react-compiler` verifiziert, Hook-/Screen-Closures und Objekte werden bereits gecacht), deshalb keine zusaetzlichen `useCallback`/`useMemo` in den Hooks; `React.memo` nur an den Listenzeilen, weil FlatList `renderItem` neue Elemente erzeugt. NICHT umgesetzt: Dedupe der 3 Observer auf `useGroupWatchlist` (nicht trivial: jeder Tab nutzt `select` mit eigener Map; Umbau waere ein groesserer Eingriff in die Datenschicht) und `freezeOnBlur`.
- **#3 FadeInItem:** `src/components/ui/FadeInItem.tsx` + `FADE_MAX_INDEX = 29` in `src/lib/motion.ts`: Items mit `index > 29` sind schlichte Views (kein Mount-Fade, kein Tab-Replay, kein `TabSwitchContext`-Abo). Damit entsteht beim Scrollen kein Pop-in mit bis zu 320 ms Stagger-Verzoegerung durch die Virtualisierung. Die ersten 30 Items (deckt den ersten Bildschirm auch im 3-Spalten-Grid) fadeen unveraendert beim Mount und beim Tab-Wechsel (Replay) wie bisher; einziger Unterschied: tiefer gescrollte, gemountete Items replayen beim Tab-Wechsel nicht mehr.
- **Tests:** `__tests__/screens/Tagebuch.test.tsx` (120 Eintraege: nur Fenster gemountet, in allen 3 Modi), `__tests__/components/ui/FadeInItem.test.tsx` (Cap: kein Fade/Replay ab Index 30, bis 29 weiter Fade).

### Nachtrag: Blank-Areas beim schnellen Scrollen (2026-10-10)

Problem: schnelle Fling-Gesten (Karten-/Sheet-Ansicht Tagebuch und Watchlist, auch Grid/Liste) ueberholten das Rendering, es entstanden leere Flaechen. Ursache: das zu kleine Fenster (`windowSize` 7, `maxToRenderPerBatch` 5) plus `removeClippedSubviews`.

Neue Werte (beide Listen, alle Modi): `windowSize` 11 (vorher 7; Watchlist original 21 = Jank), `maxToRenderPerBatch` 8 (vorher 5), `updateCellsBatchingPeriod` 25 ms (neu, FlatList-Default 50), `removeClippedSubviews` false (vorher true), `initialNumToRender` ca. 1,5 Bildschirme: Karten 8, Grid 7 Reihen, Liste 20 (vorher 6/5/14). Begruendung: Fenster 11 = 5 Bildschirme je Seite vorgerendert, das reicht fuer normale Fluege; kleine Batches im kurzen Takt fuellen schneller nach, ohne den JS-Thread lange zu blockieren (Mittelweg zwischen 5/50 und dem alten Default 10/50 mit Fenster 21). `removeClippedSubviews` entkoppelt native Views ausserhalb des Sichtbereichs, zeigt aber auf Android bei diesen Blur-Karten Leerflaechen beim schnellen Zurueckscrollen; aus. Kosten: mehr gemountete Zeilen (Speicher, initiale Arbeit) gegenueber weniger Leerflaechen; liegt klar unter dem alten Jank-Zustand (21).

Platzhalter: Poster-Wrapper haben bereits feste Mindesthoehe (`min-h-36`, `bg-black/40`) bzw. `aspect-[2/3]` mit `bg-black/40`, also nie pechschwarz/leer beim Bildladen. Poster nutzen `cachePolicy="memory-disk"` (DiaryEntryCard, DiaryPosterTile, WatchlistPosterCard). `recyclingKey` nicht gesetzt: FlatList recycelt keine Zellen (nur FlashList); waere wirkungslos. `getItemLayout` bewusst NICHT gesetzt: Karten sind variabel hoch, und auch Listen-/Grid-Zeilen variieren (Titel 1-2 Zeilen, optionale Titel unter Kacheln), ein falsches Layout wuerde Scroll-Spruenge erzeugen.

Zu testen: schneller Fling hoch/runter und zurueck in der Karten-/Sheet-Ansicht von Tagebuch und Watchlist (danach Grid und Liste); wenn noch Leerflaechen: `windowSize` auf 13 und `maxToRenderPerBatch` auf 10 (`VIRTUALIZATION` in `TagebuchEntryList.tsx`/`WatchlistEntryList.tsx`); bei Ruckeln stattdessen zurueck auf 9/6.

### Nachtrag 2: Cheap Glass statt BlurView pro Item, Hintergrund vorab gebacken (2026-10-10)

Struktur (geprueft): hinter allen Screens liegt EIN statisches Foto (`AppBackground`, einmal im Root-Layout, nur horizontaler Parallax beim Tab-Wechsel, kein vertikales Scroll-Parallax). Der Inhalt der Listen scrollt UEBER dem Foto, ist nicht Teil des Blur-Targets. Ein BlurView (dimezis) zeigt daher nur den geblurrten Fotoausschnitt hinter sich, nie Listeninhalt. Genau dieses Bild pro Item live neu zu blurren (Ursache #1) war die Verschwendung.

**Umgesetzt (keine neue Dependency):**
- `GlassBlur` hat den neuen Modus `cheap` (durchgereicht ueber `Glass` und `Card` als Prop `cheap`): statt `BlurView` ein statisches, vorgeblurtes und vorgedimmtes Bild (`assets/images/cinema-bg-blur.jpg`, 384x256, ~5 KB, `expo-image`, `cachePolicy="memory"`, `contentFit="cover"`) plus derselbe Tint (`bg-bg-card-blur`) und Border. `enabled={false}` gewinnt weiterhin (Fallback-Fuellung). Alle anderen Nutzungen (Tab-Bar, Sheet, Filterpanel, Toast, Detail-Leiste, ScreenBackdrop, Tracker-Karte) bleiben echter Blur (wenige Instanzen).
- `cheap` aktiv in: `DiaryEntryCard`, `DiaryPosterTile`, `WatchlistPosterCard` (card + grid) und in `GlassTableHeader`/`GlassTableRow` (Tagebuch-/Watchlist-Liste). Damit gibt es in den scrollenden Listen keinen einzigen BlurView mehr.
- Assets werden reproduzierbar mit `scripts/generate-bg-assets.py` (Pillow + numpy) aus `cinema-bg.jpg` erzeugt; das Original bleibt unveraendert.

**Visuell ehrlich:** Der echte Blur zeigte den Fotoausschnitt exakt hinter der Karte. Das Cheap-Bild ist das ganze geblurrte Foto in die Karte skaliert: es folgt nicht dem Scroll/Parallax und zeigt nicht exakt den Ausschnitt dahinter. Da das Foto bei 62 % dunklem Tint und 25 px Blur praktisch strukturlos ist (weiche helle Flecken im Rauch, sonst nahezu schwarz), ist der Unterschied klein, aber nicht null: Helligkeitsverlauf der Karten kann leicht von dem des Hintergrunds hinter ihnen abweichen. Nicht auf dem Geraet verglichen (Pixel war nicht per adb verbunden).

**Cause #5 (mixBlendMode):** umgesetzt. `AppBackground` nutzt jetzt `assets/images/cinema-bg-baked.jpg` (1920x1280, selbe Aufloesung/Schaerfe), vorberechnet als `0.6 * Luma + 0.4 * 10` (Luminosity-Blend ueber `#0a0a0a` bei Opacity 0.6; Backdrop ist neutral grau, daher ist das Ergebnis ohne Farbstich exakt diese Formel). Kein `mixBlendMode`/`opacity` mehr zur Laufzeit (kein Offscreen-Layer), und das Blur-Target der verbleibenden BlurViews enthaelt kein Blend mehr. Abweichung: nur JPEG-Requantisierung (Qualitaet 92), minimal. Das Original `cinema-bg.jpg` bleibt als Quelle erhalten (Regel "nie neu kodieren" gilt weiter fuer die Quelle).

**Virtualisierung zurueckgenommen:** `windowSize` 9 (vorher 11), `maxToRenderPerBatch` 6 (vorher 8), `updateCellsBatchingPeriod` 30 (vorher 25); `removeClippedSubviews` false und `initialNumToRender` unveraendert. Gilt fuer beide Listen, alle Modi (`VIRTUALIZATION` in `TagebuchEntryList.tsx`/`WatchlistEntryList.tsx`). Wenn wieder Leerflaechen: 11/8/25; bei Ruckeln 7/5/50.

Zu pruefen am Handy: schneller Fling hoch/runter/zurueck in Tagebuch (Karten, Raster, Liste) und Watchlist; Kartenoptik vs. vorher (Helligkeit/Weichheit); Tab-Wechsel-Parallax unveraendert.

### Nachtrag 3: Pre-Blur-Bild verworfen, flache dunkle Karten (2026-10-10)

Geraetetest des Nutzers: Performance mit `cheap` deutlich besser, aber das vorgeblurte Bild passte nicht zum echten Foto dahinter (graue/weisse Flecken zwischen und unter den Karten). Ursache: das Bild war das ganze Foto in jede Karte skaliert, ohne Bezug zur Position.

**Geaendert:** `cheap` rendert jetzt KEIN Bild und keinen Tint-Layer mehr, sondern nur eine flache, stark abgedunkelte Flaeche `bg-bg-card-flat` = rgba(10,10,12,.95) (Token in `tailwind.config.js`; erst .85 gewaehlt, vom Nutzer nach Geraetetest auf .92, dann .95 erhoeht) mit unveraendertem Border/Rundung. Deckkraft final .95 (Nutzerentscheid); Feinjustage ueber den einen Token. `cinema-bg-blur.jpg` und die Blur-Erzeugung im Skript sind entfernt. Gebackener Hintergrund (`cinema-bg-baked.jpg`, Nachtrag 2) und die Fenster-Werte 9/6/30 bleiben.

**Waere ein billigerer echter Blur fuer 100+ Karten machbar? (Einschaetzung, nicht umgesetzt)**
- Nur die sichtbaren/obersten N Karten blurren: technisch moeglich (Sichtbarkeit per `onViewableItemsChanged`), aber beim Scrollen wechseln staendig Karten zwischen Blur und flach (Pop-in), und schon 6-8 sichtbare dimezis-BlurViews waren laut Test der Jank-Grund (jeder rendert pro Frame das Target neu und blurt). Erwartete Ersparnis nur etwa proportional zur Reduktion, Ruckeln auf dem Pixel bei Fling bleibt wahrscheinlich. Nicht empfohlen.
- EIN BlurView ueber dem ganzen Listenbereich, Karten als "Fenster": braucht eine Maske (Karten ausschneiden). Dafuer gibt es in der Installation nichts (`@react-native-masked-view` waere neue Dependency, und Masken erzwingen Offscreen-Layer, der mit dem scrollenden Inhalt jedes Frame neu gerendert wird). Alternativ BlurView UNTER der Liste und Zwischenraeume abdecken: die Luecken zwischen Karten zeigen dann geblurrtes statt scharfes Foto (Look-Aenderung) und die Kartenflaechen muessten exakt transparent bleiben; dann ist es 1 Blur-Pass pro Frame (guenstig, ca. wie Tab-Bar), aber der Look ist "ganze Liste unscharf", nicht "Karten milchig".
- Gebackene Alternative, die zum Foto passt: geblurrtes Foto im selben Koordinatensystem wie `AppBackground` (gleiche Groesse/Parallax) als EINE Ebene ueber dem scharfen Foto, nur im Listenbereich, Karten transparent mit leichtem Tint. Kosten: ein Bild (~wie das Hintergrundfoto), kein Blur-Pass. Nachteil wie oben: auch die Luecken zwischen Karten sind unscharf. Das waere der realistische Weg zu "Blur-Look", braucht aber eine Designentscheidung.
- Fazit: pro-Karte-Echtblur bei 100+ Karten auf Android nicht sinnvoll; nur die Ein-Ebene-Variante ist billig.

### Nachtrag 4: Blur komplett entfernt (2026-10-11)

Alle Glas-Flaechen nutzen jetzt die flache Fuellung `bg-bg-card-flat` (95 %); `GlassBlur`, `cheap` und die Dependency `expo-blur` sind entfernt. Aeltere Abschnitte oben beschreiben den Zustand davor.
