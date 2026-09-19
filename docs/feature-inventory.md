# Filmkritiker Trautmanns — Feature & Funktions-Inventar
## Funktionale Spezifikation für Frontend-Rewrite (Cross-Platform Mobile App)

> **Hinweis (WatchCrew-Repo, siehe `docs/adr/`):** Dieses Dokument ist eine funktionale Spezifikation — Screens, API-Verhalten und Business-Regeln der alten PWA "Filmkritiker Trautmanns". Es bleibt als Feature-Referenz für die WatchCrew-Migration wertvoll. Die darin beschriebenen **Architektur-Annahmen sind jedoch veraltet**: das Dokument geht noch davon aus, dass das bestehende PHP/MySQL-Backend (`api.php`, `auth.php`, `tmdb.php`, `db.php`, Multi-Projekt-System, etc.) unverändert weiterläuft und von der neuen App nur per HTTP(S) konsumiert wird. Diese Annahme wurde in der Planungs-Session vom 2026-09-19 verworfen: WatchCrew migriert stattdessen vollständig auf Supabase (Postgres + Auth + Realtime + Edge Functions), siehe `docs/adr/0002-supabase-backend.md` und die übrigen ADRs für die aktuell gültige Architektur. Für Screens, Datenfelder und Business-Regeln (Sterne-Rating, Bezahl-Tracker, Like-Feature, Nav-Stack-Verhalten etc.) bleibt dieses Dokument die primäre Quelle.

Erstellt durch Read-only-Analyse von `/home/robin/programming/filmkritiker` am 2026-09-19.
Backend (`api.php`, `auth.php`, `login.php`, `tmdb.php`, `cron-releases.php`, `db.php`, DB-Schema) bleibt **unverändert** und wird von der neuen App weiter per HTTP(S) angesprochen. Ersetzt werden nur `index.html` + `js/*` + `css/*`.

> **Wichtiger Befund vorab:** Die Codebase ist inzwischen deutlich über das in `CLAUDE.md` beschriebene Single-Family-Modell hinausgewachsen. Sie wurde zu einem **Multi-Tenant "Projekt"-System** ausgebaut (`window.CURRENT_PROJECT`, `PROJECT_NAME`, `login.php` mit Projekt-ID + Passwort + Nutzerauswahl, `admin.php`, `setup.php`, `migrate.php`, `logout.php`, `createGroup`/`getProjectGroups`/`getProjectMembers`/`updateProjectName` API-Actions). Außerdem gibt es zwei weitere Tabs, die in `CLAUDE.md` nicht dokumentiert sind: **News** (`js/news.js`, `news.php`) und einen modularisierten **Tracker** (`js/tracker.js`, als ES-Module geladen, mit neuen Actions `setPayment`/`deletePayment` statt der in `CLAUDE.md` erwähnten `getRotation`/`payNext`). Dieses Dokument beschreibt den **tatsächlichen, aktuellen Code-Zustand** (Stand des Analyse-Zeitpunkts), nicht nur die CLAUDE.md-Beschreibung. Für den Rewrite der Familien-App sind `all_three` und `robin_tobias` die relevanten Gruppen; das Projekt-System ist optionale Mehrfahrt-Infrastruktur, die ebenfalls nachgebildet werden müsste, falls die neue App weiterhin mehrere Projekte unterstützen soll.

---

## 1. App-Overview

**Zweck:** Private Film-Tracking-PWA für die Familie Trautmann (Robin, Tobias, Dad). Nutzer verwalten eine gemeinsame Watchlist, bewerten gesehene Filme (Sterne 0–5 in 0.5-Schritten), führen ein "Bezahl-Tracker"-Rotationssystem für Kinobesuche/Streaming-Abos, lesen Film-News und entdecken neue Filme über TMDB/Trakt-Empfehlungen.

**Nutzer:** 3 Personen (Robin, Tobias, Dad), angemeldet per Cookie-Auth mit persönlicher Nutzerauswahl (kein individuelles Passwort — alle teilen ein Projekt-Passwort, wählen aber ihren Namen aus einem Dropdown).

**Gruppen:** Zwei Watch-Groups mit unabhängigen Watchlists/Tagebüchern/Trackern:
- `all_three` — Robin, Tobias, Dad
- `robin_tobias` — Robin, Tobias

Gruppenwechsel ändert die komplette sichtbare Datenmenge (Filme, Ratings, Tracker-Rotation) und die Akzentfarbe der UI (Gold für `all_three`, Rot für `robin_tobias`; weitere Farben für evtl. zusätzliche Gruppen im Projekt-System: Blau, Grün, Lila, Orange — `css/variables.css:46-134`).

**High-Level-Struktur — 4 Tabs** (Bottom-Nav auf Mobile, `index.html:75-92`):
1. **News** (`newspaper`-Icon) — kann deaktiviert werden, dann per Default ausgeblendet
2. **Tracker** (`payments`-Icon) — Bezahl-Rotation, standardmäßig aktiver Tab
3. **Watchlist** (`movie`-Icon) — ungesehene Filme
4. **Tagebuch** (`auto_stories`-Icon) — gesehene/bewertete Filme

Zusätzlich: Header-Row mit Logo (Klick = Gruppenwechsel/-menü), Burger-Menü für >2 Gruppen, Settings-Zahnrad-Button. Alle Detail-Overlays, Modals, Formulare etc. laufen durch **ein einziges** wiederverwendetes Overlay-Element (`#edit-overlay` / `#edit-modal`, `index.html:187-189`) mit eigenem Navigations-Stack (`_navStack`) statt echtem Routing.

**Kein Framework:** Vanilla JS ES-Module, kein Build-Step, HTML wird serverseitig als String zusammengesetzt und per `innerHTML` injiziert (kein Virtual DOM). Für den Rewrite ist das komplett zu ersetzen; dieses Dokument beschreibt ausschließlich *Verhalten*, nicht Implementierungsdetails der DOM-Manipulation.

---

## 2. Screens / Views

### 2.1 Tracker (Bezahl-Tracker)

Datei: `js/tracker.js` (ES-Module, `index.html:207` `<script type="module">`), Tab-Markup `index.html:101-112`, CSS `css/tracker.css`.

**Anzeige:**
- Suchfeld (`#tracker-search`, filtert Filme nach Namen, live)
- 💰-Button öffnet "Zahlung erfassen"-Modal (`openPaymentModal`)
- Tabelle (`.tracker-table`) mit Spalten: Film | Bezahlt von | Datum — zeigt **ausschließlich Filme, die bereits als bezahlt markiert wurden** (`m.paidAt` gesetzt). Sortiert nach Zahlungsdatum absteigend (neueste zuerst). Filme, die zwar von allen bewertet wurden aber noch keine Zahlung haben, erscheinen NICHT in der Liste (`tracker.js:60-62`).
- Zeile antippen → expandiert inline (`_expandedId`) und zeigt je nach Zustand:
  - Unbezahlter Kontext (kommt aktuell nicht vor, da Liste nur bezahlte zeigt) → Bezahl-Formular (Personen-Buttons + Datum + Speichern/Abbrechen)
  - Bezahlter Eintrag → "Bearbeiten"/"Löschen"-Buttons; Löschen fragt zusätzlich "Wirklich löschen?" nach (Inline-Bestätigung, kein Modal)

**Personen-Buttons:** Für jedes Gruppenmitglied ein Button mit individueller Farbe (`TRACKER_COLORS = ['#f59e0b','#6366f1','#22c55e']`, Index = Position in `GROUPS[group]`); zeigt "vor X Tagen"/"heute"/"gestern" seit letzter Zahlung dieser Person als `<small>`-Hinweis (`daysSince()`).

**Automatischer Vorschlag "wer ist dran":** `computeNextPayer(movies, group)` (`tracker.js:3-20`) — bestimmt für jedes Mitglied das Datum seiner letzten Zahlung (`paidByName`+`paidAt`), wählt die Person mit dem ältesten (oder fehlendem) `paidAt` als Vorschlag. Wird als vorausgewählter Button im Zahlungs-Formular und im "Zahlung erfassen"-Modal verwendet.

**"Zahlung erfassen"-Modal** (`openPaymentModal`, `tracker.js:192-254`):
- Filmauswahl per Suchfeld + `<select size="100">` (native Multi-Row-Select als Liste), gefüllt mit **allen unbezahlten Tagebuch-Filmen** (`m.ratings` hat ≥1 Wert, `!m.paidAt`) — **nicht** nur Filme, bei denen alle Mitglieder bewertet haben (History: `tracker.js` Kommentar + Changelog 2026-05-09 "Tracker: Alle Tagebuch-Filme auswählbar")
- Personen-Auswahl (vorausgewählt: `computeNextPayer`)
- Datum (Default: heute)
- Speichern → `setPayment` API-Call

**Bearbeiten eines bezahlten Eintrags:** Inline-Formular mit Personen-Buttons + Datum, direkt in der Tabellenzeile eingefügt (`_buildTrackerEditFormHtml`).

