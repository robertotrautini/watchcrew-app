# Maestro-Abdeckung (Screens und Funktionen)

Pflege-Regel: Wird ein Screen oder eine Funktion hinzugefügt/geändert, wird diese Matrix im selben Zug aktualisiert und ein Flow (mit benannten Screenshots) ergänzt (Definition of Done, siehe `CLAUDE.md` -> "Verification workflow"). Ausführung: `scripts/maestro-all.sh` (komplett) oder nur betroffene Bereiche: `--area <name>` / `--changed` / `--smoke`, siehe `docs/maestro-areas.md`. Screenshot-Namen sind `<flow>/<shot>`; der Runner legt sie als `NN-<flow>--<shot>.png` ab.

Status: **covered** = automatisiert, Screenshot vorhanden. **partial** = Teil automatisiert (Grund genannt). **not automatable** = bewusst nicht automatisiert (Grund genannt).

## 1. Screens / Routen

| Screen (Route) | Flow | Bereich | Screenshots | Status |
|---|---|---|---|---|
| Auth-Gate `index.tsx` (Redirect) | `login`, `launch`-Subflow | auth | `login/01-launch-state`, `login/03-tracker-has-group` | covered |
| Login `(auth)/login` | `auth-screens`, `login` | auth | `auth-screens/01-login-screen`, `02-login-validation-empty`, `03-login-wrong-password-error` | covered |
| Registrierung `(auth)/register` | `auth-screens` | auth | `06-register-screen`, `07-register-validation-empty` | partial (Formular + Validierung; Absenden legt Account an) |
| Passwort vergessen `(auth)/forgot-password` | `auth-screens` | auth | `04-forgot-password-screen`, `05-forgot-password-validation-empty` | partial (Absenden verschickt echte E-Mail) |
| Auth-Callback `auth/callback` | `deeplinks` | offline-deeplinks | `03-auth-callback-no-tokens` | partial (Fehlerzustand; Passwort-Setzen braucht gültigen Mail-Token) |
| Join-Token `join/[token]` | `deeplinks` | offline-deeplinks | `02-join-token-screen` | partial (Fake-Token; echtes Beitreten braucht 2. Account) |
| Onboarding Auswahl/Erstellen/Beitreten `(onboarding)/create-or-join-group` | `onboarding-explore`, `create-test-group` | onboarding | `onboarding-explore/01..03` | not automatable (Test-Account hat Gruppe; Flows laufen nur bei gruppenlosem Account, sonst übersprungen) |
| Tracker-Tab | `tracker-payment`, `tabs-tour` | tracker, navigation | `tracker-payment/01-tracker-before`, `06-tracker-with-payment`, `11-tracker-restored`, `tabs-tour/01-tab-tracker` | covered |
| Watchlist-Tab | `watchlist-filter-sort`, `tabs-tour`, `watchlist-add-remove` | watchlist, navigation, add-movie | `watchlist-filter-sort/01..20`, `tabs-tour/02-tab-watchlist` | covered |
| Tagebuch-Tab | `tagebuch-filter-sort`, `tabs-tour` | tagebuch, navigation | `tagebuch-filter-sort/01..21`, `tabs-tour/03-tab-tagebuch` | covered |
| Tab-Bar (Wechsel, Akzentfarbe) | alle Flows, `group-settings-edit` (alle 6 Themes) | group-settings | `group-settings-edit/04..09` | covered |
| Filmdetail `movie/[tmdbId]` (Tagebuch-Kontext) | `movie-detail-full` | movie-detail | `01-detail-top`..`09-detail-delete-confirm`, `13-back-on-tagebuch` | covered |
| Filmdetail (Watchlist-Kontext) | `watchlist-open-detail`, `rating-cycle`, `watchlist-add-remove` | watchlist, movie-detail, rating, add-movie | `watchlist-open-detail/01-watchlist-detail`, `rating-cycle/01-watchlist-detail-actions` | covered |
| Filmdetail ohne Gruppenkontext (Suche) | `movie-detail`, `watchlist-add-remove` | movie-detail, add-movie, watchlist | `movie-detail/03-movie-detail-overlay`, `watchlist-add-remove/03-matrix-detail-not-on-watchlist` | covered |
| Add-Movie `add-movie` (Film/Regisseur/Besetzung/Studio) | `add-movie-modes`, `movie-detail` | add-movie, movie-detail | `add-movie-modes/01..12` | covered |
| Ähnliche Filme `similar/[tmdbId]` | `movie-detail-full` | movie-detail | `12-similar-movies` | covered |
| Zurueck-Navigation (Wisch-Geste/Hardware-Back, Stack-Reihenfolge Detail -> Aehnliche -> Detail, Einstellungen -> Darstellung, Sheet schliesst vor Screen) | `back-navigation` | navigation-back | `01-detail-a`..`11-hardware-back-to-tagebuch` | partial (Edge-Wisch per adb/Maestro-Swipe, kein echter Finger) |
| Filmreihe `collection/[collectionId]` | `movie-collection` | movie-detail | `01-dark-knight-detail`, `02-collection-screen` | covered |
| Filmografie Regisseur | `movie-detail-full` | movie-detail | `10-director-filmography` | covered |
| Filmografie Schauspieler | `movie-detail-full` | movie-detail | `11-actor-filmography` | covered |
| Filmografie Studio `filmography/studio/[companyId]` | `deeplinks` | offline-deeplinks | `01-studio-filmography` | covered (nur per Deep-Link erreichbar, keine UI-Navigation vorhanden) |
| Settings-Hub `settings` | `tabs-tour`, `settings-edit` | navigation, settings | `tabs-tour/04-settings-hub`, `settings-edit/01-settings-hub-top` | covered |
| Toasts (Erfolg gruen / Fehler rot) | `toasts`, `settings-edit` | toasts, settings | `toasts/01-toast-success-green`, `toasts/02-toast-error-red` | covered (Fehler per serverseitig abgelehntem 55-Zeichen-Anzeigenamen, nichts wird geschrieben) |
| Settings: Streaming-Dienste | `settings-edit`, `tabs-tour` | settings, navigation | `settings-edit/11..14` | covered |
| Settings: Darstellung | `settings-edit` | settings | `07..10` | covered |
| Settings: Benachrichtigungen | `settings-edit` | settings | `15-notifications-screen` | partial (Screen ja, Toggle nein, s. unten) |
| Settings: Konto löschen | `settings-edit` | settings | `05-delete-account-screen`, `06-delete-account-confirm-sheet` | partial (Dialog gezeigt, nie bestätigt, destruktiv) |
| Gruppen-Einstellungen `group-settings` | `group-settings-edit`, `tabs-tour` | group-settings, navigation | `group-settings-edit/01..16` | covered |
| Highlight-Farbe (Theme Rot-Tour, Blau-Stichprobe, Gold-Restore) | `theme-tour` | theme, design-system | `theme-tour/00..24` | covered (Gold-Restore via `onFlowComplete`) |
| Datenquellen/Attributions (im Settings-Hub) | `tabs-tour` | navigation | `04-settings-hub` | partial (Anzeige; Links öffnen externen Browser) |
| Rechtliches (Datenschutz, Nutzungsbedingungen) | `settings-edit` (Zeilen sichtbar) | settings | `01-settings-hub-top` | not automatable (öffnen externen Browser, App wird verlassen) |

