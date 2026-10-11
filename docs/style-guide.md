# WatchCrew Style Guide (flat Material)

Kurzreferenz. Quelle der Wahrheit fuer Tokens: `tailwind.config.js`; Komponenten in `src/components/ui/`.

## Tokens

| Token | Wert | Zweck |
|---|---|---|
| `glass-border` | `rgba(255,255,255,.10)`, **1px** | EINE Border fuer alle Flaechen (Karten, Buttons, Inputs, Sheets, Leisten, Trenner) |
| `bg-bg-card-flat` | `.95` | EINZIGE Glas-Fuellung aller Flaechen (Karten, Tab-Bar, Toasts, Leisten, Dialoge, Settings, Backdrop). Konstante `GLASS_FLAT_FILL` in `Glass.tsx`. Kein Blur in der App. |
| `accent` | Gruppenfarbe (Standard Gold `#c8a44e`) | Primary |
| `danger` / `danger-text` | `#c0392b` / `#e5675a` | Danger-Fuellung bzw. Text und Icon |
| `success` / `success-text` | `#2e9e5b` / `#5fcf8a` | Erfolg (gruen): Toast-Fuellung/Border bzw. Text und Icon |

## Border-Regel

- Flat Material: eine gleichmaessige 1px-Border `border border-glass-border`. Kein Highlight oben, keine dunkle Unterkante, kein Innen-/Aussenschatten (`shadow-card` entfernt), keine Doppel-Border (kein `border-t-*`/`border-b-*` Farbpaar).
- Kein Blur, keine Transluzenz-Stufen: alle Glas-Flaechen nutzen dieselbe flache dunkle Fuellung, nur die Kante ist schlicht.
- Alle Glas-Flaechen (Karten, Kacheln, Tabellenzeilen, Tab-Bar, Toasts, Detail-Leiste, Settings-Gruppen, Backdrop) nutzen die flache dunkle Flaeche `bg-bg-card-flat` (rgba(10,10,12,.95), `GLASS_FLAT_FILL`) + Border + Rundung. KEIN BlurView (`expo-blur` entfernt), kein Bild. Die Varianten `default`/`strong`/`panel` von `Glass` unterscheiden sich nur noch in der Form.
- Ausgegraute Eintraege ("Kommt noch") dimmen nur die Inhaltsschicht (`*-content`, `opacity-50`), nie die Glas-Flaeche.
- Konstanten: `GLASS_EDGE` / `GLASS_INSET_EDGE` (identisch) in `Glass.tsx`; Tab-Bar `GLASS_TAB_BAR_STYLE` nutzt dieselbe Farbe (0.1 Alpha).
- Primary hat `border-transparent` (gleiche Masse, keine sichtbare Kante).

## Varianten nach Funktion (`Button`, `src/components/ui/Button.tsx`)

| Funktion | Variante | Look |
|---|---|---|
| Hauptaktion (eine pro Screen) | `primary` | Akzent (Gold) gefuellt, dunkler Text |
| Nebenaktion, Abbrechen | `secondary` | `bg-white/10` + `glass-border`, heller Text |
| Tertiaer / Icon im Header | `ghost` | keine Fuellung, keine Kante |
| Zerstoerend (loeschen, verlassen, entfernen) | `danger` | siehe unten |
| Nur Icon | `IconButton` (siehe "Icon-Buttons") | rund, 48dp |

Chips (`Chip.tsx`) bleiben die eigene Auswahl-Komponente (Filter/Modi/Tags), `ViewModeToggle` = Segment in `glass-border` mit aktivem Primary-Segment; Pille 48 hoch, `p-[3px]`+1px Border = 4px Innenabstand ringsum, drei identische 40x40-Zellen mit `gap-1`, Icons mittig, Toolbar-Reihe `items-center`.

## Icon-Buttons

**Regel: nur `IconButton`** (`src/components/ui/IconButton.tsx`) fuer jede Aktion ohne Text. Kein `Button iconOnly`, kein Hand-Bau aus `Pressable` + `Icon` (Guard: `__tests__/components/ui/IconButton.test.tsx`).

- Props: `icon` (Icon-Rolle), `variant`, `size` (48 Standard, 44 nur wenn noetig), `accessibilityLabel` (Pflicht), `testID`, `disabled`, `loading`, `onPress`, `className` (nur Platzierung/Margin).
- Form: rund, 48dp (Touch >= 44), 1px Border, Icon immer Token `M` (24), Farbe nach Variante, bei `disabled` gedimmt.
- Varianten: `neutral` (Glas `bg-white/10` + `glass-border`; Zurueck, Einstellungen, Filter zu), `accent` (Akzentfuellung, dunkles Icon; Speichern, Hinzufuegen, Zahlung erfassen, Filter offen), `danger` (`bg-danger/15` + `border-danger/30`, rotes Icon; Loeschen, Mitglied entfernen), `ghost` (ohne Flaeche; Toast-Schliessen), `overlay` (`bg-black/55` auf Bild/Video; Trailer-Schliessen).
- Gleiche Aktion = gleiche Icon-Rolle: Loeschen/Zuruecksetzen einer Bewertung `delete`, Mitglied entfernen `removeMember`, Speichern `save`, Schliessen/Abbrechen `close`, Zurueck `back`, Teilen `share`, Neu generieren `regenerate`, Hinzufuegen `add`.
- Zerstoerende Icon-Buttons stehen in Aktionszeilen ganz rechts.
- Kein Icon-Button: Toggles mit Zustand (Herz "Mag ich", Switch, `ViewModeToggle`), Aktions-Kacheln mit Label (`MovieDetailActionsBar`), Poster-Overlays in Kacheln (Play; das "+" im `MovieGrid` entfaellt, Hinzufuegen nur ueber Detail).

## Button-Icons (Text + Icon ueberall)