**Business-Logik / Edge Cases:**
- Zahlung kann auch direkt beim Bewerten eines Films (Rating-Dialog) oder beim Bearbeiten eines Tagebuch-Eintrags gesetzt werden (`buildPaymentSection()` in `js/ratings.js:91-119`, eingebunden über `data-feature="tracker"` — versteckt, wenn Tracker-Feature-Flag aus ist).
- **`paid_at` wird beim Bearbeiten/Bewerten NICHT überschrieben, wenn bereits ein Datum existiert** (kritischer Bugfix, siehe Abschnitt 6) — API bevorzugt explizit übergebenes Datum, sonst existierendes `paid_at`, sonst „heute" (`api.php:580-584`).
- Zahlung kann gelöscht werden (`deletePayment`), setzt `paid_by_member_id`/`paid_at` auf `NULL`.
- Tracker-Sektion ist komplett ausblendbar per Feature-Flag (Settings → Darstellung → "Bezahl-Tracker anzeigen"); wenn deaktiviert und gerade aktiver Tab, wechselt App automatisch zu Watchlist (`tabs.js:128-129`, `settings.js:144-150`).

### 2.2 Watchlist

Datei: `js/render.js` (`renderWatchlist`, Zeilen 27–257), Tab-Markup `index.html:114-149`, CSS `css/cards.css`, `css/list.css`, `css/watchlist.css`, `css/controls.css`.

**Definition:** Filme in der `watchlist`-Tabelle, bei denen der **aktuell eingeloggte Nutzer** noch keine Bewertung abgegeben hat (`m.ratings[currentUser] === null/undefined`). Ohne eingeloggten Nutzer: gesamte Watchlist der Gruppe.

**Controls:**
- Suchfeld (Fuzzy-Suche via Fuse.js, ab 2 Zeichen aktiv, `fuzzyScore()`)
- "+"-Button → Add-Movie-Modal (siehe 2.5)
- Tune-Icon → Filter-Panel auf/zu (Zustand pro Tab+Gruppe in localStorage gemerkt)
- Sortier-Dropdown mit 8 Optionen: Hinzugefügt (neueste, Default) / Kommt noch / Keine Bewertung / Mit Bewertung(en) / TMDB Score / Meine Streaming-Dienste / Nach Genre / Nach Jahr
- View-Toggle: Karten / Grid (Poster-Kacheln) / Liste (Tabelle) — pro Tab in localStorage gespeichert
- Bei Sortierung "Nach Genre"/"Nach Jahr": Filter-Badges (Mehrfachauswahl bei Genre via UND-Logik, Einzelauswahl bei Jahr)
- Bei "Meine Streaming-Dienste": zusätzliche Pills Flatrate/Leihen/Kaufen (mind. 1 muss aktiv sein)