## 2. Funktionen

| Funktion | Flow | Bereich | Screenshots | Status |
|---|---|---|---|---|
| Login (E-Mail/Passwort) | `login`, `auth-screens` | auth | `login/02-post-login`, `auth-screens/08-signed-back-in-tracker` | covered |
| Login-Validierung + falsches Passwort | `auth-screens` | auth | `02`, `03` | covered |
| Logout | `auth-screens` | auth | `01-login-screen` | covered |
| Registrieren (absenden) | - | - | - | not automatable (legt echten Account an) |
| Passwort-Reset (absenden / neues Passwort setzen) | - | - | - | not automatable (echte E-Mail, Token aus Mail) |
| Gruppe erstellen | `create-test-group` | onboarding | `create-test-group/01..03` | not automatable wiederholt (einmalig, braucht gruppenlosen Account; schon ausgeführt) |
| Gruppe beitreten (Code / Einladungslink) | `onboarding-explore`, `deeplinks` | onboarding, offline-deeplinks | `deeplinks/02-join-token-screen` | not automatable (2. Account/gültiger Token nötig) |
| Zahlung erfassen (Sheet, Film wählen, Suche, speichern) | `tracker-payment` | tracker | `03..06` | covered |
| Tracker-Zeile bearbeiten (Flyout, Speichern) | `tracker-payment` | tracker | `07`, `09`, `10` | covered |
| Tracker-Zahlung löschen (Bestätigung gezeigt/abgebrochen, dann echt, nur selbst angelegte Zahlung) | `tracker-payment` | tracker | `08`, `11` | covered |
| Tracker-Suche | `tracker-payment` | tracker | `02-tracker-search-no-match` | covered |
| Film hinzufügen (Suche, Quick-Add, Detail "Zur Watchlist") | `watchlist-add-remove`, `movie-detail` | watchlist, add-movie, movie-detail | `watchlist-add-remove/02..05` | covered |
| Film suchen nach Regisseur/Besetzung/Studio | `add-movie-modes` | add-movie | `05..11` | covered |
| Duplikat-Warnung "Film bereits gesehen" | `add-movie-modes` | add-movie | `04-add-movie-duplicate-warning` | covered (abgebrochen) |
| Manuelles Erscheinungsdatum (Add-Movie-Sheet) | - | - | - | not automatable (braucht Film ohne TMDB-Datum, datenabhängig) |
| Streaming-Filter-Toggle im Add-Movie | `add-movie-modes` | add-movie | `03-add-movie-streaming-filter-toggled` | covered |
| Film bewerten (Sterne, Like, Speichern) | `rating-cycle` | rating | `02..05` | covered |
| Bewertung bearbeiten | `rating-cycle`, `movie-detail-full` | rating, movie-detail | `rating-cycle/06..08`, `movie-detail-full/08` | covered |
| Bewertung zurücksetzen | `rating-cycle` | rating | `09-edit-dialog-after-reset` | covered |
| "Direkt bewerten" | - | - | `watchlist-add-remove/03` (Button sichtbar) | partial (Button sichtbar, nicht ausgelöst, würde Film dauerhaft hinzufügen+bewerten) |
| Film von Watchlist löschen (Bestätigung + echt, nur selbst angelegt) | `watchlist-add-remove` | watchlist, add-movie | `07-delete-confirm`, `08-watchlist-after-remove` | covered |
| Film aus Tagebuch löschen | `movie-detail-full` | movie-detail | `09-detail-delete-confirm` | partial (Dialog gezeigt/abgebrochen, Löschen zerstört echte Daten) |
| Watchlist-Eintrag bearbeiten (Erscheinungsdatum-Sheet) | `watchlist-add-remove` | watchlist, add-movie | `06-watchlist-entry-edit-sheet` | partial (Sheet gezeigt, nicht gespeichert) |
| Watchlist/Tagebuch Suche (Treffer, kein Treffer) | `watchlist-filter-sort`, `tagebuch-filter-sort` | watchlist, tagebuch | `02`, `03` | covered |
| Filter-Panel auf/zu + Filter-Punkt | `watchlist-filter-sort`, `tagebuch-filter-sort` | watchlist, tagebuch | `04`, `18`, `20/21` | covered |
| Sortier-Flyout + jede Sortieroption (Watchlist 8, Tagebuch 9) | `watchlist-filter-sort`, `tagebuch-filter-sort` | watchlist, tagebuch | `05..15` / `05..16` | covered |
| Genre-/Jahr-Chips | `watchlist-filter-sort`, `tagebuch-filter-sort` | watchlist, tagebuch | `11..14` / `12..15` | covered |
| Provider-Kategorien (Flatrate/Leihen/Kaufen) | `watchlist-filter-sort`, `tagebuch-filter-sort` | watchlist, tagebuch | `16` / `17` | covered |
| Ansichtsmodi Karten/Grid/Liste | `watchlist-filter-sort`, `tagebuch-filter-sort` | watchlist, tagebuch | `17..19` / `18..20` | covered |
| Detail: Bewertungen auf/zuklappen, Beschreibung, Besetzung | `movie-detail-full` | movie-detail | `02..04`, `07` | covered |
| Detail: Anbieter-Liste (Provider) | `movie-detail-full` | movie-detail | `05`, `06` | partial (nur wenn Film Anbieter hat, sonst bedingt übersprungen) |
| Detail: Trailer abspielen | - | - | - | not automatable (WebView/YouTube, externer Inhalt) |
| Ähnliche Filme / Filmreihe / Regisseur- und Schauspieler-Filmografie | `movie-detail-full`, `movie-collection` | movie-detail | siehe oben | covered |
| Anzeigename ändern (speichern + zurücksetzen) | `settings-edit` | settings | `02..04` | covered |
| Darstellung-Toggles (Titel im Grid, Tracker aktiv) | `settings-edit` | settings | `07..10` | covered |
| Streaming-Dienste wählen/Suche (Netflix an/aus) | `settings-edit` | settings | `11..14` | covered |
| Benachrichtigungen an/aus | - | - | `settings-edit/15` | not automatable (OS-Permission-Dialog + Push-Token-Registrierung) |
| Push-Benachrichtigungen empfangen/Tippen | - | - | - | not automatable (braucht Push-Auslöser von 2. Account) |
| Realtime-Toast (Änderung anderer Mitglieder) | - | - | - | not automatable (2. Account) |
| Gruppe umbenennen (speichern + zurück) | `group-settings-edit` | group-settings | `02`, `03` | covered |
| Gruppen-Theme wechseln (alle 6, Ende Gold) | `group-settings-edit` | group-settings | `04..09` | covered |
| Einladungslink anzeigen / teilen (System-Share-Sheet) | `group-settings-edit` | group-settings | `10`, `13` | covered |
| Einladungen aktiv/deaktiviert | `group-settings-edit` | group-settings | `11`, `12` | covered |
| Einladungslink neu generieren | - | - | - | not automatable (zerstört den bisherigen Link irreversibel) |
| Mitglied entfernen | - | - | `group-settings-edit/14` (Mitgliederliste) | not automatable (2. Mitglied nötig, destruktiv) |
| Gruppe verlassen | `group-settings-edit` | group-settings | `15-leave-confirm`, `16-leave-cancelled` | partial (Bestätigung gezeigt, abgebrochen, destruktiv) |
| Gruppe wechseln (Switcher) | - | - | `group-settings-edit/01` | not automatable (nur 1 Gruppe) |
| Konto löschen | `settings-edit` | settings | `05`, `06` | partial (nie bestätigt, destruktiv) |
| Offline-Banner / Offline-Cache | `offline-banner` | offline-deeplinks | `01..03` | covered (Flugmodus an/aus) |
| Deep-Links (Studio, Join, Callback) | `deeplinks` | offline-deeplinks | `01..03` | covered |