Jeder beschriftete Aktions-`Button` zeigt ein fuehrendes Icon: `<Button label="Speichern" icon="save" />` (`icon` = Rolle aus `Icon.tsx`; Farbe nach Variante, gedimmt bei `disabled`, Groesse M bzw. S bei `size="xs"`). Kein Hand-Bau aus `Icon` + `Text` als Children. Durchgesetzt von `__tests__/components/ui/buttonIcons.test.ts` (scannt `src`). Ausnahmen: Chips/Pillen/Segmente, Listenzeilen, Tabs, Textlinks (`Link`), `badgeOnly`.

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
- **Select** (`src/components/ui/Select.tsx`, Dropdown): Trigger-Feld `min-h-touch-comfortable rounded-lg` + `GLASS_EDGE` + flaches dunkles Fill (`GLASS_FLAT_FILL`, kein Blur), Chevron rechts (`chevronDown`/`chevronUp`), Platzhalter `text-text-secondary`. Aufklappbare Liste als Overlay in einem transparenten RN-`Modal` (eigenes Android-Fenster, `statusBarTranslucent`/`navigationBarTranslucent`, `animationType="none"`): beim Oeffnen wird der Trigger per `measureInWindow` vermessen, im Modal wird ein identisches Feld (`<id>-field`, bei `searchable` mit dem Suchfeld) exakt ueber dem Trigger plus die Liste (`position absolute`, direkt darunter bzw. darueber) gerendert; der Original-Trigger bleibt im Layout, das Layout verschiebt sich NICHT. Grund: auf Android bekommen Kinder ausserhalb der Eltern-Bounds keine Touches und ein vertikales ScrollView im Sheet-ScrollView/`overflow-hidden`-Sheet verschluckt die Scroll-Geste (Liste liess sich im Zahlungs-Sheet nicht scrollen); ein Modal-Fenster hat beides nicht. Bis zur ersten Messung ist der Overlay unsichtbar (opacity 0). Hoehe max 240 und scrollbar (`nestedScrollEnabled`), per Messung + Tastaturhoehe auf den freien Platz begrenzt (min 96, zweite Messung nach 200ms wegen Sheet-Lift); ist unten wenig Platz (<160) und oben mehr, oeffnet sie nach oben (`selectListPlacement`). Tap ausserhalb (transparenter Vollbild-Backdrop `<id>-backdrop`) oder Hardware-Back (`onRequestClose`) schliesst. Kein `zIndex`/`overflow`-Workaround in Eltern noetig; Optionen 48dp hoch mit Trennlinie, gewaehlte Option `bg-accent` + `text-bg-primary`. Schliesst bei Auswahl oder erneutem Tap auf den Trigger. `searchable`: der Trigger wird beim Oeffnen zum Textfeld, Optionen filtern live (case-insensitive Teilstring), leer = `emptyText` ("Keine Treffer"). `disabled` = `opacity-50`. A11y: Trigger `combobox` (`expanded`), Option `menuitem` (`selected`). testIDs: `<id>`, `<id>-field`, `<id>-list`, `<id>-scroll`, `<id>-backdrop`, `<id>-option-<value>`, `<id>-search`, `<id>-empty`. `onOpenChange(open)` bleibt als Hook (z. B. group-settings sperrt Folgebereiche per `pointerEvents="none"`), ist wegen des Modals aber nicht mehr noetig fuer Touch-Korrektheit. Optionale Props: `autoFocusSearch={false}` (Suchfeld sichtbar, aber erst per eigenem Tap fokussiert; Chevron wird dann eigener Button `<id>-toggle`, Trigger toggelt nicht), `defaultOptions` (Liste bei leerer Suche, z. B. alle Filme nach zuletzt gesehen sortiert, nie abgeschnitten; Tippen filtert ALLE `options`), `SelectOption.hint` (kleine Zweitzeile in der Option, testID `<id>-option-<value>-hint`). Einsatz: Gruppenwahl (`group-settings-switch`), Film in `PaymentModal` (`payment-modal-movie-select`) (searchable, `autoFocusSearch={false}`, `defaultOptions` = ALLE unbezahlten Filme nach `seen_at` absteigend, ohne Begrenzung, Liste scrollt), 'Wer hat bezahlt?' (`payment-modal-payer-select`, Hint 'zuletzt bezahlt') 'Wer hat bezahlt?' im `RatingDialog` (`rating-dialog-payer-select`; 'Bezahlt am' ist mit dem vorhandenen `paid_at` vorbelegt) und 'Bezahlt von' im `TrackerEntrySheet` (`tracker-entry-sheet-payer-select`); Platzhalter 'Person wählen' (ersetzt die Personen-Chips).
- Sheet-Flaeche (`Sheet`, alle Flyouts/Bottom-Sheets: Tracker-Eintrag, Zahlung, Bewertung, Filter-Flyout, Erscheinungsdatum, Loeschen/Bestaetigungen): deckendes Schwarz `bg-black` (100 %, keine Transparenz, nicht `GLASS_FLAT_FILL`). Rand nur oben (`border-t border-glass-border`, gerade ueber die volle Breite), KEINE obere Eckenrundung (gerade Oberkante, kein `rounded-t-*`), Schliessen-Button = `IconButton` ghost/`close`, Inhalt unveraendert; der abgedunkelte Backdrop dahinter (schwarz, 75 %, einheitlich fuer alle Varianten, Konstante `SHEET_BACKDROP_OPACITY` in `Sheet.tsx`) bleibt. Innenelemente (Inputs, Select-Trigger, Chips) behalten ihren flachen dunklen Fill, bleiben ueber ihre Border auf Schwarz erkennbar. Select-Listen-Overlay und Toasts unveraendert.
- Sheet-Inhalt (`TrackerEntrySheet`, `PaymentModal`): Inhalt `gap-4`, Label+Feld-Sektionen `gap-2`, Aktionszeile `flex-row gap-3`, Loeschen immer ganz rechts.
- "Zahlung erfassen" (`PaymentModal`): zweite Zeile je Chip, explizit beschriftet (`lastPaidHint`): "zuletzt bezahlt: heute | gestern | vor N Tagen", "noch nie bezahlt"; Zukunftsdatum als absolutes Datum. Hilft zu sehen, wer als naechstes dran ist.

## Danger-Regel (ein Look, alle Formen)

Gemeinsame Tokens in `Button.tsx`: `DANGER_SURFACE_CLASSNAME` (`bg-danger/15 border border-danger/30`), `DANGER_PRESSED_CLASSNAME` (`active:bg-danger/25`), `DANGER_TEXT_CLASSNAME` (`text-danger-text`), `DANGER_ICON_COLOR` (`#e5675a`).

- Neue Gruppe anlegen (Gruppenverwaltung): runder `IconButton` accent (`add`, a11y 'Neue Gruppe anlegen', `group-settings-create-button`) rechts neben dem 'Deine Gruppen'-Dropdown (Dropdown `flex-1`, 48dp-Button, Muster wie Gruppenname + Speichern). Oeffnet Flyout `CreateGroupSheet` (`src/components/settings/CreateGroupSheet.tsx`, Sheet): Gruppenname (Pflicht, getrimmt, `group-settings-create-name-input`), Farbthema-Punkte (`group-settings-create-theme-<name>`, Standard Gold), Buttons 'Abbrechen' links / 'Anlegen' rechts (`-cancel-button`, `-confirm-button`, primary, Loading). Entwurf bis Anlegen, Abbrechen verwirft. Erfolg: gruener Toast 'Gruppe angelegt', neue Gruppe wird aktiv; Fehler: roter Toast. Hook `useCreateGroup` (`useGroupSettings.ts`).
- Button: `<Button variant="danger" />` (Gruppe verlassen, Konto loeschen, Bestaetigen im Loesch-Flyout). Mitglied entfernen (Gruppenverwaltung): `IconButton` danger (`removeMember`, a11y 'Mitglied entfernen') ganz rechts in der einzeiligen Mitgliederzeile (Name | Rolle | Icon), Bestaetigung per `ConfirmDialog`.
- Listenzeile: `<SettingsRow danger />` (rote Tint-Zeile, roter Text, Icon und Chevron).
- Icon-Button: `<IconButton icon="delete" variant="danger" />` (Bewertung zuruecksetzen im `RatingDialog`, 48dp wie alle).
- Aktions-Kachel: `ActionIconButton danger` in `MovieDetailActionsBar` (Danger-Flaeche statt Glas-Kachel).
- Aktions-Leiste Film-Detail: die ganze Leiste (Container inkl. Safe-Area unten, `[tmdbId].tsx`) und alle Kacheln sind deckend `bg-black` (keine Transparenz), Rand und Icon-/Label-Farben unveraendert; Loeschen steht ganz rechts, seine Danger-Toenung (`*-tint`) liegt auf dem schwarzen Grund.
- Fehlertext: `text-danger` (nur Meldungen, keine Aktionen).
- Zerstoerende Aktionen mit Bestaetigung: siehe "Destruktive Aktionen: immer ConfirmDialog".

