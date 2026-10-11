# WatchCrew Style Guide (flat Material)

Kurzreferenz. Quelle der Wahrheit fuer Tokens: `tailwind.config.js`; Komponenten in `src/components/ui/`.

## Tokens

| Token | Wert | Zweck |
|---|---|---|
| `glass-border` | `rgba(255,255,255,.10)`, **1px** | EINE Border fuer alle Flaechen (Karten, Buttons, Inputs, Sheets, Leisten, Trenner) |
| `bg-card` / `bg-bg-card-blur` | `.72` / `.62` | Karten-Fuellung (Glas): Fallback ohne Blur / Tint ueber dem Blur |
| `bg-glass` / `bg-bg-glass-strong-blur` | `.78` / `.72` | dichtere Glas-Variante |
| `bg-sheet` / `bg-bg-sheet-blur` | `.96` / `.76` | Flyouts, Tab-Bar, Toasts |
| `accent` | Gruppenfarbe (Standard Gold `#c8a44e`) | Primary |
| `danger` / `danger-text` | `#c0392b` / `#e5675a` | Danger-Fuellung bzw. Text und Icon |
| `success` / `success-text` | `#2e9e5b` / `#5fcf8a` | Erfolg (gruen): Toast-Fuellung/Border bzw. Text und Icon |

## Border-Regel

- Flat Material: eine gleichmaessige 1px-Border `border border-glass-border`. Kein Highlight oben, keine dunkle Unterkante, kein Innen-/Aussenschatten (`shadow-card` entfernt), keine Doppel-Border (kein `border-t-*`/`border-b-*` Farbpaar).
- Glas-Blur und Transluzenz bleiben (Inhaltstrennung), nur die Kante ist schlicht.
- Listen-Items (Karten, Kacheln, Tabellenzeilen in scrollenden Listen: Tagebuch/Watchlist/Tracker-Tabelle) nutzen `cheap` (`GlassBlur`/`Glass`/`Card` Prop): flache dunkle Glas-Flaeche `bg-bg-card-flat` (rgba(10,10,12,.95)) + Border + Rundung, KEIN BlurView und kein Bild (Performance, docs/performance-scroll-analysis.md Nachtrag 3). Ein vorgeblurtes Bild pro Item wurde verworfen (passte nicht zum Foto dahinter). Echter BlurView nur fuer wenige grosse Flaechen (Tab-Bar, Sheet, Filterpanel, Toast, Detail-Leiste, Backdrop).
- Glas-Schicht = BlurView (Intensitaet `GLASS_BLUR_INTENSITY` 100 = max. 25px Radius) + dunkler Tint (>= .6) + Border, immer HINTER dem Inhalt. Ausgegraute Eintraege ("Kommt noch") dimmen nur die Inhaltsschicht (`*-content`, `opacity-50`), nie die Glas-Flaeche.
- Konstanten: `GLASS_EDGE` / `GLASS_INSET_EDGE` (identisch) in `Glass.tsx`; Tab-Bar `GLASS_TAB_BAR_STYLE` nutzt dieselbe Farbe (0.1 Alpha).
- Primary hat `border-transparent` (gleiche Masse, keine sichtbare Kante).

## Varianten nach Funktion (`Button`, `src/components/ui/Button.tsx`)

| Funktion | Variante | Look |
|---|---|---|
| Hauptaktion (eine pro Screen) | `primary` | Akzent (Gold) gefuellt, dunkler Text |
| Nebenaktion, Abbrechen | `secondary` | `bg-white/10` + `glass-border`, heller Text |
| Tertiaer / Icon im Header | `ghost` | keine Fuellung, keine Kante |
| Zerstoerend (loeschen, verlassen, entfernen) | `danger` | siehe unten |
| Nur Icon | `iconOnly` + beliebige Variante (`size`: default 48 / sm 44 / xs 36) | rund |

Chips (`Chip.tsx`) bleiben die eigene Auswahl-Komponente (Filter/Modi/Tags), `SortButton` = Secondary-Look, `ViewModeToggle` = Segment in `glass-border` mit aktivem Primary-Segment; Pille 48 hoch, `p-[3px]`+1px Border = 4px Innenabstand ringsum, drei identische 40x40-Zellen mit `gap-1`, Icons mittig, Toolbar-Reihe `items-center`.

## Button-Icons (Text + Icon ueberall)