## 3. Bereiche (Areas)

Spalte "Bereich" = Use-Case-Bereich(e) des Flows (Karte und Pfadmuster: `docs/maestro-areas.md`, `.maestro/areas.json`). Teil-Läufe: `scripts/maestro-all.sh --area <name>` / `--changed`.

## 4. Zusammenfassung

77 Matrix-Zeilen: **50 covered**, **13 partial**, **14 not automatable**.

Nicht automatisierbar (Gründe): Account anlegen / Reset-Mail (echte Mails, Token aus Mail), Gruppe erstellen/beitreten (braucht gruppenlosen bzw. 2. Account, `create-test-group` ist einmalig gelaufen), Push + Realtime-Toast + Mitglied entfernen + Gruppenwechsel (2. Account/Gruppe), Benachrichtigungen-Toggle (OS-Permission-Dialog + Push-Token), Trailer (WebView/YouTube), externe Links (Datenschutz, Nutzungsbedingungen, Attributions), Einladungslink neu generieren (irreversibel), manuelles Erscheinungsdatum (datenabhängig).

Letzter Gesamtlauf: 19 Flows, alle PASS, 158 Screenshots, 29,8 Min (vorher 43,3 Min).

Bekannte Restspuren der Rating-Zyklen: Das flow-eigene Matrix (wird am Ende gelöscht) behält nach "Zurücksetzen" ein leeres Rating mit gesetztem "Gesehen am"-Datum (in der UI nicht sichtbar, Eintrag bleibt unbewertet auf der Watchlist).

Hinweis Flow-Technik: `scrollUntilVisible` stoppt bei teilweise verdecktem Element (feste Aktionsleiste unten im Filmdetail); Flows nutzen dort `centerElement: true` (movie-detail-full: Regie/Besetzung). Seed-Zustand der Testgruppe: siehe `.maestro/README.md` (Prerequisites).