## Destruktive Aktionen: immer ConfirmDialog

- JEDE zerstoerende/unumkehrbare Aktion fragt vorher ueber den einen gemeinsamen `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`, Sheet-Basis) nach: Titel als Frage, konkrete deutsche Beschreibung der Folge, `Abbrechen` (secondary) LINKS, die Aktion (`danger`, Label z. B. `Loeschen`/`Entfernen`/`Verlassen`/`Neu generieren`) ganz RECHTS, `loading` waehrend der Mutation. Keine Inline-Bestaetigungen, keine eigenen Bestaetigungs-Sheets, kein `Alert`.
- testIDs aus dem Prefix `testID`: `<id>-dialog`, `<id>-description`, `<id>-actions`, `<id>-cancel-button`, `<id>-confirm-button`. Optionale `children` (z. B. Eingabe 'LOESCHEN' beim Konto loeschen, mit `confirmDisabled`).
- Einsatz: Film aus Watchlist/Tagebuch entfernen (`movie-detail-delete`), Zahlung loeschen (`tracker-entry-sheet-delete`), Bewertung loeschen (`rating-dialog-delete`, erst beim Speichern), Mitglied entfernen (`group-settings-member-<id>-remove`), Gruppe verlassen (`group-settings-leave`), Einladungslink neu generieren (`group-settings-invite-regenerate`), Konto loeschen (`delete-account`).
- Flyouts halten ALLE Aenderungen als lokalen Entwurf; erst `Speichern` persistiert, `Abbrechen`/Backdrop/Zurueck verwerfen (Rating-Dialog inkl. Reset, Tracker-Eintrag, Zahlung, Erscheinungsdatum).
- Maestro: ConfirmDialogs werden gescreenshottet und abgebrochen (ausser bei flow-eigenen Daten).

## Aktionsreihen: Löschen immer rechts/zuletzt

- In jeder Reihe/Gruppe von Aktions-Buttons ist die zerstoerende Aktion (Loeschen, Entfernen, Verlassen) das LETZTE (rechteste) Element, nie an zweiter/dritter Stelle. Vertikale Stapel: zuletzt/unten. Gilt auch fuer Bestaetigungs-Paare (`Abbrechen` links, `Loeschen` rechts) und die Film-Aktionsleiste (Watchlist: `bewerten, aehnliche, filmreihe, loeschen`; Tagebuch: `bearbeiten, aehnliche, filmreihe, loeschen`; Quelle `getVisibleActions`).
- Tracker-Flyout: `Speichern | Loeschen`. Rating-Dialog: der Reset-Papierkorb steht rechts in der Sternzeile.

## Motion (`src/lib/motion.ts`)

- Eine Animationssprache fuer Listeninhalt: gestaffeltes Einblenden pro Eintrag (`FadeInItem`): Opacity 0 -> 1, 220 ms (`ITEM_FADE_DURATION_MS`), Easing `Easing.inOut(Easing.ease)` (`ITEM_FADE_EASING`), Versatz 40 ms pro Index (`STAGGER_STEP_MS`), gedeckelt ab Index 8 (`MAX_STAGGER_INDEX`, max. 320 ms), Native-Driver.
- Ansichtswechsel (Sheet/Tile/Liste): die Liste wird per `key` neu gemountet, jeder Eintrag blendet so ein.
- Tab-Wechsel (Tracker/Watchlist/Tagebuch): Eintraege des neu aktiven Tabs spielen dieselbe Animation erneut ab (`replayTab` + `TabSwitchContext`, Zaehler nur bei Tab-zu-Tab-Wechsel; Rueckkehr aus Modals und Refetches loesen nichts aus), parallel zu Swipe/Parallax (600 ms).
- Reduce-Motion (`useReducedMotion`): keine Animation, Eintraege sofort sichtbar.
- Neue Werte nur in `motion.ts` aendern, nie pro Screen.

## Laden (Spinner)

- **Kein Skeleton mehr.** Ladezustand = der Accent-`Spinner` (`src/components/ui/Spinner.tsx`, Akzentfarbe des Gruppen-Themes via `useGroupTheme().colors.accent`; nie rohes `ActivityIndicator`; `color` nur fuer Kontrast auf gefuellten Primary-/Danger-Buttons).
- **Inhaltsbereiche:** `LoadingArea` (`src/components/ui/LoadingArea.tsx`) zentriert den Spinner im Bereich, Standard `min-h-48 w-full flex-1`, kompakt `className="min-h-32 w-full"` (Suchergebnisse in add-movie). Mindesthoehe verhindert Layout-Springen, kein Fullscreen-Overlay. `accessibilityLabel="Lädt"`; testID auf der Flaeche (`*-loading`), Spinner darin `*-loading-spinner`.
- **Struktur zuerst:** Header/Poster/Action-Bar rendern sofort aus vorhandenen Daten. Film-Detail: Poster, Abschnitt "Info" (Titel + Beschreibung) und ggf. "Bewertung" (aus Suchergebnis/Cache) erscheinen sofort, ohne Spinner. Fuer den Rest (Details, Regie, Besetzung, Streaming) gibt es genau EINEN zentralen `LoadingArea` (`movie-detail-content-loading`, `min-h-64`), solange `useMovieDetail().isLoading` und noch nichts davon bekannt ist (kein Poster-Spinner, keine Einzel-Spinner pro Abschnitt). Danach erscheint der Block gemeinsam (`movie-detail-content`) per einmaligem `FadeInItem` (nur wenn er aus dem Ladezustand kommt; bei Cache-Daten sofort sichtbar). Anbieter kommen mit demselben Query, haben keinen eigenen Spinner und rendern nichts, solange keine Daten da sind.
- **Detail-Layout (Film-Detail, alle Kontexte):** alles LINKSBUENDIG in einheitlichen Abschnitten `MovieDetailSection` (`movie-detail-section-<name>`): `py-4`, gleiche Seitenraender (`px-4`), Ueberschrift klein/Versalien (`text-xs uppercase tracking-widest text-text-secondary`), duenne Trennlinie OBEN (`border-t border-glass-border`) an jedem sichtbaren Abschnitt ausser dem ersten (Linien nur ZWISCHEN sichtbaren Abschnitten; leere Abschnitte samt Ueberschrift/Linie entfallen). Reihenfolge: (1) `info` ohne Ueberschrift: Titel (Outfit, `text-accent-light`, links) + Beschreibung mit "Mehr anzeigen"; (2) `rating` "BEWERTUNG" nur wenn eigene Bewertung existiert oder Tagebuch-Kontext: Sterne + Herz in einer Zeile (5x44 + 48 = 268dp, passt in 328dp), "x/y bewertet" darunter (x = Mitglieder mit Bewertung > 0 INKLUSIVE mir, y = alle Gruppenmitglieder), dann "Bewertungen der Gruppe" (Tagebuch, einklappbar, NUR die anderen Mitglieder: bewertete zuerst mit Name/Sterne S/Wert, dann Zeile "nicht bewertet" gedaemmt; Zeilenhoehe einheitlich `h-10` = 40dp; ohne andere Mitglieder entfaellt der Block); (3) `details` "DETAILS": Laufzeit + Datum (Stift im Watchlist-Kontext) und TMDB-Badge nebeneinander (umbrechend), Genre-Chips darunter; (4) `director` "REGIE" (Name `text-accent`, antippbar); (5) `cast` "BESETZUNG" (horizontale Liste); (6) `streaming` "STREAMING" (Anbieter). Abschnitte 3-6 liegen im nachladenden Block `movie-detail-content`. **Abstaende (ein Wert):** Abschnitt `py-4`, Ueberschrift -> Inhalt `gap-2` (Konstanten `MOVIE_DETAIL_SECTION_PADDING_CLASSNAME`/`_GAP_CLASSNAME`); Inhalte haben KEIN eigenes min-h/margin/padding: Tippziele (Regie-Name, "Mehr anzeigen", "Alle Anbieter anzeigen", Gruppen-Toggle) sind 44dp ueber `hitSlop` statt Layout-Hoehe. Meta-Zeile in DETAILS: Laufzeit, Datum(+Stift) und TMDB-Badge (ohne dunklen Pillen-Hintergrund) als gleichberechtigte Items, `flex-row flex-wrap items-center` mit Mittelpunkt-Trenner `·` zwischen vorhandenen Items (nur zwischen vorhandenen; Trenner haengt am vorherigen Item, nie am Zeilenanfang; Abstaende explizit per style: `META_ROW_GAP` 8dp links/rechts des Trenners, `META_ROW_ROW_GAP` 6dp `rowGap`; KEIN className-gap, greift auf Android nicht zuverlaessig; bricht auf 360dp sauber um).
- Buttons/winzige Inline-Bereiche nutzen `Spinner` direkt.

