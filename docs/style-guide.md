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

Chips (`Chip.tsx`) bleiben die eigene Auswahl-Komponente (Filter/Modi/Tags), `SortButton` = Secondary-Look, `ViewModeToggle` = Segment in `glass-border` mit aktivem Primary-Segment.

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

- In jeder Reihe/Gruppe von Aktions-Buttons ist die zerstoerende Aktion (Loeschen, Entfernen, Verlassen) das LETZTE (rechteste) Element, nie an zweiter/dritter Stelle. Vertikale Stapel: zuletzt/unten. Gilt auch fuer Bestaetigungs-Paare (`Abbrechen` links, `Loeschen` rechts) und die Film-Aktionsleiste (`bewerten, bearbeiten, aehnliche, filmreihe, loeschen`; Quelle `getVisibleActions`).
- Tracker-Flyout: `Speichern | Loeschen`. Rating-Dialog: der Reset-Papierkorb steht rechts in der Sternzeile.

## Motion (`src/lib/motion.ts`)

- Eine Animationssprache fuer Listeninhalt: gestaffeltes Einblenden pro Eintrag (`FadeInItem`): Opacity 0 -> 1, 220 ms (`ITEM_FADE_DURATION_MS`), Easing `Easing.inOut(Easing.ease)` (`ITEM_FADE_EASING`), Versatz 40 ms pro Index (`STAGGER_STEP_MS`), gedeckelt ab Index 8 (`MAX_STAGGER_INDEX`, max. 320 ms), Native-Driver.
- Ansichtswechsel (Sheet/Tile/Liste): die Liste wird per `key` neu gemountet, jeder Eintrag blendet so ein.
- Tab-Wechsel (Tracker/Watchlist/Tagebuch): Eintraege des neu aktiven Tabs spielen dieselbe Animation erneut ab (`replayTab` + `TabSwitchContext`, Zaehler nur bei Tab-zu-Tab-Wechsel; Rueckkehr aus Modals und Refetches loesen nichts aus), parallel zu Swipe/Parallax (600 ms).
- Reduce-Motion (`useReducedMotion`): keine Animation, Eintraege sofort sichtbar.
- Neue Werte nur in `motion.ts` aendern, nie pro Screen.

## Navigation (Zurück)

- Zurück-Wisch von links nach rechts nimmt genau eine Ebene vom Stack (Detail, Ähnliche Filme, Einstellungen und Unterseiten, Filmreihe, Filmografien, Film hinzufuegen). Android: Systemgeste am Rand plus `BackSwipeView` (linke 25 % der Breite); iOS: `fullScreenGestureEnabled`. Hardware-Zurück tut dasselbe.
- Reihenfolge: Ursprung (Tab) -> Detail -> Ähnliche Filme -> Detail wird per `replace` auf der Raster-Ebene geführt, d.h. Zurück vom ähnlichen Film landet im vorherigen Detail, dann beim Ursprung. Andere Raster (Filmreihe, Filmografie) bleiben auf dem Stack.
- Sheet/Dialog (`Sheet`) schliesst bei Zurück zuerst (BackHandler), erst danach wird der Screen gepoppt.
- Eigene Zurück-Buttons nutzen `useSafeBack` (`router.back()`, ohne History `replace("/")`).

## Backdrop-Regel (`ScreenBackdrop`, `src/components/ui/ScreenBackdrop.tsx`)

- NUR Tracker, Watchlist, Tagebuch zeigen das Foto (`AppBackground`) ungedimmt.
- Foto: Original 1920x1280 (`assets/images/cinema-bg.jpg`, nie neu kodieren/verkleinern), 100 % Bildschirmhöhe, nur horizontaler Parallax (erster/letzter Tab je 40 dp Abstand zur Bildkante, `BG_PARALLAX_EDGE_INSET_DP`, Mitte zentriert, live mit dem Wisch); Dimmung per `mixBlendMode: luminosity` + Opacity, nicht im Asset.
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
- Ausnahme zu "keine Inline-Styles": Geometrie des Splash-Overlays nutzt `StyleSheet`-Objekte, da className-Geometrie im EAS-Release-Build kollabieren kann (siehe `AppBackground`).

## Highlight-Farbe

- Alles, was Highlight/Brand-Akzent ist, folgt dem Gruppen-Theme (Gold, Rot, Blau, Grün, Lila, Orange): Pillen/Chips, aktive Segmente, Tab-Indikator, Primary-Button, Switch, Chevrons, Links, Modal-Header-Pfeil/-Titel, Filter-Punkt, Bookmark-Badge.
- Klassen: `accent`, `accent-light`, `accent-aNN` (15/30/40/45/55; NativeWind `/NN` geht auf `var()`-Farben nicht). Props mit Hex-Zwang: `useGroupTheme().colors.accent|accentLight|...`. Nie Hex im Code.
- Feste Ausnahmen: Danger (rot), Success (grün), Like-Herz, Gesehen-Auge, TMDB-Badge, Splash-/Icon-Assets. **Sterne sind in ALLEN Themes fest gelb `#FFD700`** (Token `star-color`/`colors.starColor`, nie Akzent): Durchschnitt, Einzelbewertungen, Rating-Dialog, Details, Tagebuch-Karten/-Kacheln, Halbsterne. **Header/Brand immer weiss:** `WATCHCREW`-Schriftzug, Gruppenname und Film-Icon in `AppHeader`/`Brand` (`text-white`, Icon `#ffffff`), nie Akzent. Tippen auf das Header-Logo (`app-header-brand-button`, 48dp) wechselt zur naechsten Gruppe (Wrap-around, Info-Toast mit Gruppenname; bei einer Gruppe Toast "Nur eine Gruppe").
- Test: `__tests__/theme/noHardcodedAccent.test.ts`. Device: `theme-tour`.