Jeder beschriftete Aktions-`Button` zeigt ein fuehrendes Icon: `<Button label="Speichern" icon="save" />` (`icon` = Rolle aus `Icon.tsx`; Farbe nach Variante, gedimmt bei `disabled`, Groesse M bzw. S bei `size="xs"`). Kein Hand-Bau aus `Icon` + `Text` als Children. Durchgesetzt von `__tests__/components/ui/buttonIcons.test.ts` (scannt `src`). Ausnahmen: Chips/Pillen/Segmente, Listenzeilen, Tabs, Textlinks (`Link`), `iconOnly`, Gruppen-Umschalter (`group-settings-switch-*`).

| Aktion | Rolle (Glyph) |
|---|---|
| Speichern (Zahlung, Passwort, Bewertung) | `save` (save) |
| Abbrechen / Schliessen | `close` (close) |
| Loeschen (Konto, Zahlung, Film) | `delete` (delete) |
| Entfernen (Mitglied) | `removeMember` (person-remove) |
| Verlassen (Gruppe) | `leave` (exit-to-app) |
| Zurueck / Zurueck zum Login | `back` (arrow-back) |
| Weiter / Fortfahren | `next` (arrow-forward) |
| Anmelden / Zum Login | `login` (login) |
| Konto erstellen | `register` (person-add) |
| Gruppe beitreten | `join` (login) |
| Gruppe erstellen / Hinzufuegen | `add` (add) |
| Abmelden | `logout` (logout) |
| Teilen | `share` (share) |
| Neu generieren | `regenerate` (refresh) |
| Zuruecksetzen (Datum) | `reset` (restore) |
| Link senden / anfordern | `send` (send) |
| Mehr laden | `chevronDown` (expand-more) |
| Andere/s Person/Studio waehlen | `change` (swap-horiz) |
| Systemeinstellungen oeffnen | `settings` (settings) |

Reihenfolge in Aktionsreihen bleibt: Loeschen zuletzt/rechts. Lange Labels brechen in `flex-1`-Buttons nicht ab: Icon + Text zentriert, Text darf umbrechen.

## Zahler-Hinweis (Tracker)

- Bearbeiten-Flyout (`TrackerEntrySheet`): Zahler-Chips nur mit Namen, KEIN Hinweis (das Datum des Eintrags steht im Datumsfeld).
- "Zahlung erfassen" (`PaymentModal`): zweite Zeile je Chip, explizit beschriftet (`lastPaidHint`): "zuletzt bezahlt: heute | gestern | vor N Tagen", "noch nie bezahlt"; Zukunftsdatum als absolutes Datum. Hilft zu sehen, wer als naechstes dran ist.

## Danger-Regel (ein Look, alle Formen)

Gemeinsame Tokens in `Button.tsx`: `DANGER_SURFACE_CLASSNAME` (`bg-danger/15 border border-danger/30`), `DANGER_PRESSED_CLASSNAME` (`active:bg-danger/25`), `DANGER_TEXT_CLASSNAME` (`text-danger-text`), `DANGER_ICON_COLOR` (`#e5675a`).

- Button: `<Button variant="danger" />` (Gruppe verlassen, Mitglied entfernen, Konto loeschen, Bestaetigen im Loesch-Flyout).
- Listenzeile: `<SettingsRow danger />` (rote Tint-Zeile, roter Text, Icon und Chevron).
- Icon-Button: `<Button variant="danger" iconOnly size="xs" />` (Bewertung zuruecksetzen im `RatingDialog`).
- Aktions-Kachel: `ActionIconButton danger` in `MovieDetailActionsBar` (Danger-Flaeche statt Glas-Kachel).
- Fehlertext: `text-danger` (nur Meldungen, keine Aktionen).
- Zerstoerende Aktionen mit Bestaetigung: erst Danger-Ausloeser, dann Bestaetigung (Flyout/inline) mit `secondary` (Abbrechen) + `danger` (Ausfuehren).

## Aktionsreihen: Löschen immer rechts/zuletzt