## Navigation (Zurück)

- Zurück-Wisch von links nach rechts nimmt genau eine Ebene vom Stack (Detail, Ähnliche Filme, Einstellungen und Unterseiten, Filmreihe, Filmografien, Film hinzufuegen). Android: Systemgeste am Rand plus `BackSwipeView` (linke 25 % der Breite); iOS: `fullScreenGestureEnabled`. Hardware-Zurück tut dasselbe.
- Reihenfolge: Ursprung (Tab) -> Detail -> Ähnliche Filme -> Detail wird per `replace` auf der Raster-Ebene geführt, d.h. Zurück vom ähnlichen Film landet im vorherigen Detail, dann beim Ursprung. Andere Raster (Filmreihe, Filmografie) bleiben auf dem Stack.
- Sheet/Dialog (`Sheet`) schliesst bei Zurück zuerst (BackHandler), erst danach wird der Screen gepoppt.
- Eigene Zurück-Buttons nutzen `useSafeBack` (`router.back()`, ohne History `replace("/")`).

## Backdrop-Regel (`ScreenBackdrop`, `src/components/ui/ScreenBackdrop.tsx`)

- NUR Tracker, Watchlist, Tagebuch zeigen das Foto (`AppBackground`) ungedimmt.
- Foto: Original 1920x1280 (`assets/images/cinema-bg.jpg`, Quelle, nie veraendern) wird per `scripts/generate-bg-assets.py` zu `cinema-bg-baked.jpg` (gleiche Aufloesung) vorberechnet und angezeigt; 100 % Bildschirmhöhe, nur horizontaler Parallax, zentriert (mittlerer Tab = Bildmitte, Bewegung gleich weit nach links/rechts, live mit dem Wisch); Weg = `BG_PARALLAX_TRAVEL_FRACTION` (0.45, vorher 1.0 = voller Weg) x (Ueberstand - 2 x `BG_PARALLAX_EDGE_INSET_DP` 40 dp) in `src/lib/parallax.ts`; Dimmung (Graustufen, 0.6 ueber #0a0a0a) ist im gebackenen Asset, kein `mixBlendMode`/Opacity zur Laufzeit.
- Test-Dimmung: statisches schwarzes Overlay (`app-background-dim`) in `AppBackground` ueber dem Foto, unter dem Inhalt, nicht im Parallax; Wert `BG_DIM_OPACITY` (aktuell 0.3 = 30 % Schwarz, 0 = aus) in `src/lib/parallax.ts`, per Reload aenderbar (Asset bleibt unveraendert). Es dimmt auch die Fotoflaeche hinter `ScreenBackdrop` (additiv; die 95-%-Flaeche deckt das Foto dort fast voll, Effekt dort kaum sichtbar).
- Alle anderen Screens bekommen ein flaches Backdrop (`GLASS_FLAT_FILL`, 95 %, kein Blur, keine Stufen):
  - Detail-artige Modal-Routen (Filmdetail, Film hinzufuegen, Aehnliche, Filmreihe, Filmografien). `CALM_BACKDROP_ROUTES`.
  - Einstellungen (Hub + Unterseiten), Gruppen-Einstellungen, Login/Registrierung/Passwort, Onboarding, Einladung, Auth-Callback. `DIM_BACKDROP_ROUTES`, `ROOT_DIM_BACKDROP_ROUTES`.
- Anwendung per Navigator-`screenLayout` (`screenBackdropLayout` in `(modals)`, `rootBackdropLayout` im Root-Stack), nie per Screen-Hack. Neue Route = in die passende Liste eintragen.

## Toasts (`ToastHost`, `showToast(msg, { variant })`)

Gleiche Glas-Flaeche + EINE 1px-Border; die Variante faerbt Border (40%), Tint (15%), Text und Icon:

| Variante | Wann | Look |
|---|---|---|
| `success` | gespeichert, hinzugefuegt, umbenannt, Farbthema geaendert, Zahlung gespeichert | gruen: `bg-success/15`, `border-success/40`, `text-success-text`, Icon check-circle |
| `error` | jeder Fehlerpfad (Speichern fehlgeschlagen, Netzwerk, Validierung ausserhalb von Formularfeldern) | rot: `bg-danger/15`, `border-danger/40`, `text-danger-text`, Icon error, `accessibilityLiveRegion="assertive"` |

Jeder Toast hat rechts einen Schliessen-Button (`toast-close`, Icon `close`, 48dp Touch-Box, `accessibilityLabel="Schließen"`), der ihn sofort ausblendet; Auto-Dismiss (4 s) bleibt. Der Trailer-Player im Filmdetail hat links oben ebenfalls ein X (`movie-detail-trailer-close-button`), das zum Poster zurueckkehrt.

Regeln: Nur zwei Varianten (kein neutraler Info-Toast; Hinweise ohne Erfolg/Fehler gibt es nicht). Standard ohne Angabe = `success`. Erfolg IMMER `{ variant: "success" }`, Fehler IMMER `{ variant: "error" }` (kein `Alert.alert` fuer Fehler). Aufruf ueber `showToast(msg, { variant })` in `src/lib/toast.ts` (die Helfer `showSuccessToast`/`showErrorToast` wurden entfernt, nie genutzt). Varianten-Tabelle: `TOAST_VARIANT_STYLES` in `Toast.tsx`.

## Touch-Targets (Barrierefreiheit)

Mindestens 48dp (Android) bzw. 44pt (iOS) pro tippbarem Element; Konstanten und Helfer in `src/components/ui/touchTarget.ts` (`MIN_TOUCH_TARGET`, `MIN_TOUCH_TARGET_IOS`, `hitSlopFor`, `SMALL_PILL_HIT_SLOP`).

- Visual bleibt klein, Touch waechst: `hitSlop` (Button `sm`/`xs` automatisch, `Chip` vertikal, Payer-Pillen) oder 48er Touch-Box mit kleinem Visual darin (`ViewModeToggle`). Kein hitSlop zwischen direkt angrenzenden Targets (Overlap).
- Sterne: Touch-Box 44 breit x 48 hoch (Glyph 40, Luecke 4dp); 5 x 44 = 220 (+ Herz 44 + Reset 48 = 312) passt in 328dp Inhaltsbreite eines 360dp-Phones. Halbe Sterne bleiben ueber die Tap-Position links/rechts der Box.
- Reine Textlinks/Zeilen: `min-h-touch-comfortable` (48). Icon-only: `IconButton` (48) mit `accessibilityLabel`.
- Jedes Icon-only-Control hat `accessibilityLabel`; Toggles `accessibilityState` (selected/checked/expanded).

## Switches (`SwitchIndicator`, `src/components/ui/Switch.tsx`)

- Android: echter Material-3-Compose-Switch (`@expo/ui/jetpack-compose` `Switch`, nativ im Dev-Client enthalten), nicht interaktiv unter `pointerEvents="none"`; an-Farbe = Gruppen-Akzent (`useGroupTheme().colors.accent`). Sonst (iOS/Web/Jest) `FallbackSwitch`.
- Fallback exakt M3: Track 52x32 (`border-2`), an = `bg-accent` + heller 24dp-Daumen (`bg-text-primary`, nie dunkel) mit Check-Icon (16dp, Akzentfarbe); aus = `border-text-secondary` + 16dp-Daumen `bg-text-secondary`; gedrueckt = 28dp-Daumen + 40dp State-Layer (`bg-white/10`); disabled = `opacity-40`.
- Immer ueber `SettingsToggleRow` (ganze Zeile `Pressable`, `accessibilityRole="switch"`, `accessibilityState.checked`, `min-h-touch-comfortable` = 48dp). Kein nativer `Switch`, keine Button-als-Switch.
- Textlinks (`expo-router` `Link`): `asChild` + `Pressable` + `Text` mit expliziter Farbe (`text-accent-light`); `className` direkt auf `Link` wirkt nicht (Text wird schwarz). Jeder `Text` auf dunklen Flaechen braucht eine explizite `text-*`-Klasse.

## Logo

- Gewaehlt: P3 (Squircle-Badge mit Play-Dreieck und drei verbundenen Punkten). Masters: `docs/logo-concepts/final/watchcrew-logo-horizontal.svg` und `watchcrew-logo-icon.svg` (+ PNGs Gold/Rot/Blau). Badge = `currentColor` (Akzent), Dreieck und Wortmarke `#f5f5f7`, Wortmarke als Pfade.
- Zentrierung (mathematisch): gleichseitiges Dreieck (Seite 38 im 64er Raum, abgerundet r 3.2), Spitze rechts, **Flaechenschwerpunkt = Inkreismittelpunkt = Badge-Mitte (32,32)** (nicht Bounding-Box-Mitte). Punkte = gleiches Dreieck um den Schwerpunkt skaliert (0.43), Punktradius 2.9, Linie 1.4. Dadurch Schwerpunkt der Punkte = Schwerpunkt des Dreiecks und alle Punkte gleicher Randabstand zu allen Kanten. Gemessen per resvg: Dreieck (31.97/31.95), Punkte (31.94/31.95). Geometrie-Konstanten: `src/lib/brandLogo.ts` (getestet).
- App: `BrandLogo` (`src/components/ui/BrandLogo.tsx`, Props `height` (Default 44), `badgeOnly`, `testID`) zeigt per `expo-image` ein vorgerendertes PNG passend zum Gruppen-Theme (statische `require`-Map `LOGO_HORIZONTAL`/`LOGO_ICON`, `contentFit="contain"`, a11y-Label "WatchCrew", Breite aus Hoehe: horizontal 260:64, Badge quadratisch). Eingesetzt in `AppHeader` (Hoehe 42, links, siehe Header-Layout) und `Brand` (Auth/Onboarding, Hoehe 56).
- Assets: `assets/images/logo/watchcrew-logo-<theme>.png` (1560x384, 6x) und `watchcrew-logo-icon-<theme>.png` (512x512), transparent, fuer alle 6 Themes (Akzent = `currentColor`; Glanz/Verlauf/Kante stecken im SVG als Weiss/Schwarz-Overlays und passen sich automatisch an). Neu generieren (nach SVG- oder Theme-Aenderung): `npm i --no-save @resvg/resvg-js && node scripts/generate-logo-assets.js`; die Akzent-Map im Skript spiegelt `groupTheme.ts` (Test `logoAssets.test.ts`).
- PNG statt SVG, weil `react-native-svg` NICHT im Dev-Client-Binary ist (kein nativer Build noetig). Dynamische Breite/Hoehe am Bild per `style` (Ausnahme zu "keine Inline-Styles", wie Splash-Overlay). `src/lib/brandLogo.ts` haelt die Zentrierungs-Geometrie (getestet) als Referenz.

## Brand-Assets (Icon, Splash)

- Quelle der Wahrheit: `scripts/generate-brand-assets.py` (`python3 scripts/generate-brand-assets.py`; `--preview DIR` rendert Verlaufskandidaten + Launcher-Masken). Glyph = Legacy-Icon (Gold `#c8a44e` / gedimmt `#8f763a` auf `#0a0a0a`).
- Splash: schwarz mit schraegem Grau-Verlauf (oben links hell, unten rechts schwarz). Nativ nur schwarz + Glyph (`app.config.ts`, `imageWidth` 288); In-App-Overlay `src/components/animated-icon.tsx` zeigt `splash-bg.png` + Glyph (`SPLASH_GLYPH_SIZE` 288).
- Sheet-Karten (Tagebuch `DiaryEntryCard`, Watchlist `WatchlistPosterCard` card): Poster-Wrapper `min-h-36 w-24 self-stretch`, Bild `absolute inset-0 h-full w-full` + `contentFit="cover"`; Poster fuellt IMMER die volle Kartenhoehe (nie festes `aspect-[2/3]` am Bild).
- Ausnahme zu "keine Inline-Styles": Geometrie des Splash-Overlays nutzt `StyleSheet`-Objekte, da className-Geometrie im EAS-Release-Build kollabieren kann (siehe `AppBackground`).

## Highlight-Farbe

- Alles, was Highlight/Brand-Akzent ist, folgt dem Gruppen-Theme (Gold, Rot, Blau, Grün, Lila, Orange): Pillen/Chips, aktive Segmente, Tab-Indikator, Primary-Button, Switch, Chevrons, Links, Modal-Header-Pfeil/-Titel, Filter-Punkt, Bookmark-Badge.
- Klassen: `accent`, `accent-light`, `accent-aNN` (15/30/40/45/55; NativeWind `/NN` geht auf `var()`-Farben nicht). Props mit Hex-Zwang: `useGroupTheme().colors.accent|accentLight|...`. Nie Hex im Code.
- Feste Ausnahmen: Danger (rot), Success (grün), Like-Herz, Gesehen-Auge, TMDB-Badge, Splash-/Icon-Assets. **Sterne sind in ALLEN Themes fest gelb `#FFD700`** (Token `star-color`/`colors.starColor`, nie Akzent): Durchschnitt, Einzelbewertungen, Rating-Dialog, Details, Tagebuch-Karten/-Kacheln, Halbsterne. **Logo:** siehe Abschnitt "Logo" (Badge folgt dem Gruppen-Akzent, Wortmarke immer weiss). Header-Layout (360dp: 12dp Rand, Logo links `height 42` = ca. 170dp breit, Gruppenname flexibel in der Mitte ca. 118dp, Zahnrad rechts 48dp; Zeilenhoehe min. 48dp, kleiner als vorher; Abstand unter dem Header einmalig +10dp via `APP_HEADER_BOTTOM_GAP_CLASSNAME` (`pb-2.5`) im `AppHeader`, Panels behalten ihr `mt-3`): Gruppenname ist reine ANZEIGE (`app-header-group`, kein Tap-Ziel): Akzent-Punkt (`app-header-group-dot`, `bg-accent`) + Name (`app-header-title`, Outfit `font-title text-xs uppercase tracking-wide text-text-secondary`, 1 Zeile, Ellipsis; ohne Gruppe Ansichtsname). Tippen auf das Logo (`app-header-brand-button`) wechselt zur naechsten Gruppe (Wrap-around; Anzeige folgt sofort; bei einer Gruppe passiert nichts). Gezielter Gruppenwechsel per Dropdown in Einstellungen: Zeile "Aktuelle Gruppe" (`settings-active-group-select`, `Select`) im Abschnitt "Profil" (Glas-Karte mit Abschnitts-Titel wie Gruppe/App/Rechtliches; Zeile "Anzeigename" (eigene Zeile `items-center`, `min-h-12`, symmetrisches `py-2`, Stift exakt mittig ohne Margin; Label links, Wert `settings-current-user` `text-base text-text-primary`, am Zeilenende `IconButton` `edit` 44dp `settings-display-name-edit-button`, a11y "Anzeigename bearbeiten"; Tippen oeffnet Sheet `settings-display-name-sheet` mit Eingabe `-input`, Abbrechen `-cancel-button` links, Speichern `-confirm-button` rechts, Entwurf bis Speichern, gruener/roter Toast, schliesst nach Erfolg), E-Mail darunter; keine Sektion "Konto" mehr: "Abmelden" (secondary) und darunter "Konto loeschen" (`Button variant="danger"`, `settings-section-delete-account`, ConfirmDialog `delete-account`) stehen am Seitenende vor der Version, dann Label-Zeile "Aktuelle Gruppe" mit Dropdown); Auswahl setzt die aktive Gruppe (`useGroupQuickSwitch().selectGroup`, gleiche Daten wie group-settings).
- Test: `__tests__/theme/noHardcodedAccent.test.ts`. Device: `theme-tour`.

## Listenansicht = Tracker-Tabelle

Die Listenansichten von Watchlist und Tagebuch sehen aus wie die Tracker-Tabelle: Glas-Karte (`px-3 pt-3`), Kopfzeile `text-sm text-text-secondary` mit Trennlinie, Zeilen `py-3` mit Trennlinie, Titel weiss in Outfit (`TABLE_TITLE_CELL` = `flex-1 pr-2 font-title text-text-primary`; wie Sheets/Karten; auch im Tracker; genau 1 Zeile mit Ellipsis), Datumsspalte `w-28` rechtsbuendig, Scores `w-10` rechtsbuendig, kein Poster. Gemeinsame Bausteine in `src/components/ui/GlassTable.tsx` (`GlassTableHeader`, `GlassTableRow`, `TABLE_*_CELL`); die virtualisierten Listen bauen die eine Karte aus Kopf-/Zeilen-Scheiben (`bg-bg-card-flat`, Seitenrand) zusammen. Die Scheiben sind QUADRATISCH (kein Standard-`Glass`-Radius pro Zeile, sonst wirkt jede Zeile als Pille): nur der Kopf rundet oben (`rounded-t-xl`), nur die letzte Zeile unten (`rounded-b-xl`); dazwischen duenne gerade Trennlinien. Kopfzeile symmetrisch `pt-3`/`pb-3` (Inhalt vertikal mittig zwischen Oberkante und Trennlinie, `items-center`, keine Reserve fuer Chevrons).

Spalten: Tracker Film | Bezahlt von | Datum; Watchlist Film | Erscheint; Tagebuch Film | Herz (nur bei eigenem Like, `#e05c6e`) | Ø | TMDB. Tagebuch-Kachel (`DiaryPosterTile`): zwei in die Poster-Ecken eingebettete Overlays (dunkle Flaechen `bg-black/60`, buendig mit Rundung zur Innenseite, linkes Padding `pl-2.5`, Icons `XS`, keine Zeilen unter dem Poster, Kachelhoehe unveraendert): oben rechts buendig (`rounded-bl-xl`) EIN Badge mit Herz (nur bei eigenem Like, `#e05c6e`) + Stern + Ø in dieser Reihenfolge (wie `DiaryEntryCard`), unten rechts buendig `TmdbBadge` (Logo + Wert, "–" ohne Wert, `rounded-tl-xl`); passt ohne Ueberlappung in ~80dp breite 4-Spalten-Kacheln. Watchlist-Kachel (`WatchlistPosterCard` grid) im selben Stil: oben rechts buendig (`rounded-bl-xl bg-black/60 py-1 pl-2.5 pr-1.5`, `date-badge`) NUR das Datum (Erscheinungsdatum bzw. "Streaming verfügbar"/"Kein Datum"; nie ein Praefix wie "Kommt am", einheitlich ueberall `getDateBadgeText`), unten rechts buendig `TmdbBadge` (Logo + Wert, `rounded-tl-xl`, gleiche Klassen wie Tagebuch); der "x/y bewertet"-Badge (nur bei 0 < bewertet < Mitglieder) sitzt links darunter (`left-1 top-8`) und ueberlappt Datum/TMDB in 80dp-Kacheln nicht. Unveroeffentlichte Filme bleiben ueber die Inhaltsschicht gedimmt. Tagebuch-Kopfzeile nutzt Icons statt Text (Herz, Stern in Sternfarbe, TMDB-Logo via `TmdbBadge hideScore`) mit `accessibilityLabel` "Favorit"/"Durchschnitt"/"TMDB".

**Raster-Spalten (Darstellung):** zwei globale Einstellungen (`usePreferencesStore`, MMKV) mit 3|4-Umschalter (`SettingsColumnsRow`): `gridColumnsDiaryWatchlist` (Tagebuch + Watchlist Grid, Standard 4) und `gridColumnsMovies` (`MovieGrid`: Aehnliche Filme, Filmsuche, Collection, Filmografien, Standard 3). Spaltenabstand zentral `GRID_COLUMN_GAP` = 4dp (`src/lib/gridPadding.ts`, als explizites `columnWrapperStyle`, nicht `columnWrapperClassName`: das wendet NativeWind nicht an, es blieben 1-2px); Reihenabstand unveraendert. Kacheln sind `flex-1` (gleiche Breite, Platzhalter fuellen die letzte Reihe); Spaltenwechsel remountet die FlatList (Key `-c<n>`). Segment-Umschalter (ViewModeToggle, 3|4) nutzen `SegmentedControl`: Rundung (Aussen 12, Innen 8 = Aussen - 4 Inset) und Akzentfuellung der aktiven Flaeche als explizite Style-Werte, nie als wechselnde className (Android uebernahm den Radius nach Zustandswechsel nicht).

**Tile-Badges (alle Poster-Kacheln):** Eck-Badges auf Poster-Kacheln NUR ueber `PosterCornerBadge` (oben rechts, `right-0 top-0 rounded-bl-xl bg-black/60 py-1 pl-2.5 pr-1.5`) und `PosterTmdbBadge` (unten rechts, `bottom-0 right-0 rounded-tl-xl`, gleicher Hintergrund/Padding, Logo + Wert, "–" ohne Wert) – keine eigenen Badge-Implementierungen in Kacheln. Feste Reihenfolge im Ecken-Badge, zentral in `PosterCornerBadge` definiert: Herz (eigener Like) -> Stern + Ø -> Auge (gesehen, gruen) -> Lesezeichen (Watchlist, Theme-Akzent) -> Datum. Maximal ZWEI Elemente gleichzeitig (die ersten zwei in dieser Reihenfolge, Stern + Ø zaehlt als eins); ohne Inhalt wird nichts gerendert. Eingesetzt in: Tagebuch (`DiaryPosterTile`: Herz + Stern/Ø), Watchlist-Grid (`WatchlistPosterCard`: Datum), `MovieGrid` (Aehnliche Filme, Collection, Schauspieler-/Regisseur-/Studio-Filmografie, Add-Movie: Auge bzw. Lesezeichen). Der "x/y bewertet"-Badge der Watchlist bleibt links (`left-1 top-8`). Der Quick-Add-Button (Add-Movie) sitzt unten links (48dp-Touchbox), damit er keine Eck-Badges ueberdeckt.

**Statische Spaltenkoepfe:** Die Kopfzeile der Listenansichten (Tagebuch: Film | Herz | Stern | TMDB-Logo; Watchlist: Film | Erscheint) ist eine einzige statische Zeile ohne Pressables, ohne Sortierung und ohne Chevrons; sortiert wird ausschliesslich ueber die Sortierzeile des Panels. Icon-Zellen `h-5` mit Label (`accessibilityLabel`). Regel: Kopf- und Datenzelle einer Spalte nutzen dieselbe Breitenkonstante (`TABLE_ICON_CELL` w-12, `TABLE_SCORE_STRONG_CELL` w-12, `TABLE_SCORE_CELL` w-16), Inhalt zentriert. Kopf-Icons `SM` (20), TMDB-Logo `largeLogo` (36x16). testIDs: `<p>-table-header`, `<p>-table-header-<title|like|average|tmdb|release>`.


## Schriften (Fonts)

- **Outfit** (`@expo-google-fonts/outfit`): Filmtitel und ALLE Ueberschriften (Headline-Schrift). Tokens `font-title` (Outfit_600SemiBold), `font-title-bold` (Outfit_700Bold).
- **DM Sans** (`@expo-google-fonts/dm-sans`): Standard-Textschrift der ganzen App (Fliesstext, Inputs, Buttons, Chips, Tab-Labels, Dialoge, Toasts, Badges, Zahlen, Tabellenzellen). React Native braucht eine Family pro Gewicht, daher explizite Tokens: `font-sans` (DMSans_400Regular, Default), `font-sans-medium` (500), `font-sans-semibold` (600), `font-sans-bold` (700), `font-sans-italic` (400 Italic). Die Klassen `font-medium`/`font-semibold` werden NICHT mehr verwendet, stattdessen `font-sans-medium`/`font-sans-semibold`.
- Default-Mechanismus: `Text`/`TextInput` IMMER aus `@/components/ui/Text` importieren (nicht aus `react-native`); der Wrapper ergaenzt `font-sans`, ausser die className waehlt schon eine Family (`font-title*`, `font-sans*`).
- **Playfair Display entfernt:** Outfit ist die Headline-Schrift fuer ALLES (Wortmarke `AppHeader`/`Brand` in `font-title-bold`, Sheet-/Modal-Header-Titel, Auth, Onboarding, Settings). Body bleibt DM Sans.
- Konstanten `src/components/ui/movieTitle.ts`: `MOVIE_TITLE_TEXT` (`font-title text-accent-light`) fuer Titel in Sheet-Karten und Kacheln/Grid, `MOVIE_TITLE_FONT` (`font-title`) wenn die Farbe am Aufrufort gesetzt wird (Tabellenzeilen weiss via `TABLE_TITLE_CELL`; Detail-Titel und Rating-Dialog `text-accent-light`). Groesse am Aufrufort.
- Titel in allen Listenansichten sind IMMER genau 1 Zeile (`numberOfLines={1}` + `ellipsizeMode="tail"`); Farbe: Sheet-Karten/Kacheln Akzent, Tabellenzeilen weiss. So haengt die Kartenhoehe nicht von der Titellaenge ab.
- Noch Systemschrift: native Picker/Alerts, Statusleiste, Tastatur, System-Datepicker, Android-Toasts/Dialoge des Systems.

**Filter-/Sortier-Panel (Tagebuch + Watchlist):** Sortierung und Filter sind getrennte, kombinierbare Zustaende (`sort {field, direction}`, `filters` mit UND-Logik, Tagebuch zusaetzlich der globale `scope`). Sortierung, Filter und Scope gelten GLOBAL pro Tab (Watchlist, Tagebuch je eine Einstellung, MMKV-Key nur pro Tab, nicht pro Gruppe) und bleiben beim Gruppenwechsel unveraendert; sie werden auf die Daten der neuen Gruppe angewendet. Sortierung ist kein Filter: Sortierfeld "Likes" ordnet nur nach Anzahl der Herzen, blendet nichts aus; ausblenden macht der Filter "Mag ich". Das aufklappbare Panel (`CollapsibleFilterPanel`) hat (Variante A, keine Labels "SORTIEREN"/"FILTER") drei Zeilen mit `gap-3`: (1) Suche, "+" (Watchlist), Panel-Knopf; (2) `Select` (Sortierfeld, `flex-1`, Sortier-Icon `sort` links im Trigger, accessibilityLabel "Sortieren nach ...") + `IconButton` fuer die Richtung (`sortAsc`/`sortDesc`), wirkt sofort (`EntrySortRow`); (3) links fest der Chip "+ Filter" (oeffnet das Filter-Flyout), daneben die aktiven Filter-Chips als horizontal scrollbare Reihe (aktiver Chip-Look, `close`-Icon, Tippen entfernt sofort), rechts fest der Ansichts-Umschalter `ViewModeToggle` (3 Modi) (`EntryFilterBar` mit `trailing`-Slot). Keine eigene Umschalter-Zeile. Das Flyout (`EntryFilterFlyout`, `Sheet`) hat die Abschnitte Genre (Mehrfach), Jahr, Streaming (Chip "Meine Dienste", bei aktivem Chip zusaetzlich Flatrate/Leihen/Kaufen, min. 1), Mag ich und Bewertungsstand (Tagebuch: Alle bewertet / Fehlt noch, Watchlist: Kommt noch / Keine Bewertung / Mit Bewertungen; Alle bewertet/Fehlt noch sowie Keine Bewertung/Mit Bewertungen schliessen sich in der UI gegenseitig aus). Das Flyout arbeitet auf einem Entwurf: erst "Anwenden" (rechts, primaer) uebernimmt, "Zuruecksetzen" (links, sekundaer) leert den Entwurf. Tagebuch-Scope "Mein Tagebuch | Gruppe" = zwei `Chip`s in einer schmalen Zeile ueber dem Panel (`TagebuchScopeSwitch`), immer sichtbar; Standard ist "Gruppe", die Wahl ist eine globale Einstellung (`diaryScope` im Store) und bleibt beim Gruppenwechsel und App-Neustart erhalten. "Mein Tagebuch" zeigt alle eigenen Filme gruppenuebergreifend (auch ohne Gruppen-Eintrag); dort entfaellt im Flyout der Abschnitt Bewertungsstand (Alle bewertet / Fehlt noch gelten nur fuer "Gruppe"). Das Panel (`Glass variant="solid"`) ist deckend schwarz (`bg-black`, #000, kein 95%-Fill), mit `rounded-xl` (`PANEL_RADIUS` 12 dp) und duennem Rand. Es liegt per Wrapper `z-10` ueber der Liste; die Liste reicht um `PANEL_LIST_OVERLAP` (12 dp, Klasse `PANEL_LIST_OVERLAP_CLASSNAME` = `-mt-3`) nach oben unter das Panel, damit Poster/Zeilen erst hinter der Rundung verschwinden; der Listenansicht-Inhalt oben bekommt `PANEL_LIST_CONTENT_PT_CLASSNAME` (`pt-[24px]` = Overlap 12 + `PANEL_LIST_START_GAP` 12; Karten + Liste/Tabelle, 12 = Zeilenabstand `h-3`/`gap-3` = Panel-Aussenabstand `mt-3`) bzw. im Raster `PANEL_LIST_GRID_CONTENT_PT_CLASSNAME` (`pt-[20px]` = 12 + `PANEL_LIST_GRID_START_GAP` 8 = Reihenabstand `h-2`/`gap-2`): Abstand Panel zum ersten Eintrag ist exakt so gross wie der Abstand zwischen zwei Eintraegen derselben Ansicht. Der Schatten (`PanelShadow`, erstes Kind des Panel-Wrappers, also hinter dem Panel) besteht aus `PANEL_SHADOW_LAYERS` (12) gleich gerundeten schwarzen Views (gleiche Breite/Radius), jede 1 dp weiter nach unten (`translateY`), mit fallender Opacity (`panelShadowOpacities()`, zusammengesetzte Spitze `PANEL_SHADOW_PEAK_OPACITY` 0.52, quadratisch -> 0), `pointerEvents="none"`. Er ist nur unter und an den unteren Ecken des Panels sichtbar. Konstanten in `src/components/ui/Glass.tsx`. Kein `elevation`/`shadow*` (Android zeichnet eckige Artefakte); expo-linear-gradient ist nicht im Projekt (nativ, braeuchte Dev-Client-Rebuild). Gilt auch fuer das Tracker-Panel (Suche + Zahlungs-Button). Der Gold-Punkt am Filter-Toggle (`hasActiveListFilters`) erscheint NUR bei mindestens einem aktiven Filter (Genre, Jahr, Streaming, Mag ich, Bewertungsstand); Sortierfeld/-richtung, Ansichtsmodus, Scope und Spaltenzahl loesen ihn nicht aus. Sortierfelder Tagebuch: Bewertung Ø (Standard, absteigend), Eigene Bewertung, Likes, TMDB, Titel, Gesehen am; Watchlist: Hinzugefuegt (Standard, absteigend), TMDB, Titel, Erscheinungsdatum. testIDs (Prefix `tagebuch`/`watchlist`): `<p>-sort-row`, `<p>-sort-field` (+ `-list`, `-option-<field>`), `<p>-sort-direction`, `<p>-filter-row`, `<p>-filter-chips`, `<p>-filter-chip-<key>` (`genre-<id>`, `year`, `streaming`, `liked`, `upcoming`, `unrated`, `has_ratings`, `all_rated`, `missing`), `<p>-filter-add`, `<p>-filter-flyout`, `<p>-filter-reset`, `<p>-filter-apply`, `<p>-filter-<flag>`, `<p>-streaming-mine`, `<p>-genre-pill-<id>`, `<p>-year-pill-<y|no_date>`, `<p>-provider-category-<c>`, `tagebuch-scope-my_diary|group`.

## Leerzustaende (`EmptyState`)

Jeder Leerzustand nutzt AUSSCHLIESSLICH `src/components/ui/EmptyState.tsx`: IMMER nur ein grosses Icon (`Icon size="L"`, `PLACEHOLDER_COLOR`, kein Kreis/Rahmen) und EIN kurzer gedaempfter Text (`text-base text-text-secondary`, zentriert) – keine Beschreibung, keine Aktion. Props: `icon`, `title`, `testID`. Der Container ist `flex-1 min-h-40 items-center justify-center`: der Parent muss Restplatz geben (Screen-Zweig `flex-1` neben dem Panel; `MovieGrid`-Root ist `flex-1`; alle Add-Movie-Such-Tabs (Film/Regisseur/Besetzung/Studio) nutzen `SearchResultsArea` (`src/components/ui/SearchResultsArea.tsx`): `mt-3 flex-1`-Wrapper mit genau EINEM Zustand (Laden/Fehler/EmptyState/Ergebnisse); der EmptyState steht DIREKT im Wrapper, NIE in einem ScrollView-Content-Container (dort hat `flex-1` keine definite Elternhoehe und klebt oben); nur die Ergebnisliste liegt in einer ScrollView mit `flex-1` + `contentContainerClassName="flex-grow"`), dann sitzt der Inhalt mittig zwischen Panel/Suchfeld und Tab-Leiste, bei Tastatur mittig im sichtbaren Restbereich. Keine Eigenbauten mit nacktem `Text`. Texte kurz, deutsch, ohne Schlusspunkt.

| Zustand | Icon-Rolle | Text |
|---|---|---|
| Filmsuche Anfang | `film` | Suche nach einem Filmtitel |
| Filmsuche/Filmografie/Aehnliche/Collection leer (`MovieGrid`, `emptyIcon` ueberschreibbar) | `film` | Keine Filme gefunden / Keine aehnlichen Filme gefunden / Keine weiteren Teile gefunden |
| Regisseur-/Besetzungssuche Anfang bzw. ohne Treffer | `person` | Suche nach einem Namen / Keine Personen gefunden |
| Studiosuche Anfang bzw. ohne Treffer | `studio` | Suche nach einem Studio / Keine Studios gefunden |
| Watchlist leer | `bookmark` | Deine Watchlist ist leer |
| Tagebuch leer | `tabDiary` | Noch keine bewerteten Filme |
| Tracker leer | `tabTracker` | Noch keine Zahlungen erfasst |
| Watchlist/Tagebuch ohne Treffer durch Filter/Suche | `filter` | Keine Treffer fuer „…“ / Keine Filme fuer diese Filter |
| Gruppe verwalten ohne aktive Gruppe | `group` | Keine aktive Gruppe gefunden |