**Karten-Ansicht (Default):** Poster, Titel, Datums-Anzeige (`"Kommt am DD.MM.YYYY"` / `DD.MM.YYYY` wenn erschienen / `"Streaming verfügbar"` wenn kein Datum aber auf Streaming verfügbar / `"Kein Datum"`), Overview-Text (oder Platzhalter „Keine Beschreibung vorhanden"), TMDB-Score-Badge unten rechts, Fortschritts-Badge oben (Sternhälften-Anteil `x/y bewertet`, nur wenn nicht alle bewertet haben — `renderWatchlistBadge()`). Nicht erschienene/nicht-streamende Filme werden abgedunkelt (`.unreleased`-Klasse).

**Grid-Ansicht:** Reine Poster-Kacheln, Titel optional ausblendbar (Settings → Darstellung), zeigt Bewertungs-Fortschritt oder Datum + TMDB-Badge.

**Listen-Ansicht:** Tabelle mit Titel | Datum.

**Business-Logik:**
- Filter "Kommt noch" (`upcoming`): Filme mit zukünftigem Datum ODER (kein Datum UND nicht auf Streaming verfügbar) — schließt Streaming-verfügbare Filme aus (Bugfix 2026-05-16).
- Streaming-Verfügbarkeit wird nur für Filme ohne `releaseDate` per TMDB-Watch-Provider-API abgefragt und gecacht (`_providerCache`, Ländercode DE).
- Klick auf Karte → Details-Overlay (Source `'watchlist'`).
- Bereits-gesehen-Warnung: Beim Hinzufügen eines Films, der (unter anderem Titel-Match oder gleicher TMDB-ID) bereits im Tagebuch der **Zielgruppe** existiert (≥1 Rating), erscheint ein Bestätigungsdialog "Film bereits gesehen" mit Ø-Bewertung, bevor der Film trotzdem doppelt zur Watchlist hinzugefügt wird (`movie.js:48-77`).

### 2.3 Tagebuch (Diary)

Datei: `js/render.js` (`renderWatched`, Zeilen 284–503), Tab-Markup `index.html:151-184`.

**Definition:** Filme mit mindestens einer Bewertung. Standardmäßig ("Mein Tagebuch") zeigt es nur Filme, die **der aktuell eingeloggte Nutzer** selbst bewertet hat.

**Sortier-Dropdown (9 Optionen):**
- Mein Tagebuch (Default) — nur eigene Bewertungen, sortiert nach eigenem `seenAt`-Datum absteigend
- Von allen bewertet (`all_rated`) — nur Filme, bei denen ALLE Gruppenmitglieder bewertet haben, sortiert nach Ø-Bewertung
- Fehlende Bewertungen (`missing`) — mind. ein Mitglied hat noch nicht bewertet
- Beste Bewertung (`rating`) — sortiert nach Ø absteigend
- TMDB Score
- Meine Streaming-Dienste
- Nach Genre / Nach Jahr (eigenes `seenAt`-Jahr, mit "Kein Datum"-Pille für Filme ohne bekanntes Sehdatum)
- **Mag ich ♥** (`mag_ich`) — zeigt nur vom aktuellen Nutzer gelikte Filme (siehe Like-Feature, 4.4)

**Karten-Ansicht:** Poster, Titel, "Gesehen am DD.MM.YYYY" oder "Kein Datum", individuelle Bewertungszeilen pro Gruppenmitglied (Name + Sterne read-only + Zahl oder "–"), Ø-Bewertungs-Badge oben rechts (Stern-Icon + Zahl), Like-Herz-Badge links daneben falls vom aktuellen Nutzer geliked, TMDB-Score unten rechts.

**Grid-Ansicht:** Poster + Ø-Sterne + Like-Herz-Icon + TMDB-Badge.

**Listen-Ansicht:** Titel | Gesehen (Jahr) | ★ (Ø) | TMDB.

**Business-Logik / Edge Cases:**
- `getWatchYear()`: Datum `2020-01-01` gilt als Platzhalter für "unbekanntes Datum" (Legacy — neuere Einträge speichern stattdessen `NULL`, siehe Bugfix 2026-05-12) und wird NICHT als reales Jahr gezählt.
- Jede Bewertung ist strikt personenbezogen — jeder Nutzer hat eigenes `seenAt`-Datum, das nur durch eigene Aktionen verändert wird (nicht durch andere Mitglieder, die denselben Film bewerten — Bugfix 2026-04-25).
- Klick auf Karte → Details-Overlay (Source `'watched'`).

### 2.4 Movie-Detail-Overlay

Datei: `js/details.js` (`renderDetailsModal`, Zeilen 82–224), CSS `css/details.css`.

**Layout:** Vollbild-Overlay mit scrollbarem Content-Bereich + fixierten Action-Buttons unten.
- Kopfzeile: Zurück-Pfeil (wenn Nav-Stack nicht leer) oder Schließen-X, Poster (w342), Play-Button-Overlay für Trailer (Spinner während Laden, erscheint sobald YouTube-Trailer gefunden — Priorität Trailer > Teaser > erstes Video)
- Titel + TMDB-Badge + Like-Herz (nur Anzeige, togglebar per Klick — nur wenn `movie.liked[currentUser]` bereits true, sonst kein Herz sichtbar; **das Herz im Detail-Overlay ist reiner Toggle-Button, keine Bewertungsmöglichkeit** — Changelog: "Detail-Overlay: display-only")
- Meta-Zeile: Laufzeit (`Xh Ymin`, lazy nachgeladen falls fehlend) · Erscheinungsdatum
- Genre-Tags (werden bei Fehlen automatisch von TMDB nachgeladen und in DB gespeichert — `fetchAndDisplayGenres`)
- Bei Tagebuch-Filmen: aufklappbares `<details>`-Element "Bewertungen" mit Sternen pro Mitglied
- Regie (klickbar → Regisseur-Filmografie) + Besetzung (bis 10 Personen, klickbar → Schauspieler-Filmografie), lazy von TMDB nachgeladen
- Beschreibung (mit "Mehr anzeigen"-Toggle, nur sichtbar wenn Text über 3 Zeilen geht)
- Streaming-Anbieter (Flatrate/Leihen/Kaufen für DE, mit "Alle Anbieter anzeigen"-Toggle wenn >1 Sektion oder >3 Anbieter)

**Action-Buttons (kontextabhängig):**
- Ist Film in Watchlist/Tagebuch (`group` + `source` gesetzt):
  - "Bewerten" (nur bei Watchlist-Source UND Film ist erschienen ODER auf Streaming verfügbar) → öffnet Rating-Dialog
  - "Bearbeiten" → editMovie (Watchlist) oder editWatchedMovie (Tagebuch)
  - "Ähnliche" → Ähnliche-Filme-Grid
  - "Löschen" (mit Bestätigungs-Dialog)
  - "Filmreihe" (nur wenn TMDB `belongs_to_collection` vorhanden, lazy nachgeladen)
- Film aus Suche/Empfehlung (kein `group`/`source`, aber `tmdbId`):
  - "Zur Watchlist" → fügt direkt hinzu
  - "Direkt Bewerten" → fügt hinzu UND öffnet sofort Rating-Dialog (nur eigener Eintrag bekommt Bewertung, andere Mitglieder sehen Film ganz normal auf ihrer Watchlist)
  - "Ähnliche"
  - "Filmreihe" (falls vorhanden)

**Trailer-Inline-Player:** Ersetzt Posterbereich durch YouTube-iframe (nocookie-Domain), eigener Custom-Fullscreen (native `requestFullscreen`, Landscape-Lock via `screen.orientation.lock`), Auto-Hide von Fullscreen-Button nach 3s Inaktivität.

**Filmreihe (Collection) Sub-View:** Grid aller Teile einer TMDB-Collection, sortiert nach Erscheinungsdatum, mit Status-Icon (grünes Auge = gesehen, goldenes Lesezeichen = auf Watchlist), Streaming-Filter-Toggle, TMDB-Badge. Klick öffnet Detail des jeweiligen Teils.

**Regisseur-/Schauspieler-/Studio-Filmografie:** Eigene Grid-Views (`openDirectorMovies`, `openActorMovies`, `openStudioMovies`), zeigen "X von Y gesehen · Z%"-Badge (nur bei Regisseur/Schauspieler), Studio-Grid unterstützt seitenweises Nachladen ("Mehr laden"-Button, TMDB-Pagination).

### 2.5 Add-Movie-Modal + Autocomplete

Datei: `js/autocomplete.js` (`openAddMovieModal`, Zeilen 249–638).

**Zugriff:** "+"-Button in Watchlist-Controls.

**Vier Such-Modi (Pills):** Film (Default) / Regisseur / Besetzung / Studio — jeweils eigener Input-Handler und eigenes Ergebnis-Grid.
- **Film:** Fuzzy-Suche via `tmdbSearch()` (TMDB DE+EN gemerged), debounced 350ms, Ergebnis-Grid mit Bibliotheks-Status-Icon (grünes Auge = im Tagebuch, Lesezeichen = auf Watchlist).
- **Regisseur/Besetzung:** Personen-Autocomplete (250ms debounce, TMDB `search_person`), Auswahl lädt Filmografie als Grid.
- **Studio:** Firmen-Autocomplete (TMDB `search_company`), Scoring nach Fuzzy-Score + Prefix-Bonus + Logo-Bonus, Auswahl öffnet Studio-Filmografie.
- Optionaler Streaming-Filter-Button (nur bei Film-Modus sichtbar, TV-Icon) — filtert Ergebnis-Grid nach eigenen Streaming-Diensten.
- Klick auf Kachel → Details-Overlay (mit vollen Action-Buttons falls Film schon in Bibliothek, sonst "Zur Watchlist"/"Direkt Bewerten").

**Separates Inline-Autocomplete im Watchlist-Suchfeld selbst** (`showAutocompleteUnified`, `autocomplete.js:76-124`): zeigt kombiniert lokale Watchlist-Treffer ("In deiner Watchlist") + TMDB-Treffer ("Hinzufügen von TMDB", max. 5 initial mit "Alle X anzeigen"), inkl. Keyboard-Navigation (Pfeiltasten, Enter, Escape) und Lupen-Icon pro Ergebnis zum Öffnen der Vorschau ohne Hinzufügen (`openTmdbDetails`).

**Manuelle Ergänzung fehlendes Datum:** Falls TMDB kein `releaseDate` liefert, erscheint ein zusätzliches Datumsfeld zur manuellen Eingabe (`addMovie()` in `movie.js:1-46`).

**Beim Hinzufügen geladene Metadaten (parallel von TMDB):** `voteAverage`, `runtime`, `director`+`directorId`, deutsches Kino-/Digital-/TV-Releasedatum (`release_dates`-Action, bevorzugt vor globalem TMDB-Datum), Genres (deutsche Namen via `TMDB_GENRES`-Mapping).

### 2.6 Rating-Dialog ("Bewerten")

Datei: `js/ratings.js` (`renderAllRatingsOverlay`, Zeilen 126–244) für initiales Bewerten von der Watchlist; `js/movie.js` (`renderEditWatchedModal`, Zeilen 223–319) für Bearbeiten bereits bewerteter Filme; `js/movie.js` (`renderDirectRateModal`, Zeilen 564–635) für "Direkt Bewerten" bei neuen Filmen.

**Gemeinsame Elemente:**
- Datum "Gesehen am" (Default heute) mit zwei sich gegenseitig ausschließenden Checkboxen: "Weiß nicht" (deaktiviert Feld, speichert `NULL`) und "Release Date" (übernimmt Kinostart-Datum, nur aktiv wenn vorhanden)
- 5-Sterne-Widget mit **Halbstern-Präzision** (Klick links/rechts der Sternmitte = .5 oder volle Zahl) — clientseitig via `event.clientX` relativ zur Button-Breite berechnet
- Like-Herz-Button direkt neben den Sternen (toggle, siehe 4.4)
- Reset/Löschen-Button (setzt Rating auf 0/NULL zurück, deaktiviert wenn keine Bewertung vorhanden)
- Read-only-Anzeige der Bewertungen der anderen Gruppenmitglieder darunter
- Bezahl-Tracker-Sektion (`buildPaymentSection`, nur sichtbar wenn Tracker-Feature aktiv) — optionale Zuordnung "Wer hat bezahlt?" direkt im selben Dialog
- Speichern-Button → `rateMovie`/`editMovie`-API-Call, danach Toast „Film → Tagebuch" bei Erstbewertung bzw. „Film → Watchlist" bei Rating-Entfernung (Rückverschiebung in Watchlist)

**Wichtige Business-Regeln:**
- Bewerten-Button ist im Detail-Overlay **nur sichtbar wenn Film bereits erschienen ist** (Kinostart in Vergangenheit) ODER kein Datum bekannt aber Streaming-verfügbar (Bugfix 2026-05-09 + 2026-05-12).
- Push-Benachrichtigung an andere Gruppenmitglieder wird **nur bei Erstbewertung** ausgelöst (NULL→Wert-Übergang), nicht bei nachträglicher Korrektur einer bestehenden Bewertung (Bugfix 2026-05-16, serverseitig in `api.php:656-673, 742-830` via Snapshot-Vergleich `previouslyRated` vs. `newRaters`).
- "Direkt Bewerten" fügt Film gleichzeitig zur Watchlist UND ins Tagebuch hinzu — aber **nur für den eigenen Nutzer**; andere Gruppenmitglieder finden den Film ganz normal (unbewertet) auf ihrer Watchlist.

**Einzelbewertung ("Person X bewerten"):** Separater, minimalerer Dialog (`renderRatingOverlayFor`) — wird über `renderRatingSection()` erreicht (scheint aktuell nicht mehr direkt verlinkt, aber Funktion existiert weiterhin, evtl. Altlast/Fallback für stellvertretende Bewertung eines anderen Mitglieds).

### 2.7 Settings-Overlay

Datei: `js/settings.js`. Struktur: Hauptseite (`openSettings`) mit Navigations-Items zu 4 Unteransichten (jeweils mit eigenem Zurück via `_navStack`):

1. **Allgemein** (`openSettingsAllgemein`) — Projektname bearbeiten (`updateProjectName`-API), wird in `localStorage` gecacht und live im Logo-Untertitel angezeigt.
2. **Darstellung** (`openSettingsDarstellung`) — 3 Toggle-Switches:
   - "Filmtitel in Tile-Ansicht" (Grid-View Titel ein/ausblenden)
   - "News-Tab anzeigen" (Feature-Flag)
   - "Bezahl-Tracker anzeigen" (Feature-Flag)
3. **Meine Streaming-Dienste** (`openStreamingServices`) — durchsuchbares Grid aller TMDB-Provider (DE), Mehrfachauswahl, pro Nutzer in `localStorage` gespeichert (`filmkritiker_streaming_<user>`). Badge auf dem Settings-Hauptmenü zeigt Anzahl ausgewählter Dienste.
4. **Benachrichtigungen** (`openSettingsBenachrichtigungen`) — Checkbox pro Gruppe zum Ein-/Ausschalten von Push-Notifications (siehe 4.2); im Admin-Modus zusätzlich "Test-Benachrichtigung"-Button.

**Weitere Elemente auf der Hauptseite:**
- Aktueller Nutzer (read-only Anzeige)
- Nur im Admin-Modus (`window.IS_ADMIN_SESSION`): "TMDB Daten aktualisieren"-Button — batched (5er-Gruppen parallel) Refresh von Poster/Release-Datum/Regisseur/Laufzeit/Genres für ALLE Filme der aktuellen Gruppe via `updateMovieMeta`
- Changelog-Button (siehe 2.8)
- Abmelden-Button (→ `logout.php`)
- Attributions-Links (TMDB, Trakt, KinoCheck) mit Logos
- App-Versions-Anzeige oben rechts (`window.APP_VERSION`, wird beim Deploy per GitHub Actions Run-Number ersetzt)

**Feature-Request-Formular** (`openFeatureRequest`, separat von Hauptsettings erreichbar aber aktuell nicht verlinkt im sichtbaren Settings-Menü — Legacy-Funktion): Titel, Beschreibung, Screenshot-Upload (Multi-File, Base64), sendet an `createFeatureRequest`-API (erstellt Linear-Ticket inkl. Datei-Uploads).

### 2.8 Changelog-Modal

Datei: `js/settings.js:485-613`. Zeigt eine feste Liste (`CHANGELOG`-Array, ~130+ Einträge, jeweils `{date, title, description}`, neueste zuerst) als vertikale Timeline mit goldenem linken Rand. Version-Tracking über `CHANGELOG_VERSION` (String) — beim App-Start wird verglichen mit `localStorage.filmkritiker_changelog_version`; bei Unterschied erscheint 1.5s nach Start ein Toast ("Neue Features — Tippe um das Changelog zu öffnen", verschwindet nach 6s) (`init.js:133-154`). Öffnen des Changelogs markiert die aktuelle Version sofort als gesehen.

### 2.9 Gruppen-Switcher

Datei: `js/tabs.js:155-277`.
- **Logo-Klick** (`toggleGroup`) — bei genau 2 Gruppen: direkter Toggle zur jeweils anderen.
- **Burger-Menü** (`#group-burger-btn`, nur sichtbar bei >2 Gruppen im Projekt) — Dropdown-Liste aller Gruppen mit Checkmark bei aktiver Gruppe.
- Gruppenwechsel: aktualisiert `localStorage.filmkritiker_group`, Body-Klasse für Akzentfarbe, rendert Tracker-Rotation + aktiven Tab neu, stellt Filter-Panel-Zustand (`controls-extra` collapsed/offen) pro Gruppe+Tab aus `localStorage` wieder her.

### 2.10 "Ähnliche Filme"-Feature (Similar/Empfehlungen)

Datei: `js/similar.js`.
- Datenquelle: **Trakt.tv** (`trakt_related`-Action in `tmdb.php`, ersetzt frühere TMDB-Similar/Recommendations-Kombination — Changelog 2026-04-03), bis zu 40 Empfehlungen, ergebnis-gecacht pro TMDB-ID (`_similarCache`).
- Darstellung: Poster-Grid (kein 3D-Carousel mehr — durch Grid ersetzt, Changelog 2026-04-03), mit "gesehen"-Auge-Icon falls bereits in Bibliothek des Nutzers.
- Streaming-Filter-Toggle (TV-Icon oben rechts) mit Flatrate/Leihen/Kaufen-Pills.
- Klick auf Kachel → `openSimilarDetail` → Detail-Overlay (mit vollen Aktions-Buttons falls Film schon in Bibliothek der aktiven Gruppe, sonst Zur-Watchlist/Direkt-Bewerten-Flow).
- Dieselbe Grid-Komponente (`renderMovieGrid`) wird auch für Regisseur-, Schauspieler- und Studio-Filmografien wiederverwendet (unterschiedlicher `cacheKey`-Präfix: `_director_`, `_actor_`, `_studio_`).

### 2.11 Action-Menu auf Karten

Es gibt **kein separates Kontextmenü** (z.B. Long-Press-Menü) mehr — Karten sind direkt klickbar und öffnen das Detail-Overlay, welches alle Aktionen (Bewerten/Bearbeiten/Ähnliche/Löschen/Filmreihe) als fixierte Buttonleiste unten zeigt. Der Changelog erwähnt historisch ein "Action-Menü (⋮)" (2026-03-30), das aber inzwischen durch das Detail-Overlay ersetzt wurde — für den Rewrite ist NICHT von einem separaten Kontextmenü auszugehen, sondern von Card-Click → Detail-Overlay mit Action-Bar.

### 2.12 News-Tab

Datei: `js/news.js`, Backend `news.php`.
- Feed aggregiert 4 Quellen: KinoCheck, Den of Geek, RogerEbert.com, Bloody Disgusting (RSS, serverseitig gecacht, `news.php` — je Quelle eigene Cache-Datei + TTL + Kategorie-Exclusions).
- Karten-Liste: Bild (mit Lade-Spinner-Overlay, Lazy-Fade-in), Datum, Quellen-Logo, Titel, Kurzbeschreibung (HTML-gestrippt), Autor/Urheber falls vorhanden.
- Artikel-Detail: Vollbild-Overlay mit sanitisiertem HTML-Inhalt (`_sanitizeNewsHtml` entfernt `<script>`, iframes, Social-Embeds, inline `on*`-Handler, `javascript:`-URLs, style-Attribute; relative Links/Bilder werden zur Quelldomain aufgelöst; Bildorientierung Landscape/Portrait wird per `naturalWidth`/`naturalHeight` erkannt), "Zum Artikel"-Button öffnet Originalquelle in neuem Tab.
- Für Quellen ohne eigenes Bild (RogerEbert, Bloody Disgusting) wird ein TMDB-Backdrop anhand des im Titel erkannten Filmnamens nachgeladen und gecacht (`fetchTmdbBackdrop`).
- Komplett per Feature-Flag deaktivierbar (Settings → Darstellung).

### 2.13 Sonstige Overlays

- **Notification-blocked-Hinweis** (`showNotificationBlockedHint`, `settings.js:74-111`) — eigenständiges Overlay außerhalb des normalen Modal-Systems (`#notif-blocked-hint`), zeigt plattformspezifische Anleitung (iOS/Android/Desktop) wenn Push-Berechtigung zuvor verweigert wurde.
- **Lösch-Bestätigungsdialoge** für Watchlist- und Tagebuch-Filme (jeweils eigener, aber strukturell identischer Dialog: Warnung + "Ja, entfernen"/"Abbrechen").
- **Bereits-gesehen-Bestätigung** beim Hinzufügen eines Duplikats (siehe 2.2).
- **Bewertungen-Ansicht (read-only)** (`openRatingsViewModal`, `ratings.js:430-469`) — reine Anzeige aller Mitgliederbewertungen, aktuell keine sichtbare Einstiegsstelle im UI gefunden (evtl. Legacy/nicht mehr verlinkt).

---

## 3. API-Actions (`api.php`, `tmdb.php`, `news.php`)

Alle `api.php`-Actions: `GET/POST api.php?action=<name>&project=<projectId>` (Projekt-Parameter zusätzlich im POST-Body möglich). Response-Envelope immer `{ok: true, data: ...}` oder `{ok: false, error: "..."}`. Auth: Cookie-Check via `fk_check_project_auth()`, liefert `401` mit JSON-Body bei fehlendem/ungültigem Cookie (Frontend: `api.js:18-21` redirected dann zu `login.php`).

| Action | Methode | Zweck | Wichtige Request-Felder | Response `data` | Aufrufende UI-Feature(s) | Cache-Invalidierung |
|---|---|---|---|---|---|---|
| `getWatchlist` | GET `?group=` | Alle Filme (Watchlist+Tagebuch) einer Gruppe inkl. Genres, Ratings, Liked, SeenAt, RatedAt, Zahlungsinfo | — | Array von Movie-Objekten (siehe Feldliste unten) | Watchlist, Tagebuch, Tracker, Details, Similar, Add-Modal (alle Kern-Views) | wird gecacht via `fetchMovies()`/`cache.movies[group]` |
| `addMovie` | POST | Film zur Watchlist hinzufügen (inkl. Genre-/Movie-Insert, Null-Rating-Zeilen je Mitglied, Push an andere Mitglieder) | group, id, name, releaseDate, poster, overview, genres[], tmdbId, voteAverage, runtime, director, directorId, member, myEndpoint | `{id, watchlistId}` | Add-Movie-Modal, Direkt-Bewerten | `invalidateCache('movies', group)` |
| `deleteMovie` | POST | Film aus Watchlist/Tagebuch der Gruppe entfernen (cascade löscht Ratings) | group, movieId | `{deleted:true}` | Lösch-Dialog (Watchlist+Tagebuch) | `invalidateCache('movies', group)` |
| `updateMovieMeta` | POST | TMDB-Metadaten eines Films aktualisieren (Poster/Datum/TMDB-ID/Score/Laufzeit/Regie/Genres) | movieId, beliebige Teilmenge der Felder | `{updated:true}` | Details-Overlay (Genre-Nachladen), Settings "TMDB Daten aktualisieren" | `invalidateCache('movies', group)` bzw. `'all'` |
| `editMovie` | POST | Film bearbeiten: Name/Datum, optional Ratings-Batch, Liked, `ratedAtUpdate` (seenAt), Zahlung (`paidByMemberName`/`paidAt`) | movieId, group?, name?, releaseDate?, ratings{}?, liked?, member?, ratedAtUpdate{member,date}?, paidByMemberName?, paidAt? | `{updated:true}` | Watchlist-Bearbeiten, Tagebuch-Bearbeiten-Dialog | `invalidateCache('movies', group)` |
| `toggleLike` | POST | "Mag ich"-Herz für ein Mitglied setzen/entfernen (UPSERT) | movieId, group, member, liked (bool) | `{liked: bool}` | Detail-Overlay Like-Toggle | `invalidateCache('movies', group)` |
| `rateMovie` | POST | Bewertung(en) setzen (Batch über Mitglieder), optional Liked, `ratedAtUpdate`, Zahlungszuordnung; löst Push nur bei Erstbewertung (NULL→Wert) aus | group, movieId, ratings{member:rating}, myEndpoint, liked?, member?, ratedAtUpdate{member,date}?, paidByMemberName? | `{rated:true}` | Rating-Dialog, Direkt-Bewerten, Einzelbewertung | `invalidateCache('movies', group)` |
| `setPayment` | POST | Zahlung für einen Film manuell setzen | group, movieId, memberName, paidAt | `null` | Tracker (Inline-Formular, Zahlungs-Modal) | `invalidateCache('movies', group)` |
| `deletePayment` | POST | Zahlung zurücksetzen | group, movieId | `null` | Tracker (Löschen-Bestätigung) | `invalidateCache('movies', group)` |
| `subscribePush` | POST | Push-Subscription für Gruppe registrieren/aktualisieren (UPSERT) | endpoint, keys{p256dh,auth}, group, member_name | `true` | Settings → Benachrichtigungen Toggle, Auto-Resubscribe beim Start | `localStorage.filmkritiker_notif_groups` aktualisiert (kein API-Cache) |
| `unsubscribePush` | POST | Push-Subscription für Gruppe entfernen | endpoint, group | `true` | Settings → Benachrichtigungen Toggle | wie oben |
| `getSubscriptions` | GET `?endpoint=` | Liste der Gruppen, für die dieser Push-Endpoint abonniert ist | — | `string[]` (group ids) | Settings-Öffnen (Checkbox-Vorbelegung), Migrations-Logik beim Start | — |
| `getVapidPublicKey` | GET | VAPID Public Key für `pushManager.subscribe()` | — | string | Push-Subscribe-Flow | — |
| `getSubscriptionMembers` | GET | Alle Mitgliedernamen mit aktiver Subscription im Projekt | — | `string[]` | (aktuell keine erkennbare Frontend-Nutzung — evtl. für künftige Admin-Funktion) | — |
| `sendTestPush` | POST | Test-Push an alle Subscriptions eines Mitglieds senden | memberName | `{sent, failed, errors[]}` | Settings → Benachrichtigungen "Test-Benachrichtigung" (nur Admin-Modus) | — |
| `createFeatureRequest` | POST | Linear-Ticket erstellen (inkl. Bild-Upload via Linear GraphQL File-Upload) | title, description, images[] (base64) | `{id, title, url}` | Feature-Request-Formular | — |
| `getProjectGroups` | GET | Alle Gruppen des aktuellen Projekts (sortiert) | — | `[{id,name}]` | Gruppen-Switcher, Settings-Benachrichtigungen, Tracker-Personen | `_projectGroups`-Cache in `api.js` |
| `getProjectMembers` | GET | Alle Mitglieder des Projekts | — | `[{id,name}]` | (Fallback/Zukunft — `GROUPS`-Konstante ist noch der primäre Weg für Mitgliederlisten; Kommentar in `api.js:4` markiert `GROUPS` als "Temporary shim") | `_projectMembers`-Cache |
| `getGroupMembers` | GET `?group=` | Mitglieder einer spezifischen Gruppe (sortiert) | — | `[{id,name}]` | (aktuell keine erkennbare direkte Frontend-Nutzung gefunden — evtl. für Multi-Gruppen-Erweiterung vorbereitet) | — |
| `createGroup` | POST | Neue Gruppe im Projekt anlegen (inkl. automatische Mitgliederzuordnung + Rotation-Init) | name | `{id, name}` | `createGroupFromUI()` (Funktion existiert, aktuell kein sichtbarer Menüpunkt im Standard-Settings-Flow) | `invalidateCache('all')` |
| `updateProjectName` | POST | Projektnamen ändern | name | string (neuer Name) | Settings → Allgemein | `localStorage`-Cache des Projektnamens aktualisiert |

**`getWatchlist`-Movie-Objekt-Felder (zentrale Datenstruktur):**
```
id, tmdbId, voteAverage, name, releaseDate, poster, overview, runtime, director, directorId,
addedAt, paidByMemberId, paidByName, paidAt, genres[],
ratings{member: number|null}, ratedAt{member: datetime|null}, seenAt{member: date|null}, liked{member: bool}
```

### `tmdb.php` (TMDB-Proxy, GET-only, kein Auth-Check — nur über App erreichbar mit Referrer)

| Action / Param | Zweck |
|---|---|
| `?query=` (kein action) | Filmsuche, DE+EN gemerged, EN-Titel-Fallback wenn keine DE-Übersetzung |
| `movie_id=` (kein action) | Legacy Watch-Providers (Rohdaten TMDB) |
| `action=providers_list` | Alle DE-Flatrate-Provider (für Streaming-Dienste-Auswahl) |
| `action=trakt_related&tmdb_id=` | Ähnliche Filme via Trakt.tv API |
| `action=collection&collection_id=` | Filmreihen-Teile |
| `movie_id=&action=providers` | Watch-Provider für einen Film |
| `action=search_person&query=` | Personen-Suche (Regisseur/Schauspieler-Autocomplete) |
| `action=person_movies&person_id=`/`person_name=` | Filmografie eines Schauspielers |
| `action=director_movies&person_id=`/`person_name=` | Filmografie eines Regisseurs (aus Crew gefiltert) |
| `action=search_company&query=` | Studio/Firmen-Suche |
| `action=studio_movies&company_id=&page=` | Filme eines Studios (paginiert) |
| `movie_id=&action=credits` | Cast + Crew |
| `movie_id=&action=release_dates` | Deutsche Release-Daten (Kino/Digital/TV-Priorität) |
| `movie_id=&action=details` | Filmdetails (Laufzeit, Genres, Collection-Info, Vote-Average) |
| `movie_id=&action=videos` | Trailer/Teaser (YouTube) |

### `news.php` (GET, kein Parameter)
Liefert `{ok:true, data:[{id, title, link, pubDate, description, image, content, source, author, media_credit}]}`, sortiert nach `pubDate` absteigend, serverseitig RSS-gecacht mit TTL pro Quelle.

---

## 4. Cross-Cutting Features

### 4.1 Auth-Flow

- Cookie-basiert, **pro Projekt eigenes Cookie** (`fk_auth_<projectId>`, HMAC-SHA256 über `AUTH_SECRET`), 365 Tage Gültigkeit, `SameSite=Lax` (bewusst nicht `Strict` — iOS Safari blockiert Strict-Cookies bei OS-initiierten Navigationen wie PWA-Start vom Homescreen; Bugfix 2026-05-16, `auth.php:31-47`).
- Zusätzliches Cookie `fk_last_project` merkt zuletzt genutztes Projekt für automatischen Redirect bei Direktaufruf ohne `?project=`.
- Nutzerauswahl: eigenes Cookie `fk_user_<projectId>` (nicht httpOnly — vom Client lesbar/schreibbar), gemerkt vom Login-Formular als Dropdown-Vorauswahl.
- **`index.php` refresht das Auth-Cookie bei JEDEM erfolgreichen Laden** (`fk_set_project_cookie($projectId)`), um Ablauf durch iOS ITP (7-Tage-Regel für JS-gesetzte/nicht genutzte Cookies) zu umgehen (Bugfix "iOS PWA auth persistence — static cookie path and session refresh on load").
- Lokal: `DISABLE_AUTH=1` in `.env` deaktiviert die gesamte Auth-Prüfung; `index.php` wählt dann automatisch das erste Projekt-Mitglied als `currentUser`.
- Admin-Session separat: `fk_admin`-Cookie (1h Gültigkeit, `SameSite=Strict`), schaltet zusätzliche UI-Elemente frei (TMDB-Bulk-Update, Test-Push, Admin-Badge im Header).
- API-Requests bei `401` → Redirect zu `login.php?project=...` (`api.js:18-21`).

### 4.2 Push Notifications (VAPID)

- Subscribe-Flow: `Notification.requestPermission()` → `pushManager.subscribe()` mit VAPID Public Key (`getVapidPublicKey`) → `subscribePush`-API pro Gruppe einzeln.
- **Pro Gruppe separat abonnierbar** (nicht global) — `localStorage.filmkritiker_notif_groups` merkt lokal, für welche Gruppen abonniert wurde.
- **Auto-Resubscribe beim App-Start**: Falls Subscription abgelaufen aber Gruppen in `localStorage` gemerkt sind, wird automatisch neu abonniert ohne Nutzerinteraktion (`init.js:208-239`).
- **Einmalige Migration** für Bestandsinstallationen ohne `localStorage`-Eintrag: liest bestehende Subscriptions aus der DB (`getSubscriptions`) und speichert sie nach.
- Notification-Trigger (serverseitig): neuer Watchlist-Eintrag (an alle außer Hinzufügendem via `myEndpoint`-Ausschluss), Erstbewertung (an alle außer sich selbst, mit/ohne CTA je nachdem ob Empfänger selbst schon bewertet hat), Kinostart-Reminder (14/7/1 Tag vorher + Tag selbst + Neuzugänge < 14 Tage, via `cron-releases.php`), neues Kinostartdatum gefunden (Cron aktualisiert `NULL`-Releasedaten täglich automatisch).
- Deep-Links: Notification-`url` enthält `?project=&tab=&group=&movie=` — beim Klick öffnet/fokussiert die App den richtigen Tab/Film (`sw.js` `notificationclick` → `postMessage` an offene Tabs oder `clients.openWindow`).
- Abgelaufene/ungültige Subscriptions werden serverseitig bei fehlgeschlagenem Push automatisch aus der DB gelöscht.
- Blockierte Browser-Permission zeigt plattformspezifische Anleitung (iOS/Android/Desktop) statt stillem Fehlschlag.

### 4.3 PWA-Installierbarkeit

- `manifest.json`: `start_url: ./index.php`, `display: standalone`, Icons 192/512 (any + maskable).
- `sw.js`: **Sehr minimaler Service Worker — KEINE Offline-Caching-Strategie, kein `fetch`-Handler.** Ausschließlich für: sofortige Aktivierung (`skipWaiting`+`clients.claim`), Push-Empfang/-Anzeige, Notification-Klick-Routing, und ein `sw-updated`-Broadcast an alle Tabs beim Update (Frontend zeigt dann Toast + Reload nach 1s, aber nur wenn App bereits >3s offen war — verhindert Reload-Loop bei frischem Ladevorgang).
- iOS-PWA-Erkennung: `matchMedia('(display-mode: standalone)')` bzw. `navigator.standalone` + UA-Sniffing für iPad/iPhone/iPod → `<html class="ios-pwa">` (steuert z.B. Safe-Area-Anpassungen in `responsive.css:235-240`).
- Für den Rewrite als native Cross-Platform-App relevant: **Offline-Fähigkeit ist aktuell NICHT vorhanden** — alle Daten werden live vom Server geladen (nur `cache.movies[group]` als In-Memory-Session-Cache, kein persistentes Offline-Storage).

### 4.4 "Mag ich" / Like-Feature

- Neuestes Feature (Changelog 2026-06-13), pro Nutzer unabhängig (`watchlist_ratings.liked` Spalte, Teil derselben Zeile wie das Rating).
- Setzbar: im Rating-Dialog (Herz-Button neben Sternen), im "Film bearbeiten"-Dialog (Tagebuch), NICHT im "Direkt Bewerten"-Dialog (kein Herz-Button dort implementiert — zu prüfen, ob gewollt oder Lücke).
- Anzeige: Tagebuch-Karte (Badge links neben Ø-Stern), Tagebuch-Grid (Icon rechts neben Sternen), Detail-Overlay (Herz neben TMDB-Badge, **dort nur Anzeige+Toggle, keine Bewertungsfunktion**).
- **Löschen einer Bewertung setzt auch das Like zurück** (`resetEditRating`/`resetRating`).
- Eigener Diary-Filter "Mag ich ♥" zeigt nur gelikte Filme des aktuellen Nutzers.
- API: `toggleLike` (dedizierte UPSERT-Action) sowie `liked`-Feld als Teil von `rateMovie`/`editMovie`-Payload.

### 4.5 Sterne-Rating (0–5, DECIMAL 2,1)

- Halbstern-Genauigkeit (0.5-Schritte), clientseitig berechnet aus Klick-X-Position relativ zur Sternbreite.
- `NULL`/`0` = keine Bewertung (= Watchlist-Status); jeder Wert `>0` verschiebt den Film konzeptionell ins Tagebuch der jeweiligen Person.
- Speicherung: `watchlist_ratings.rating DECIMAL(2,1)`, pro `(watchlist_id, member_id)` eindeutig (UPSERT via `ON DUPLICATE KEY UPDATE`).
- Anzeigekonvention: volle Sterne bei `rating >= i`, Halbstern bei `rating >= i-0.5`, sonst leer (`renderStarsStatic`/`renderReadOnlyStars`, identische Logik dreifach dupliziert in `render.js`, `ratings.js`, `movie.js` — Rewrite-Kandidat für Konsolidierung).

### 4.6 Changelog-System

Siehe 2.8. Wichtig für Rewrite: rein clientseitiges statisches Array + Versions-String-Vergleich, kein Server-Endpoint. Ob die ~130 historischen Einträge 1:1 migriert werden müssen, ist eine Produktentscheidung — sie dokumentieren aber wertvolle implizite Anforderungen (siehe Abschnitt 6).

### 4.7 Material-Symbols-Icon-System

- Google Fonts "Material Symbols Rounded", variable Font-Achsen (`opsz,wght,FILL,GRAD`).
- **Whitelist-Zwang:** Jedes verwendete Icon muss im `icon_names=`-Parameter zweier `<link>`-Tags in `index.html:17-18` enthalten sein, **strikt alphabetisch sortiert** — Reihenfolgefehler brechen ALLE Icons der App (Google Fonts API-Eigenheit). Für den Rewrite mit nativer Icon-Library (z.B. gebündelte SVG/Vektor-Icons) entfällt dieses Problem strukturbedingt, aber die **vollständige Icon-Liste muss migriert werden** (aktuell: add, arrow_back, arrow_forward, attach_file, auto_stories, bookmark, check, check_circle, close, delete, edit, expand_more, favorite, favorite_border, fullscreen, fullscreen_exit, grid_view, group_add, logout, menu, more_vert, movie, newspaper, notifications, notifications_off, palette, payments, person, play_arrow, progress_activity, save, search, send, settings, star, star_border, star_half, theaters, tune, tv, tv_off, view_agenda, view_carousel, view_list, visibility).
- Gefüllte Variante (`font-variation-settings: 'FILL' 1`) wird selektiv für "aktive" Icon-Zustände verwendet (z.B. Bewerten-Stern, Like-Herz aktiv, Speichern-Icon).

### 4.8 Responsive-Breakpoints

- Nur **ein** Breakpoint: `max-width: 480px` (`css/responsive.css:2`) — darunter: Vollbild-Layout ohne Body-Scroll, fixierte Bottom-Tab-Bar mit Safe-Area-Padding, kompakter Header.
- Zusätzliche Anpassungen für Touch-Geräte via `@media (pointer: coarse)` (verhindert "stuck hover" auf Buttons, `css/overlays.css:276`) und `@media (hover: none)` (`css/header.css:55`).
- `env(safe-area-inset-bottom)` durchgängig für iOS-Notch/Home-Indicator berücksichtigt (Tab-Bar, Modal-Action-Buttons, Toast-Position).
- Die App ist faktisch **Mobile-Only designt** — für eine native Cross-Platform-App ist das ohnehin der Zielzustand, es gibt kein separates Desktop-Layout von Bedeutung.

### 4.9 Toast-Notifications (`showStatus`)

`js/api.js:56-70`: Zentrale Funktion `showStatus(msg, isError, icon)` — fixierte Toast-Box unten (80px vom unteren Rand), Glass-Effekt, optional Icon links, automatisches Fade-in/-out (2.5s normal / 3.5s bei Fehler), rot bei Fehler sonst Akzentfarbe. Wird von praktisch jeder mutierenden Aktion sowie von API-Fehlern automatisch aufgerufen (`api()`-Wrapper ruft `showStatus(json.error, true)` bei `!json.ok`).

### 4.10 Navigation / Back-Stack-Verhalten

- **Kein Router** — ein globaler Array-Stack `_navStack` (`state.js:19`) speichert Closures, die den vorherigen Modal-Inhalt wiederherstellen (`document.getElementById('edit-modal').innerHTML = savedHtml`). `navBack()` poppt und führt aus; ohne Stack-Eintrag schließt `closeEdit()` das Overlay komplett.
- **Tab-Wechsel leert immer den Nav-Stack** (`switchTab()`, `tabs.js:126` `_navStack.length = 0`) — Bugfix "clear nav stack when switching tabs to prevent stale back navigation" (Commit `5ad0a19`): verhindert, dass ein "Zurück" nach Tab-Wechsel in einen inkonsistenten/verwaisten Modal-Zustand eines anderen Tabs führt.
- **Browser-History-Integration:** Beim Öffnen des Overlays wird `history.pushState()` aufgerufen (via `MutationObserver` auf die `visible`-Klasse); native Zurück-Geste/Android-Back-Button poppt dann den Nav-Stack statt die App zu verlassen (`init.js:1-18`, `_historyModalOpen`/`_historyPopTriggered`-Flags verhindern Doppel-Trigger).
- **Swipe-Gesten:** horizontaler Swipe zwischen Tabs (min. 60px, überwiegend horizontal, deaktiviert wenn Modal offen oder Touch auf Carousel), Swipe nach rechts im offenen Modal (min. 80px) = zurück/schließen (deaktiviert über `.credits-cast`-Bereich um horizontales Scrollen der Besetzung nicht zu stören).
- Für den Rewrite mit echtem nativem Navigations-Stack (React Navigation o.ä.) ist dieses Verhalten 1:1 nachzubilden: Detail→Ähnliche→Detail-Verschachtelung, Settings-Unterseiten, Collection-Filmreihe→Teil-Detail, etc. — alles funktioniert aktuell als LIFO-Stack von "wiederherstellbaren" Screens, nicht als URL-Routen.

### 4.11 Inline-onclick-Escaping-Pattern

Rewrite-irrelevant für Implementierung (kein `innerHTML`-basiertes Rendering mehr nötig), aber wichtig als **Beleg dafür, dass Film-/Personen-/Studionamen beliebige Sonderzeichen inkl. Apostrophe, Anführungszeichen, Zeilenumbrüche enthalten können** — muss im neuen State-/Formular-Handling ebenfalls robust gehandhabt werden (keine Escaping-bezogenen Annahmen über "sichere" Namen treffen). Drei Hilfsfunktionen in `js/utils.js`: `escapeHtml` (sichtbarer Text), `escapeAttr` (HTML-Attribute), `escapeJs` (JS-String-Literal in inline-Handler).

### 4.12 Feature-Flags (News/Tracker)

`js/features.js` + `localStorage` (`filmkritiker_feature_news`, `filmkritiker_feature_tracker`, Default beide aktiv). Steuert:
- Sichtbarkeit der Tab-Buttons via Body-Klassen `feature-news-hidden`/`feature-tracker-hidden` + CSS `data-feature`-Attribute.
- `switchTab()` leitet automatisch auf Watchlist um, falls Ziel-Tab durch Flag versteckt ist.
- Zahlungssektion in Rating-/Edit-Dialogen wird ausgeblendet, wenn Tracker-Feature deaktiviert ist (`data-feature="tracker"` in `buildPaymentSection`).
- Wird **pro Gerät** (localStorage), nicht pro Account gespeichert.

### 4.13 Multi-Projekt-System (nur relevant falls Rewrite dieses Konzept beibehalten soll)

- `window.CURRENT_PROJECT`/`PROJECT_NAME` werden von `index.php` in die Seite injiziert.
- Jedes Projekt hat eigenen Projektnamen, Passwort-Hash, Gruppen, Mitglieder — `projects`, `project_groups` Tabellen zusätzlich zum in `CLAUDE.md` dokumentierten Schema.
- Login läuft über `?project=<slug>`, Projekt-Login-Formular fragt zuerst Projekt-ID, dann Nutzer+Passwort ab.
- `admin.php`, `setup.php`, `migrate.php`, `create-guberac.php` existieren als Backend-Infrastruktur für Projekt-Verwaltung — **nicht im Detail analysiert**, da außerhalb des Kern-Scopes der Familien-App-Nutzung, aber als Deploy-Artefakte vorhanden (`.github/workflows/deploy.yml:30`).
- **Für den Rewrite der Familien-App entscheidend:** Falls nur `all_three`/`robin_tobias` innerhalb eines festen Projekts relevant sind, kann das Projekt-Konzept vereinfacht/fest verdrahtet werden — die API verlangt aber weiterhin einen `project`-Query-Parameter bei jedem Call (`verifyGroupInProject()`-Check in fast jeder Action).

---

## 5. State-Management (`js/state.js`)

Rein globale, mutable `let`/`const`-Variablen (kein Reducer/Store-Pattern):

```js
let currentProject = '';                 // aktuelles Projekt (aus window.CURRENT_PROJECT)
function getCurrentGroup()               // liest aktive Gruppe direkt aus localStorage
const sortState = {};                    // Tagebuch-Sortierung pro Gruppe
const watchlistFilter = {};              // Watchlist-Sortierung pro Gruppe
const watchlistSearch = {};              // Watchlist-Suchtext pro Gruppe
const watchlistSearchType = {};          // 'film' | 'regisseur' pro Gruppe
const watchlistGenreFilter = {};         // Set<string> pro Gruppe
const watchlistYearFilter = {};          // Set<string> pro Gruppe (max. 1 Eintrag effektiv)
const viewMode = { watchlist: 'card', diary: 'card' }; // 'card'|'grid'|'list', GLOBAL nicht pro Gruppe
const genreFilter = {};                  // Tagebuch Genre-Filter, Set pro Gruppe
const yearFilter = {};                   // Tagebuch Jahr-Filter, Set pro Gruppe
const _navStack = [];                    // Modal-Back-Stack (Closures)
let _similarCache = {};                  // TMDB/Trakt-ID → {similar, recommendations}
const tempRatings = {};                  // Ungespeicherte Sterne-Eingaben während Dialog offen (Key: `${movieId}_${person}`)
const editRatings = {};                  // dito für Edit-Dialog (Key: person)
const tempLiked = {};                    // Ungespeicherter Like-Zustand während Rating-Dialog
const editLiked = {};                    // dito für Edit-Dialog
let _carouselIndex = 0;                  // Legacy (Carousel wurde durch Grid ersetzt)
let _addModalResults = [];               // aktuelle Suchergebnisse im Add-Movie-Modal
let _addModalTimer = null;               // Debounce-Timer
const diaryFilterMode = {};              // 'genre' | 'jahr' pro Gruppe
const yearFilter = {};                   // (Duplikat-Deklaration s.o. — vgl. Datei)
```

Zusätzlich verstreute Modul-lokale State-Variablen: `selectedMovie`, `acTimer`, `_addModalSearchType`, `_addModalStreamingFilter`, `_personAcTimer`, `_studioAcTimer` (`autocomplete.js`), `_providerCache` (`render.js` — TMDB-Watch-Provider pro tmdbId), `_gridStreamingFilter`, `_currentGridData` (`similar.js`), `_collectionStreamingFilter`, `window._collectionParts`, `window._pendingDetailsMovie`, `window._pendingForceAdd`, `window._pendingDirectRate` (`movie.js`/`details.js` — Übergabe von Kontext zwischen Modal-Schritten via `window`-Objekt statt Parameter, da `onclick`-Strings keine komplexen Objekte transportieren können), `_expandedId`, `_cachedMovies` (`tracker.js`).

**Cache-Invalidierung (`js/api.js`):**
- `cache.movies[group]` — In-Memory-Cache für `getWatchlist`-Response pro Gruppe, gefüllt on-demand via `fetchMovies(group)`.
- `invalidateCache('movies', group)` — löscht Cache für genau eine Gruppe; wird nach JEDER mutierenden Aktion (add/edit/delete/rate/like/pay) aufgerufen, gefolgt von einem Re-Render des aktiven Views.
- `invalidateCache('all')` — leert kompletten Movie-Cache + `_projectGroups`/`_projectMembers`; genutzt nach Bulk-TMDB-Update und Gruppen-Erstellung.
- `_projectGroups`/`_projectMembers` — separate Caches für `getProjectGroups`/`getProjectMembers`, invalidiert über `invalidateProjectCache()`.
- **Kein Persistenz-Layer über die Session hinaus** — bei Reload wird alles neu von der API geladen; `localStorage` dient ausschließlich für UI-Präferenzen (Sortierung, Filter, aktiver Tab, Gruppe, Nutzer, Theme, Streaming-Auswahl, Notification-Gruppen, Changelog-Version, Feature-Flags), NICHT für Filmdaten selbst.

**Für den Rewrite empfohlen zu beachten:** Die Trennung "Server-Daten (Movies/Ratings) = ephemer gecacht, re-fetch nach jeder Mutation" vs. "Geräte-Präferenzen = persistent in localStorage" sollte im neuen State-Management (z.B. React Query/TanStack Query für Server-State + AsyncStorage/MMKV für Preferences) 1:1 übernommen werden — inklusive der Tatsache, dass praktisch jede Mutation optimistisch NICHTS macht, sondern strikt: API-Call → Cache invalidieren → kompletten View neu laden/rendern (kein granulares optimistic UI-Update vorhanden).

---

## 6. Wichtige Verhaltens-Constraints aus der Bugfix-Historie (`git log`)

Jede Zeile: Commit → daraus abgeleitete verbindliche Anforderung für den Rewrite.

- `4550aa1` **preserve paid_at when editing/rating movies** → Beim Bearbeiten/Bewerten eines Films darf ein bereits gesetztes Zahlungsdatum NIEMALS stillschweigend auf "heute" zurückgesetzt werden, außer es wird explizit ein neues Datum übergeben oder es existierte noch keins.
- `5ad0a19` **clear nav stack when switching tabs** → Tab-Wechsel muss jeden offenen Modal-Back-Stack/Screen-Stack vollständig zurücksetzen, sonst führt "Zurück" nach Tab-Wechsel zu Geisterzuständen. Im neuen Navigations-Modell: jeder Tab braucht seinen eigenen, beim Tab-Wechsel unabhängigen Navigations-Stack (kein globaler geteilter Stack über Tabs hinweg).
- `8a6631c` **iOS PWA auth persistence — static cookie path and session refresh on load** → Auth-Session darf bei PWA-Start vom Homescreen nach OS-Kill NICHT verloren gehen; Session/Token muss bei jedem App-Start proaktiv verlängert werden, nicht nur bei aktiver Nutzung.
- `40b9938` **"Mag ich" als Diary-Dropdown-Option statt separatem Filter-Button** → UI-Konsolidierung: Like-Filter gehört als Sortier-/Filter-Option ins bestehende Dropdown, nicht als zusätzliches UI-Element.
- `75abb9e` **Star über Heart auf Karte, Heart gleiche Größe wie Dialog-Stars** → visuelle Konsistenz zwischen Karten-Badges und Dialog-Icons ist ein wiederkehrendes QA-Thema — im Rewrite über ein gemeinsames Design-System/Komponenten-Set lösen, nicht pro Screen neu bauen.
- `9698bd2`/`039431e` **Watchlist-Karten-Regression durch Like-Feature, tempLiked muss beim Öffnen vorbelegt werden** → Neue Features dürfen bestehende, unabhängige Views (hier: Watchlist-Karten-Layout) nicht durch geteilten CSS/State beeinflussen; State für ein Dialog-Widget muss beim Öffnen deterministisch aus Serverdaten initialisiert werden, nicht implizit leer bleiben.
- `ac17bb5`/`e9ea76b` **escapeJs für alle onclick-Args in Edit-/Ratings-Overlays** → Alle nutzergenerierten/TMDB-gelieferten Strings (Namen, Titel) müssen konsequent escaped werden, wo immer sie in generierten Code/Strings eingebettet werden — im Rewrite mit deklarativem UI entfällt das Problem strukturell, aber alle Namen sind weiterhin als "beliebiger Text mit Sonderzeichen" zu behandeln (siehe 4.11).
- `e4d07dc` **Streaming-Dienste-Badge zeigt nach navBack nicht aktuellen Stand** → Zurück-Navigation zu einer Einstellungsseite muss deren Anzeige immer aus dem aktuellen persistenten Zustand neu aufbauen, nicht aus einem gecachten/eingefrorenen Render-Snapshot.
- `a3c92df` **leere gecachte Backdrop-URLs werden übersprungen und neu geladen** → Caching-Schicht (hier: News-Backdrop-Cache) muss leere/fehlgeschlagene Ergebnisse von echten Treffern unterscheiden und Neuversuche zulassen.
- `a878e4a` **TMDB-Backdrop-Extraktion nutzt Unicode-Anführungszeichen aus BD-Headlines** → Text-Parsing/Matching gegen externe Quellen (Titel-Matching) muss verschiedene Anführungszeichen-Varianten normalisieren.
- `2ebd417`/`59dd922`/`f9b8dc9`/`cf713de` (mehrere Commits rund um Payment-Sektion in Dialogen) → Die Zahlungs-Zuordnung muss in JEDEM Bewertungs-/Bearbeitungs-Dialog konsistent vorhanden UND korrekt an das jeweilige Feature-Flag (Tracker an/aus) gekoppelt sein; Personen-Button-Selektor-Fehler zeigen, dass die Kopplung zwischen Formular-UI und Save-Logik über CSS-Selektoren fragil war — im Rewrite über typisierten Component-State lösen, nicht DOM-Query zum Auslesen des ausgewählten Zahlers.
- Changelog 2026-06-13 **"Mag ich"-Herz**: pro-Nutzer-Like, unabhängig von anderen Mitgliedern; Löschen der Bewertung setzt auch das Like zurück (siehe 4.4).
- Changelog 2026-05-16 **"Kommt noch" schließt Streaming-verfügbare Filme aus** → Filter-Logik "kommt noch" ist NICHT nur "hat kein Datum oder Datum in Zukunft", sondern schließt explizit bereits streambare Filme aus.
- Changelog 2026-05-16 **Notification-Klick öffnet richtigen Film nur mit `?project=`-Parameter** → Jeder Deep-Link (Push-URL) muss den vollen Kontext (Projekt+Tab+Gruppe+Film) tragen, sonst geht der Zielzustand beim Kaltstart verloren.
- Changelog 2026-05-16 **Push nur bei Erstbewertung, nicht bei Korrektur** → siehe 2.6/API-Tabelle `rateMovie`.
- Changelog 2026-05-12 **"Gesehen am"-Datum getrennt vom Bewertungs-Timestamp** → `seenAt` (wann geschaut) und `ratedAt` (wann die Bewertung eingetragen wurde) sind bewusst getrennte Felder — nicht zusammenfassen.
- Changelog 2026-05-12 **"Weiß nicht"-Datum speichert NULL statt Platzhalter 2020-01-01** → Legacy-Daten können noch den Platzhalter enthalten (Frontend behandelt `2020-01-01` weiterhin als "kein Datum" zur Abwärtskompatibilität, `render.js:280-281`); neue Einträge sollen `NULL` verwenden.
- Changelog 2026-05-12 **Gesehen-Datum eines Nutzers wird nie durch Aktion eines anderen Nutzers überschrieben** → strikte Personenbezogenheit aller Felder in `watchlist_ratings`.
- Changelog 2026-05-09 **Bewerten nur für bereits erschienene (oder streambare) Filme** → siehe 2.6.
- Changelog 2026-05-02 **Cron aktualisiert automatisch DE-Releasedaten für datumslose Filme + sendet Notification bei neuem Datum** → asynchrone Hintergrundaktualisierung ist Teil der erwarteten Funktionalität, nicht nur manueller Bulk-Refresh.
- Changelog 2026-04-27/04-25 (mehrfach) **Zahlungsdatum beim Speichern einer Bewertung übernimmt eingetragenes Sehen-Datum statt "heute"** → konsistent mit `4550aa1`.
- Changelog 2026-04-24 **Tracker zeigt nur explizit bezahlte Filme, nicht "alle bewertet aber unbezahlt"** → siehe 2.1.
- Changelog 2026-04-07 **Apostrophe in Namen brechen sonst JS-Handler** → wieder ein Hinweis auf notwendige robuste String-Behandlung.
- Changelog 2026-04-01 **Single-Table-Modell**: Watchlist/Tagebuch sind KEINE getrennten Datensätze — der Übergang erfolgt ausschließlich über das Vorhandensein einer Bewertung. Kein "Verschieben"-Vorgang. Dies ist eine fundamentale Datenmodell-Entscheidung, die für den Rewrite (Backend bleibt gleich!) zwingend beizubehalten ist: die neue App darf NICHT versuchen, Watchlist/Tagebuch als getrennte Entitäten zu modellieren.

---

## 7. Explizite Non-Goals

Folgende Teile der Codebase bleiben **vollständig unverändert** und werden von der neuen Cross-Platform-App lediglich als bestehende HTTP(S)-API konsumiert:

- `api.php` — komplette REST-API, alle Actions und deren Verhalten (Abschnitt 3) sind als gegebener Vertrag zu behandeln.
- `auth.php` — Cookie-Auth-Mechanismus (Abschnitt 4.1). Die neue App muss sich an dieses Cookie-Schema halten (oder einen äquivalenten Session-Mechanismus über dieselben Endpunkte etablieren) — es wird kein neues Auth-Backend gebaut.
- `login.php` — Login-Flow (Projekt-ID → Nutzerauswahl → Passwort) bleibt serverseitig; die native App muss diesen Flow rein clientseitig nachbilden, ohne den PHP-Login-Screen selbst zu rendern (natives Login-UI, das dieselben Formularfelder/Cookies gegen denselben Endpunkt sendet, oder ein äquivalenter Login-API-Call).
- `tmdb.php` — TMDB/Trakt-Proxy inkl. aller Sonderlogiken (DE+EN-Merge, Release-Date-Prioritäten, Genre-Mapping-Quelle).
- `cron-releases.php` — Server-seitiger Cron für Release-Reminder und automatische DE-Datums-Aktualisierung; läuft unabhängig vom Frontend weiter.
- `db.php` — DB-Connection-Logik (lokal-zuerst, Fallback Prod), Schema (`groups`, `members`, `group_members`, `rotation`, `movies`, `genres`, `movie_genres`, `watchlist`, `watchlist_ratings`, plus Multi-Tenant-Erweiterungen `projects`, `project_groups`) bleibt unangetastet.
- `news.php` — RSS-Aggregation/-Sanitizing-Backend für den News-Tab.
- `sw.js`/sonstige PHP-Dateien außerhalb `index.html`/`js/`/`css/` (`admin.php`, `setup.php`, `migrate.php`, `create-guberac.php`, `logout.php`) — Multi-Tenant-Verwaltungsinfrastruktur, nicht Teil des Kern-Nutzungsflows der Familien-App, bleibt Server-seitig bestehen (Service Worker wird ggf. durch native Push-Handling ersetzt, siehe 4.3).

**Ersetzt werden ausschließlich:** `index.html`, alle Dateien in `js/`, alle Dateien in `css/` — durch die neue Cross-Platform-Mobile-App-Codebase (z.B. React Native / Flutter / Kotlin Multiplatform, je nach Team-Entscheidung), die weiterhin dieselben `api.php`/`tmdb.php`/`news.php`-Endpunkte per HTTP(S) anspricht.