- In jeder Reihe/Gruppe von Aktions-Buttons ist die zerstoerende Aktion (Loeschen, Entfernen, Verlassen) das LETZTE (rechteste) Element, nie an zweiter/dritter Stelle. Vertikale Stapel: zuletzt/unten. Gilt auch fuer Bestaetigungs-Paare (`Abbrechen` links, `Loeschen` rechts) und die Film-Aktionsleiste (Watchlist: `bewerten, aehnliche, filmreihe, loeschen`; Tagebuch: `bearbeiten, aehnliche, filmreihe, loeschen`; Quelle `getVisibleActions`).
- Tracker-Flyout: `Speichern | Loeschen`. Rating-Dialog: der Reset-Papierkorb steht rechts in der Sternzeile.

## Motion (`src/lib/motion.ts`)

- Eine Animationssprache fuer Listeninhalt: gestaffeltes Einblenden pro Eintrag (`FadeInItem`): Opacity 0 -> 1, 220 ms (`ITEM_FADE_DURATION_MS`), Easing `Easing.inOut(Easing.ease)` (`ITEM_FADE_EASING`), Versatz 40 ms pro Index (`STAGGER_STEP_MS`), gedeckelt ab Index 8 (`MAX_STAGGER_INDEX`, max. 320 ms), Native-Driver.
- Ansichtswechsel (Sheet/Tile/Liste): die Liste wird per `key` neu gemountet, jeder Eintrag blendet so ein.
- Tab-Wechsel (Tracker/Watchlist/Tagebuch): Eintraege des neu aktiven Tabs spielen dieselbe Animation erneut ab (`replayTab` + `TabSwitchContext`, Zaehler nur bei Tab-zu-Tab-Wechsel; Rueckkehr aus Modals und Refetches loesen nichts aus), parallel zu Swipe/Parallax (600 ms).
- Reduce-Motion (`useReducedMotion`): keine Animation, Eintraege sofort sichtbar.
- Neue Werte nur in `motion.ts` aendern, nie pro Screen.

## Laden (Skeleton + Spinner)

- **Struktur zuerst:** Seiten zeigen ihr Gerüst sofort aus vorhandenen Daten (gecachte Zeile / Route-Params); nur was noch fehlt, ist ein Platzhalter, der beim Eintreffen der Daten ersetzt wird (keine Layout-Sprünge: Platzhalter haben die Form/Größe des Inhalts).
- **Hoehe = Realhoehe:** `SkeletonText` bekommt die GLEICHEN Text-Klassen wie der echte Inhalt (`textClassName`, exportiert als Konstante der Komponente, z.B. `MOVIE_DETAIL_META_TEXT_CLASSNAME`) und rendert pro Zeile einen unsichtbaren Text mit diesen Klassen; Chips/Avatare/Logos nutzen dieselben Groessen-Token (`CHIP_HEIGHT_CLASSNAME`, `CAST_AVATAR_SIZE_CLASSNAME`, `PROVIDER_LOGO_CLASSNAME`). Nie Pixelhoehen separat festlegen; Schrift-/Groessenwechsel (Outfit/DM Sans) wirken so automatisch. Test: `__tests__/components/movie/MovieDetailSkeletons.test.tsx`.
- **Skeleton** (`src/components/ui/Skeleton.tsx`: `Skeleton`, `SkeletonText`; `ListSkeleton.tsx` fuer Listen): massive, dezente Fuellung `bg-white/10` (weiss ~10 %), **kein Border**, `rounded-md` (Avatare/Chips `rounded-full`), Pulsieren 0,5 bis 1,0 Opacity (Reanimated, UI-Thread, Werte `SKELETON_*` in `src/lib/motion.ts`), Reduce-Motion = statisch. Form pro Inhalt: Cast = 5 Kreise + kurze Namens- und kuerzere Rollenzeile, Regie = Balken ~40 % neben dem Label, Beschreibung = 3 Zeilen (letzte 60 %), Genres = 3 Pillen, Laufzeit/Datum = 2 Balken, Anbieter = Reihe Quadrate. Technik: Geometrie + Farbe auf normalen Views (className greift immer), die Reanimated-Ebene animiert nur Opacity (StyleSheet-Geometrie, className auf Animated-Views kann im Release kollabieren). Nie dunkle Fuellung (`bg-card-flat` ist auf dunklem Hintergrund unsichtbar) und nie 1px-Border auf dem Block (zeigte nur gebrochene Kanten).
- **Spinner** (`src/components/ui/Spinner.tsx`) nur wo ein Skeleton keinen Sinn ergibt (Buttons, winzige Inline-Bereiche, Trailer-Wartezustand). Immer Akzentfarbe des Gruppen-Themes (`useGroupTheme().colors.accent`); nie rohes `ActivityIndicator`. Einzige Ausnahme: `color` nur für Kontrast auf gefuellten Primary-/Danger-Buttons.
- Detail-Screen testIDs: `movie-detail-*-skeleton` (title, poster, runtime, release-date, genre-skeleton-N, description, director, cast, providers). Listen: bestehende `*-loading`-testIDs liegen jetzt auf dem `ListSkeleton`.

## Navigation (Zurück)

- Zurück-Wisch von links nach rechts nimmt genau eine Ebene vom Stack (Detail, Ähnliche Filme, Einstellungen und Unterseiten, Filmreihe, Filmografien, Film hinzufuegen). Android: Systemgeste am Rand plus `BackSwipeView` (linke 25 % der Breite); iOS: `fullScreenGestureEnabled`. Hardware-Zurück tut dasselbe.
- Reihenfolge: Ursprung (Tab) -> Detail -> Ähnliche Filme -> Detail wird per `replace` auf der Raster-Ebene geführt, d.h. Zurück vom ähnlichen Film landet im vorherigen Detail, dann beim Ursprung. Andere Raster (Filmreihe, Filmografie) bleiben auf dem Stack.
- Sheet/Dialog (`Sheet`) schliesst bei Zurück zuerst (BackHandler), erst danach wird der Screen gepoppt.
- Eigene Zurück-Buttons nutzen `useSafeBack` (`router.back()`, ohne History `replace("/")`).

## Backdrop-Regel (`ScreenBackdrop`, `src/components/ui/ScreenBackdrop.tsx`)

- NUR Tracker, Watchlist, Tagebuch zeigen das Foto (`AppBackground`) ungedimmt.
- Foto: Original 1920x1280 (`assets/images/cinema-bg.jpg`, Quelle, nie veraendern) wird per `scripts/generate-bg-assets.py` zu `cinema-bg-baked.jpg` (gleiche Aufloesung) vorberechnet und angezeigt; 100 % Bildschirmhöhe, nur horizontaler Parallax, zentriert (mittlerer Tab = Bildmitte, Bewegung gleich weit nach links/rechts, live mit dem Wisch); Weg = `BG_PARALLAX_TRAVEL_FRACTION` (0.45, vorher 1.0 = voller Weg) x (Ueberstand - 2 x `BG_PARALLAX_EDGE_INSET_DP` 40 dp) in `src/lib/parallax.ts`; Dimmung (Graustufen, 0.6 ueber #0a0a0a) ist im gebackenen Asset, kein `mixBlendMode`/Opacity zur Laufzeit.
- Alle anderen Screens bekommen ein Blur-Backdrop mit Dim-Stufe (`level`):
  - `calm` (`bg-black/70`, Blur 90): Detail-artige Modal-Routen (Filmdetail = Referenzlook, Film hinzufuegen, Aehnliche, Filmreihe, Filmografien). `CALM_BACKDROP_ROUTES`.
  - `dim` (`bg-black/80`, Blur 90): Einstellungen (Hub + Unterseiten), Gruppen-Einstellungen, Login/Registrierung/Passwort, Onboarding, Einladung, Auth-Callback. `DIM_BACKDROP_ROUTES`, `ROOT_DIM_BACKDROP_ROUTES`.
- Anwendung per Navigator-`screenLayout` (`screenBackdropLayout` in `(modals)`, `rootBackdropLayout` im Root-Stack), nie per Screen-Hack. Neue Route = in die passende Liste eintragen.

## Toasts (`ToastHost`, `showToast(msg, { variant })`)

Gleiche Glas-Flaeche + EINE 1px-Border; die Variante faerbt Border (40%), Tint (15%), Text und Icon:

| Variante | Wann | Look |
|---|---|---|
| `success` | gespeichert, hinzugefuegt, umbenannt, Farbthema geaendert, Zahlung gespeichert | gruen: `bg-success/15`, `border-success/40`, `text-success-text`, Icon check-circle |
| `error` | jeder Fehlerpfad (Speichern fehlgeschlagen, Netzwerk, Validierung ausserhalb von Formularfeldern) | rot: `bg-danger/15`, `border-danger/40`, `text-danger-text`, Icon error, `accessibilityLiveRegion="assertive"` |
| `info` (Standard) | neutrale Hinweise (Realtime, "Wird bald ergaenzt") | Accent-Border, keine Tint, kein Icon |

Jeder Toast hat rechts einen Schliessen-Button (`toast-close`, Icon `close`, 48dp Touch-Box, `accessibilityLabel="Schließen"`), der ihn sofort ausblendet; Auto-Dismiss (4 s) bleibt. Der Trailer-Player im Filmdetail hat links oben ebenfalls ein X (`movie-detail-trailer-close-button`), das zum Poster zurueckkehrt.

Regeln: Erfolg IMMER `{ variant: "success" }`, Fehler IMMER `{ variant: "error" }` (kein `Alert.alert` fuer Fehler). Helfer `showSuccessToast` / `showErrorToast` in `src/lib/toast.ts`. Varianten-Tabelle: `TOAST_VARIANT_STYLES` in `Toast.tsx`.

## Touch-Targets (Barrierefreiheit)

Mindestens 48dp (Android) bzw. 44pt (iOS) pro tippbarem Element; Konstanten und Helfer in `src/components/ui/touchTarget.ts` (`MIN_TOUCH_TARGET`, `MIN_TOUCH_TARGET_IOS`, `hitSlopFor`, `SMALL_PILL_HIT_SLOP`).

- Visual bleibt klein, Touch waechst: `hitSlop` (Button `sm`/`xs` automatisch, `Chip` vertikal, Payer-Pillen) oder 48er Touch-Box mit kleinem Visual darin (`ViewModeToggle`, "+" im `MovieGrid`). Kein hitSlop zwischen direkt angrenzenden Targets (Overlap).
- Sterne: Touch-Box 44 breit x 48 hoch (Glyph 40, Luecke 4dp); 5 x 44 = 220 (+ Herz 44 + Reset 36 = 300) passt in 328dp Inhaltsbreite eines 360dp-Phones. Halbe Sterne bleiben ueber die Tap-Position links/rechts der Box.
- Reine Textlinks/Zeilen: `min-h-touch-comfortable` (48). Icon-only: `Button iconOnly` (48 default) mit `accessibilityLabel`.
- Jedes Icon-only-Control hat `accessibilityLabel`; Toggles `accessibilityState` (selected/checked/expanded).

## Switches (`SwitchIndicator`, `src/components/ui/Switch.tsx`)

- Android: echter Material-3-Compose-Switch (`@expo/ui/jetpack-compose` `Switch`, nativ im Dev-Client enthalten), nicht interaktiv unter `pointerEvents="none"`; an-Farbe = Gruppen-Akzent (`useGroupTheme().colors.accent`). Sonst (iOS/Web/Jest) `FallbackSwitch`.
- Fallback exakt M3: Track 52x32 (`border-2`), an = `bg-accent` + heller 24dp-Daumen (`bg-text-primary`, nie dunkel) mit Check-Icon (16dp, Akzentfarbe); aus = `border-text-secondary` + 16dp-Daumen `bg-text-secondary`; gedrueckt = 28dp-Daumen + 40dp State-Layer (`bg-white/10`); disabled = `opacity-40`.
- Immer ueber `SettingsToggleRow` (ganze Zeile `Pressable`, `accessibilityRole="switch"`, `accessibilityState.checked`, `min-h-touch-comfortable` = 48dp). Kein nativer `Switch`, keine Button-als-Switch.
- Textlinks (`expo-router` `Link`): `asChild` + `Pressable` + `Text` mit expliziter Farbe (`text-accent-light`); `className` direkt auf `Link` wirkt nicht (Text wird schwarz). Jeder `Text` auf dunklen Flaechen braucht eine explizite `text-*`-Klasse.

## Brand-Assets (Icon, Splash)

- Quelle der Wahrheit: `scripts/generate-brand-assets.py` (`python3 scripts/generate-brand-assets.py`; `--preview DIR` rendert Verlaufskandidaten + Launcher-Masken). Glyph = Legacy-Icon (Gold `#c8a44e` / gedimmt `#8f763a` auf `#0a0a0a`).
- Splash: schwarz mit schraegem Grau-Verlauf (oben links hell, unten rechts schwarz). Nativ nur schwarz + Glyph (`app.config.ts`, `imageWidth` 288); In-App-Overlay `src/components/animated-icon.tsx` zeigt `splash-bg.png` + Glyph (`SPLASH_GLYPH_SIZE` 288).
- Sheet-Karten (Tagebuch `DiaryEntryCard`, Watchlist `WatchlistPosterCard` card): Poster-Wrapper `min-h-36 w-24 self-stretch`, Bild `absolute inset-0 h-full w-full` + `contentFit="cover"`; Poster fuellt IMMER die volle Kartenhoehe (nie festes `aspect-[2/3]` am Bild).
- Ausnahme zu "keine Inline-Styles": Geometrie des Splash-Overlays nutzt `StyleSheet`-Objekte, da className-Geometrie im EAS-Release-Build kollabieren kann (siehe `AppBackground`).

## Highlight-Farbe

- Alles, was Highlight/Brand-Akzent ist, folgt dem Gruppen-Theme (Gold, Rot, Blau, Grün, Lila, Orange): Pillen/Chips, aktive Segmente, Tab-Indikator, Primary-Button, Switch, Chevrons, Links, Modal-Header-Pfeil/-Titel, Filter-Punkt, Bookmark-Badge.
- Klassen: `accent`, `accent-light`, `accent-aNN` (15/30/40/45/55; NativeWind `/NN` geht auf `var()`-Farben nicht). Props mit Hex-Zwang: `useGroupTheme().colors.accent|accentLight|...`. Nie Hex im Code.
- Feste Ausnahmen: Danger (rot), Success (grün), Like-Herz, Gesehen-Auge, TMDB-Badge, Splash-/Icon-Assets. **Sterne sind in ALLEN Themes fest gelb `#FFD700`** (Token `star-color`/`colors.starColor`, nie Akzent): Durchschnitt, Einzelbewertungen, Rating-Dialog, Details, Tagebuch-Karten/-Kacheln, Halbsterne. **Header/Brand immer weiss:** `WATCHCREW`-Schriftzug und Film-Icon in `AppHeader`/`Brand` (`text-white`, Icon `#ffffff`), nie Akzent. Untertitel unter dem Schriftzug = NUR der Gruppenname (Stil wie frueher der Ansichtsname: `text-xs uppercase tracking-widest text-text-secondary`, 1 Zeile, Ellipsis; ohne Gruppe faellt er auf den Ansichtsnamen zurueck), testID `app-header-title`; das frühere `app-header-group` ist entfallen, an seiner Stelle haelt `app-header-spacer` (`h-4`) die Hoehe. Tippen auf das Header-Logo (`app-header-brand-button`, 48dp) wechselt zur naechsten Gruppe (Wrap-around, Info-Toast mit Gruppenname; bei einer Gruppe Toast "Nur eine Gruppe").
- Test: `__tests__/theme/noHardcodedAccent.test.ts`. Device: `theme-tour`.

## Listenansicht = Tracker-Tabelle

Die Listenansichten von Watchlist und Tagebuch sehen aus wie die Tracker-Tabelle: Glas-Karte (`px-3 pt-3`), Kopfzeile `text-sm text-text-secondary` mit Trennlinie, Zeilen `py-3` mit Trennlinie, Titel weiss in Outfit (`TABLE_TITLE_CELL` = `flex-1 pr-2 font-title text-text-primary`; wie Sheets/Karten; auch im Tracker; genau 1 Zeile mit Ellipsis), Datumsspalte `w-28` rechtsbuendig, Scores `w-10` rechtsbuendig, kein Poster. Gemeinsame Bausteine in `src/components/ui/GlassTable.tsx` (`GlassTableHeader`, `GlassTableRow`, `TABLE_*_CELL`); die virtualisierten Listen bauen die eine Karte aus Kopf-/Zeilen-Scheiben (`GlassBlur` im `cheap`-Modus, `bg-bg-card-flat`) zusammen.

Spalten: Tracker Film | Bezahlt von | Datum; Watchlist Film | Erscheint; Tagebuch Film | Herz (nur bei eigenem Like, `#e05c6e`) | Ø | TMDB. Tagebuch-Kopfzeile nutzt Icons statt Text (Herz, Stern in Sternfarbe, TMDB-Logo via `TmdbBadge hideScore`) mit `accessibilityLabel` "Favorit"/"Durchschnitt"/"TMDB".

**Sortierbare Spaltenkoepfe:** Kopfzellen der Listenansichten (Tagebuch: Film, Herz, Ø, TMDB; Watchlist: Film, Erscheint) sind ueber `onPress`/`sortState` an `GlassTableHeaderCell`/`GlassTableHeaderIconCell` sortierbar; ohne `onPress` bleiben sie reiner Text/Icon (Tracker). Tipp-Zyklus aufsteigend, absteigend, aus; nur die aktive Spalte zeigt einen kleinen Chevron (`Icon` `sortAsc`/`sortDesc` = expand-less/-more, Token `XS` 14px, Akzentfarbe) und `accessibilityState.selected`; das Label nennt die Richtung ("aufsteigend/absteigend sortiert"), dazu `accessibilityHint`. testIDs: `<header-testID>` und `<header-testID>-sort-asc|-sort-desc` am Chevron. Aufbau: Kopfzelle idle `h-6` (24dp, Kopfzeile symmetrisch `pt-3`/`pb-3`, Inhalt vertikal zentriert, kein reservierter Platz); nur die AKTIVE Zelle waechst auf `h-9` und die Kopfzeile damit um 12dp, in diesem Streifen sitzt der Chevron (absolut, `pointerEvents=none`, bei Icon-Zellen horizontal zentriert unter dem Icon, bei rechtsbuendigem "Erscheint" rechtsbuendig unter dem Text); Icon/Text bewegen sich nie. Text-Kopf links (Film): fester 14px-Slot rechts vom Text, immer reserviert. Touch-Ziel >= 44dp (24dp + hitSlop 10 oben/unten). Kopf-Icons `SM` (20), TMDB-Logo `largeLogo` (36x16). Regel: Kopf- und Datenzelle einer Spalte nutzen dieselbe Breitenkonstante (`TABLE_ICON_CELL` w-12, `TABLE_SCORE_STRONG_CELL` w-12, `TABLE_SCORE_CELL` w-16), Inhalt in allen drei Spalten zentriert (Icon und Zahl uebereinander).


## Schriften (Fonts)

- **Outfit** (`@expo-google-fonts/outfit`): Filmtitel und ALLE Ueberschriften (Headline-Schrift). Tokens `font-title` (Outfit_600SemiBold), `font-title-bold` (Outfit_700Bold).
- **DM Sans** (`@expo-google-fonts/dm-sans`): Standard-Textschrift der ganzen App (Fliesstext, Inputs, Buttons, Chips, Tab-Labels, Dialoge, Toasts, Badges, Zahlen, Tabellenzellen). React Native braucht eine Family pro Gewicht, daher explizite Tokens: `font-sans` (DMSans_400Regular, Default), `font-sans-medium` (500), `font-sans-semibold` (600), `font-sans-bold` (700), `font-sans-italic` (400 Italic). Die Klassen `font-medium`/`font-semibold` werden NICHT mehr verwendet, stattdessen `font-sans-medium`/`font-sans-semibold`.
- Default-Mechanismus: `Text`/`TextInput` IMMER aus `@/components/ui/Text` importieren (nicht aus `react-native`); der Wrapper ergaenzt `font-sans`, ausser die className waehlt schon eine Family (`font-title*`, `font-sans*`).
- **Playfair Display entfernt:** Outfit ist die Headline-Schrift fuer ALLES (Wortmarke `AppHeader`/`Brand` in `font-title-bold`, Sheet-/Modal-Header-Titel, Auth, Onboarding, Settings). Body bleibt DM Sans.
- Konstanten `src/components/ui/movieTitle.ts`: `MOVIE_TITLE_TEXT` (`font-title text-accent-light`) fuer Titel in Sheet-Karten und Kacheln/Grid, `MOVIE_TITLE_FONT` (`font-title`) wenn die Farbe am Aufrufort gesetzt wird (Tabellenzeilen weiss via `TABLE_TITLE_CELL`; Detail-Titel und Rating-Dialog `text-accent-light`). Groesse am Aufrufort.
- Titel in allen Listenansichten sind IMMER genau 1 Zeile (`numberOfLines={1}` + `ellipsizeMode="tail"`); Farbe: Sheet-Karten/Kacheln Akzent, Tabellenzeilen weiss. So haengt die Kartenhoehe nicht von der Titellaenge ab.
- Noch Systemschrift: native Picker/Alerts, Statusleiste, Tastatur, System-Datepicker, Android-Toasts/Dialoge des Systems.
