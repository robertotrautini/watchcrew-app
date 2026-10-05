# Vorläufige Implementierungsentscheidungen (Interim Decisions)

Dieses Dokument protokolliert jede REVERSIBLE, günstig änderbare Implementierungsdetail-Entscheidung, die während der Umsetzung (ab M0) autonom getroffen wurde, ohne vorher beim Nutzer nachzufragen — unter einer expliziten Standing-Autorisierung, die der Nutzer projektbegleitend erteilt hat ("du brauchst von mir keine Gos zwischen den einzelnen Milestones... kannst alles durchimplementieren"). Es ist NICHT für echte Business-Regel-/Architekturentscheidungen gedacht, bei denen bereits gestoppt und nachgefragt wurde (wie z.B. das M1-Datenbankschema, das der Nutzer explizit freigegeben hat) — sondern nur für die kleineren "vertretbarer Entscheid, dokumentiert, geht weiter"-Fälle.

Zweck: Nach vollständiger Implementierung der App geht der Nutzer dieses Dokument komplett durch und bestätigt jeden Eintrag final oder fordert eine Änderung an — jeder Eintrag erklärt bereits, was eine spätere Änderung bedeuten würde, damit der Nutzer Aufwand/Nutzen einer Revision abschätzen kann.

## Inhaltsverzeichnis

- [M2 — Gruppen-Theme-Farbableitung (5 Nicht-Gold-Themes)](#m2--gruppen-theme-farbableitung-5-nicht-gold-themes)
- [M2 — Card-Hintergrund-Token-Wahl](#m2--card-hintergrund-token-wahl)
- [M2 — Sheet/Modal: Implementierung via React-Native-`Modal` statt custom Animated/Gesture-Library](#m2--sheetmodal-implementierung-via-react-native-modal-statt-custom-animatedgesture-library)
- [M2 — Sheet: reduzierter Blur auf kleinen Screens ist ein Platzhalter](#m2--sheet-reduzierter-blur-auf-kleinen-screens-ist-ein-platzhalter)
- [M2 — StarRating: Farbe als Prop statt Selbstauflösung](#m2--starrating-farbe-als-prop-statt-selbstauflösung)
- [M3 — Fallback bei Gruppen-Lookup-Fehler](#m3--fallback-bei-gruppen-lookup-fehler)
- [M3 — Tab-Bar-Akzentfarbe ohne aktive Gruppe](#m3--tab-bar-akzentfarbe-ohne-aktive-gruppe)
- [M4 — TanStack Query staleTime/gcTime-Werte](#m4--tanstack-query-staletimegctime-werte)
- [M4 — EAS Dev Client wird nötig (kein Entscheid, sondern ein Fakt zur Kenntnisnahme)](#m4--eas-dev-client-wird-nötig-kein-entscheid-sondern-ein-fakt-zur-kenntnisnahme)
- [M5 — Suchfeld-Scope (nur lokaler Filter, kein TMDB-Add-Autocomplete)](#m5--suchfeld-scope-nur-lokaler-filter-kein-tmdb-add-autocomplete)
- [M5 — Kein Film/Regisseur-Umschalter im Watchlist-Suchfeld](#m5--kein-filmregisseur-umschalter-im-watchlist-suchfeld)
- [M5 — Geteiltes Suchfeld zwischen Watchlist und Tagebuch](#m5--geteiltes-suchfeld-zwischen-watchlist-und-tagebuch)
- [M5 — Empty-State-Copy](#m5--empty-state-copy)
- [M5 — Fuzzy-Suche: Suchfeld + Threshold](#m5--fuzzy-suche-suchfeld--threshold)
- [M5 — "Meine Streaming-Dienste"-Sortierung ist ein Stub (M10-Abhängigkeit)](#m5--meine-streaming-dienste-sortierung-ist-ein-stub-m10-abhängigkeit)
- [M5 — "Kommt noch"-Sortierreihenfolge](#m5--kommt-noch-sortierreihenfolge)
- [M5 — "Aktive Gruppe" = erste Gruppe des Nutzers (Übergangslösung)](#m5--aktive-gruppe--erste-gruppe-des-nutzers-übergangslösung)
- [M5 — "unrated"/"has_ratings" vs. "all_rated"/"missing": rating>0 vs. non-null](#m5--unratedhas_ratings-vs-all_ratedmissing-rating0-vs-non-null)
- [M5 (Fast-Follow) — profiles-Tabelle + Genre-Namen-Join](#m5-fast-follow--profiles-tabelle--genre-namen-join)
- [M6 — Cache-Aside für die neuen TMDB-Detail-Actions: gemeinsame Zeile, eigene Keys](#m6--cache-aside-für-die-neuen-tmdb-detail-actions-gemeinsame-zeile-eigene-keys)
- [M6 — `collection`-Action erfordert sowohl `tmdbId` als auch `collectionId`](#m6--collection-action-erfordert-sowohl-tmdbid-als-auch-collectionid)
- [M6 — Kino-Priorität: Type 3 vor Type 2 als Fallback](#m6--kino-priorität-type-3-vor-type-2-als-fallback)
- [M6 — DE-Übersetzungs-Erkennung für die Suche (title === original_title)](#m6--de-übersetzungs-erkennung-für-die-suche-title--original_title)
- [M6 — Cast-10-Cap wird in der Edge Function angewendet](#m6--cast-10-cap-wird-in-der-edge-function-angewendet)
- [M6 — `search_company`-Scoring: eigene Fuzzy-/Bonus-Gewichte](#m6--search_company-scoring-eigene-fuzzy-bonus-gewichte)
- [M6 — `trakt_related`: TMDB-ID → Trakt-Slug-Auflösung als Zwischenschritt](#m6--trakt_related-tmdb-id--trakt-slug-auflösung-als-zwischenschritt)
- [M6 — `person_movies`/`director_movies`/`studio_movies` ebenfalls ohne Cache-Aside](#m6--person_moviesdirector_moviesstudio_movies-ebenfalls-ohne-cache-aside)
- [M6 — Studio-Filmografie-Screen: Dedupe-Strategie, Footer-Sichtbarkeit, `movie-detail`-Routenannahme](#m6--studio-filmografie-screen-dedupe-strategie-footer-sichtbarkeit-movie-detail-routenannahme)
- [M6 — Ähnliche-Filme-Screen: kein Poster-/Score-Backfill, `movie-detail`-Routenannahme](#m6--ähnliche-filme-screen-kein-poster-score-backfill-movie-detail-routenannahme)
- [M6 (Teil 2a) — `useMovieDetail`: paralleles Fetching statt kombiniertem Server-Call](#m6-teil-2a--usemoviedetail-paralleles-fetching-statt-kombiniertem-server-call)
- [M6 (Teil 2a) — `useMovieDetailMutations`: Like-Toggle-Pfad, Cache-Invalidierung, Fehlerbehandlung](#m6-teil-2a--usemoviedetailmutations-like-toggle-pfad-cache-invalidierung-fehlerbehandlung)
- [M6 (Teil 2a) — Movie-Detail-Screen: Routen-Contract, Aktionsleisten-Logik, Trailer, UI-Details](#m6-teil-2a--movie-detail-screen-routen-contract-aktionsleisten-logik-trailer-ui-details)
- [M6-Cleanup — `movie-detail`-Routen-Korrektur: echter Pfad, Source-Enum-Mapping, `as never`-Casts entfernt](#m6-cleanup--movie-detail-routen-korrektur-echter-pfad-source-enum-mapping-as-never-casts-entfernt)
- [M6-Cleanup — MovieGrid: Inline-Style-Ausnahme für dynamische Fortschritts-Breite](#m6-cleanup--moviegrid-inline-style-ausnahme-für-dynamische-fortschritts-breite)
- [M6-Cleanup / M7-Vorgriff — `movies`-Tabelle ohne INSERT/UPDATE-RLS: Add-Movie-Mechanismus offen](#m6-cleanup--m7-vorgriff--movies-tabelle-ohne-insertupdate-rls-add-movie-mechanismus-offen)
- [M7 Teil 1 — `upsert_movie`-Action: exakte `movies`-Spalten-Zuordnung, Idempotenz-Ansatz, Genre-Upsert-Strategie](#m7-teil-1--upsert_movie-action-exakte-movies-spalten-zuordnung-idempotenz-ansatz-genre-upsert-strategie)
- [M7 Teil 2b — `paid_at`-Prioritätskette: Einordnung des "Gesehen am"-Datums](#m7-teil-2b--paid_at-prioritätskette-einordnung-des-gesehen-am-datums)
- [M7 Teil 2b — Like-Herz auch im "Direkt Bewerten"-Dialog](#m7-teil-2b--like-herz-auch-im-direkt-bewerten-dialog)
- [M7 Teil 2b — "Einzelbewertung" (`renderRatingOverlayFor`) nicht gebaut](#m7-teil-2b--einzelbewertung-renderratingoverlayfor-nicht-gebaut)
- [M7 Teil 2b — Reset-Button bewegt `rated_at` nicht](#m7-teil-2b--reset-button-bewegt-rated_at-nicht)
- [M7 Teil 2b — Bezahl-Sektion: kein "Zahlung löschen"-Gesture, kein Overwrite bei unverändertem Zahler](#m7-teil-2b--bezahl-sektion-kein-zahlung-löschen-gesture-kein-overwrite-bei-unverändertem-zahler)
- [M7 Teil 2b — Kein neues Datepicker-Package: einfaches TT.MM.JJJJ-Textfeld](#m7-teil-2b--kein-neues-datepicker-package-einfaches-ttmmjjjj-textfeld)
- [M7 Teil 2b — Rating-Mutationen in der bestehenden `movieDetailMutations.ts`, neuer Hook `useSaveRating.ts`](#m7-teil-2b--rating-mutationen-in-der-bestehenden-moviedetailmutationsts-neuer-hook-usesaveratingts)
- [M7 Teil 2b — Erfolgs-/Fehler-Feedback via `Alert.alert`](#m7-teil-2b--erfolgs-fehler-feedback-via-alertalert)
- [M7 Teil 2b — `RatingDialog`-Prop-Zuschnitt](#m7-teil-2b--ratingdialog-prop-zuschnitt)
- [M7-Konsolidierung — `upsert_movie`: optionale `manualReleaseDate`](#m7-konsolidierung--upsert_movie-optionale-manualreleasedate)
- [M7-Konsolidierung — RatingDialog-Einbindung in die Movie-Detail-Overlay-Aktionsleiste](#m7-konsolidierung--ratingdialog-einbindung-in-die-movie-detail-overlay-aktionsleiste)
- [M7-Konsolidierung — Datepicker-Bibliothek: `@react-native-community/datetimepicker`](#m7-konsolidierung--datepicker-bibliothek-react-native-communitydatetimepicker)
- [M8 — `computeNextPayer`-Tie-Break: `joined_at` aufsteigend](#m8--computenextpayer-tie-break-joined_at-aufsteigend)
- [M8 — Zahler-Button-Farben: Wiederverwendung der Gruppen-Theme-Palette statt hartcodiertem 3-Farben-Array](#m8--zahler-button-farben-wiederverwendung-der-gruppen-theme-palette-statt-hartcodiertem-3-farben-array)
- [M8 — Zahlungs-Berechtigungen: jedes Gruppenmitglied darf jede Zahlung bearbeiten/löschen](#m8--zahlungs-berechtigungen-jedes-gruppenmitglied-darf-jede-zahlung-bearbeitenlöschen)
- [M8 — `resolvePaymentDate`-Wiederverwendung mit vereinfachter Kette (kein "Gesehen am"-Fallback)](#m8--resolvepaymentdate-wiederverwendung-mit-vereinfachter-kette-kein-gesehen-am-fallback)
- [M8 — Neuer Hook `useTrackerPayments.ts` statt Erweiterung von `useSaveRating.ts`](#m8--neuer-hook-usetrackerpaymentsts-statt-erweiterung-von-usesaveratingts)
- [M8 — Inline-Löschen-Bestätigung statt Sheet: exakte Copy](#m8--inline-löschen-bestätigung-statt-sheet-exakte-copy)
- [M8 — Inline-Style-Ausnahme für Zahler-Button-Farben](#m8--inline-style-ausnahme-für-zahler-button-farben)
- [M9 Teil 1 — ⚠️ SCHEMA-EBENE: `invite_token`/`invite_enabled` als eigene Spalten statt Primärschlüssel-Wiederverwendung (löst ADR-0003-Mehrdeutigkeit auf)](#m9-teil-1--️-schema-ebene-invite_tokeninvite_enabled-als-eigene-spalten-statt-primärschlüssel-wiederverwendung-löst-adr-0003-mehrdeutigkeit-auf)
- [M9 Teil 1 — Chicken-and-Egg-Lösung: SECURITY-DEFINER-RPCs statt komplexer INSERT-RLS-Policies](#m9-teil-1--chicken-and-egg-lösung-security-definer-rpcs-statt-komplexer-insert-rls-policies)
- [M9 Teil 1 — Fehlercode-Konvention für die neuen RPCs (`WC001`/`WC002`/`WC003`)](#m9-teil-1--fehlercode-konvention-für-die-neuen-rpcs-wc001wc002wc003)
- [M9 Teil 1 — Einladungscode-Eingabefeld: Parsing-Regel für Link vs. rohe Token-UUID](#m9-teil-1--einladungscode-eingabefeld-parsing-regel-für-link-vs-rohe-token-uuid)
- [M9 Teil 1 — Navigation nach Erstellen/Beitreten: expliziter `router.replace` statt Verlass auf `useAuthGate`](#m9-teil-1--navigation-nach-erstellenbeitreten-expliziter-routerreplace-statt-verlass-auf-useauthgate)
- [M9 Teil 1 — Fehlertext-Konvention (generisch vs. Token-spezifisch)](#m9-teil-1--fehlertext-konvention-generisch-vs-token-spezifisch)
- [M9 Teil 2 — "Aktive Gruppe": echter, persistierter State statt "erste Gruppe"](#m9-teil-2--aktive-gruppe-echter-persistierter-state-statt-erste-gruppe)
- [M9 Teil 2 — Invite-Link-Regenerierung: SECURITY-DEFINER-RPC statt clientseitig generierter UUID](#m9-teil-2--invite-link-regenerierung-security-definer-rpc-statt-clientseitig-generierter-uuid)
- [M9 Teil 2 — Deep-Link-Format für den Einladungslink](#m9-teil-2--deep-link-format-für-den-einladungslink)
- [M9 Teil 2 — Bestätigungsmuster für "Entfernen"/"Gruppe verlassen": inline statt Sheet](#m9-teil-2--bestätigungsmuster-für-entfernengruppe-verlassen-inline-statt-sheet)
- [M9 Teil 2 — Gruppen-Umschalter braucht die Namen ALLER Gruppen: neue `getWatchGroupsByIds`/`useGroupNames`](#m9-teil-2--gruppen-umschalter-braucht-die-namen-aller-gruppen-neue-getwatchgroupsbyidsusegroupnames)
- [M9 Teil 2 — `groupDisplayLabel` liegt in `diaryDisplay.ts`, nicht in `groups.ts`](#m9-teil-2--groupdisplaylabel-liegt-in-diarydisplayts-nicht-in-groupsts)
- [M9 Teil 2 — Namensfeld-Sync ohne eigenes Dirty-Tracking](#m9-teil-2--namensfeld-sync-ohne-eigenes-dirty-tracking)
- [M9 Teil 2 — `useLeaveGroup` als eigener Hook statt Wiederverwendung von `useRemoveMember`](#m9-teil-2--useleavegroup-als-eigener-hook-statt-wiederverwendung-von-useremovemember)
- [M9 Teil 2 — Einstiegspunkt für das Group-Settings-Screen: "⚙️"-Button im Tracker-Header](#m9-teil-2--einstiegspunkt-für-das-group-settings-screen-️-button-im-tracker-header)
- [M10 — Realtime-Filterung für `ratings`: unfiltert abonniert, Mitgliedschaft clientseitig geprüft](#m10--realtime-filterung-für-ratings-unfiltert-abonniert-mitgliedschaft-clientseitig-geprüft)
- [M10 — Toast-Trigger-Typen: drei Arten, generische Copy ohne Namen](#m10--toast-trigger-typen-drei-arten-generische-copy-ohne-namen)
- [M10 — Fokus-Tracking-Mechanismus: eigener, nicht-persistierter Store + `useFocusEffect`](#m10--fokus-tracking-mechanismus-eigener-nicht-persistierter-store--usefocuseffect)
- [M10 — Toast-Anzeigedauer](#m10--toast-anzeigedauer)
- [M10 — Toast: kein Tap-to-Navigate](#m10--toast-kein-tap-to-navigate)
- [M10 — Push-Infrastruktur: ⚠️ pg_net direkt statt Database-Webhooks/Queue-Poller, Vault als neuer Secret-Store](#m10--push-infrastruktur-️-pg_net-direkt-statt-database-webhooksqueue-poller-vault-als-neuer-secret-store)
- [M10 — Erstbewertungs-Trigger auf `ratings`: INSERT UND UPDATE, nicht nur UPDATE](#m10--erstbewertungs-trigger-auf-ratings-insert-und-update-nicht-nur-update)
- [M10 — Release-Reminder: Dedup-Log-Tabelle + tägliches pg_cron um 09:00 UTC](#m10--release-reminder-dedup-log-tabelle--tägliches-pg_cron-um-0900-utc)
- [M10 — `push_subscriptions`: zusätzliche Gruppenmitgliedschafts-Prüfung in der RLS-INSERT-Policy](#m10--push_subscriptions-zusätzliche-gruppenmitgliedschafts-prüfung-in-der-rls-insert-policy)
- [M10 — Expo-Push-Zustellbestätigung: nur sofortige Receipt-Prüfung (bekannte Einschränkung)](#m10--expo-push-zustellbestätigung-nur-sofortige-receipt-prüfung-bekannte-einschränkung)
- [M10 — Push-Notification-Copy: Platzhalter-deutsche Texte](#m10--push-notification-copy-platzhalter-deutsche-texte)
- [M10 — Push-Registrierung: kein EAS-Projekt konfiguriert (Fakt zur Kenntnisnahme)](#m10--push-registrierung-kein-eas-projekt-konfiguriert-fakt-zur-kenntnisnahme)
- [M10 — Kein `setNotificationHandler` gesetzt: Koordination mit der parallelen Realtime-Task](#m10--kein-setnotificationhandler-gesetzt-koordination-mit-der-parallelen-realtime-task)
- [M10 — Deep-Link-Routing-Hook in `(app)/_layout.tsx` statt Root-Layout](#m10--deep-link-routing-hook-in-app_layouttsx-statt-root-layout)
- [M10 — `expo-notifications`-Config-Plugin ohne Custom-Icon/Farbe](#m10--expo-notifications-config-plugin-ohne-custom-iconfarbe)
- [M10 — Settings-Hub: Struktur, "Meine Streaming-Dienste"/"Filmtitel in Grid anzeigen" bleiben Geräte-Präferenzen](#m10--settings-hub-struktur-meine-streaming-dienstefilmtitel-in-grid-anzeigen-bleiben-geräte-präferenzen)
- [M10 — Darstellung-Toggle: eigener Pressable-Toggle statt React-Native-`Switch`](#m10--darstellung-toggle-eigener-pressable-toggle-statt-react-native-switch)
- [M10 — Tagebuch-Grid-Titel: Asymmetrie zu Watchlist aufgelöst, indem die Präferenz einen Titel ERGÄNZT statt nur zu verstecken](#m10--tagebuch-grid-titel-asymmetrie-zu-watchlist-aufgelöst-indem-die-präferenz-einen-titel-ergänzt-statt-nur-zu-verstecken)
- [M10 — Changelog: Starter-Array mit einem v1.0.0-Eintrag, Versions-Vergleich als reiner String-Vergleich](#m10--changelog-starter-array-mit-einem-v100-eintrag-versions-vergleich-als-reiner-string-vergleich)
- [M10 — Konto-löschen: JWT-`sub`-Dekodierung ohne eigene Signaturprüfung, Bestätigungsphrase "LÖSCHEN" im Sheet](#m10--konto-löschen-jwt-sub-dekodierung-ohne-eigene-signaturprüfung-bestätigungsphrase-löschen-im-sheet)
- [M10 — "Abmelden"/Konto-Löschung: expliziter `router.replace("/")` statt Vertrauen auf den bestehenden Auth-Gate](#m10--abmeldenkonto-löschung-expliziter-routerreplace-statt-vertrauen-auf-den-bestehenden-auth-gate)
- [M10 — "Benachrichtigungen"-Zeile verlinkt einen Platzhalter-Screen (Abstimmungspunkt mit der parallelen Push-Task)](#m10--benachrichtigungen-zeile-verlinkt-einen-platzhalter-screen-abstimmungspunkt-mit-der-parallelen-push-task)
- [M10 — `.expo/types/router.d.ts` manuell nachgezogen (kein Entscheid, Tooling-Hinweis)](#m10--exportypesrouterdts-manuell-nachgezogen-kein-entscheid-tooling-hinweis)
- [M10 (Nachzügler) — Benachrichtigungen-Screen: echte Umsetzung ersetzt den Platzhalter](#m10-nachzügler--benachrichtigungen-screen-echte-umsetzung-ersetzt-den-platzhalter)
- [M11 Teil 2 — Job 1 (Inaktivitäts-Cleanup): ⚠️ E-Mail-Provider-Frage bleibt bewusst offen; Schema-/Job-/Vault-Entscheidungen drumherum](#m11-teil-2--job-1-inaktivitäts-cleanup-️-e-mail-provider-frage-bleibt-bewusst-offen-schema-job-vault-entscheidungen-drumherum)
- [M11 Teil 2 — Job 2 (Empty-Group-Hard-Delete): `emptied_at`-Spalte, Trigger-/RPC-Erweiterung statt neuer Mechanismen, defensiver Doppel-Check im Cleanup](#m11-teil-2--job-2-empty-group-hard-delete-emptied_at-spalte-trigger-rpc-erweiterung-statt-neuer-mechanismen-defensiver-doppel-check-im-cleanup)
- [M11 Teil 2 — Job 3 (Rechtstexte-Platzhalter): Duplizierte Platzhalter-Konstanten, "Wird bald ergänzt"-Toast, Register-Screen-Ergänzung](#m11-teil-2--job-3-rechtstexte-platzhalter-duplizierte-platzhalter-konstanten-wird-bald-ergänzt-toast-register-screen-ergänzung)
- [M11 Teil 1 — Haptik: ausgewählte Interaktionen und Intensitäten](#m11-teil-1--haptik-ausgewählte-interaktionen-und-intensitäten)
- [M11 Teil 1 — Animation: Toast nur Fade-IN, gestaffeltes Grid-/Karten-Fade-in mit gedeckeltem Stagger](#m11-teil-1--animation-toast-nur-fade-in-gestaffeltes-grid-karten-fade-in-mit-gedeckeltem-stagger)
- [M11 Teil 1 — Keyboard-Avoiding: reine Platform-Funktionen statt gerenderter Prop-Prüfung, Scope auf Login/Register/Sheet](#m11-teil-1--keyboard-avoiding-reine-platform-funktionen-statt-gerenderter-prop-prüfung-scope-auf-loginregistersheet)
- [M11 Teil 1 — Safe-Area: `SafeAreaView` gezielt pro Screen, nicht global](#m11-teil-1--safe-area-safeareaview-gezielt-pro-screen-nicht-global)
- [M11 Teil 1 — StatusBar: fest `style="light"`, nicht `colorScheme`-abhängig](#m11-teil-1--statusbar-fest-stylelight-nicht-colorscheme-abhängig)
- [M3-Nachbesserung (Live-Bug-Fix) — Login: fehlender expliziter `router.replace("/")` nach erfolgreichem Sign-in](#m3-nachbesserung-live-bug-fix--login-fehlender-expliziter-routerreplace-nach-erfolgreichem-sign-in)
- [M3-Nachbesserung (Live-Bug-Fix) — `useAuthGate`: Race Condition bei parallelen `evaluate()`-Aufrufen überschrieb korrekten Zustand](#m3-nachbesserung-live-bug-fix--useauthgate-race-condition-bei-parallelen-evaluate-aufrufen-überschrieb-korrekten-zustand)
- [Datenbank-Nachbesserung (Live-Bug-Fix) — Fehlende Base-Table-GRANTs für `authenticated`/`service_role` auf allen public-Tabellen](#datenbank-nachbesserung-live-bug-fix--fehlende-base-table-grants-für-authenticatedservice_role-auf-allen-public-tabellen)
- [M10-Nachbesserung (Live-Bug-Fix) — `useGroupRealtimeSync`: von mehreren gleichzeitig gemounteten Tabs unabhängig aufgebauter Channel führte zu `.on()` nach `.subscribe()`-Absturz](#m10-nachbesserung-live-bug-fix--usegrouprealtimesync-von-mehreren-gleichzeitig-gemounteten-tabs-unabhängig-aufgebauter-channel-führte-zu-on-nach-subscribe-absturz)
- [M12-Vorbereitung (Live-Bug-Fix) — expo-image: `className` wurde von NativeWind verworfen (Poster mit Größe 0)](#m12-vorbereitung-live-bug-fix--expo-image-classname-wurde-von-nativewind-verworfen-poster-mit-größe-0)
- [M12-Vorbereitung (Live-Bug-Fix) — Gespeicherter Poster-Pfad ohne TMDB-Basis-URL](#m12-vorbereitung-live-bug-fix--gespeicherter-poster-pfad-ohne-tmdb-basis-url)
- [M12-Vorbereitung (Live-Bug-Fix) — Detail-Overlay ignorierte Live-`details` (Titel "Film", kein Poster, Overview leer)](#m12-vorbereitung-live-bug-fix--detail-overlay-ignorierte-live-details-titel-film-kein-poster-overview-leer)
- [M12-Vorbereitung (Live-Bug-Fix) — Release-Datum im Detail-Overlay roh als ISO-Datetime](#m12-vorbereitung-live-bug-fix--release-datum-im-detail-overlay-roh-als-iso-datetime)
- [M12-Vorbereitung (Live-Bug-Fix) — Modal-Header zeigten rohe Routennamen (`add-movie`, `similar/[tmdbId]`)](#m12-vorbereitung-live-bug-fix--modal-header-zeigten-rohe-routennamen-add-movie-similartmdbid)
- [M12-Vorbereitung (Live-Bug-Fix) — Navigation & Header: Watchlist/Tagebuch nicht antippbar, Filmreihe-Referenz ungültig, rohe Header-Titel, Regie/Schauspieler-Taps wirkungslos](#m12-vorbereitung-live-bug-fix-—-navigation--header-watchlisttagebuch-nicht-antippbar-filmreihe-referenz-ungültig-rohe-header-titel-regieschauspieler-taps-wirkungslos)
- [M12-Vorbereitung (Live-Bug-Fix) — Sheets/Dialoge & Datum: durchscheinende Sheets, UTC-Datum, umbrechende Tracker-Datumsspalte, veraltete Action-Bar, Gruppen-Chip nach Umbenennen](#m12-vorbereitung-live-bug-fix-—-sheetsdialoge--datum-durchscheinende-sheets-utc-datum-umbrechende-tracker-datumsspalte-veraltete-action-bar-gruppen-chip-nach-umbenennen)
- [M12-Vorbereitung (Live-Bug-Fix) — Gruppen-Chip nach Umbenennen (`groupNames`) & Regie/Schauspieler-Taps (Mess-Text-Overlay)](#m12-vorbereitung-live-bug-fix-—-gruppen-chip-nach-umbenennen-groupnames--regieschauspieler-taps-mess-text-overlay)
- [M12-Vorbereitung (Live-Bug-Fix) — Datumsformat TT.MM.JJJJ vereinheitlicht, UTC-Reste & YouTube-Trailer Fehler 153](#m12-vorbereitung-live-bug-fix-—-datumsformat-ttmmjjjj-vereinheitlicht-utc-reste--youtube-trailer-fehler-153)
- [M12-Vorbereitung (Live-Bug-Fix) — Erfolgs-Toasts (Gruppe umbenannt, Watchlist, Bewertung, Zahlung)](#m12-vorbereitung-live-bug-fix-—-erfolgs-toasts-gruppe-umbenannt-watchlist-bewertung-zahlung)
- [M12-Vorbereitung (Live-Bug-Fix) — Anzeigename bei Registrierung, Änderung in den Einstellungen, einheitlicher Namens-Fallback](#m12-vorbereitung-live-bug-fix-—-anzeigename-bei-registrierung-änderung-in-den-einstellungen-einheitlicher-namens-fallback)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung „Ähnliche Filme“: Poster/Score serverseitig per TMDB-Anreicherung](#m12-vorbereitung-live-bug-fix-—-nachbesserung-ähnliche-filme-poster-score-serverseitig-per-tmdb-anreicherung)

- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Anzeigenamen-Cache & Toast beim Bearbeiten einer Zahlung](#m12-vorbereitung-live-bug-fix--nachbesserung-anzeigenamen-cache--toast-beim-bearbeiten-einer-zahlung)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Einladungs-Deep-Link, Push-Toggles pro Gruppe, Tracker-Feature-Flag](#m12-vorbereitung-live-bug-fix--nachbesserung-einladungs-deep-link-push-toggles-pro-gruppe-tracker-feature-flag)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Audit: aktive Gruppe in Modals, Tagebuch-Mitgliederzeilen, Push-Tap-Routing, Changelog-Startup-Toast, Gruppenfarbe ändern](#m12-vorbereitung-live-bug-fix--nachbesserung-audit-aktive-gruppe-in-modals-tagebuch-mitgliederzeilen-push-tap-routing-changelog-startup-toast-gruppenfarbe-ändern)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Audit: Streaming-Verfügbarkeit (ADR 0005), „Meine Streaming-Dienste“, Sortierung/Filter pro Gruppe merken](#m12-vorbereitung-live-bug-fix--nachbesserung-audit-streaming-verfügbarkeit-adr-0005-meine-streaming-dienste-sortierungfilter-pro-gruppe-merken)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Passwort vergessen, Auth-Deep-Link (Reset + Signup-Bestätigung)](#m12-vorbereitung-live-bug-fix--nachbesserung-passwort-vergessen-auth-deep-link-reset--signup-bestätigung)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Offline-Stufe 1: Query-Cache-Persistenz (MMKV), Offline-Banner](#m12-vorbereitung-live-bug-fix--nachbesserung-offline-stufe-1-query-cache-persistenz-mmkv-offline-banner)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Erscheinungsdatum pro Gruppe bearbeiten](#m12-vorbereitung-live-bug-fix--nachbesserung-erscheinungsdatum-pro-gruppe-bearbeiten)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Geräte-Test Welle 2: Map-Cache-Absturz, Settings-Aussperrung, Gruppenfarbe, Offline-Kaltstart](#m12-vorbereitung-live-bug-fix--nachbesserung-gerate-test-welle-2-map-cache-absturz-settings-aussperrung-gruppenfarbe-offline-kaltstart)
- [M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Datenquellen-Attribution (Settings), Inline-Style-Audit](#m12-vorbereitung-live-bug-fix--nachbesserung-datenquellen-attribution-settings-inline-style-audit)
- [M12-Vorbereitung — Entscheidung Legacy-Cron "Erscheinungsdatum nachtragen" entfällt, Lazy-Refresh date-loser Filme](#m12-vorbereitung--entscheidung-legacy-cron-erscheinungsdatum-nachtragen-entfällt-lazy-refresh-date-loser-filme)
- [Design-Angleichung Welle 1 — Legacy-Look: Hintergrundfoto, Glas ohne Blur, AppHeader, Tab-Leiste, Icons](#design-angleichung-welle-1--legacy-look-hintergrundfoto-glas-ohne-blur-appheader-tab-leiste-icons)
- [Design-Angleichung Welle 2A — Tracker, Watchlist, Tagebuch](#design-angleichung-welle-2a--tracker-watchlist-tagebuch)
- [Design-Angleichung Welle 2B — Detail-Overlay, Bewertungsdialog, Film hinzufügen](#design-angleichung-welle-2b--detail-overlay-bewertungsdialog-film-hinzufügen)
- [Design-Angleichung Welle 2C — Settings, Changelog, Auth, Onboarding, EmptyState](#design-angleichung-welle-2c--settings-changelog-auth-onboarding-emptystate)
- [Design-Angleichung Geräte-Prüfung](#design-angleichung-geräte-prüfung)
- [Nachbesserung nach Praxistest (UI)](#nachbesserung-nach-praxistest-ui)
- [Nachbesserung nach Praxistest (Plattform)](#nachbesserung-nach-praxistest-plattform)
- [Praxistest-Nachbesserungen Geräte-Prüfung](#praxistest-nachbesserungen-geräte-prüfung)
- [Nachbesserung: Datum in Bearbeiten, Aktionsleiste, Glas](#nachbesserung-datum-in-bearbeiten-aktionsleiste-glas)
- [Echter Blur (expo-blur)](#echter-blur-expo-blur)
- [Glas sichtbar ueber dem Vollfoto-Hintergrund](#glas-sichtbar-ueber-dem-vollfoto-hintergrund)
- [Blur flächendeckend, Sheet ohne Modal](#blur-flächendeckend-sheet-ohne-modal)
- [Geräte-Prüfung final (Blur, Einstellungen, Logos)](#geräte-prüfung-final-blur-einstellungen-logos)
- [Einstellungen neu gegliedert, Logos, Badges, Trailer](#einstellungen-neu-gegliedert-logos-badges-trailer)
- [Glas dunkler (wie Legacy), Settings mit Hintergrundbild, Stern-Zentrierung](#glas-dunkler-wie-legacy-settings-mit-hintergrundbild-stern-zentrierung)
- [Glas-Buttons, 3D-Kante statt Rand, Stern-Zentrierung](#glas-buttons-3d-kante-statt-rand-stern-zentrierung)
- [Tagebuch-Karte: Bewertung als Eck-Badge](#tagebuch-karte-bewertung-als-eck-badge)
- [Kacheln: Poster randlos](#kacheln-poster-randlos)
- [TMDB-Logo im Sheet-Badge, Changelog entfernt](#tmdb-logo-im-sheet-badge-changelog-entfernt)
- [Einheitliche Chips, Besetzung-Rahmen, ruhiger Glas-Hintergrund für Detail-Views](#einheitliche-chips-besetzung-rahmen-ruhiger-glas-hintergrund-für-detail-views)
- [Chips lesbar auf dem Foto, Parallax-Hintergrund](#chips-lesbar-auf-dem-foto-parallax-hintergrund)
- [Speichern als runder Icon-Button hinter Namensfeldern](#speichern-als-runder-icon-button-hinter-namensfeldern)
- [Icons: Material Icons über zentrale Icon-Komponente](#icons-material-icons-über-zentrale-icon-komponente)
- [Einklappbares Filter-Panel (Watchlist, Tagebuch)](#einklappbares-filter-panel-watchlist-tagebuch)
- [Hintergrund v2: Original-Foto, Höhen-Fit, horizontaler Swipe-Parallax](#hintergrund-v2-original-foto-höhen-fit-horizontaler-swipe-parallax)
- [Motion: gestaffeltes Einblenden auch beim Tab-Wechsel](#motion-gestaffeltes-einblenden-auch-beim-tab-wechsel)
- [Flat-Material-Stil, Backdrop-Dimmung, Danger-Styleguide](#flat-material-stil-backdrop-dimmung-danger-styleguide)
- [Verifikations-Workflow: vollständige Maestro-Suite + alle Screenshots nach jeder Änderung](#verifikations-workflow-vollständige-maestro-suite--alle-screenshots-nach-jeder-änderung)
- [Maestro: Use-Case-Bereiche (Areas), schnellere Flows, Animationen aus](#maestro-use-case-bereiche-areas-schnellere-flows-animationen-aus)
- [Toast-Varianten (grün/rot), Touch-Targets (48dp), Bewertungs-Sterne enger](#toast-varianten-grün-rot-touch-targets-48dp-bewertungs-sterne-enger)
- [Brand-Assets: Legacy-Icon, Splash mit Verlauf](#brand-assets-legacy-icon-splash-mit-verlauf)
- [Material-3-Switch (`SwitchIndicator`) und Auth-Links mit lesbarer Farbe](#material-3-switch-switchindicator-und-auth-links-mit-lesbarer-farbe)
- [Toast-X, Loeschen rechts, nativer M3-Switch](#toast-x-loeschen-rechts-nativer-m3-switch)
- [Button-Icons ueberall, Zahler-Hinweis nur im Zahlungs-Modal](#button-icons-ueberall-zahler-hinweis-nur-im-zahlungs-modal)
- [Highlight-Farbe folgt überall dem Gruppen-Theme](#highlight-farbe-folgt-überall-dem-gruppen-theme)
- [Sterne fest gelb, Header weiss, Logo wechselt Gruppe](#sterne-fest-gelb-header-weiss-logo-wechselt-gruppe)
- [Zurück-Wischgeste: Navigations-Stack, Android-BackSwipeView, Ähnliche Filme ersetzt statt stapelt](#zurück-wischgeste-navigations-stack-android-backswipeview-ähnliche-filme-ersetzt-statt-stapelt)
- [ESLint: eslint-config-expo (flat config)](#eslint-eslint-config-expo-flat-config)
- [Tooling — ESLint: `no-require-imports` und `import/first` nur in `__tests__/**` aus](#tooling--eslint-no-require-imports-und-importfirst-nur-in-__tests__-aus)
- [Abmelden: erst nach /(auth)/login navigieren, dann signOut (Android ScreenStackFragment-Crash)](#abmelden-erst-nach-authlogin-navigieren-dann-signout-android-screenstackfragment-crash)
---

## M2 — Gruppen-Theme-Farbableitung (5 Nicht-Gold-Themes)

**Problem/Lücke:** Nur der Gold-Akzentwert war in den Design-Tokens exakt spezifiziert; für Rot/Blau/Grün/Lila/Orange fehlten accentLight/gradient/starColor-Werte.

**Entscheidung (vorläufig):** Formel — accentLight = Akzent 40% Richtung Weiß gemischt (pro RGB-Kanal), gradientStart/End = Akzent ±8 HSL-Lightness-Punkte, starColor = Akzent selbst (kein eigener Sternfarbwert für Nicht-Gold-Themes spezifiziert).

**Warum das später leicht änderbar ist:** Reine Formel/Konstanten in `src/lib/groupTheme.ts`, betrifft nur 5 abgeleitete Hex-Werte pro Theme, keine Strukturänderung nötig.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M2 — Card-Hintergrund-Token-Wahl

**Problem/Lücke:** Sowohl `bg-card` (rgba .5) als auch `bg-glass` (rgba .7) kamen als Kandidat für die Card-Komponente infrage.

**Entscheidung (vorläufig):** `bg-card` gewählt (Name passt semantisch besser für Card-Container, `bg-glass` für schwerere Overlay-Flächen wie Sheets reserviert).

**Warum das später leicht änderbar ist:** Eine className-Zeile in `src/components/ui/Card.tsx`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M2 — Sheet/Modal: Implementierung via React-Native-`Modal` statt custom Animated/Gesture-Library

**Problem/Lücke:** Kein ADR legt fest, wie das Sheet/Modal-System technisch gebaut wird.

**Entscheidung (vorläufig):** Natives RN `Modal` (transparent, slide-Animation) statt eigenem Animated-Stack oder Gesture-Library.

**Warum das später leicht änderbar ist:** Nur `src/components/ui/Sheet.tsx` intern betroffen, öffentliche Props (`visible`, `onClose`, `children`, `title`) bleiben stabil — ein Austausch der Implementierung bräche keine Aufrufer.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M2 — Sheet: reduzierter Blur auf kleinen Screens ist ein Platzhalter

**Problem/Lücke:** Design-Pattern verlangt "Glassmorphism-Blur reduziert auf kleinen Screens für Performance", aber keine echte Blur-View wurde gebaut (nur ein Dimensions-basierter Opacity-Fallback als Stand-in).

**Entscheidung (vorläufig):** `Dimensions.get("window").width < 380` schaltet zwischen `bg-black/50` und `bg-black/70` um — kein echtes `BlurView`.

**Warum das später leicht änderbar ist:** Müsste durch eine echte `expo-glass-effect`/`BlurView`-Integration ersetzt werden, ist als TODO im Code markiert.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M2 — StarRating: Farbe als Prop statt Selbstauflösung

**Problem/Lücke:** Sollte die Komponente `resolveGroupTheme()` selbst aufrufen, oder eine fertige Farbe als Prop bekommen?

**Entscheidung (vorläufig):** Reine Presentational-Komponente, bekommt `starColor` als Prop, Aufrufer löst das Theme auf.

**Warum das später leicht änderbar ist:** Umkehrung würde nur den Aufrufer-Code betreffen, nicht die Kernlogik der Komponente.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M3 — Fallback bei Gruppen-Lookup-Fehler

**Problem/Lücke:** Was soll passieren, wenn die Gruppen-Mitgliedschaftsabfrage beim Auth-Gate fehlschlägt?

**Entscheidung (vorläufig):** Fallback auf 'onboarding'-Zustand (User landet auf "Gruppe erstellen/beitreten"), statt Fehlerzustand oder endlosem Laden.

**Warum das später leicht änderbar ist:** Eine Zeile in `src/hooks/useAuthGate.ts` / `src/lib/authGate.ts`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M3 — Tab-Bar-Akzentfarbe ohne aktive Gruppe

**Problem/Lücke:** Die Tab-Leiste liegt oberhalb jeder einzelnen Gruppen-Theme-Zuordnung — welche Akzentfarbe soll sie zeigen?

**Entscheidung (vorläufig):** `resolveGroupTheme(undefined)` → Gold/Default als Tab-Bar-Akzent, unabhängig von der Gruppe des Nutzers.

**Warum das später leicht änderbar ist:** Ein Funktionsaufruf-Parameter im Tab-Layout.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M4 — TanStack Query staleTime/gcTime-Werte

**Problem/Lücke:** Keine ADR-Vorgabe für konkrete Cache-Zeiten.

**Entscheidung (vorläufig):** staleTime 2 Minuten, gcTime 10 Minuten, retry mit Backoff (max 30s), refetchOnReconnect an.

**Warum das später leicht änderbar ist:** Zwei Zahlenwerte in `src/lib/queryClient.ts`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M4 — EAS Dev Client wird nötig (kein Entscheid, sondern ein Fakt zur Kenntnisnahme)

**Problem/Lücke:** `react-native-mmkv` (Native Modul) läuft nicht in Expo Go — braucht einen eigenen EAS-Dev-Client-Build für echtes Geräte-Testing.

**Entscheidung (vorläufig):** (Keine Umgehung gebaut) — als Hinweis dokumentiert, dass ein Dev-Client-Build irgendwann eingerichtet werden muss.

**Warum das später leicht änderbar ist:** n/a — reine Infrastruktur-To-Do, kein Code-Entscheid.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — Suchfeld-Scope (nur lokaler Filter, kein TMDB-Add-Autocomplete)

**Problem/Lücke:** feature-inventory.md beschreibt sowohl einen reinen Fuzzy-Filter über die Watchlist als auch ein TMDB-Inline-Autocomplete im "Watchlist-Suchfeld" — unklar ob dasselbe Feld gemeint ist.

**Entscheidung (vorläufig):** M5 baut nur den lokalen Fuse.js-Filter; das TMDB-Add-Autocomplete gehört zum Add-Movie-Modal (M7).

**Warum das später leicht änderbar ist:** Falls doch gewünscht, wäre es eine Erweiterung des Suchfelds in M7, keine Änderung an der M5-Logik nötig.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — Kein Film/Regisseur-Umschalter im Watchlist-Suchfeld

**Problem/Lücke:** Alter State-Code hatte ein `watchlistSearchType` ('film'/'regisseur')-Feld ohne zugehörige UI-Beschreibung im Text.

**Entscheidung (vorläufig):** Nicht gebaut, da nirgends als sichtbares UI-Feature beschrieben.

**Warum das später leicht änderbar ist:** Wäre ein neuer Toggle + zweiter Suchmodus in der Such-Logik, additiv nachrüstbar.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — Geteiltes Suchfeld zwischen Watchlist und Tagebuch

**Problem/Lücke:** feature-inventory.md beschreibt kein eigenes Suchverhalten für das Tagebuch.

**Entscheidung (vorläufig):** Gleiche `searchEntries`-Logik in beiden Tabs verwendet.

**Warum das später leicht änderbar ist:** Falls das Tagebuch ein eigenes Suchverhalten braucht, wäre das eine zusätzliche Funktion, keine Änderung der bestehenden.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — Empty-State-Copy

**Problem/Lücke:** Keine dokumentierte Leertext-Copy für leere Watchlist/Tagebuch.

**Entscheidung (vorläufig):** Generische deutsche Platzhaltertexte geschrieben (z.B. "Deine Watchlist ist leer."), ohne Verweis auf noch nicht existierende Features.

**Warum das später leicht änderbar ist:** Reiner Text-String pro Screen-Datei.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — Fuzzy-Suche: Suchfeld + Threshold

**Problem/Lücke:** feature-inventory.md nennt nur "Fuse.js, ab 2 Zeichen", ohne Feldliste oder Score-Parameter.

**Entscheidung (vorläufig):** Suche nur über `movie.name` (Filmtitel), Fuse.js-Threshold 0.4.

**Warum das später leicht änderbar ist:** Konfigurationsobjekt in `src/lib/watchlistLogic.ts`, Feldliste/Threshold sind einzelne Parameter.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — "Meine Streaming-Dienste"-Sortierung ist ein Stub (M10-Abhängigkeit)

**Problem/Lücke:** Diese Sortier-/Filter-Option braucht die Nutzer-Präferenz "meine Streaming-Dienste", die erst in M10 gebaut wird.

**Entscheidung (vorläufig):** Option erscheint im Dropdown, sortiert aber aktuell nichts um (No-Op), mit Code-Kommentar `TODO(M10)`.

**Warum das später leicht änderbar ist:** Funktion `sortByMyStreamingStub` in `src/lib/watchlistLogic.ts` durch echte Logik ersetzen, sobald die M10-Präferenz existiert — Dropdown/UI muss dafür nicht geändert werden.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — "Kommt noch"-Sortierreihenfolge

**Problem/Lücke:** Die Filter-Regel selbst ist exakt spezifiziert, aber keine Sortierreihenfolge innerhalb der gefilterten Treffer war vorgegeben.

**Entscheidung (vorläufig):** Aufsteigend nach Erscheinungsdatum (nächster Release zuerst), undatierte Einträge ans Ende.

**Warum das später leicht änderbar ist:** Eine Sortierfunktion in `src/lib/watchlistLogic.ts`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 — "Aktive Gruppe" = erste Gruppe des Nutzers (Übergangslösung)

**Problem/Lücke:** Es gibt noch keine Gruppen-Auswahl/Wechsel-UI (das kommt erst mit M9/M10) — welche Gruppe zeigen Watchlist/Tagebuch an, wenn ein Nutzer mehrere Gruppen hat?

**Entscheidung (vorläufig):** Übergangslösung — die erste Gruppe aus `useUserGroups()` wird als "aktive Gruppe" verwendet, kein echter Umschalter.

**Warum das später leicht änderbar ist:** Müsste durch echten Gruppen-Kontext/State ersetzt werden, sobald eine Gruppen-Auswahl-UI existiert — betrifft beide Tab-Screens gleichermaßen, ist als klar markierte Übergangslösung im Code kommentiert.

**Status:** ✅ Abgelöst durch M9 Teil 2 — siehe [M9 Teil 2 — "Aktive Gruppe": echter, persistierter State statt "erste Gruppe"](#m9-teil-2--aktive-gruppe-echter-persistierter-state-statt-erste-gruppe). Dieser Eintrag bleibt zur Historie stehen.

---

## M5 — "unrated"/"has_ratings" vs. "all_rated"/"missing": rating>0 vs. non-null

**Problem/Lücke:** Die Watchlist-Optionen #3/#4 nutzen laut Split-Logik "rating>0" als Definition von "bewertet", während die Tagebuch-Optionen #2/#3 laut Spec-Wortlaut "non-null" verwenden (0 zählt dort als bewertet) — zwei leicht unterschiedliche Definitionen von "bewertet", jeweils exakt wie im Ursprungstext übernommen.

**Entscheidung (vorläufig):** Beide Definitionen 1:1 wie in der feature-inventory.md unterschiedlich belassen, mit Code-Kommentar an beiden Stellen dokumentiert, damit es nicht wie eine Inkonsistenz wirkt.

**Warum das später leicht änderbar ist:** Falls eine einheitliche Definition gewünscht ist, wäre das eine bewusste Vereinheitlichung in `src/lib/watchlistLogic.ts` — aber Vorsicht: das würde von der Original-App-Spezifikation abweichen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M5 (Fast-Follow) — profiles-Tabelle + Genre-Namen-Join

**Problem/Lücke:** M5 part 2 hatte zwei echte (nicht-kosmetische) Lücken hinterlassen, die als solche geflaggt waren: (1) `ratings.member_id`/`watch_group_members.user_id` sind bloße `auth.users`-UUIDs, keine `profiles`/`display_name`-Tabelle existierte, wodurch `memberDisplayLabel` nur einen UUID-Präfix-Platzhalter zeigen konnte. (2) `public.movie_genres` verknüpfte nur `genre_id`, ohne den zugehörigen `genres.name` zu joinen, wodurch Genre-Filter-Pills in Watchlist und Tagebuch ebenfalls nur einen UUID-Präfix-Platzhalter zeigten.

**Entscheidung (vorläufig):**
- Neue Migration `supabase/migrations/20260920120000_profiles_table_and_display_name_trigger.sql`: `profiles(id uuid pk → auth.users, display_name text not null, created_at)`, plus ein `AFTER INSERT`-Trigger (`handle_new_user()`, `SECURITY DEFINER`) auf `auth.users`, der automatisch eine `profiles`-Zeile anlegt. `display_name` wird beim Anlegen aus dem E-Mail-Lokalteil (vor dem `@`) abgeleitet — ausdrücklich ein Platzhalter-Default, da es noch keine Profil-Bearbeiten-UI gibt. RLS: `profiles` lesbar für jeden `authenticated`-Nutzer (Namen sind nicht sensibel, ADR 0003 verlangt gegenseitige Sichtbarkeit innerhalb der Gruppe), aber KEINE INSERT/UPDATE-Policy für `authenticated` (der Trigger braucht keine, da `SECURITY DEFINER`).
- `src/lib/groups.ts`'s `getGroupMembers` joint jetzt `profiles.display_name` per Zwei-Schritt-Query (erst `watch_group_members`, dann `profiles` gefiltert per `.in("id", userIds)`, im JS gemerged) — kein direkter DB-Level-Embed, weil `watch_group_members.user_id` und `profiles.id` beide unabhängig auf `auth.users(id)` verweisen und PostgREST ohne einen direkten FK zwischen den beiden Tabellen selbst nicht embedden kann.
- `src/lib/watchlist.ts`'s Select erweitert um `movie_genres(genre_id, genres(name))`; `src/lib/watchlistTypes.ts`'s `MovieGenreLink` bekommt ein optionales `genres: { name: string } | null`-Feld (additiv, `genre_id` bleibt unverändert für die bestehende Filter-/Sortierlogik in `watchlistLogic.ts`).
- `src/lib/diaryDisplay.ts`'s `memberDisplayLabel`/`genreDisplayLabel` nehmen jetzt einen optionalen zweiten Parameter (echter Name) und fallen nur noch auf den UUID-Präfix-Platzhalter zurück, wenn kein Profil-/Genre-Datensatz gefunden wird (defensiv, z.B. fehlendes Profil).
- Docker-verifiziert (lokaler `supabase start`/`db reset`-Stack): `auth.users`-Insert erzeugt automatisch die passende `profiles`-Zeile mit E-Mail-Lokalteil-Namen; cross-user SELECT auf `profiles` als `authenticated` funktioniert; direktes UPDATE als `authenticated` betrifft 0 Zeilen (RLS greift); die tatsächliche REST-Query-Form von `getGroupMembers` (zwei GET-Requests gegen `/rest/v1/watch_group_members` und `/rest/v1/profiles?id=in.(...)`) wurde live gegen den lokalen PostgREST-Endpunkt bestätigt.

**Warum das später leicht änderbar ist:** Der E-Mail-Lokalteil-Default ist ausdrücklich Platzhalter-Qualität — eine spätere Settings/Profil-Milestone müsste nur eine `UPDATE-own-row`-RLS-Policy (`using (id = auth.uid())`) plus eine kleine UI ergänzen, keine strukturelle Änderung an `profiles` nötig. Der Genre-Namen-Join ist rein additiv (ein zusätzliches verschachteltes Select-Feld + ein optionales Typ-Feld), keine bestehende Filter-/Sortierlogik musste angefasst werden.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Cache-Aside für die neuen TMDB-Detail-Actions: gemeinsame Zeile, eigene Keys

**Problem/Lücke:** feature-inventory.md/ADR 0005 geben für `details`/`videos`/`credits`/`release_dates`/`collection` keine server-seitige TTL vor (nur die alten, rein clientseitigen, session-only In-Memory-Caches `_similarCache`/`_providerCache` sind erwähnt, und die betreffen ohnehin nur `trakt_related`/`providers`). Der Task-Auftrag verlangt explizit, diese fünf neuen Actions unter der BESTEHENDEN "statische Metadaten, nur bei `null`-Feld neu laden"-Cache-Aside-Regel aus M1 laufen zu lassen, statt eine neue Tabelle zu erfinden.

**Entscheidung (vorläufig):**
- Alle fünf Actions nutzen dieselbe `movie_metadata_cache`-Zeile (Schlüssel `tmdb_id`) wie der bestehende `kind:"metadata"`-Stub — aber jede unter einem EIGENEN Key im `data`-JSONB-Blob (`data.details`, `data.videos`, `data.credits`, `data.releaseDatesDE`, `data.collection`), um Kollisionen mit den Stub-Keys (`runtime`/`director`/`genres`/`poster`) zu vermeiden.
- Neue generische Pure-Function `isCacheAsideFieldFresh(data, fieldKey)` in `freshness.ts`: identische "nur bei `null`/`undefined` neu laden, sonst unbegrenzt frisch"-Logik wie `isMetadataFresh`, aber pro einzelnem Feld statt für die ganze Zeile.
- Generischer Handler `handleCacheAsideField()` in `index.ts`: liest die Zeile, prüft nur das angefragte Feld auf Frische, merged bei einem Refetch nur dieses eine Feld in die bestehenden Daten (`{...cachedRow.data, [fieldKey]: freshValue}`) statt die ganze Zeile zu überschreiben.
- Als Nebeneffekt musste auch `handleMetadata()` (kind:`"metadata"`) auf denselben Merge-Ansatz umgestellt werden (`{...cachedRow?.data, ...freshData}` statt reinem Overwrite) — sonst hätte ein `kind:"metadata"`-Refetch die inzwischen unter eigenen Keys gecachten M6-Felder in derselben Zeile stillschweigend gelöscht. Rein additive, verhaltensgleiche Änderung, solange keine Feld-Namenskollision zwischen Stub und M6-Keys besteht (durch die Namensräume oben ausgeschlossen).
- Bekannte, akzeptierte Einschränkung: bei einem Film ohne echte Filmreihe bleibt `data.collection` dauerhaft `null` — das einfache Null-Check-Freshness-Modell interpretiert das als "noch nie geladen" und fragt bei jedem `collection`-Request erneut bei TMDB an. Da für diese Datenklasse ohnehin keine TTL-Vorgabe existiert, wird das als günstig-hinnehmbarer Kompromiss dokumentiert statt mit einem Sentinel-Wert (z.B. `collectionChecked: true`) zu lösen.

**Warum das später leicht änderbar ist:** Die generische `handleCacheAsideField()`-Funktion und `isCacheAsideFieldFresh()` sind reine, kleine Bausteine — eine echte TTL oder ein "no collection"-Sentinel-Wert ließe sich als zusätzlicher Parameter/Feld nachrüsten, ohne die Aufrufer (`index.ts`-Switch-Cases) strukturell zu ändern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — `collection`-Action erfordert sowohl `tmdbId` als auch `collectionId`

**Problem/Lücke:** Die `collection`-Action liefert TMDB-Collection-Daten anhand einer `collection_id`, nicht anhand einer `tmdb_id` (Film-ID) — aber die Cache-Aside-Zeile (siehe oben) ist nach `tmdb_id` geschlüsselt, nicht nach `collection_id`.

**Entscheidung (vorläufig):** Der Request-Body für `kind:"collection"` verlangt BEIDE Parameter: `tmdbId` (der auslösende Film, dient als Cache-Zeilen-Schlüssel) UND `collectionId` (die tatsächlich abzurufende Filmreihe). Der Client kennt `collectionId` ohnehin aus einem vorherigen `details`-Call (`belongs_to_collection.id`).

**Warum das später leicht änderbar ist:** Reine Request-Validierung in einem `index.ts`-Switch-Case; falls eine collection-eigene Cache-Tabelle (statt Wiederverwendung von `movie_metadata_cache`) gewünscht ist, wäre das eine isolierte Änderung an genau diesem Case plus einer neuen Migration.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Kino-Priorität: Type 3 vor Type 2 als Fallback

**Problem/Lücke:** Der Task-Auftrag benennt TMDB-Type-3 (Theatrical) explizit als "Kino", lässt aber offen, wie Type 2 (Theatrical, limited) einzuordnen ist.

**Entscheidung (vorläufig):** Type 2 wird als Kino-Äquivalent-FALLBACK behandelt — nur verwendet, wenn kein Type-3-Eintrag existiert. Bei Vorhandensein BEIDER Typen gewinnt immer Type 3 (durch einen dedizierten Test in `tmdb-client.test.ts` abgesichert, siehe TDD-Nachweis im Abschlussbericht).

**Warum das später leicht änderbar ist:** Zwei benannte Konstanten (`KINO_TYPE_PRIMARY`, `KINO_TYPE_FALLBACK`) in `tmdb-client.ts`, die Priorisierungslogik ist eine einzelne, pur getestete Funktion (`selectGermanReleaseDate`).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — DE-Übersetzungs-Erkennung für die Suche (title === original_title)

**Problem/Lücke:** feature-inventory.md spezifiziert nur das GEWÜNSCHTE Verhalten ("EN-Titel-Fallback wenn keine DE-Übersetzung"), nicht, wie "keine DE-Übersetzung" aus TMDBs Such-Response technisch zu ERKENNEN ist.

**Entscheidung (vorläufig):** Ein DE-Suchergebnis gilt als unübersetzt, wenn `title === original_title` UND `original_language !== "de"` — TMDB fällt bei fehlender Übersetzung selbst intern auf `original_title` zurück, das ist also ein beobachtbares Signal aus der echten API-Response-Form, kein erfundenes Zusatzkriterium. Filme, deren `original_language` bereits `"de"` ist, werden nie als "unübersetzt" behandelt (ihr `title` IST die korrekte deutsche Fassung).

**Warum das später leicht änderbar ist:** Eine einzelne, pur getestete Funktion (`mergeSearchResults` in `tmdb-client.ts`) — die Erkennungs-Bedingung ist ein einzeiliger Ausdruck, austauschbar ohne Änderungen an der Merge-Struktur drumherum.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Cast-10-Cap wird in der Edge Function angewendet

**Problem/Lücke:** Der Task-Auftrag erlaubt beide Optionen (Cap in der Edge Function ODER Cap im Client) und verlangt nur eine dokumentierte Wahl.

**Entscheidung (vorläufig):** Der Cap auf 10 Personen (`CAST_DISPLAY_LIMIT`) wird in der Edge Function selbst angewendet (`fetchMovieCredits` in `tmdb-client.ts`), NICHT dem Client überlassen — spart Payload-Größe und hält die "was zeigt die UI"-Regel serverseitig neben der übrigen TMDB-Sonderlogik. `crew` wird bewusst ungekappt durchgereicht, da daraus u.a. der Regisseur extrahiert wird und Crew-Listen i.d.R. kürzer sind.

**Warum das später leicht änderbar ist:** Eine benannte Konstante (`CAST_DISPLAY_LIMIT = 10`) plus ein `.slice()`-Aufruf; eine spätere Verlagerung zum Client wäre eine Ein-Zeilen-Änderung (Cap entfernen), ohne Strukturänderung an der Response-Form.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — `search_company`-Scoring: eigene Fuzzy-/Bonus-Gewichte

**Problem/Lücke:** feature-inventory.md benennt nur die drei Scoring-Faktoren ("Fuzzy-Score + Prefix-Bonus + Logo-Bonus"), aber keine konkreten Gewichte oder den Fuzzy-Algorithmus selbst.

**Entscheidung (vorläufig):** Fuzzy-Score = normalisierte Levenshtein-Ähnlichkeit (0–1, exakter Substring-Treffer = 0.8, exakte Gleichheit = 1). Prefix-Bonus = `+0.5` fest, wenn der Firmenname mit dem Suchbegriff beginnt. Logo-Bonus = `+0.2` fest, wenn `logo_path` gesetzt ist. Werte so gewählt, dass ein Prefix- oder Logo-Treffer einen ansonsten mittelmäßigen Fuzzy-Score klar überholen kann, aber ein exakter Namenstreffer (Score 1) trotzdem kaum zu übertreffen ist.

**Warum das später leicht änderbar ist:** Zwei benannte Konstanten (`PREFIX_MATCH_BONUS`, `HAS_LOGO_BONUS`) plus eine austauschbare `fuzzyScore()`-Hilfsfunktion, alles isoliert in `tmdb-client.ts`, pur getestet in `scoreCompanyMatch`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — `trakt_related`: TMDB-ID → Trakt-Slug-Auflösung als Zwischenschritt

**Problem/Lücke:** Trakts öffentliche API identifiziert Filme über Trakt-Slug/-ID oder IMDb-ID im `/movies/{id}/related`-Pfad — es gibt dort keinen Endpunkt, der direkt eine TMDB-ID entgegennimmt. feature-inventory.md beschreibt nur das Ergebnis ("Ähnliche Filme via Trakt.tv API"), nicht den API-Vertrag im Detail.

**Entscheidung (vorläufig):** Zweistufige Auflösung in `trakt-client.ts`: zuerst `GET /search/tmdb/{id}?type=movie` (liefert den Trakt-Slug), dann `GET /movies/{slug}/related?limit=40&extended=full`. Beide Schritte sind eigene, mockbare Funktionen (`resolveTraktSlugFromTmdbId`, `fetchTraktRelatedBySlug`), orchestriert von `fetchTraktRelated`. Kann die TMDB-ID nicht aufgelöst werden, wird ein leeres Array zurückgegeben (kein Fehler).

**Warum das später leicht änderbar ist:** Beide Schritte sind isolierte, pur mit Fixture-Daten getestete Funktionen — falls sich Trakts tatsächlicher API-Vertrag von dieser Annahme unterscheidet (nicht verifizierbar ohne echten `TRAKT_API_KEY`/Netzwerkzugriff in dieser Session), betrifft eine Korrektur nur diese zwei Funktionen, nicht die Cap-Logik (`limitRelatedMovies`) oder den Aufrufer in `index.ts`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch — **Achtung, echter Verifikations-Gap:** Der genaue Trakt-API-Vertrag für diese Auflösung konnte in dieser Session nicht gegen die echte API geprüft werden (kein `TRAKT_API_KEY`, kein Auftrag zu echtem Netzwerkzugriff). Vor Prod-Einsatz mit echtem Trakt-Key einmal gegen die echte API verifizieren.

---

## M6 — `person_movies`/`director_movies`/`studio_movies` ebenfalls ohne Cache-Aside

**Problem/Lücke:** Der Task-Auftrag listet explizit `search`/`search_person`/`search_company`/`trakt_related`/`providers`/`providers_list` als "kein Cache-Aside", sagt aber nichts explizit zu `person_movies`/`director_movies`/`studio_movies`.

**Entscheidung (vorläufig):** Auch diese drei Actions laufen als reines Fetch-Through ohne Cache-Tabelle — sie sind genauso query-/lookup-förmig (Schlüssel ist eine Personen-/Firmen-ID + optionale Seite, kein fester Pro-Film-Cache-Key) und im alten Legacy-Zustand ohne eigene `_cache`-Variable erwähnt (nur `_similarCache`/`_providerCache` sind dort benannt). Konsistent mit der Begründung, die der Task-Auftrag für die explizit genannten Actions gibt.

**Warum das später leicht änderbar ist:** Falls doch gewünscht, wäre das ein zusätzlicher `handleCacheAsideField`-artiger Wrapper um genau diese drei `index.ts`-Cases, ohne Änderung an den zugrunde liegenden `tmdb-client.ts`-Fetch-Funktionen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Studio-Filmografie-Screen: Dedupe-Strategie, Footer-Sichtbarkeit, `movie-detail`-Routenannahme

**Problem/Lücke:** Der Studio-Filmografie-Screen (`src/app/(app)/(modals)/filmography/studio/[companyId].tsx`) baut auf `useStudioFilmography`s `useInfiniteQuery`-Pagination auf; der Task-Auftrag ließ drei Implementierungsdetails offen: (1) wie über mehrere geladene Seiten hinweg dedupliziert wird, (2) wann genau der "Mehr laden"-Footer erscheint, und (3) welche Route/Params ein Tile-Tap ansteuert, da der `movie-detail`-Screen selbst zum Zeitpunkt dieser Arbeit noch nicht existierte (durch ein paralleles Detail-Overlay-Task).

**Entscheidung (vorläufig):**
- Dedupe: alle geladenen Seiten werden zu einer Liste geflacht, dann über ein `Set<number>` nach `tmdbId` in Erst-Vorkommen-Reihenfolge dedupliziert (spätere Duplikate verworfen) — reine In-Memory-Defensivmaßnahme gegen TMDBs seltene Seiten-Überlappung bei sich verschiebenden Discover-Ergebnissen, keine Server-Änderung.
- Footer-Sichtbarkeit: der "Mehr laden"-Button (`MovieGrid`s `footer`-Prop) wird nur gerendert, wenn `hasNextPage === true`; ist die letzte Seite erreicht, wird `footer={undefined}` übergeben (kein deaktivierter/ausgegrauter Button als letzter Zustand).
- `movie-detail`-Route: `router.push({ pathname: "/(app)/(modals)/movie-detail", params: { tmdbId: String(item.tmdbId) } })` — 1:1 übernommen von der bereits gelandeten Schwester-Implementierung `src/app/(app)/(modals)/collection/[collectionId].tsx` (identische Konvention dort bereits vorgefunden), NICHT neu erfunden. Der `movie-detail`-Screen selbst existierte zum Zeitpunkt dieser Arbeit noch nicht (`find src/app -iname "*movie-detail*"` fand nichts) — daher ein bekannter, erwarteter `tsc`-Fehler in allen fünf Sub-View-Screens (`collection`, `filmography/actor`, `filmography/director`, `filmography/studio`, `similar`), der erst verschwindet, sobald das parallele Detail-Overlay-Task landet.
- Kein `progressHeader` und kein `streamingFilter` an `MovieGrid` übergeben (`undefined`) — laut Task-Spec bewusst NICHT Teil des Studio-Grids (anders als Regisseur/Schauspieler bzw. Filmreihe), da ein Studio-Katalog i.d.R. zu groß/unabgeschlossen für eine "X von Y gesehen"-Fortschrittsanzeige ist.

**Warum das später leicht änderbar ist:** Alle vier Punkte sind isolierte, kleine Code-Stellen in genau dieser einen Datei (ein `Set`-basierter Dedupe-Block, ein Ternary für die `footer`-Prop, eine `router.push`-Zeile, zwei `undefined`-Props) — keine strukturelle Kopplung an `MovieGrid`, `useStudioFilmography` oder andere Sub-View-Screens. Sobald der echte `movie-detail`-Screen landet, muss hier höchstens der Pfad/die Param-Namen angepasst werden, falls sie von der Collection-Screen-Konvention abweichen sollten.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Ähnliche-Filme-Screen: kein Poster-/Score-Backfill, `movie-detail`-Routenannahme

**Problem/Lücke:** Trakts `related`-Response (`src/lib/tmdbProxy.ts`s `TraktRelatedMovie`) liefert nur `title`/`year`/`ids` — kein `poster_path`, kein `vote_average`, und nicht jeder Eintrag hat `ids.tmdb`. Der Task-Auftrag für `src/app/(app)/(modals)/similar/[tmdbId].tsx` legte fest, wie damit umzugehen ist (siehe unten), statt es dem Subagent offenzulassen — hier dokumentiert, weil es dieselbe Kategorie "leicht revidierbare Implementierungswahl" ist wie die übrigen Einträge in diesem Dokument. Zusätzlich: der `movie-detail`-Screen existierte zum Zeitpunkt dieser Arbeit noch nicht (`find src/app -iname "*movie-detail*"` fand nichts).

**Entscheidung (vorläufig):**
- Kein Poster-/Score-Backfill per zusätzlichem Pro-Item-TMDB-Call: Items werden direkt mit `posterPath: null` / `voteAverage: null` gemappt (bis zu 40 Items, N zusätzliche Calls wären teures Fan-out). `MovieGrid` rendert dafür bereits ein Platzhalter-Icon und blendet die Score-Pille aus — kein UI-Sonderfall nötig.
- Items ohne `ids.tmdb` werden komplett herausgefiltert (nicht nur ohne Badge/Navigation gerendert) — ohne TMDB-ID gibt es weder einen Badge-/Streaming-Lookup-Schlüssel noch ein Navigationsziel.
- `year` → `releaseDate`-Platzhalter als `"${year}-01-01"` (fester 1. Januar), da Trakt kein echtes Datum liefert.
- Badge-Logik: dieselbe `getLibraryBadgeForTmdbId` (watched/watchlist/kein Badge) wie bei den drei anderen Sub-View-Screens, statt eines eigenen vereinfachten "in Bibliothek Ja/Nein"-Flags — für Konsistenz über alle vier Grids hinweg.
- `movie-detail`-Route/Params: `router.push({ pathname: "/(app)/(modals)/movie-detail", params: { tmdbId: String(item.tmdbId) } })` wenn der Badge `null` ist (Film noch nicht in der aktiven Gruppen-Bibliothek); `params: { tmdbId: String(item.tmdbId), groupId: activeGroupId ?? "", source: "library" }` wenn der Badge `"watched"` oder `"watchlist"` ist. Anders als bei den Schwester-Screens (`collection`, `filmography/*`, die immer nur `tmdbId` übergeben) macht dieser Screen laut eigenem Task-Auftrag also eine Fallunterscheidung nach Bibliotheksstatus — das ist eine explizite Vorgabe dieses Tasks, keine eigenmächtige Abweichung von der Collection-Konvention. Da der `movie-detail`-Screen noch nicht existiert, ist besonders `groupId`/`source` als Parameter-NAME eine Annahme, die beim Landen des parallelen Detail-Overlay-Tasks gegen die tatsächlichen erwarteten Prop-Namen abgeglichen werden muss. Bekannter, erwarteter `tsc`-Fehler in dieser Datei (Pfad `"/(app)/(modals)/movie-detail"` ist noch keine gültige Route) — identisch zur bereits dokumentierten Situation bei `collection`/`filmography/*`.

**Warum das später leicht änderbar ist:** Poster-/Score-Backfill wäre eine rein additive Erweiterung der `.map()`-Funktion (ein weiterer Call, kein Strukturbruch). Die `movie-detail`-Params sind zwei String-Literale in genau einer `onPressItem`-Closure; falls der echte Screen andere Namen erwartet, ist das eine punktuelle Änderung ohne Rückwirkung auf `MovieGrid`, `useSimilarMovies` oder die Badge-/Filter-Logik.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch — **zusätzlich zu verifizieren, sobald `movie-detail` gelandet ist:** ob `groupId`/`source` die tatsächlich erwarteten Param-Namen für den "bereits in Bibliothek"-Kontext sind. **Update (M6-Cleanup): verifiziert und korrigiert** — siehe "M6-Cleanup — `movie-detail`-Routen-Korrektur" unten für die tatsächliche Param-Namen-/Wertekorrektur (`source: "library"` war kein gültiger Enum-Wert, jetzt `"watchlist"`/`"diary"`).

---

## M6 — Route-Struktur für Sub-Views unter `(app)/(modals)/`

**Problem/Lücke:** Für die vier neuen Movie-Sub-View-Screens (Filmreihe, Regisseur-/Schauspieler-/Studio-Filmografie, Ähnliche Filme) existierte vorher keine Routing-Konvention — weder ein Ordnerlayout noch eine Entscheidung, ob es überhaupt eine eigene Modal-Stack-Gruppe braucht.

**Entscheidung (vorläufig):** Neue Routen unter einer eigenen Gruppe `(app)/(modals)/`: `collection/[collectionId].tsx` (plus `tmdbId` als Query-Param, da die `collection`-tmdb-proxy-Action beide braucht), `filmography/director/[personId].tsx`, `filmography/actor/[personId].tsx`, `filmography/studio/[companyId].tsx`, `similar/[tmdbId].tsx`. Alle fünf hängen an einem neuen `(modals)/_layout.tsx` (`<Stack screenOptions={{ headerShown: true }} />`), das wiederum in `src/app/(app)/_layout.tsx` als `<Stack.Screen name="(modals)" options={{ presentation: "modal", headerShown: false }} />` registriert ist — Geschwister von `(tabs)`, sodass der Tab-Stack beim Öffnen eines Sub-Views unangetastet bleibt.

**Warum das später leicht änderbar ist:** Reine Datei-/Ordnerkonvention innerhalb von Expo Router (file-based Routing) — Umbenennen/Verschieben einzelner Routen berührt keine der fünf Screens inhaltlich, nur ihre eigene Datei plus ggf. `router.push`-Aufrufe an den (aktuell wenigen) Stellen, die dorthin navigieren.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Angenommene `movie-detail`-Route (konsolidiert über alle 5 Sub-View-Screens)

**Problem/Lücke:** Alle fünf Sub-View-Screens navigieren bei Tap auf ein Grid-Item zum eigentlichen Movie-Detail-Overlay. Dieser Screen (`(app)/(modals)/movie-detail`) ist Teil eines PARALLEL laufenden Tasks (M6 Teil 1) und existierte zum Zeitpunkt dieser Arbeit noch nicht (`find src/app -iname "*movie-detail*"` findet weiterhin nichts — verifiziert am Ende dieser Arbeit, nicht nur zu Beginn).

**Entscheidung (vorläufig):** Einheitlich über alle fünf Screens: `router.push({ pathname: "/(app)/(modals)/movie-detail", params: { tmdbId: String(tmdbId) } })`. Einzige Ausnahme: der Ähnliche-Filme-Screen (`similar/[tmdbId].tsx`) hängt zusätzlich `groupId: activeGroupId ?? "", source: "library"` an, wenn der Film laut `getLibraryBadgeForTmdbId` bereits `"watched"` oder `"watchlist"` ist (Feature-Vorgabe dieses Screens, siehe eigener Eintrag unten). Da die Zielroute noch nicht existiert, erzeugt Expo Routers `typedRoutes`-Generierung (`app.config.ts`) für `"/(app)/(modals)/movie-detail"` noch keinen validen Literal-Typ — alle fünf `router.push`-Aufrufe casten den `pathname` daher mit `as never`, kommentiert mit einem Verweis auf diesen Eintrag; die Casts fallen weg, sobald der echte Screen landet und `npx expo` seine Typen neu generiert.

**Achtung, echter Verifikations-Gap:** Sowohl die Route selbst als auch die Parameter-Namen `tmdbId`/`groupId`/`source` sind unverifizierte Annahmen. Sobald der `movie-detail`-Screen aus dem parallelen Task gelandet ist, MUSS dessen tatsächliche `useLocalSearchParams`-Signatur gegen alle fünf `router.push`-Aufrufe (in `collection/[collectionId].tsx`, `filmography/director/[personId].tsx`, `filmography/actor/[personId].tsx`, `filmography/studio/[companyId].tsx`, `similar/[tmdbId].tsx`) abgeglichen werden. **Update (M6-Cleanup): abgeglichen und korrigiert** — der echte Screen liegt unter `movie/[tmdbId].tsx` (nicht `movie-detail`), alle fünf Aufrufer wurden korrigiert; siehe "M6-Cleanup — `movie-detail`-Routen-Korrektur" unten für Details.

**Warum das später leicht änderbar ist:** Jeder Aufruf ist eine isolierte `router.push(...)`-Zeile in genau einer `onPressItem`-Closure pro Screen — keine strukturelle Kopplung an `MovieGrid`, die Hooks oder die Badge-/Filter-Logik.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Badge-Definition "gesehen" = eigene Bewertung/Diary-Eintrag statt gruppenweiter Aggregation

**Problem/Lücke:** `getLibraryBadgeForTmdbId`/`getWatchedTmdbIdSet` (`src/lib/movieLibraryStatus.ts`) mussten festlegen, wessen "gesehen"-Status für das Watched-Badge in den neuen Grids zählt — nur der eigene oder gruppenweit aggregiert (z. B. "mindestens ein Gruppenmitglied hat's gesehen").

**Entscheidung (vorläufig):** Beide Funktionen delegieren an `splitWatchlistAndDiary` (`src/lib/watchlistLogic.ts`, bereits aus M5) und werten ausschließlich den `diary`-Anteil des AKTUELLEN Users (`currentUserId`) als "watched"; der `watchlist`-Anteil ergibt das `"watchlist"`-Badge; alles andere `null`. Damit exakt dieselbe Pro-Nutzer-Regel wie im bestehenden Watchlist/Tagebuch-Screen (M5), keine neue/andere Gruppen-Aggregations-Logik.

**Warum das später leicht änderbar ist:** Beide Funktionen sind reine, kleine Wrapper um `splitWatchlistAndDiary` — eine gruppenweite Variante wäre eine neue Funktion mit anderer Signatur (bräuchte alle Mitglieder-Diary-Einträge, nicht nur die des aktuellen Users), ohne dass `MovieGrid` oder die Screens angepasst werden müssten (sie kennen nur das `LibraryBadge`-Resultat).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Streaming-Provider-Filter nutzt `kind:"providers"` (nicht `kind:"streaming"`), ein Request pro Film

**Problem/Lücke:** Die tmdb-proxy Edge Function hat bereits einen `kind:"streaming"`-Stub aus M1 (`supabase/functions/tmdb-proxy/index.ts` Zeile ~64/93/267, `tmdb-client.ts` Zeile ~4/18) — der liefert aber nur eine ungeprüfte, nicht nach Flatrate/Leihen/Kaufen aufgeschlüsselte Payload. Für den neuen Streaming-Filter in `collection`/`similar`-Grids brauchte es diese Aufschlüsselung.

**Entscheidung (vorläufig):** Neuer, eigener Pfad statt Erweiterung des `streaming`-Stubs: `getMovieProviders`/`useMoviesProviders` (`src/lib/tmdbProxy.ts` `getMovieProviders`, Zeile 128) ruft `kind:"providers"` auf und bekommt `TmdbMovieProviders { flatrate, rent, buy }` zurück. `useMoviesProviders` fragt dabei PRO FILM einzeln ab (kein Batch-Endpoint) — bei bis zu 40 Items im Ähnliche-Filme-Grid also bis zu 40 parallele Requests.

**Warum das später leicht änderbar ist:** Der `streaming`-Stub bleibt unangetastet (M1-Code, nicht Teil dieser Arbeit); ein Batch-Endpoint für Provider-Daten wäre ein rein serverseitiger Zusatz in der Edge Function plus einer Anpassung von `useMoviesProviders`s Fetch-Strategie — die Konsumenten (`filterByProviderCategory`, die Screens) kennen nur die fertige `Map<number, TmdbMovieProviders>` und müssten nicht angefasst werden.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Fehlende Provider-Daten gelten als "nicht verfügbar" im Filter

**Problem/Lücke:** `filterByProviderCategory` (`src/lib/movieProviderFilter.ts`) musste festlegen, was bei aktivem Streaming-Filter mit Filmen passiert, für die (noch) keine Provider-Daten in der `providersByTmdbId`-Map vorliegen (z. B. Request noch nicht zurück, oder TMDB liefert für dieses Land keine Daten).

**Entscheidung (vorläufig):** Solche Filme werden bei aktivem Filter (`category !== null`) herausgefiltert — kein Eintrag in der Map bzw. eine leere Liste für die gewählte Kategorie zählt als "nicht verfügbar in dieser Kategorie", nicht als "unbekannt, also anzeigen".

**Warum das später leicht änderbar ist:** Eine einzige Zeile (`Array.isArray(list) && list.length > 0`) in einer reinen, ungekoppelten Filterfunktion — ein Wechsel zu "unbekannt anzeigen" wäre eine lokale Bedingungsänderung ohne Auswirkung auf Aufrufer.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Doppelte TMDB-Provider-Typen (`tmdbProxy.ts` vs. `movieDetailTypes.ts`) bewusst nicht konsolidiert

**Problem/Lücke:** `TmdbProviderRef`/`TmdbMovieProviders` sind sowohl in `src/lib/tmdbProxy.ts` (diese Arbeit) als auch in `src/lib/movieDetailTypes.ts` (paralleler M6-Teil-1-Task, unabhängig entstanden) strukturell identisch definiert.

**Entscheidung (vorläufig):** Bewusst NICHT konsolidiert/dedupliziert im Rahmen dieser Arbeit — ein Merge hätte bedeutet, in eine parallel und zeitgleich bearbeitete Datei (`movieDetailTypes.ts`, Teil des anderen, noch laufenden Tasks) einzugreifen, mit Risiko eines Merge-Konflikts oder einer stillen Breaking-Change für den anderen Task.

**Warum das später leicht änderbar ist:** Beide Interfaces sind strukturell (nicht nur nominell) gleich — ein späteres Zusammenführen auf einen gemeinsamen Typ in einem dritten, neutralen Modul ist ein reiner Umbenennungs-/Import-Refactor ohne Verhaltensänderung.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 — Test-Pfad-Konvention für neue Hooks flach (`__tests__/*.test.tsx`) statt `__tests__/hooks/`

**Problem/Lücke:** Für die sieben neuen Hooks (`useCollection`, `useDirectorFilmography`, `useActorFilmography`, `useStudioFilmography`, `useSimilarMovies`, `useMovieProviders`, `useMoviesProviders`) gab es keine zwingende Vorgabe, ob ihre Tests unter einem eigenen `__tests__/hooks/`-Unterordner oder flach direkt unter `__tests__/` liegen.

**Entscheidung (vorläufig):** Flach direkt unter `__tests__/` (z. B. `__tests__/useCollection.test.tsx`), passend zur bereits bestehenden Repo-Konvention für alle früheren Hooks (`useCurrentUserId.test.tsx`, `useGroupWatchlist.test.tsx`, `useUserGroups.test.tsx` usw. liegen ebenfalls flach, nicht unter `__tests__/hooks/`). Lib-Tests dagegen liegen unter `__tests__/lib/` und Screen-Tests unter `__tests__/screens/` — beides ebenfalls bereits bestehende, jetzt fortgeführte Konventionen.

**Warum das später leicht änderbar ist:** Reine Datei-Pfad-Frage für Jest — ein `find`+`git mv` in einen `hooks/`-Unterordner würde nichts an Testinhalten oder Imports ändern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 (Teil 2a) — `useMovieDetail`: paralleles Fetching statt kombiniertem Server-Call

**Problem/Lücke:** Der neue Movie-Detail-Screen braucht fünf verschiedene `tmdb-proxy`-Actions (`details`, `videos`, `credits`, `release_dates`, `providers`) gleichzeitig. Weder ADR 0002/0005 noch feature-inventory.md legen fest, ob diese als ein kombinierter Server-Call oder als mehrere Client-Calls geholt werden.

**Entscheidung (vorläufig):**
- Die fünf Actions bleiben fünf separate Funktionen in `src/lib/movieDetail.ts`, werden aber innerhalb der `queryFn` von `useMovieDetail` per `Promise.all` gleichzeitig (parallel) abgefeuert, statt sequenziell oder über einen neuen kombinierten Server-Endpoint.
- Fehlerverhalten ist "fail-fast in fester Reihenfolge": schlägt einer oder mehrere der fünf Calls fehl, wirft der Hook den ERSTEN Fehler in der festen Prüfreihenfolge `details → trailer → credits → germanReleaseDate → providers`, statt alle fünf Fehler zu aggregieren — analog zum bestehenden Stil von `useGroupWatchlist`.
- `region` wird bei allen fünf Calls einheitlich fest als `"DE"` mitgeschickt, für eine simple, einheitliche Helper-Signatur.
- Neuer Client-seitiger Helper `invokeTmdbProxy` in `src/lib/movieDetail.ts` — der erste Client-Code, der die `tmdb-proxy` Edge Function überhaupt aufruft (bisher gab es dafür noch keinen Helper).

**Warum das später leicht änderbar ist:** Ein Wechsel zu einem einzigen kombinierten "Batch-Detail"-Server-Endpoint würde nur `useMovieDetail`s `queryFn` und `src/lib/movieDetail.ts` betreffen — die Aufrufer (der Screen) kennen nur das fertige `MovieDetailData`-Resultat. Ein Wechsel von Fail-Fast zu einem aggregierten Fehlerobjekt wäre eine lokale Änderung der Catch-Logik, ohne Strukturbruch.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 (Teil 2a) — `useMovieDetailMutations`: Like-Toggle-Pfad, Cache-Invalidierung, Fehlerbehandlung

**Problem/Lücke:** Für Like-Toggle, Watchlist-Hinzufügen und Watchlist-Löschen aus dem Movie-Detail-Screen fehlten Implementierungsdetails zu Update- vs. Insert-Pfad, Cache-Invalidierung, Fehlerformat und Nutzer-ID-Herkunft.

**Entscheidung (vorläufig):**
- Like-Toggle: `.update({ liked })` auf die konkrete Rating-Zeile per `id`, wenn eine existierende Rating-ID bekannt ist (garantiert, dass andere Rating-Felder unangetastet bleiben); `.upsert(..., { onConflict: "watchlist_entry_id,member_id" })`, wenn keine existierende Rating-ID bekannt ist (Insert-oder-Erzeugen-mit-nur-`liked`-gesetzt-Pfad, da `ratings` keine DELETE-Policy hat). Aufrufer/UI entscheidet über den Pfad, je nachdem ob `existingRatingId` mitgegeben wird oder nicht.
- Cache-Invalidierung: `useDeleteWatchlistEntry`/`useAddToWatchlist` nehmen `groupId` als Mutation-Variable entgegen und invalidieren bei Erfolg exakt den Key `["watchlist", groupId]` — derselbe Key, den `useGroupWatchlist` verwendet. `useToggleLike` invalidiert bewusst KEINEN Cache (im Auftrag nicht gefordert; separat als bekannte Lücke geflaggt, hier nicht behoben, da diese Datei im Rahmen dieser Konsolidierung nicht angefasst werden sollte). **Update (M6-Cleanup):** genau diese Lücke wurde inzwischen behoben — `useToggleLike` nimmt jetzt ebenfalls `groupId` als Mutation-Variable entgegen (analog zu `useDeleteWatchlistEntry`) und invalidiert `["watchlist", groupId]` bei Erfolg, damit das Like-Herz in Watchlist/Tagebuch nach einem Toggle aus dem Detail-Overlay sofort visuell aktualisiert.
- Duplicate-Entry-Fehler (Postgres-Code `23505`): keine Übersetzung in eine freundliche Meldung, der rohe Postgres-Fehler wird unverändert durchgereicht (kein Präzedenzfall im Repo für eine Übersetzung von Postgres-Fehlercodes gefunden; als UI-Layer-Scope betrachtet).
- Aktuelle User-ID wird als Hook-/Mutation-Parameter (`memberId`/`addedBy`) übergeben, nicht intern per `useCurrentUserId()` geholt — hält diese Mutation-Hooks auth-state-agnostisch und leichter testbar/wiederverwendbar, passend zu `watchlist.tsx`/`tagebuch.tsx`, die `useCurrentUserId()` einmal auf Screen-Ebene aufrufen und nach unten durchreichen.
- `MovieNotCatalogedError` wird auf der `src/lib`-Ebene als `{ data: null, error }` zurückgegeben (never-throws-Konvention), auf Hook-Ebene aber in einen echten geworfenen Fehler umgewandelt, damit UI-Code per `error instanceof MovieNotCatalogedError` auf `mutation.error` prüfen kann.

**Warum das später leicht änderbar ist:** Alle vier Punkte sind lokal isoliert — der Like-Toggle-Pfad ist eine Verzweigung innerhalb einer Mutation-Funktion, die Invalidierungs-Keys sind einzelne String-Arrays, die Fehlerübersetzung wäre eine zusätzliche Catch-Klausel, und die `memberId`-Parameter-Übergabe ist eine Signaturfrage ohne Rückwirkung auf die DB-Queries selbst.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6 (Teil 2a) — Movie-Detail-Screen: Routen-Contract, Aktionsleisten-Logik, Trailer, UI-Details

**Problem/Lücke:** Für den neuen Screen `src/app/(app)/(modals)/movie/[tmdbId].tsx` fehlten Festlegungen zu Routen-Parametern, Aktionsleisten-Sichtbarkeit, Lösch-Bestätigung, Platzhalter-Navigation, Trailer-Wiedergabe und diversem UI-Feinschliff.

**Entscheidung (vorläufig):**
- Routen-Contract: `tmdbId` als erforderliches dynamisches Segment; optionale Query-Parameter `groupId`, `source` (`"watchlist"`|`"diary"`), `watchlistEntryId` definieren den "Gruppen-Kontext" (`hasGroupContext = Boolean(groupId && source)`); optionaler Parameter `movieJson` = `encodeURIComponent(JSON.stringify(movie))` eines `Movie`-förmigen Objekts, dient nur als sofortiges Instant-Paint, bevor `useGroupWatchlist`s autoritative Daten geladen sind, defensiv geparst (crasht nie bei fehlendem/fehlerhaftem Input). Sobald die echte DB-Zeile geladen ist, gewinnt sie immer gegenüber dem übergebenen JSON. Kein Aufrufer verdrahtet aktuell die Navigation zu diesem Screen (expliziter Follow-up, außerhalb des Scopes dieser Arbeit).
- `getVisibleActions`/Aktionsleisten-Logik als reine Funktion in `src/lib/movieDetailLogic.ts` extrahiert, erschöpfend unit-getestet (Branch-Matrix für Gruppen- vs. Such-Kontext, "Bewerten"s Watchlist-plus-erschienen-oder-streaming-Gate, "Filmreihe"s `hasCollection`-Gate).
- Bewertungen-Sektion ("Bewertungen") wird nur gerendert, wenn `source === "diary"` (gewählte Interpretation von "nur für Diary/gesehene Filme", passend zum bereits etablierten Diary/Watchlist-Split via `splitWatchlistAndDiary`).
- Lösch-Bestätigung über die bestehende `Sheet`-Komponente umgesetzt (nicht `Alert.alert`), für visuelle Konsistenz mit der dokumentierten Sheet/Modal-System-Konvention des Codebase.
- Platzhalter-Navigation isoliert in `src/lib/movieDetailNavigation.ts`: die echten M6-Teil-2b-Sub-View-Routen zeigen auf ihre TATSÄCHLICHEN existierenden Pfade (`/filmography/director/[personId]`, `/filmography/actor/[personId]`, `/collection/[collectionId]`, `/similar/[tmdbId]`), da diese Routen im Baum bereits existieren; `navigateToRatingDialog`/`navigateToEditFlow` bleiben echte geratene Platzhalter, da M7 noch nicht existiert.
- Trailer: Inline-`react-native-webview`-YouTube-Embed (`https://www.youtube.com/embed/{key}?playsinline=1`) beim Tap auf den Play-Button über dem Poster; ein separater Vollbild-Umschalter öffnet ein Vollbild-natives RN-`Modal` mit derselben WebView plus `expo-screen-orientation`-Landscape-Lock beim Öffnen / Portrait-Lock beim Schließen — dokumentiert als nativ-sinnvolles Äquivalent zum Legacy-Web-`requestFullscreen()`, kein Byte-für-Byte-Port.
- Poster-/Trailer-Container nutzt eine 16:9-Aspect-Box (nicht das sonst übliche 2:3-Poster-Verhältnis der App), um einen Layout-Sprung zwischen Poster- und Trailer-Zustand zu vermeiden.
- Beschreibung "Mehr anzeigen": Off-Screen-Mess-`Text` via `className="absolute opacity-0"` (NativeWind reichte aus, kein Inline-Style-Fallback nötig), um die echte Zeilenzahl per `onTextLayout` zu ermitteln, verglichen gegen `maxLines=3` per reiner `shouldShowMoreToggle`-Hilfsfunktion.
- Streaming-Anbieter-Sektion zeigt nur Namen (keine Anbieter-Logos) — vermeidet eine Out-of-Scope-Entscheidung zu rohen TMDB-Bildpfaden; die eingeklappte Ansicht zeigt eine geflachte 3-Item-Vorschau (Reihenfolge Flatrate→Leihen→Kaufen), wenn der "Alle Anbieter anzeigen"-Umschalter greifen würde.
- Score-Badge: schlichte `voteAverage.toFixed(1)`-Pille (kein Stern-Icon), passend zu einer bereits bestehenden schlichten Zahlen-Badge-Konvention an anderer Stelle der App.
- Aktionsleisten-Copy fest auf Deutsch: Bewerten / Bearbeiten / Ähnliche Filme / Löschen / Filmreihe / Zur Watchlist / Direkt bewerten; Lösch-Bestätigungs-Sheet-Titel "Film löschen?" (bestätigen "Löschen" / abbrechen "Abbrechen"); generischer Fehler-Alert-Titel beim Watchlist-Hinzufügen "Fehler" / Text "Der Film konnte nicht zur Watchlist hinzugefügt werden. Bitte versuche es erneut." (die `MovieNotCatalogedError`-spezifische Alert-Copy ist der auftragsseitig exakt vorgegebene Text, unverändert übernommen).

**Warum das später leicht änderbar ist:** Alle Punkte sind lokal isolierte Implementierungsdetails innerhalb genau dieses einen Screens bzw. seiner extrahierten Helper-Module (`movieDetailLogic.ts`, `movieDetailNavigation.ts`) — Routen-Parameter-Namen, Aktionsleisten-Copy, Trailer-Mechanik und UI-Feinschliff ließen sich jeweils lokal austauschen, ohne `useMovieDetail`/`useMovieDetailMutations` oder andere Screens anzufassen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6-Cleanup — `movie-detail`-Routen-Korrektur: echter Pfad, Source-Enum-Mapping, `as never`-Casts entfernt

**Problem/Lücke:** Die fünf M6-part-2b-Sub-View-Screens (`collection/[collectionId].tsx`, `filmography/{director,actor,studio}/[...].tsx`, `similar/[tmdbId].tsx`) navigierten alle zu einem angenommenen, nie existierenden Pfad `/(app)/(modals)/movie-detail` mit `as never`-Casts (dokumentiert in "M6 — Angenommene `movie-detail`-Route" oben). Der echte, inzwischen gelandete Screen liegt tatsächlich unter `src/app/(app)/(modals)/movie/[tmdbId].tsx` — anderer Pfad (`movie/[tmdbId]`, nicht `movie-detail`) UND ein anderer Params-Vertrag (`groupId`, `source: "watchlist"|"diary"`, `watchlistEntryId`, `movieJson`), während der Ähnliche-Filme-Screen zuvor `source: "library"` geraten hatte — kein gültiger Wert im echten Enum.

**Entscheidung (vorläufig):**
- Alle fünf `router.push`-Aufrufe korrigiert auf `pathname: "/movie/[tmdbId]"` (kein `as never` mehr nötig — `.expo/types/router.d.ts` wurde neu generiert und enthält das Literal jetzt).
- `collection`/`filmography/{actor,director,studio}`: unverändertes Verhalten ansonsten — weiterhin nur `tmdbId` als Param, kein Gruppen-Kontext (diese vier Screens hatten nie eine Badge-abhängige Verzweigung, nur `similar` hatte das).
- `similar/[tmdbId].tsx`: die bestehende Badge-abhängige Verzweigung (Film bereits in der aktiven Gruppen-Bibliothek ja/nein) bleibt erhalten, aber korrekt auf den echten Enum gemappt — `getLibraryBadgeForTmdbId`s `"watched"` → `source: "diary"` (Nutzer hat bereits eine Bewertung/Diary-Zeile), `"watchlist"` → `source: "watchlist"` (unbewerteter Watchlist-Eintrag), `null` → kein Gruppen-Kontext (nur `tmdbId`, wie zuvor). Zusätzlich wird jetzt, wenn ein Badge vorliegt, die passende `watchlist_entries.id` aus den bereits geladenen `watchlistQuery.data.entries` per `tmdb_id`-Match nachgeschlagen und als `watchlistEntryId` mitgegeben — ohne das hätte der echte Movie-Detail-Screen trotz gesetztem `groupId`/`source` keine passende Zeile gefunden (`watchlistEntry`-Lookup dort matcht exakt auf `watchlistEntryId`) und wäre auf die "Film"-Platzhalter-Copy zurückgefallen, obwohl die echten Film-/Bewertungsdaten bereits im Speicher lagen — das wäre ein vermeidbarer Funktionsverlust gewesen, kein bloßes Detail.
- Zusätzlich (nicht explizit im Auftrag genannt, aber derselbe Ursache-/Cleanup-Kontext): die vier `as never`-Casts in `src/lib/movieDetailNavigation.ts` (`navigateToDirectorFilmography`/`navigateToActorFilmography`/`navigateToCollection`/`navigateToSimilarMovies`) wurden ebenfalls entfernt — sie zeigten bereits auf echte, existierende Routen und waren nur durch dieselbe veraltete `.expo/types/router.d.ts`-Generierung blockiert, die jetzt aktualisiert ist. Die zwei echten M7-Platzhalter (`navigateToRatingDialog`/`navigateToEditFlow`) behalten ihren `as never`-Cast, da diese Routen noch nicht existieren.
- `.expo/types/router.d.ts` wurde durch einen kurzen `npx expo start`-Lauf neu generiert (die Datei ist `.gitignore`t, rein lokal — jede Umgebung, die `tsc`/`expo start` einmal laufen lässt, bekommt dieselbe aktuelle Generierung).

**Warum das später leicht änderbar ist:** Jeder Aufruf ist weiterhin eine isolierte `router.push(...)`-Zeile in genau einer `onPressItem`-Closure pro Screen (bzw. eine Zeile pro `navigateToX`-Funktion in `movieDetailNavigation.ts`) — keine strukturelle Kopplung an `MovieGrid`, die Hooks oder die Badge-/Filter-Logik. Das `badge`→`source`-Mapping ist ein einzeiliger Ternary, austauschbar ohne Rückwirkung auf `getLibraryBadgeForTmdbId` selbst.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6-Cleanup — MovieGrid: Inline-Style-Ausnahme für dynamische Fortschritts-Breite

**Problem/Lücke:** `MovieGrid.tsx`s Fortschrittsbalken-Füllung baute ihre Breite über eine Laufzeit-Template-Literal-Klasse (`` `w-[${percent}%]` ``) — NativeWind/Tailwinds JIT kann beliebige (`arbitrary`) Klassenwerte nur extrahieren, wenn sie zur Build-Zeit statisch bekannt sind; ein zur Laufzeit interpolierter Prozentwert wird dort NIE als echte CSS-Regel erzeugt, die Klasse ist also praktisch wirkungslos. Das verstößt gegen die Projekt-Standing-Regel "NativeWind-Klassen statt Inline-Styles", die aber genau für diesen strukturell unlösbaren Fall eine schmale, explizit genehmigte Ausnahme vorsieht.

**Entscheidung (vorläufig):** Nur für dieses eine Element (den Fortschrittsbalken-Fill-`View`) wird `style={{ width: `${percent}%` }}` statt einer `w-[...]`-Klasse verwendet, mit Code-Kommentar direkt an der Stelle, der die Begründung erklärt. Alles andere an der Komponente (Farben, Layout, Border-Radius, die äußere Balken-Hülle) bleibt unverändert auf NativeWind-Klassen. Diese Ausnahme ist bewusst NICHT verallgemeinerbar: sie gilt nur für echte, kontinuierliche Laufzeitwerte ohne diskretes Klassen-Äquivalent (ein Prozentsatz zwischen 0 und 100 mit beliebiger Nachkommastelle) — keine feste Anzahl möglicher Werte ließe sich sinnvoll als vordefinierte Klassenliste ausrollen, anders als z. B. ein Badge mit nur zwei/drei Zuständen (dort bleiben feste Klassen/Ternaries wie bisher Pflicht).

**Warum das später leicht änderbar ist:** Eine einzelne `style`-Prop an genau einem `View`-Element in genau einer Datei — falls NativeWind zukünftig echte Laufzeit-Arbitrary-Values unterstützt (z. B. über CSS-Custom-Properties), ist das ein lokaler Ein-Zeilen-Tausch zurück auf eine Klasse, ohne Auswirkung auf den Rest der Komponente.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M6-Cleanup / M7-Vorgriff — `movies`-Tabelle ohne INSERT/UPDATE-RLS: Add-Movie-Mechanismus offen

**Problem/Lücke:** Die `movies`-Tabelle hat für `authenticated` aktuell KEINE INSERT/UPDATE-RLS-Policy (Catalog-Schreibzugriffe sind laut der M1-Migration bewusst nur einer service-role Edge Function vorbehalten, siehe deren Migrations-Kommentar). Das bedeutet: ein Film, der noch nie zur Watchlist IRGENDEINER Gruppe hinzugefügt wurde (also noch keine `movies`-Zeile hat), kann über `useAddToWatchlist`/`addToWatchlist` (`src/lib/movieDetailMutations.ts`) aktuell NICHT hinzugefügt werden — die Funktion schlägt bewusst früh und sauber fehl (`{ data: null, error: new MovieNotCatalogedError(tmdbId) }`), statt einen zum Scheitern verurteilten RLS-abgelehnten Insert zu versuchen.

**Entscheidung (vorläufig):** Dies ist KEIN Bug, der jetzt zu fixen wäre, und wird auch NICHT stillschweigend umgangen — es ist eine echte, bewusst offene Architekturfrage, die absichtlich auf Milestone M7 ("Add-Movie- & Rating-Flows") verschoben wird, weil M7 der natürliche Ort ist, den tatsächlichen Mechanismus festzulegen. Zwei Optionen stehen dafür zur Wahl, beide mit echten Sicherheits-/Architektur-Implikationen, die eine bewusste Nutzer-Entscheidung brauchen (kein "vertretbarer stiller Default" im Sinne dieses Dokuments):
1. Eine neue, bewusst eingeschränkte `authenticated`-INSERT-Policy auf `movies` (z. B. nur bestimmte Spalten, oder nur im selben Request wie ein `watchlist_entries`-Insert per Trigger/Constraint).
2. Eine service-role Edge Function, die den Film-Datensatz zuerst per TMDB-Daten upserted und danach den `watchlist_entries`-Insert vornimmt (analog zum bestehenden Muster "Catalog-Schreibzugriffe nur über service-role").

**Warum das später leicht änderbar ist:** `MovieNotCatalogedError` ist bereits ein eigener, `instanceof`-prüfbarer Fehlertyp, den die UI-Schicht gezielt abfangen kann (aktuell zeigt der Movie-Detail-Screen dafür einen generischen Fehler-Alert) — welche der beiden Optionen M7 auch wählt, der Aufrufer-Code ändert sich nicht strukturell, nur `addToWatchlist`s interner "Film nicht gefunden"-Zweig wird durch den echten Mechanismus ersetzt oder ergänzt.

**Status:** Offen — **dies ist explizit eine echte Architekturfrage für M7, keine vorläufige Cleanup-Entscheidung** — der Nutzer entscheidet in M7 zwischen den beiden oben genannten Optionen (oder einer dritten), bevor der Add-Movie-Flow dort implementiert wird. **Update (M7 Teil 1): entschieden — Option 2 gewählt und umgesetzt.** Siehe "M7 Teil 1 — `upsert_movie`-Action" unten für die konkrete Implementierung. `addToWatchlist`s "Film nicht gefunden"-Zweig selbst wurde in dieser Arbeit noch NICHT umgeschrieben, um `upsert_movie` aufzurufen — das bleibt bewusst ein separater Folgeschritt in `src/` (außerhalb des Scopes dieser Edge-Function-only-Arbeit, siehe Standing-Rule 3 dieses Tasks), ist aber jetzt möglich, da die Server-Seite existiert.

---

## M7 Teil 1 — `upsert_movie`-Action: exakte `movies`-Spalten-Zuordnung, Idempotenz-Ansatz, Genre-Upsert-Strategie

**Problem/Lücke:** Die neue `upsert_movie`-Action bekommt nur `{ tmdbId: number }` als Input — kein `name`/`poster`/`overview` vom Client (anders als die alte `addMovie`-API, die diese Felder vom Client bekam, weil der Client sie bereits aus dem TMDB-Suchergebnis hatte). Der Task-Auftrag verlangt aber exakt diese Felder in der `movies`-Zeile (M1-Schema: `tmdb_id`, `name` NOT NULL, `release_date`, `poster`, `overview`, `runtime`, `director`, `director_id`, `vote_average` — verifiziert gegen `supabase/migrations/20260919120000_watch_group_core_schema_and_rls.sql` Zeilen 40–51). Das bereits gebaute M6 `fetchMovieDetails` (`tmdb-client.ts`) lieferte bisher weder Titel/Poster/Overview noch die rohen TMDB-Genre-IDs (nur bereits über `mapGenreIds` in deutsche Namen umgewandelte Strings) — beides fehlte, weil M6s `details`-Action-Konsumenten (Movie-Detail-Screen) diese Felder bereits von anderswo hatten (Route-Params/DB-Zeile).

**Entscheidung (vorläufig):**
- **Erweiterung statt Neuimplementierung:** `fetchMovieDetails`/`RawTmdbMovieDetails`/`NormalizedMovieDetails` in `tmdb-client.ts` wurden rein additiv um `title`, `overview`, `posterPath`, `releaseDate` (alle vom selben `/movie/{id}`-Response, der ohnehin schon geholt wird) sowie `genreIds: number[]` (die rohen TMDB-IDs neben den bereits gemappten `genres: string[]`-Namen) erweitert — bestehende Felder/Shape unverändert, damit die bereits ausgelieferte `kind:"details"`-Action für ihre bisherigen Konsumenten rückwärtskompatibel bleibt (zusätzliche Felder in der JSON-Antwort sind harmlos).
- **`language: "de-DE"` neu gesetzt** beim `/movie/{id}`-Call (vorher kein `language`-Parameter, also TMDBs Default). Konsistent mit jeder anderen Deutsch-bevorzugenden Action in dieser Datei (Suche, Release-Dates, Genre-Namen). Einziger beobachtbarer Effekt auf die bestehende `details`-Action: `belongs_to_collection.name` kann jetzt auf Deutsch statt im vorherigen Default kommen; `runtime`/gemappte Genre-Namen/`vote_average` sind unberührt.
- **`movies`-Spalten-Zuordnung** (exakt gegen die Migration verifiziert): `tmdb_id` ← Input-`tmdbId`; `name` ← `details.title` (Fallback: Platzhalter `` `TMDB #${tmdbId}` ``, falls TMDB ausnahmsweise keinen Titel liefert — NOT-NULL-Spalte); `release_date` ← deutsches Release-Datum (`fetchGermanReleaseDates`/`selectGermanReleaseDate`) bevorzugt, Fallback auf `details.releaseDate` (globales TMDB-Datum), sonst `null`; `poster` ← `details.posterPath`; `overview` ← `details.overview`; `runtime` ← `details.runtime`; `director`/`director_id` ← `fetchMovieCredits(tmdbId).director?.name`/`.id` (erste Crew-Person mit `job === "Director"`, bereits bestehende `extractDirector`-Logik aus M6); `vote_average` ← `details.vote_average`.
- **Idempotenz-Ansatz:** `upsertMovie()` prüft zuerst per `findMovieByTmdbId` (SELECT auf `tmdb_id`), ob die Zeile schon existiert — wenn ja, sofortiger Return der existierenden `id`, KEIN TMDB-Fetch und KEIN Insert-Versuch. Zusätzlich (über die im Auftrag geforderte sequenzielle Idempotenz hinaus, aber dieselbe Kategorie "günstig, reversibel"): da `movies.tmdb_id` UNIQUE ist, könnten zwei GLEICHZEITIGE `upsert_movie`-Aufrufe für denselben neuen Film beide den "existiert noch nicht"-Check passieren, bevor einer von beiden inserted hat — der zweite Insert würde dann einen Unique-Violation-Fehler (Postgres-Code `23505`) werfen. `createSupabaseMovieUpsertDb`s `insertMovie` fängt genau diesen Fehlercode ab und liest die inzwischen existierende Zeile per erneutem SELECT nach, statt einen 500er nach außen zu geben — macht die Action auch unter dieser Race idempotent, nicht nur bei sequenziellen Wiederholaufrufen. Eine analoge Race-Absicherung für `genres`-Inserts (gleichzeitiger Insert desselben `tmdb_genre_id` durch zwei parallele `upsert_movie`-Aufrufe für unterschiedliche Filme mit überlappenden Genres) wurde NICHT gebaut — bewusst als kleine, dokumentierte, akzeptierte Lücke belassen, da sie außerhalb der im Auftrag geforderten Test-Matrix liegt und die zusätzliche Komplexität (Batch-Insert mit partiellem Konflikt) den Nutzen für einen seltenen Fall aktuell nicht rechtfertigt.
- **Genre-Upsert-Strategie:** Ein einziger `findGenresByTmdbGenreIds`-Lookup (`WHERE tmdb_genre_id IN (...)`) für ALLE Genre-IDs des Films auf einmal, dann werden nur die tatsächlich fehlenden IDs per `insertGenres` (Batch-Insert) neu angelegt — der (deutsche) Name für eine neue Genre-Zeile kommt aus `mapGenreIds([id])[0]` (dieselbe M6-Funktion/-Tabelle, wiederverwendet statt dupliziert), mit Fallback auf `String(id)` für den (bei echten TMDB-IDs nicht erwarteten) Fall einer unbekannten ID. Anschließend werden `movie_genres`-Zeilen für ALLE Genres (die bereits existierenden + die neu inserteten) verlinkt. Ein Film ganz ohne Genres überspringt sämtliche Genre-Tabellen-Zugriffe komplett (kein leerer `IN ()`-Call).
- **Architektur der Testbarkeit:** `upsertMovie()` nimmt ein injizierbares `MovieUpsertDb`-Objekt (benannte Methoden: `findMovieByTmdbId`/`insertMovie`/`findGenresByTmdbGenreIds`/`insertGenres`/`insertMovieGenres`) statt eines rohen `SupabaseClient` entgegen — Tests injizieren einfache Fakes und können exakt prüfen, welche DB-Operation mit welchem Payload aufgerufen wurde, ohne Postgrest-Query-Builder-Chains mocken zu müssen. `createSupabaseMovieUpsertDb()` ist die echte, produktive Implementierung (service-role Client, wie der Rest dieser Edge Function). Kein manuelles String-Concatenation/Interpolation in irgendeiner Query — alle Werte gehen durch die normalen `.insert()`/`.select()`/`.eq()`/`.in()`-Methoden des Supabase-JS-Clients, die intern parametrisieren; ein dedizierter Test (`movie-upsert.test.ts`) belegt, dass ein Filmname mit Apostroph/Anführungszeichen/Zeilenumbruch unverändert im Insert-Payload ankommt.

**Warum das später leicht änderbar ist:** Die `tmdb-client.ts`-Erweiterungen sind rein additive Felder auf einem bestehenden Rückgabetyp — kein bestehender Aufrufer musste angepasst werden (verifiziert: nur `index.ts`s `details`-Case und die neue `movie-upsert.ts` importieren `fetchMovieDetails`). Die `movies`-Spalten-Zuordnung ist eine einzelne Objekt-Literal-Stelle in `upsertMovie()`. Der Idempotenz-/Race-Umgang ist auf `createSupabaseMovieUpsertDb`s `insertMovie` beschränkt (ein `if`-Zweig), betrifft die reine Orchestrierungslogik/Tests nicht. Die Genre-Upsert-Strategie ist ein isolierter Codeblock innerhalb `upsertMovie()`, austauschbar (z.B. gegen eine echte Postgres-`ON CONFLICT DO NOTHING`-Upsert-Query über ein RPC) ohne Änderung an `MovieUpsertDb`s Interface-Signatur.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — `paid_at`-Prioritätskette: Einordnung des "Gesehen am"-Datums

**Problem/Lücke:** Der Task-Auftrag für den Rating-Dialog verlangt eine 4-stufige Prioritätskette für `paid_at` (explizit übergebenes neues Datum > bestehendes `paid_at` > das im selben Dialog eingegebene "Gesehen am"-Datum > "heute"), bezeichnet als Versöhnung "zweier Doc-Aussagen, die dort nicht vollständig querverwiesen wurden". Die feature-inventory.md selbst enthält dazu zwei Aussagen, die beide NUR eine 3-stufige Kette kennen (ohne "Gesehen am" als Zwischenstufe):
  - §2.1: *„`paid_at` wird beim Bearbeiten/Bewerten NICHT überschrieben, wenn bereits ein Datum existiert (kritischer Bugfix, siehe Abschnitt 6) — API bevorzugt explizit übergebenes Datum, sonst existierendes `paid_at`, sonst „heute" (`api.php:580-584`)."*
  - §6 (Changelog `4550aa1`): *„Beim Bearbeiten/Bewerten eines Films darf ein bereits gesetztes Zahlungsdatum NIEMALS stillschweigend auf "heute" zurückgesetzt werden, außer es wird explizit ein neues Datum übergeben oder es existierte noch keins."*
  - Zum Vergleich, die eigenständige Tracker-„Zahlung erfassen"-Modal (§2.1) kennt ebenfalls nur "Datum (Default: heute)" — auch dort kein Bezug zu einem Sehdatum, weil dieser Dialog gar kein "Gesehen am"-Feld hat.

Keine der drei Stellen erwähnt je ein "Gesehen am"-Datum als Fallback-Kandidaten — schlicht weil keine von ihnen den Fall betrachtet, dass die Zahlungs-Erfassung UND die "Gesehen am"-Eingabe im selben Dialog-Save zusammenfallen (das ist nur im hier gebauten Rating-Dialog der Fall, nicht im eigenständigen Tracker-Modal).

**Entscheidung (vorläufig):** Für Zahlungen, die über die in den Rating-Dialog eingebettete Bezahl-Sektion gesetzt werden (nicht für die eigenständige Tracker-„Zahlung erfassen"-Modal, die kein "Gesehen am"-Feld hat und daher weiterhin nur die ursprüngliche 3-stufige Kette bräuchte, falls/wenn sie in einem späteren Milestone gebaut wird), wird das im selben Save eingegebene "Gesehen am"-Datum als zusätzliche Zwischenstufe zwischen "bestehendes `paid_at`" und "heute" eingefügt — sinnvoller Default: wurde ein Film nachträglich für ein vergangenes Sehdatum bewertet und dabei erstmals eine Zahlung zugeordnet, ist "an dem Tag, an dem der Film geschaut wurde" ein plausiblerer Zahlungstag als das Eingabedatum ("heute"). Implementiert in `resolvePaymentDate(explicitDate, existingPaidAt, seenAtDate, now)` (`src/lib/ratingLogic.ts`), alle 4 Zweige TDD-abgesichert (`__tests__/ratingLogic.test.ts`).

**Warum das später leicht änderbar ist:** Eine einzelne, pur getestete Funktion mit vier `if`-Zweigen — die dritte Stufe (Zeile `if (seenAtDate) return seenAtDate;`) ließe sich ersatzlos streichen, um exakt auf die ursprüngliche 3-stufige `api.php`-Kette zurückzufallen, ohne die übrigen drei Zweige oder ihre Aufrufer (`useSaveRating`) zu berühren.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — Like-Herz auch im "Direkt Bewerten"-Dialog

**Problem/Lücke:** feature-inventory.md §4.4 flaggt selbst explizit eine mögliche Lücke im Legacy-Code: *„Setzbar: im Rating-Dialog (Herz-Button neben Sternen), im "Film bearbeiten"-Dialog (Tagebuch), NICHT im "Direkt Bewerten"-Dialog (kein Herz-Button dort implementiert — zu prüfen, ob gewollt oder Lücke)."*

**Entscheidung (vorläufig):** Für diese Neuimplementierung wird das Like-Herz einheitlich in allen drei Kontexten (Watchlist-Erstbewertung, Tagebuch-Bearbeiten, Direkt Bewerten) angezeigt — `RatingDialog` unterscheidet UI/Verhalten nicht nach `mode` außer im Sheet-Titel. Es gibt keinen erkennbaren fachlichen Grund, warum ein "Mag ich" gerade im Direkt-Bewerten-Pfad fehlen sollte, und die Doc selbst stuft die Legacy-Lücke als wahrscheinlich unbeabsichtigt ein.

**Warum das später leicht änderbar ist:** Falls doch gewünscht, wäre das Ausblenden für `mode === "direct"` eine einzelne bedingte Prop (`onToggleLike={mode === "direct" ? undefined : ...}`) an der `StarRating`-Einbindung in `RatingDialog.tsx` — keine Änderung an `StarRating` selbst oder an den Mutationen nötig (das `liked`-Feld wird ohnehin immer mitgespeichert).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — "Einzelbewertung" (`renderRatingOverlayFor`) nicht gebaut

**Problem/Lücke:** feature-inventory.md §2.6 erwähnt einen separaten, minimaleren Dialog für eine "Einzelbewertung" (`renderRatingOverlayFor`), erreichbar über `renderRatingSection()`, und flaggt ihn selbst als vermutlich verwaist: *„(scheint aktuell nicht mehr direkt verlinkt, aber Funktion existiert weiterhin, evtl. Altlast/Fallback für stellvertretende Bewertung eines anderen Mitglieds)"*.

**Entscheidung (vorläufig):** Explizit NICHT für M7 gebaut — die drei im Task-Auftrag benannten Kontexte (Watchlist-Erstbewertung, Tagebuch-Bearbeiten, Direkt Bewerten) sind alle über den einen gemeinsamen `RatingDialog` abgedeckt. Eine vierte, separate "stellvertretende Bewertung für ein anderes Mitglied"-UI wäre ohnehin fachlich fragwürdig, da die `ratings`-RLS-Policies (`ratings_insert_own_row_only`/`ratings_update_own_row_only`) Schreibzugriffe strikt auf `member_id = auth.uid()` beschränken — eine stellvertretende Bewertung für ein anderes Mitglied wäre also serverseitig ohnehin abgelehnt worden, ganz unabhängig von dieser UI-Entscheidung.

**Warum das später leicht änderbar ist:** Reine Nichtimplementierung, kein bestehender Code muss geändert werden, falls doch gewünscht — würde einen neuen, eigenständigen Dialog plus eine RLS-Erweiterung (falls stellvertretende Bewertung tatsächlich gewollt ist) erfordern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — Reset-Button bewegt `rated_at` nicht

**Problem/Lücke:** feature-inventory.md nennt für den Reset/Löschen-Button nur "(setzt Rating auf 0/NULL zurück, deaktiviert wenn keine Bewertung vorhanden)" — keine Aussage dazu, ob `rated_at` beim Reset ebenfalls berührt wird.

**Entscheidung (vorläufig):** `resetRating()` (`src/lib/movieDetailMutations.ts`) aktualisiert ausschließlich `rating` (→ `null`) und `liked` (→ `false`, bekannte Regel "Löschen einer Bewertung setzt auch den Like zurück") — `seen_at`/`rated_at` bleiben unverändert. Begründung: ein Reset ist kein neues "Bewertungsereignis", sondern die Rücknahme eines vorherigen; `rated_at` erneut auf "jetzt" zu setzen würde ein zukünftiges serverseitiges NULL→Wert-Push-Trigger (ADR 0006, außerhalb des Scopes dieser Aufgabe) unnötig verwirren, wenn der Nutzer später erneut bewertet.

**Warum das später leicht änderbar ist:** Eine einzelne `.update({ rating: null, liked: false })`-Payload-Zeile in `resetRating()` — ein drittes Feld (`rated_at: null` oder `rated_at: now.toISOString()`) wäre eine Ein-Zeilen-Ergänzung.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — Bezahl-Sektion: kein "Zahlung löschen"-Gesture, kein Overwrite bei unverändertem Zahler

**Problem/Lücke:** feature-inventory.md §2.1 kennt zwar ein eigenständiges `deletePayment` (setzt `paid_by_member_id`/`paid_at` auf `NULL`) — aber das ist eine Tracker-Tabellen-Aktion (Löschen-Button auf einer bereits-bezahlt-Zeile), keine im Rating-Dialog selbst beschriebene Geste. Der Task-Auftrag für DIESEN Dialog spezifiziert nur einen Zahler-Picker ("jedes Gruppenmitglied auswählbar"), keine explizite "Zahlung wieder entfernen"-Interaktion innerhalb des Rating-Dialogs.

**Entscheidung (vorläufig):**
- Der Zahler-Picker im `RatingDialog` ist als Chip-Reihe umgesetzt, vorausgewählt mit dem aktuellen `paid_by_member_id` (falls gesetzt). Erneutes Antippen des bereits ausgewählten Chips deselektiert ihn wieder (`selectedPayerId = null`).
- Ist beim Speichern kein Zahler ausgewählt (`selectedPayerId == null`), wird `watchlist_entries.paid_by_member_id`/`paid_at` GAR NICHT angefasst — weder gelöscht noch neu gesetzt. Das eigentliche "Zahlung endgültig entfernen" bleibt Aufgabe der (in einem späteren Milestone zu bauenden) eigenständigen Tracker-Sektion (§2.1 `deletePayment`), nicht dieses Dialogs.
- Ist ein Zahler ausgewählt (ob neu oder unverändert derselbe wie zuvor), wird bei JEDEM Speichern ein `savePayment`-Call ausgeführt — harmlos idempotent, da `resolvePaymentDate` ein bereits bestehendes `paid_at` ohnehin bewahrt (siehe oben), der `paid_by_member_id`-Wert also bestenfalls unverändert neu geschrieben wird.

**Warum das später leicht änderbar ist:** Eine dedizierte "Zahlung entfernen"-Geste (z.B. ein expliziter "Zahlung löschen"-Button neben dem Picker, der `paid_by_member_id`/`paid_at` gezielt auf `NULL` setzt) wäre ein zusätzlicher, isolierter Button + eine neue kleine Mutation, ohne Änderung an der bestehenden Speichern-Logik.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — Kein neues Datepicker-Package: einfaches TT.MM.JJJJ-Textfeld

**Problem/Lücke:** Der Rating-Dialog braucht editierbare Datumsfelder ("Gesehen am", optional "Bezahlt am"). Im Projekt ist bislang KEINE Datepicker-Bibliothek installiert (`package.json` geprüft) — jede neue Abhängigkeit wäre laut der projektweiten "Zero autonomous decisions"-Hard-Rule genau die Art von Tooling-Entscheidung, die dem Nutzer vorab vorgelegt werden muss, keine stillschweigend wählbare Kleinigkeit.

**Entscheidung (vorläufig):** Für diese Implementierung wird ein einfaches `TextInput` im vertrauten deutschen Format TT.MM.JJJJ verwendet, mit zwei neuen, pur getesteten Konvertierungsfunktionen `parseGermanDateInput`/`formatDateForInput` (`src/lib/ratingLogic.ts`) für die TT.MM.JJJJ ↔ YYYY-MM-DD (Postgres `date`)-Umwandlung. Kein Kalender-Popup, keine Eingabemasken-/Validierungs-UI über die reine Regex-Formprüfung + Kalendergültigkeits-Check hinaus.

**Warum das später leicht änderbar ist:** Ein echter Datepicker würde nur die Eingabe-Komponente in `RatingDialog.tsx` ersetzen (`TextInput` → Picker-Komponente, die direkt ein YYYY-MM-DD liefert) — `parseGermanDateInput`/`formatDateForInput` würden dann schlicht ungenutzt, ohne dass `resolvePaymentDate`/`resolveSeenAtDate`/`buildRatingUpsertPayload` oder die Mutationen angepasst werden müssten (die arbeiten bereits durchgehend mit ISO-Datumsstrings).

**Status:** ✅ **RESOLVED (M7-Konsolidierung, Item 3):** Der Nutzer hat die konkrete Bibliothek bestätigt — `@react-native-community/datetimepicker` (Version `9.1.0`, per `npx expo install`, Expo-kompatibel). Siehe den neuen Eintrag "M7-Konsolidierung — Datepicker-Bibliothek" unten für die Umsetzungsdetails; dieser Eintrag hier bleibt als historisches Protokoll stehen.

---

## M7 Teil 2b — Rating-Mutationen in der bestehenden `movieDetailMutations.ts`, neuer Hook `useSaveRating.ts`

**Problem/Lücke:** Der Task-Auftrag erlaubte explizit beide Optionen für die Mutations-Platzierung ("useSaveRating.ts (oder ... eine bestehende Mutations-Datei erweitern, falls besser passend — prüfe movieDetailMutations.ts/useMovieDetailMutations.ts").

**Entscheidung (vorläufig):** Aufgeteilt: die rohen, nie werfenden Supabase-Aufrufe (`saveRating`, `resetRating`, `savePayment`) wurden zur bestehenden `src/lib/movieDetailMutations.ts` hinzugefügt (gleiche Kategorie "dünner, typisierter, nie werfender Supabase-Wrapper" wie `toggleLike`/`deleteWatchlistEntry`/`addToWatchlist` dort, operieren auf denselben zwei Tabellen). Die `useMutation`-Hooks selbst (`useSaveRating`, `useResetRating`) leben dagegen in der NEUEN, vom Task-Auftrag namentlich verlangten Datei `src/hooks/useSaveRating.ts` (nicht in `useMovieDetailMutations.ts`) — diese Datei orchestriert zusätzlich die `resolvePaymentDate`/`buildRatingUpsertPayload`-Business-Logik zwischen den beiden Supabase-Aufrufen, was mehr Eigenlogik ist, als die übrigen Hooks in `useMovieDetailMutations.ts` haben (die sind reine 1:1-Passthroughs).

**Hinweis zur parallelen Add-Movie-Modal-Aufgabe:** `src/lib/movieDetailMutations.ts` und ihre Testdatei wurden während dieser Arbeit zeitgleich auch von der parallelen Add-Movie-Modal-Aufgabe bearbeitet (deren `addToWatchlist`-Umbau auf `upsertMovie`). Beide Änderungssätze wurden ausschließlich additiv/chirurgisch (per gezielten Edits, nie per Volldatei-Überschreiben) vorgenommen und überschneiden sich nicht inhaltlich (unterschiedliche Funktionen im selben File) — zum Zeitpunkt der Abgabe dieser Aufgabe waren 3 `addToWatchlist`-bezogene Tests dort rot, weil die parallele Aufgabe zu diesem Zeitpunkt noch nicht abgeschlossen war; das betrifft ausschließlich deren Funktionsbereich, nicht `saveRating`/`resetRating`/`savePayment`.

**Warum das später leicht änderbar ist:** Ein Verschieben von `saveRating`/`resetRating`/`savePayment` in eine eigene `ratingMutations.ts`-Datei wäre ein reiner Import-Pfad-Wechsel in `useSaveRating.ts`, keine Verhaltensänderung.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — Erfolgs-/Fehler-Feedback via `Alert.alert`

**Problem/Lücke:** Der Task-Auftrag überließ die exakte Toast-/Message-Copy explizit dieser Aufgabe ("dein Call auf genaue Toast-/Message-Copy, dokumentiere es"). Im Projekt existiert bislang keine Toast-/Snackbar-Bibliothek.

**Entscheidung (vorläufig):** Wie bereits in `MovieDetailActionsBar` (M6, Fehler beim Hinzufügen zur Watchlist) wird `Alert.alert` verwendet, keine neue Toast-Bibliothek eingeführt. Exakte Texte:
- Erfolg: Titel **„Gespeichert"**, Nachricht **„Deine Bewertung wurde gespeichert."**
- Fehler beim Speichern: Titel **„Fehler"**, Nachricht **„Die Bewertung konnte nicht gespeichert werden. Bitte versuche es erneut."**
- Fehler beim Zurücksetzen: Titel **„Fehler"**, Nachricht **„Die Bewertung konnte nicht zurückgesetzt werden. Bitte versuche es erneut."**

Legacy-Verhalten (feature-inventory.md §2.6: „danach Toast „Film → Tagebuch" bei Erstbewertung bzw. „Film → Watchlist" bei Rating-Entfernung") wurde bewusst NICHT 1:1 übernommen — dieser bewegungs-beschreibende Toast-Text setzt eine echte visuelle Watchlist/Tagebuch-Bewegungsanimation voraus, die in dieser App (anders als im alten Single-Page-Client) über zwei getrennte Tab-Screens hinweg passiert und hier nicht Teil des Task-Scopes war.

**Warum das später leicht änderbar ist:** Drei String-Konstanten in `RatingDialog.tsx` (`SAVE_SUCCESS_TITLE`/`SAVE_SUCCESS_MESSAGE`/`SAVE_ERROR_TITLE`/`SAVE_ERROR_MESSAGE`/`RESET_ERROR_MESSAGE`) plus eine austauschbare `Alert.alert`-Aufrufstelle — ein Wechsel zu einer echten Toast-Bibliothek würde nur diese eine Datei berühren.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2b — `RatingDialog`-Prop-Zuschnitt

**Problem/Lücke:** Der Task-Auftrag überließ den exakten Prop-Zuschnitt explizit dieser Aufgabe.

**Entscheidung (vorläufig):** `RatingDialog` bekommt dieselben Daten-Shapes, die der bestehende Movie-Detail-Screen (M6 Teil 2a) bereits für dieselbe Watchlist-Zeile berechnet, statt eigene, abweichende Scalar-Props zu erfinden:
- `ratings: Rating[]` — ALLE Rating-Zeilen dieses `watchlist_entries`-Eintrags (eigene + fremde). Die eigene Zeile wird intern per `member_id === currentUserId` gefunden, statt als separate Prop übergeben zu werden — dadurch funktionieren alle drei Kontexte (inkl. einer brandneuen "Direkt Bewerten"-Zeile ohne eigene Rating-Zeile) einheitlich über denselben Code-Pfad.
- `groupMembers: GroupMemberRow[]` (aus `useGroupMembers`) und `displayNameById: Map<string,string>` — exakt dieselben Shapes, die der Movie-Detail-Screen bereits für `MovieDetailRatingsSection` aufbaut, für den Zahler-Picker bzw. die Namensauflösung wiederverwendet.
- `mode: "watchlist" | "diary" | "direct"` steuert AUSSCHLIESSLICH die Sheet-Titel-Copy — keine Verhaltensunterschiede, da die drei Kontexte laut Spec identisch funktionieren sollen (siehe Like-Herz-Entscheidung oben).
- Der Dialog re-synchronisiert seinen kompletten lokalen Entwurfs-State (Sterne, Like, Gesehen-am-Modus/-Datum, Zahler-Auswahl) bei jedem Übergang zu `visible=true` aus den aktuellen Props neu — der Entwurf wird NICHT über Schließen/Wiederöffnen hinweg im Component-State gehalten (verhindert, dass ein Entwurf für Film A beim Öffnen für Film B durchsickert).

**Warum das später leicht änderbar ist:** Alle vier Punkte sind lokale Prop-Interface-/State-Init-Entscheidungen in genau `RatingDialog.tsx` — der Aufrufer (Movie-Detail-Screen/Tagebuch-Screen) muss ohnehin verdrahtet werden, sobald dieser Dialog dort eingehängt wird (außerhalb des Scopes dieser Aufgabe, siehe Bericht), und könnte dabei bei Bedarf zusätzliche/andere Props anfordern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M7 Teil 2 — Add-Movie-Modal: `addToWatchlist`-Rewire, Studio-Debounce, Streaming-Filter-Stub, Duplicate-Warning-Copy, Quick-Add-Button, Manual-Date-Lücke

**Problem/Lücke:** Der Add-Movie-Modal-Auftrag brachte mehrere kleinere, aber reversible Implementierungsdetails mit, die der Auftrag entweder explizit als "vorläufige Entscheidung, hier loggen" markierte, oder die beim Bauen als kleinste sinnvolle Zwischenentscheidung auftraten.

**Entscheidungen (vorläufig):**

1. **`addToWatchlist`-Rewire (der eigentliche Kern dieser Aufgabe):** `src/lib/movieDetailMutations.ts`s `addToWatchlist` ruft jetzt zuerst `upsertMovie(tmdbId)` (`src/lib/tmdbProxy.ts`, neuer Client-Wrapper um die M7-Teil-1-Edge-Function-Action `upsert_movie`) auf, um die lokale `movies.id` zu bekommen/erzeugen, und inserted danach erst die `watchlist_entries`-Zeile mit dieser id. Der alte `MovieNotCatalogedError`-Fail-Fast-Sonderfall wurde VOLLSTÄNDIG entfernt (Klasse gelöscht, kein Re-Export mehr aus `src/hooks/useMovieDetailMutations.ts`) — dadurch musste auch `src/components/movie/MovieDetailActionsBar.tsx`s `instanceof MovieNotCatalogedError`-Zweig entfernt werden (fällt jetzt immer auf die generische Fehler-Alert-Copy zurück), da diese Datei sonst nicht mehr kompiliert hätte. Ein Scheitern von Schritt 1 (Edge-Function-Fehler) gibt `{ data: null, error }` unverändert zurück, BEVOR ein DB-Call versucht wird.
2. **Studio-Modus-Debounce (300ms):** Im Quelldokument nur für Film (350ms) und Regisseur/Besetzung (250ms) spezifiziert, nicht für Studio. Gewählt: 300ms (zwischen den beiden gegebenen Werten) — `src/hooks/useCompanySearch.ts`.
3. **Streaming-Filter-Toggle (nur Film-Modus): STUB.** Da die "meine Streaming-Dienste"-Präferenz erst M10 existiert, ist der Toggle sichtbar (`add-movie-streaming-filter-toggle`, Copy "Meine Streaming-Dienste (bald verfügbar)") und togglebar, aber `filterByMyStreamingStub` (`src/lib/addMovieLogic.ts`) ist eine reine Passthrough-Funktion — exakt dasselbe Muster wie `sortByMyStreamingStub` (M5, `src/lib/watchlistLogic.ts`).
4. **"Bereits gesehen"-Dialog, exakte Copy** (Quelldokument gab keine vor): Titel "Film bereits gesehen", Body `Dieser Film wurde bereits mit Ø {rating} Sternen bewertet. Trotzdem zur Watchlist hinzufügen?` (Rating auf eine Nachkommastelle formatiert, `formatAverageRating`), Buttons "Abbrechen" / "Trotzdem hinzufügen". Umgesetzt über die bestehende `Sheet`-Komponente (Konsistenz mit dem Rest der App). Die Duplikat-Prüfung (`findDuplicateRatedEntry`, `src/lib/addMovieLogic.ts`) matcht per TMDB-`tmdb_id` gegen die bereits geladenen `watchlist_entries` der ZIEL-Gruppe (nicht per lokaler `movie_id`, da der Film zu diesem Zeitpunkt evtl. noch gar nicht katalogisiert ist) und zählt nur echte Bewertungen (`rating != null && rating > 0`, dieselbe Schwelle wie an anderer Stelle im Repo).
5. **Quick-Add-Button statt Tile-Tap-Add (neuer, nicht vorab entschiedener Punkt):** Der Auftrag verlangt sowohl "Tapping a result tile navigates to that movie's Detail-Overlay" (Navigations-Konvention identisch zu `similar/[tmdbId].tsx`) ALS AUCH einen echten Add-Flow mit Manual-Date-Fallback und Duplicate-Warning VOR dem eigentlichen DB-Write. Diese beiden Anforderungen sind nur vereinbar, wenn "Tile antippen" (→ Navigation) und "Film hinzufügen" (→ Add-Flow) zwei getrennte Interaktionen sind. Entschieden: `MovieGrid` (`src/components/movie/MovieGrid.tsx`) bekommt eine neue, rein optionale Prop `onAddItem` — rendert dann pro Kachel einen kleinen "+"-Button oben rechts (Badge bleibt oben links, Score-Pille bleibt unten rechts), der NICHT `onPressItem` auslöst. Ohne die Prop (jeder bestehende M6-Aufrufer) ändert sich nichts. Alternative verworfen: einen komplett separaten, nicht-`MovieGrid`-basierten Tile-Renderer nur fürs Add-Movie-Modal zu bauen — hätte die "MovieGrid wo sinnvoll wiederverwenden"-Vorgabe des Auftrags unterlaufen.
6. **Manual-Date-Fallback — FLAGGED GAP, nicht still umgangen:** Der Auftrag verlangt ein zusätzliches manuelles Datumsfeld, wenn ein Film kein TMDB-`release_date` hat, "bevor der Add erlaubt wird". Umgesetzt als reines UI-Gate (`needsManualReleaseDate`, `src/lib/addMovieLogic.ts`): das Sheet blockiert den "Weiter"-Button, bis ein Wert eingegeben ist. ABER: es gibt aktuell KEIN Backend-Feld, in das dieses manuell eingegebene Datum geschrieben werden könnte — `movies.release_date` wird ausschließlich von der `upsert_movie`-Edge-Function aus TMDB-Daten gesetzt; die Action nimmt keinen Client-Override entgegen (`supabase/functions/tmdb-proxy/index.ts`s `upsert_movie`-Case liest nur `body.tmdbId`). Das eingegebene Datum wird also aktuell NIRGENDS persistiert — es gated nur den Add-Vorgang, ändert aber nicht, was am Ende in `movies.release_date` landet (bleibt `null`, falls TMDB nichts liefert). Das ist bewusst NICHT still mit einer erfundenen Zusatz-Tabelle/einem stillen Edge-Function-Vertragsbruch umgangen worden — echte Optionen (a) `upsert_movie` um einen optionalen `releaseDateOverride`-Parameter erweitern, oder (b) ein separates Nachpflege-Feld/-Flow — sind eine echte Architekturfrage, keine "billige, reversible" Detailentscheidung, und werden hier explizit als offener Punkt geflaggt statt entschieden.

**Warum das (größtenteils) später leicht änderbar ist:** Punkte 2–5 sind lokal isolierte, austauschbare Implementierungsdetails (ein Debounce-Wert, eine Stub-Funktion, ein Sheet-Copy-Konstante, eine optionale Component-Prop). Punkt 1 ist bereits die vom Auftrag verlangte finale Lösung, keine Zwischenlösung. Punkt 6 ist die Ausnahme — die UI-Gate-Existenz ist austauschbar, aber die eigentliche Persistenz-Frage braucht eine echte Entscheidung (Edge-Function-Vertragsänderung), bevor das manuelle Datum tatsächlich irgendwo ankommt.

**Status:** Punkte 1–5 offen für deine finale Bestätigung / Änderungswunsch. Punkt 6 (Manual-Date-Persistenz) war ein ECHTER offener Entscheidungspunkt — ✅ **RESOLVED (M7-Konsolidierung, Item 1):** `upsert_movie` akzeptiert jetzt ein optionales `manualReleaseDate`, siehe den neuen Eintrag "M7-Konsolidierung — `upsert_movie`: optionale `manualReleaseDate`" unten für die volle Umsetzung inkl. der Sicherheitsregel (TMDB-Datum gewinnt immer).

---

## M7-Konsolidierung — `upsert_movie`: optionale `manualReleaseDate`

**Problem/Lücke:** Die M7-Teil-2-Aufgabe (Add-Movie-Modal) hatte einen echten offenen Punkt geflaggt (siehe oben, "M7 Teil 2 — Add-Movie-Modal", Punkt 6): das manuell eingegebene Erscheinungsdatum (Fallback, wenn TMDB keins liefert) hatte keinen Zielort in der Datenbank — `upsert_movie` kannte nur `{ tmdbId }`.

**Entscheidung (vom Nutzer/koordinierender Session bereits final vorgegeben, hier nur umgesetzt):** `upsert_movie` (`supabase/functions/tmdb-proxy/movie-upsert.ts`, `index.ts`) akzeptiert jetzt ein optionales drittes Argument `manualReleaseDate?: string` (ISO-Datumsstring), das als DRITTER, niedrigster Fallback in der bestehenden Release-Date-Kette landet:

```
germanReleaseDate?.release_date ?? details.releaseDate ?? manualReleaseDate ?? null
```

**Sicherheitsregel (nicht verhandelbar, per Task-Vorgabe):** Ein client-seitig mitgeschicktes `manualReleaseDate` überschreibt NIEMALS ein echtes TMDB-Datum (weder das deutsche noch das globale) — es füllt ausschließlich eine echte Lücke. Das ist durch die `??`-Kette bereits strukturell garantiert; zusätzlich loggt die Funktion explizit (`console.log`), wenn ein mitgeschicktes `manualReleaseDate` ignoriert wird, weil TMDB bereits ein Datum hatte — für Beobachtbarkeit, nicht für die Entscheidung selbst. TDD-Nachweis: zwei neue Deno.test-Fälle in `movie-upsert.test.ts` ("SAFETY — a real global/German TMDB release date wins over a client-supplied manualReleaseDate"), die genau das Szenario "TMDB hat ein Datum UND der Client schickt trotzdem ein manuelles Datum mit" abdecken und `1999-03-30`/`1999-04-15` (TMDB) statt `2099-01-01` (manuell) erwarten.

Nur relevant auf dem NEU-Insert-Pfad — ein bereits katalogisierter Film (früher Return in `upsertMovie`) wird von dieser Action grundsätzlich nie geupdated, manuell oder sonst wie.

**Durchreichung:** `index.ts`s `upsert_movie`-Case validiert `manualReleaseDate` optional als `string` (400 bei Fehltyp) und reicht es durch. `src/lib/tmdbProxy.ts`s `upsertMovie(tmdbId, manualReleaseDate?)` lässt das Feld im Request-Body ganz weg, wenn nicht gegeben (gleiche Konvention wie `getStudioMovies`s optionales `page`). `src/lib/movieDetailMutations.ts`s `AddToWatchlistParams` bekam das gleichnamige optionale Feld, durchgereicht an `upsertMovie`. `src/app/(app)/(modals)/add-movie.tsx`s `performAdd` schickt es nur dann mit, wenn genau DIESER Film tatsächlich den Manual-Date-Fallback durchlaufen hat (`needsManualReleaseDate(item.releaseDate)`) — ein Quick-Add für einen Film mit echtem TMDB-Datum sendet nie ein (ggf. noch aus einem vorherigen, anderen Add übrig gebliebenes) `manualReleaseDate` mit.

**Warum das später leicht änderbar ist:** Reine Parameter-Durchreichung entlang einer bereits bestehenden Kette — keine neue Tabelle, kein neuer Vertrag außer dem einen optionalen Feld.

**Status:** ✅ Umgesetzt wie vorgegeben, TDD-abgesichert (siehe TMDB-gewinnt-Tests oben). Nicht mehr offen.

---

## M7-Konsolidierung — RatingDialog-Einbindung in die Movie-Detail-Overlay-Aktionsleiste

**Problem/Lücke:** `MovieDetailActionsBar.tsx` (M6) verlinkte "Bewerten"/"Bearbeiten"/"Direkt Bewerten" auf `navigateToRatingDialog`/`navigateToEditFlow` (`src/lib/movieDetailNavigation.ts`) — beides Platzhalter auf eine nie gebaute Route `/movie/rate/[watchlistEntryId]`. `RatingDialog.tsx` (M7 Teil 2b) war fertig gebaut, aber nirgends eingehängt.

**Entscheidung (vom Nutzer/koordinierender Session bereits final vorgegeben, hier nur umgesetzt):** `RatingDialog` wird direkt vom Movie-Detail-Screen (`src/app/(app)/(modals)/movie/[tmdbId].tsx`) als kontrollierter Overlay gerendert — exakt dieselbe Konvention wie die bereits bestehende Lösch-Bestätigungs-`Sheet` in derselben Datei (ein `visible`-Boolean plus ein separates "wofür"-Ziel-State-Objekt, `RatingDialog` bleibt permanent gemountet, `Sheet`s eigenes RN-`Modal` steuert die tatsächliche Sichtbarkeit).

- `MovieDetailActionsBar` bekam zwei neue, rein optionale Callback-Props (`onOpenRatingDialog(watchlistEntryId, mode)`, `onDirectRateEntryCreated(watchlistEntryId)`) statt der Navigations-Aufrufe. "Bewerten" ruft `onOpenRatingDialog(id, "watchlist")`, "Bearbeiten" ruft `onOpenRatingDialog(id, "diary")`, "Direkt Bewerten" ruft nach erfolgreichem `addToWatchlist` `onDirectRateEntryCreated(neueId)`.
- `movie/[tmdbId].tsx` hält `ratingDialogVisible`/`ratingDialogTarget` (`{ mode, watchlistEntryId, groupId }`) und rendert `RatingDialog` mit den bereits vorhandenen `groupMembersQuery`/`displayNameById`/`starColor`-Werten. Für "watchlist"/"diary" wird das Ziel-Entry (Ratings/Zahler/Zahldatum) aus der bereits geladenen `groupWatchlistQuery` (Route-`groupId`) aufgelöst; für "direct" (kein Gruppenkontext auf diesem Screen) gibt es dort keine passende Zeile — die Props fallen dann auf die für einen brandneuen Eintrag korrekten Defaults zurück (`ratings: []`, `paidByMemberId/paidAt: null`), `groupId` wird für diesen Fall auf `activeGroupId` gesetzt (dieselbe "erste Gruppe"-Übergangslösung wie an anderer Stelle im Screen).
- `navigateToRatingDialog`/`navigateToEditFlow` wurden komplett aus `src/lib/movieDetailNavigation.ts` entfernt (keine anderen Referenzen mehr im Repo außer der jetzt aktualisierten `MovieDetailActionsBar.test.tsx`).

**Cache-Invalidierung geprüft (kein Erweiterungsbedarf):** `useSaveRating`s bestehende `invalidateQueries({ queryKey: ["watchlist", groupId] })` (M7 Teil 2b) trifft GENAU den Query-Key, den sowohl `useGroupWatchlist` (Watchlist-/Tagebuch-Screens) als auch der Movie-Detail-Screen selbst für seine Ratings-Anzeige verwendet (`groupWatchlistQuery` — die einzige Quelle für `ratings`/`paid_by_member_id`/`paid_at` in diesem Screen; `useMovieDetail`s eigener `["movieDetail", tmdbId]`-Key liefert nur TMDB-Metadaten, keine Ratings). Eine erfolgreiche Speicherung im Dialog invalidiert also automatisch sowohl die Watchlist-/Tagebuch-Screens als auch die eigene Anzeige dieses Screens — keine Erweiterung von `useSaveRating` nötig.

**TDD-Nachweis:** Drei neue Wiring-Tests in `__tests__/screens/MovieDetail.test.tsx` ("RatingDialog wiring"-Block) decken alle drei Kontexte ab (direkt/watchlist/diary), plus aktualisierte Tests in `MovieDetailActionsBar.test.tsx` für die neuen Callback-Props (inkl. eines neuen Defensive-no-op-Tests für fehlendes `watchlistEntryId`).

**Warum das später leicht änderbar ist:** Beide Callback-Props sind rein optional und lokal in `MovieDetailActionsBar`; ein Wechsel zurück zu echter Navigation (z.B. wenn eine eigene Rating-Route doch gewünscht wird) würde nur die zwei `onPress`-Handler in `movie/[tmdbId].tsx` betreffen.

**Status:** ✅ Umgesetzt wie vorgegeben. M7 ist damit Ende-zu-Ende verdrahtet (Suche → Hinzufügen → Bewerten, aus beiden Kontexten) — siehe Abschlussbericht.

---

## M7-Konsolidierung — Datepicker-Bibliothek: `@react-native-community/datetimepicker`

**Problem/Lücke:** Sowohl der Rating-Dialog ("Gesehen am"/"Bezahlt am") als auch das Add-Movie-Modal (manuelles Erscheinungsdatum) verwendeten bislang ein reines `TextInput` mit manuellem String-Parsing (DD.MM.YYYY bzw. YYYY-MM-DD) — jeweils explizit als "braucht noch eine echte Tooling-Entscheidung" geflaggt.

**Entscheidung (vom Nutzer/koordinierender Session bereits final vorgegeben, hier nur umgesetzt):** `@react-native-community/datetimepicker` (Version `9.1.0`, per `npx expo install` — Expo-kompatibel, Standard-Wahl für React-Native-Date-Picker, geringes Risiko) ist jetzt installiert und als Expo-Config-Plugin in `app.config.ts` eingetragen.

- Neue gemeinsame Komponente `src/components/ui/DateField.tsx`: ein Pressable, das den aktuell gewählten/angezeigten Wert zeigt und beim Antippen den nativen Picker öffnet; die Konvertierung `Date` → ISO-"YYYY-MM-DD" passiert AUSSCHLIESSLICH an dieser einen Stelle (`selectedDate.toISOString().slice(0, 10)`).
- Die bestehenden, bereits getesteten reinen Konvertierungsfunktionen `parseGermanDateInput`/`formatDateForInput` (`src/lib/ratingLogic.ts`) wurden NICHT angefasst — `RatingDialog.tsx` reicht weiterhin genau diese Funktionen als Grenze zwischen `DateField`s ISO-String-Vertrag und dem restlichen (deutschen String-basierten) State/Business-Logic-Code durch. `resolvePaymentDate`/`resolveSeenAtDate`/`buildRatingUpsertPayload`/die Mutationen sind komplett unverändert.
- `RatingDialog.tsx`: "Gesehen am" und "Bezahlt am" nutzen jetzt `DateField` statt `TextInput` (inkl. Entfernung der bisherigen Inline-`style={{opacity: 0.5}}`-Ausnahme zugunsten einer CSS-Klasse in `DateField` selbst, gemäß Projektregel "CSS-Klassen statt Inline-Styles").
- `add-movie.tsx`: das manuelle Erscheinungsdatum-Feld nutzt ebenfalls `DateField`, direkt mit ISO-Strings (kein Deutsch-Format nötig, das Feld hat nie ein anderes Format als ISO verwendet).
- Tests: `RatingDialog.test.tsx`/`AddMovie.test.tsx`/`MovieDetail.test.tsx` mocken `@react-native-community/datetimepicker` als einfache `View`-Komponente (gleiche Konvention wie der bestehende `Ionicons`-Mock) und simulieren eine Datumsauswahl per `fireEvent(picker, "change", event, date)` statt `changeText`.

**Bekannte Einschränkung (keine visuelle Verifikation möglich):** Das native Picker-Verhalten (iOS-Spinner vs. Android-Dialog, tatsächliches Öffnen/Schließen-Timing) konnte in dieser Umgebung nicht visuell verifiziert werden — nur über RNTL-Tests mit gemocktem Picker. Das ist eine bekannte Lücke, kein stillschweigend übergangenes Risiko.

**Warum das später leicht änderbar ist:** `DateField` ist die einzige Stelle, die die native Picker-API berührt — ein Wechsel der Bibliothek würde nur diese eine Datei betreffen.

**Status:** ✅ Umgesetzt wie vorgegeben (Bibliothek vom Nutzer bestätigt). Nicht mehr offen.

---

## M8 — `computeNextPayer`-Tie-Break: `joined_at` aufsteigend

**Problem/Lücke:** Der Task-Auftrag für den Bezahl-Tracker gibt den Kern-Algorithmus vor (wer am längsten nicht bezahlt hat bzw. noch nie bezahlt hat, ist dran), flaggt aber selbst die Tie-Break-Fälle als offen: mehrere Mitglieder, die noch nie bezahlt haben, ODER mehrere Mitglieder mit exakt demselben letzten Zahldatum.

**Entscheidung (vorläufig):** Deterministischer Tie-Break nach `joined_at` aufsteigend — das am frühesten beigetretene Mitglied gewinnt. Gilt identisch für beide geflaggten Fälle (alle "nie bezahlt" ODER alle mit exakt gleichem letzten Zahldatum), und macht den allerersten Vorschlag einer brandneuen Gruppe (in der noch niemand je bezahlt hat) ebenfalls vollständig deterministisch, statt z.B. von der zufälligen Reihenfolge der `groupMembers`-Query abzuhängen.

**Warum das später leicht änderbar ist:** Der Tie-Break ist eine einzelne, isolierte Vergleichsklausel innerhalb der `compare()`-Funktion in `computeNextPayer` (`src/lib/trackerLogic.ts`) — ein Wechsel auf ein anderes Kriterium (z.B. alphabetisch nach Anzeigename, oder zufällig) würde nur diese eine Zeile betreffen, keine Änderung an der Haupt-Priorisierungslogik (nie-bezahlt vor bezahlt, ältestes Zahldatum zuerst).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M8 — Zahler-Button-Farben: Wiederverwendung der Gruppen-Theme-Palette statt hartcodiertem 3-Farben-Array

**Problem/Lücke:** Die Legacy-App wies jedem Zahler-Button eine von genau 3 hartcodierten Farben zu — eine echte Einschränkung, sobald eine Gruppe mehr als 3 Mitglieder hat (ein 4. Mitglied hätte gar keine eigene Farbe mehr bekommen können). Der Task-Auftrag benennt dies explizit als RESOLVED interim decision mit Vorgabe der Grundidee ("reuse existing group-theme color derivation pattern ... assign each member a color from the theme's palette by stable index"), überlässt aber die konkrete Umsetzung dieser Aufgabe.

**Entscheidung (vorläufig):** `src/lib/trackerLogic.ts`s `assignMemberColors(members)` nutzt die 6 benannten Gruppen-Theme-Akzentfarben (`gold`/`red`/`blue`/`green`/`purple`/`orange`, via `resolveGroupTheme` aus `src/lib/groupTheme.ts`) als Zahler-Farbpalette. Mitglieder werden nach `joined_at` aufsteigend sortiert und dann per Index (`index % 6`) einer Palettenfarbe zugewiesen — stabil (hängt nicht von der Reihenfolge der `groupMembers`-Query ab) und ohne harte Obergrenze: Gruppen mit mehr als 6 Mitgliedern wickeln die Palette einfach per Modulo erneut ab (zwei Mitglieder teilen sich dann dieselbe Farbe), statt zu crashen oder undefiniert zu bleiben. Dies ist eine bewusste Verbesserung gegenüber dem Legacy-Hardcoding, kein 1:1-Port.

**Warum das später leicht änderbar ist:** `MEMBER_COLOR_PALETTE`/`MEMBER_COLOR_THEME_NAMES` sind eine einzelne benannte Konstante in `trackerLogic.ts` — ein Wechsel auf eine größere/andere Farbpalette (z.B. eigene, nicht themengebundene Zahler-Farben) würde nur diese eine Liste betreffen, keine Änderung an `assignMemberColors`s Zuweisungslogik selbst.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M8 — Zahlungs-Berechtigungen: jedes Gruppenmitglied darf jede Zahlung bearbeiten/löschen

**Problem/Lücke:** feature-inventory.md schweigt sich dazu aus, wer eine bereits erfasste Zahlung bearbeiten oder löschen darf — nur der Zahler selbst? Nur wer sie ursprünglich erfasst hat? Jedes Gruppenmitglied?

**Entscheidung (vorläufig):** Jedes Gruppenmitglied darf jede Zahlung eines beliebigen anderen Mitglieds bearbeiten oder löschen — keine Einschränkung auf "nur der Zahler" oder "nur wer es erfasst hat". Dieselbe Begründung, die bereits in M7 Teil 2b für `savePayment` angewendet wurde (`watchlist_entries_update_group_members`-RLS-Policy erlaubt bereits jedem authentifizierten Gruppenmitglied ein UPDATE auf `watchlist_entries`, unabhängig von `paid_by_member_id`/`added_by`) — die neue `deletePayment`-Funktion (`src/lib/movieDetailMutations.ts`) nutzt exakt dieselbe UPDATE-Policy (setzt `paid_by_member_id`/`paid_at` auf `NULL`, statt sie zu setzen), es war also keine neue RLS-Policy nötig.

**Warum das später leicht änderbar ist:** Eine spätere Einschränkung (z.B. "nur der Zahler selbst darf löschen") wäre eine reine RLS-Policy-Änderung (`USING`-Klausel um `paid_by_member_id = auth.uid()` erweitern) plus ggf. ein Client-seitiger UI-Guard (Bearbeiten/Löschen-Buttons ausblenden) — keine strukturelle Änderung an `useTrackerPayments.ts`/`tracker.tsx` nötig.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M8 — `resolvePaymentDate`-Wiederverwendung mit vereinfachter Kette (kein "Gesehen am"-Fallback)

**Problem/Lücke:** Der Task-Auftrag verlangt explizit die Wiederverwendung von `resolvePaymentDate` (M7, `src/lib/ratingLogic.ts`) für die Tracker-eigenen Zahlungs-Flows, weist aber selbst darauf hin, dass der Tracker (anders als der Rating-Dialog) keinen "Gesehen am"-Kontext hat, in den die dritte Priorität der Funktion (`seenAtDate`) fallen könnte.

**Entscheidung (vorläufig):** Direkte Wiederverwendung von `resolvePaymentDate` OHNE jede Änderung an der Funktion selbst — `src/hooks/useTrackerPayments.ts`s `useSetPayment` ruft sie mit `seenAtDate = null` auf. Da `resolvePaymentDate` einen falsy-aber-nicht-`??`-Check für alle drei Datums-Parameter verwendet, fällt ein `null`/`undefined` an dieser Stelle einfach direkt zur vierten Priorität ("jetzt") durch, sobald weder ein explizites Datum noch ein bestehendes `paid_at` vorhanden ist — die effektive Kette wird dadurch exakt `explizites Datum > bestehendes paid_at > jetzt`, ohne dass `ratingLogic.ts` angefasst werden musste.

**Warum das später leicht änderbar ist:** Reine Aufrufer-seitige Entscheidung (ein `null`-Argument an einer bereits bestehenden, unveränderten Funktion) — betrifft nur `useTrackerPayments.ts`, keine Änderung an `resolvePaymentDate` selbst oder an dessen bestehenden Aufrufern (`useSaveRating.ts`).

**Status:** ✅ Umgesetzt wie vorgegeben (der Auftrag selbst nennt dies bereits als die erwartete Lösung, "reuse directly with a null/undefined seenAt argument"). Nicht mehr offen.

---

## M8 — Neuer Hook `useTrackerPayments.ts` statt Erweiterung von `useSaveRating.ts`

**Problem/Lücke:** Der Task-Auftrag überlässt es dieser Aufgabe, ob die Tracker-eigenen Zahlungs-Mutationen in eine bestehende Hook-Datei eingehängt oder als neue Datei angelegt werden.

**Entscheidung (vorläufig):** Neue Datei `src/hooks/useTrackerPayments.ts` mit zwei Hooks (`useSetPayment`, `useDeletePayment`), statt `useSaveRating.ts` zu erweitern. Begründung: `useSaveRating` bündelt bewusst einen RATING-Write MIT einem optionalen Zahlungs-Write (die kombinierte Speichern-Aktion des Rating-Dialogs) — die Tracker-eigenen Flows ("Zahlung erfassen", inline "Bearbeiten", inline "Löschen") berühren nie eine `ratings`-Zeile, nur `watchlist_entries.paid_by_member_id`/`paid_at`. Eine Wiederverwendung von `useSaveRating` hätte entweder einen sinnlosen No-Op-Rating-Upsert bei jedem Tracker-Save erzwungen, oder den Rating-Teil des Hooks nachträglich optional gemacht — beides unsauberer als zwei kleine, dedizierte Hooks, die direkt `savePayment`/`deletePayment` (`src/lib/movieDetailMutations.ts`) aufrufen. Die zugrundeliegenden Supabase-Wrapper-Funktionen selbst (`savePayment`, neu: `deletePayment`) leben weiterhin in der bestehenden `movieDetailMutations.ts`, exakt wie im Task-Auftrag vorgeschlagen ("check its current savePayment shape ... you'll likely extend/reuse rather than duplicate") — nur die Hook-Ebene (TanStack-Query-Wrapper) ist neu, nicht die Datenzugriffs-Ebene.

**Warum das später leicht änderbar ist:** Eine spätere Konsolidierung (z.B. alle Zahlungs-Hooks in eine gemeinsame Datei) wäre eine reine Datei-Verschiebung ohne Verhaltensänderung — beide neuen Hooks folgen exakt derselben `useMutation`+Invalidierungs-Konvention wie `useSaveRating`/`useMovieDetailMutations`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M8 — Inline-Löschen-Bestätigung statt Sheet: exakte Copy

**Problem/Lücke:** Der Task-Auftrag verlangt explizit KEINE Sheet/Modal für die "Löschen"-Bestätigung im Tracker (anders als die bestehende `Sheet`-basierte Lösch-Bestätigung im Movie-Detail-Screen, `MovieDetailActionsBar.tsx`) — "literally inline text + confirm/cancel buttons in the expanded row". Die exakte Copy ist im Quelldokument nicht vorgegeben.

**Entscheidung (vorläufig):** Bestätigungstext `"Wirklich löschen?"`, Buttons `"Abbrechen"` (`variant="secondary"`) / `"Löschen"` (`variant="danger"`) — bewusst dieselbe Button-Label-Konvention wie `MovieDetailActionsBar.tsx`s bestehende (Sheet-basierte) Lösch-Bestätigung, nur eben inline (`View` in der ausgeklappten Tabellenzeile, `tracker-row-{id}-delete-confirm`) statt in einer `Sheet`. Kein separater Bestätigungstitel nötig, da der Kontext (die bereits sichtbare, ausgeklappte Zeile mit Filmnamen) bereits eindeutig ist.

**Warum das später leicht änderbar ist:** Eine reine Copy-/Komponenten-Änderung lokal in `src/app/(app)/(tabs)/tracker.tsx`s Zeilen-Render-Funktion — keine Auswirkung auf `useDeletePayment` oder die zugrundeliegende `deletePayment`-Mutation.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M8 — Inline-Style-Ausnahme für Zahler-Button-Farben

**Problem/Lücke:** Die Zahler-Buttons (sowohl im "Zahlung erfassen"-Modal als auch im Tracker-Zeilen-Bearbeiten-Formular) brauchen pro Mitglied eine individuelle Hintergrund-/Rahmenfarbe aus `assignMemberColors` (siehe oben) — ein zur Laufzeit berechneter Hex-Wert ohne feste, im Voraus aufzählbare Werte-Menge. Das verstößt strukturell gegen die Projekt-Standing-Regel "NativeWind-Klassen statt Inline-Styles", genau wie bereits einmal bei `MovieGrid`s Fortschrittsbalken-Füllung (M6-Cleanup, siehe oben verlinkter Eintrag).

**Entscheidung (vorläufig):** Exakt derselbe, bereits dokumentierte und schmal gefasste Ausnahme-Präzedenzfall wie beim M6-Cleanup-Eintrag wird hier ein zweites Mal angewendet: `style={{ backgroundColor: color }}` bzw. `style={{ borderWidth: 1, borderColor: color }}` NUR auf dem einen Zahler-Button-`Pressable`-Element (`src/components/movie/PaymentModal.tsx` und `src/app/(app)/(tabs)/tracker.tsx`s Bearbeiten-Formular), mit Code-Kommentar direkt an beiden Stellen, der auf diesen Präzedenzfall verweist. Alles andere an diesen Komponenten (Layout, Typografie, Zustände) bleibt auf NativeWind-Klassen.

**Warum das später leicht änderbar ist:** Beide Stellen sind isolierte `style`-Props auf jeweils einem einzelnen `Pressable`-Element — betrifft keine andere Stelle der beiden Komponenten und folgt exakt demselben, bereits vom Nutzer zu bestätigenden Präzedenzfall (M6-Cleanup-Eintrag), sodass eine gemeinsame Entscheidung für beide Fälle möglich ist.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 1 — ⚠️ SCHEMA-EBENE: `invite_token`/`invite_enabled` als eigene Spalten statt Primärschlüssel-Wiederverwendung (löst ADR-0003-Mehrdeutigkeit auf)

**⚠️ Dies ist KEINE routinemäßige, günstige Detailentscheidung wie die übrigen Einträge in diesem Dokument — es ist eine Schema-Interpretation, die eine echte ADR-0003-Mehrdeutigkeit auflöst. Bitte explizit bestätigen oder korrigieren, bevor sie als endgültig gilt.**

**Problem/Lücke:** ADR 0003 (`docs/adr/0003-watch-group-data-model.md`) sagt wörtlich:

> "Invite-Link und Group-ID-Beitritt müssen beide auf derselben nicht erratbaren UUID basieren — es gibt keine zusätzliche, kürzere/erratbare Gruppen-ID." (Zeile 41)

und an anderer Stelle:

> "Owner ... kann ... Invite-Link regenerieren/widerrufen" (Zeile 14)
> "Teilbarer Invite-Link (wiederverwendbar, kein Auto-Ablauf, Owner kann jederzeit widerrufen/regenerieren)" (Zeile 20)

Wörtlich gelesen wäre "dieselbe UUID" `watch_groups.id`, der Primärschlüssel. Das steht aber im Widerspruch zur zweiten Aussage: der Owner kann den Invite-Link "regenerieren" — das kann sich unmöglich auf einen unveränderlichen Primärschlüssel beziehen, der von `watchlist_entries.group_id` etc. per Fremdschlüssel referenziert wird (eine Regenerierung würde entweder alle abhängigen Zeilen brechen oder eine kaskadierende Migration aller FKs erfordern, was ADR 0003 nirgends erwähnt oder beabsichtigt).

**Entscheidung (vorläufig, aber schema-relevant):** ADR 0003s "dieselbe UUID"-Formulierung wird so interpretiert, dass sie sich auf das UUID-*Format/die UUID-Eigenschaft* (nicht erratbar, gleicher Typ wie der Primärschlüssel) bezieht, nicht wörtlich auf die Primärschlüssel-Spalte selbst. Konkret:
- Neue Spalte `watch_groups.invite_token uuid not null default gen_random_uuid() unique` — eine vom Primärschlüssel `id` komplett unabhängige, aber ebenso nicht erratbare UUID.
- Neue Spalte `watch_groups.invite_enabled boolean not null default true`.
- Sowohl der teilbare Invite-LINK als auch der manuelle "Gruppen-ID"-Fallback-Eintrag lösen beide über `invite_token` auf (NICHT über die Primärschlüssel-Spalte `id`) — das erfüllt ADR 0003s Anforderung "beide nutzen dieselbe UUID" (dieselbe Spalte, für beide Zugangswege identisch), ohne den Primärschlüssel anzutasten.
- "Regenerieren" = Owner setzt `invite_token = gen_random_uuid()` per normalem `UPDATE watch_groups ... WHERE id = ...` — bereits durch die bestehende M1-Owner-only-UPDATE-RLS-Policy auf `watch_groups` abgedeckt (Whole-Row-Policy, keine neue Policy/RPC nötig). "Widerrufen" = `invite_enabled = false`; "Re-Aktivieren"/"Regenerieren impliziert Re-Aktivieren" = `invite_enabled = true` + neuer Token im selben Update.
- Migration: `supabase/migrations/20260920130000_group_invite_and_rpcs.sql`.

**Warum das später leicht änderbar ist:** Wäre die Interpretation falsch (d.h. ADR 0003 meint wirklich wortwörtlich die Primärschlüssel-UUID und ein "Regenerieren" war z.B. nie ernst gemeint oder sollte anders gelöst werden), wäre die Korrektur eine reine Spalten-Entfernung (`invite_token`/`invite_enabled` raus) plus Anpassung der beiden RPC-Funktionen, die stattdessen direkt auf `id` matchen würden — betrifft nur diese eine Migration plus die beiden RPCs, keine andere Tabelle oder bestehende Business-Logik.

**Status:** ⚠️ Offen für deine finale Bestätigung — diese Entscheidung wurde vom koordinierenden Session bereits vorab getroffen und dieser Implementierungsauftrag explizit angewiesen, sie so umzusetzen (nicht erneut zur Diskussion zu stellen), aber sie bleibt eine echte Schema-Interpretation und ist hier bewusst prominent geflaggt, damit du sie beim Durchgehen dieses Dokuments nicht überliest.

---

## M9 Teil 1 — Chicken-and-Egg-Lösung: SECURITY-DEFINER-RPCs statt komplexer INSERT-RLS-Policies

**Problem/Lücke:** M1 hatte bewusst keine INSERT-Policy für `watch_groups`/`watch_group_members` definiert (die "Nutzer erstellt seine erste Gruppe" / "Nutzer tritt einer Gruppe bei" Fälle lassen sich nicht sauber mit rein deklarativen RLS-Policies lösen, die selbst wieder auf Gruppenmitgliedschaft prüfen, welche zum Insert-Zeitpunkt noch nicht existiert).

**Entscheidung (vorläufig):** Zwei `SECURITY DEFINER`-Postgres-Funktionen (`create_watch_group`, `join_watch_group_by_token`), aufgerufen per `supabase.rpc(...)`, exakt dasselbe Muster wie der bereits bestehende M1-Owner-Succession-Trigger und der M5-Fast-Follow-`handle_new_user()`-Trigger. Beide Funktionen kapseln ihre jeweiligen INSERT(s) in einer einzigen Transaktion (Gruppe + Owner-Mitgliedschaft bzw. Mitgliedschaft-Insert mit `ON CONFLICT DO NOTHING` für Idempotenz). Es wird weiterhin keine INSERT-Policy für `authenticated` auf einer der beiden Tabellen definiert.

**Warum das später leicht änderbar ist:** Beide RPCs sind in sich geschlossene Funktionen mit stabiler Signatur (`p_name`/`p_color_theme` bzw. `p_token` → `uuid`); eine spätere Umstellung auf echte INSERT-RLS-Policies (falls je gewünscht) würde nur diese eine Migration betreffen, nicht die Client-Aufrufer (`src/lib/groups.ts`), solange die RPC-Namen/Signaturen erhalten blieben.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 1 — Fehlercode-Konvention für die neuen RPCs (`WC001`/`WC002`/`WC003`)

**Problem/Lücke:** Ein per `RAISE EXCEPTION` ausgelöster Postgres-Fehler braucht einen eigenen, vom Client zuverlässig unterscheidbaren Errcode, um z.B. "ungültiger/deaktivierter Einladungscode" von einem generischen Fehler zu trennen — Postgres selbst vergibt ohne explizite Angabe den generischen Code `P0001` für jede `RAISE EXCEPTION`, was keine Unterscheidung erlauben würde.

**Entscheidung (vorläufig):** Drei eigene, projektspezifische 5-Zeichen-SQLSTATE-Codes: `WC001` (Aufruf ohne authentifizierten Nutzer, beide RPCs), `WC002` (`create_watch_group`: ungültiger `p_color_theme`-Wert), `WC003` (`join_watch_group_by_token`: Token existiert nicht ODER `invite_enabled = false` — bewusst EIN gemeinsamer Code für beide Fälle, um nicht zu verraten, ob ein Token je existiert hat). Live gegen den lokalen PostgREST-Endpunkt verifiziert: Supabases Client surfaced einen so ausgelösten Fehler als `{ message, code, details, hint }` mit `code` exakt gleich dem gesetzten Errcode — `src/lib/groups.ts`s `isInvalidInviteTokenError()` prüft `error.code === "WC003"`.

**Warum das später leicht änderbar ist:** Reine String-Konstanten in der Migration plus einer Konstante in `src/lib/groups.ts` (`INVALID_INVITE_TOKEN_ERROR_CODE`) — eine spätere feinere Unterscheidung (z.B. "Token existiert nicht" vs. "Token deaktiviert" als zwei Codes) wäre eine additive Änderung an genau diesen zwei Stellen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 1 — Einladungscode-Eingabefeld: Parsing-Regel für Link vs. rohe Token-UUID

**Problem/Lücke:** Das bestehende M3-Eingabefeld ("Einladungscode / Gruppen-ID") musste neu interpretiert werden als Eingabe für den `invite_token` — unklar, ob Nutzer eine rohe UUID einfügen oder einen kompletten Deep-Link/Share-Link einfügen, und beides muss funktionieren, ohne dass eine echte Deep-Link-Infrastruktur existiert.

**Entscheidung (vorläufig):** Neue reine Funktion `extractInviteToken()` (`src/lib/inviteToken.ts`): Eingabe wird getrimmt, dann wird die erste RFC-4122-förmige UUID-Teilzeichenkette irgendwo im String gesucht (Regex `8-4-4-4-12`-Hex-Gruppen, case-insensitive) und kleingeschrieben zurückgegeben. Gibt `null` zurück, wenn keine UUID-förmige Teilzeichenkette gefunden wird (statt den rohen String ungeprüft an das RPC zu senden) — ein Eingabewert ohne jede UUID-Form kann nie ein gültiger Token sein, daher wird kein Netzwerk-Roundtrip dafür verschwendet. Deckt sowohl eine rohe Token-UUID-Eingabe als auch einen vollständigen Deep-Link (egal welches Schema/welche Domain) ab, solange die UUID irgendwo im String vorkommt.

**Warum das später leicht änderbar ist:** Eine reine, exportierte, direkt unit-getestete (`__tests__/inviteToken.test.ts`) Funktion mit einer einzigen Regel — eine strengere Prüfung (z.B. nur ein exaktes App-Deep-Link-Schema akzeptieren) wäre eine isolierte Änderung an dieser einen Funktion.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 1 — Navigation nach Erstellen/Beitreten: expliziter `router.replace` statt Verlass auf `useAuthGate`

**Problem/Lücke:** Der Task-Auftrag ging davon aus, dass die bestehende `useAuthGate`/`index.tsx`-Redirect-Logik (M3) eine neue Gruppenmitgliedschaft automatisch aufgreifen und in die App weiterleiten würde, verlangte aber explizit, das zu VERIFIZIEREN statt anzunehmen. Prüfung ergab: `useAuthGate` re-evaluiert nur bei einem Supabase-Auth-Event (`onAuthStateChange`: Sign-in/Sign-out/Token-Refresh) — eine reine Datenänderung (neue `watch_group_members`-Zeile) bei unverändert bestehender Session löst kein solches Event aus. Ohne Eingriff wäre der Nutzer nach erfolgreichem Erstellen/Beitreten auf diesem Screen "gestrandet", bis zum nächsten Auth-Event (z.B. App-Neustart).

**Entscheidung (vorläufig):** Dieser Screen navigiert nach einem erfolgreichen RPC-Aufruf explizit selbst per `router.replace("/(app)/(tabs)/tracker")` — derselbe Routen-String, den `src/app/index.tsx`s `'app'`-Gate-Zustand verwendet. `useAuthGate`/`index.tsx` selbst bleiben unverändert; sie greifen beim nächsten regulären Auth-Event (z.B. App-Neustart) ohnehin korrekt, da `getUserGroups` dann die neue Mitgliedschaft findet.

**Warum das später leicht änderbar ist:** Eine einzelne `router.replace(...)`-Zeile pro Erfolgsfall in `create-or-join-group.tsx`. Eine spätere, "sauberere" Lösung (z.B. `useAuthGate` einen manuellen `refetch()` spendieren, den dieser Screen nach Erfolg aufruft) wäre eine additive Erweiterung des Hooks, keine Änderung an dieser Navigations-Entscheidung nötig.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 1 — Fehlertext-Konvention (generisch vs. Token-spezifisch)

**Problem/Lücke:** Keine ADR-Vorgabe für die exakte Fehlertext-Copy bei einem fehlgeschlagenen Erstellen/Beitreten.

**Entscheidung (vorläufig):** Token-spezifischer Fall (ungültiger/deaktivierter Einladungscode, sowohl clientseitig durch `extractInviteToken()` als auch serverseitig durch den `WC003`-Errcode erkannt): fester Text `"Ungültiger oder deaktivierter Einladungscode."`. Jeder andere Fehler: Präfix + rohe Supabase-Fehlermeldung, exakt im selben Stil wie das bestehende Login-Screen-Muster (`` `Anmeldung fehlgeschlagen: ${error}` ``) — hier `` `Erstellen fehlgeschlagen: ${error.message}` `` bzw. `` `Beitritt fehlgeschlagen: ${error.message}` ``.

**Warum das später leicht änderbar ist:** Zwei Textstring-Konstanten/Template-Literale in `src/app/(onboarding)/create-or-join-group.tsx`, keine Auswirkung auf die zugrundeliegende Fehlerbehandlungs-Logik.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — "Aktive Gruppe": echter, persistierter State statt "erste Gruppe"

**Problem/Lücke:** Die M5-M8-Übergangslösung ("erste Gruppe aus `useUserGroups()` = aktive Gruppe", siehe M5-Eintrag oben) wird mit M9 Teil 1 unhaltbar, sobald ein Nutzer realistisch mehreren Gruppen angehören kann (Erstellen + Beitreten funktionieren jetzt echt). Es brauchte einen echten, persistierten Auswahl-Mechanismus plus eine UI dafür.

**Entscheidung:**
- `usePreferencesStore` (src/stores/usePreferencesStore.ts) bekommt ein neues Feld `activeGroupId: string | null` + `setActiveGroupId`, exakt nach dem bestehenden `lastActiveTab`/`watchlistViewMode`-Muster (persistiert über MMKV, `null` = "noch keine explizite Wahl getroffen").
- Neuer Hook `useActiveGroup(userId)` (src/hooks/useActiveGroup.ts): liest `activeGroupId` aus dem Store, validiert ihn gegen die AKTUELLE Mitgliederliste aus `useUserGroups(userId)`, und fällt auf die erste Gruppe zurück, wenn der gespeicherte Wert `null` ist ODER nicht mehr zu einer Mitgliedschaft passt (Nutzer hat die Gruppe verlassen, oder sie wurde nach 2 Wochen hart gelöscht). Der Fallback wird NICHT automatisch zurückgeschrieben — bei jedem Aufruf neu berechnet, bis der Nutzer aktiv über den neuen Gruppen-Umschalter (Group-Settings-Screen) etwas auswählt.
- Alle 4 Stellen, die vorher `userGroupsQuery.data?.[0]?.group_id` hartkodiert hatten (`watchlist.tsx`, `tagebuch.tsx`, `tracker.tsx`, `movie/[tmdbId].tsx`), nutzen jetzt ausschließlich diesen Hook.

**Warum das später leicht änderbar ist:** Der Hook exportiert zusätzlich die zugrunde liegende `groupsQuery`, sodass kein Aufrufer eine zweite `useUserGroups`-Instanz braucht. Die Fallback-Logik ist eine einzelne, klar isolierte, TDD-getestete Funktion (`__tests__/useActiveGroup.test.tsx`, inkl. expliziter Tests für den "gespeicherte ID ist veraltet"-Fall) — ein anderes Fallback-Verhalten (z.B. "zeige einen Auswahl-Dialog statt automatisch zu wechseln") wäre eine isolierte Änderung an genau dieser einen Funktion.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — Invite-Link-Regenerierung: SECURITY-DEFINER-RPC statt clientseitig generierter UUID

**Problem/Lücke:** M9 Teil 1s Migrationskommentar hatte "Regenerieren" als reines `UPDATE watch_groups SET invite_token = ...` skizziert (bereits durch die bestehende Owner-only-RLS-Policy abgedeckt) — der Task-Auftrag ließ aber ausdrücklich offen, ob der neue Token client- oder serverseitig generiert wird.

**Entscheidung:** Neue SECURITY-DEFINER-RPC `regenerate_invite_token(p_group_id uuid)` (`supabase/migrations/20260920140000_regenerate_invite_token_rpc.sql`), die serverseitig `gen_random_uuid()` erzeugt, die Owner-Rolle nochmal serverseitig prüft (neuer Errcode `WC004`, defense-in-depth zusätzlich zur ohnehin schon greifenden RLS-Policy) und `invite_enabled` im selben Update auf `true` setzt ("Regenerieren impliziert Re-Aktivieren", identisch zur M9-Teil-1-Regel). `src/lib/groups.ts`s `regenerateInviteToken(groupId)` ruft nur noch diese RPC auf, statt selbst `crypto.randomUUID()` aufzurufen und ein rohes `UPDATE` abzusetzen.

**Warum das später leicht änderbar ist:** Genau wie bei `create_watch_group`/`join_watch_group_by_token` — eine in sich geschlossene Funktion mit stabiler Signatur (`p_group_id uuid` → `uuid`). Eine spätere Umstellung auf den clientseitigen Ansatz (falls je gewünscht) würde nur diese eine Migration plus die eine `groups.ts`-Funktion betreffen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — Deep-Link-Format für den Einladungslink

**Problem/Lücke:** ADR 0003 beschreibt einen "teilbaren Invite-Link", ohne ein konkretes URL-Schema festzulegen. M3s Notizen zu Universal Links wurden laut Task-Auftrag als "noch nicht entschieden/aufgeschoben" markiert — es gibt also kein bereits etabliertes Format, an das sich anschließen ließe.

**Entscheidung:** Custom-Scheme-Deep-Link `watchcrew://join/<invite_token>` (Konstante `INVITE_LINK_SCHEME` in `src/app/(app)/(modals)/group-settings.tsx`). Kein Universal-Link/App-Link mit echter HTTPS-Domain — das würde eine verifizierte Domain + `apple-app-site-association`/`assetlinks.json`-Hosting voraussetzen, was für dieses Milestone nicht existiert.

**Warum das später leicht änderbar ist:** Eine einzelne String-Konstante an einer Stelle. Der eigentliche Beitritts-Mechanismus (`extractInviteToken()`, aus M9 Teil 1) ist bereits schema-agnostisch — er sucht nach einer UUID-förmigen Teilzeichenkette irgendwo im eingefügten Text, egal welches Schema/welche Domain davor steht. Eine spätere Umstellung auf Universal Links würde also nur diese eine Konstante ändern, nicht die Beitritts-Logik.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — Bestätigungsmuster für "Entfernen"/"Gruppe verlassen": inline statt Sheet

**Problem/Lücke:** Der Task-Auftrag verlangte, ein bereits etabliertes Bestätigungsmuster wiederzuverwenden (M6/M8-Präzedenzfälle), statt ein drittes neu zu erfinden — beide Kandidaten (Sheet-basiert vs. inline) existieren bereits im Code.

**Entscheidung:** Inline-Bestätigung, exakt nach dem M8-Tracker-Muster ("Wirklich löschen?" + Abbrechen/Löschen-Button-Reihe anstelle der Bearbeiten/Löschen-Buttons) — für BEIDE Fälle ("Entfernen" eines Mitglieds UND "Gruppe verlassen"), nicht ein `Sheet`. `Sheet` wird in dieser Codebase konsistent für Picker/Dialoge mit eigenem Inhalt verwendet (Sortier-Optionen, Rating-Dialog), nicht für reine Ja/Nein-Bestätigungen — M8 hatte diese Unterscheidung bereits getroffen.

**Warum das später leicht änderbar ist:** Betrifft nur die lokale Render-Verzweigung in `group-settings.tsx` (ein `removeTargetUserId`/`leaveConfirmVisible`-State-Flag pro Bestätigung) — eine Umstellung auf `Sheet` wäre eine rein lokale Änderung an genau diesen zwei Stellen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — Gruppen-Umschalter braucht die Namen ALLER Gruppen: neue `getWatchGroupsByIds`/`useGroupNames`

**Problem/Lücke:** Der Gruppen-Umschalter soll laut Task-Auftrag "eine Liste/ein Picker aller Gruppen des Nutzers" sein — aber `useUserGroups()` liefert nur `watch_group_members`-Zeilen (`group_id`/`user_id`/`role`/`joined_at`), NIE die Namen der Gruppen selbst. Ohne Namen wäre der Umschalter nur eine Liste roher UUIDs.

**Entscheidung:** Neue Funktion `getWatchGroupsByIds(groupIds: string[])` (`src/lib/groups.ts`) — ein gebündeltes `IN (...)`-Select über `watch_groups`, kurzschließt auf ein leeres Ergebnis für eine leere Id-Liste statt einer unnötigen `.in("id", [])`-Anfrage. Neuer Hook `useGroupNames(groupIds)` (`src/hooks/useGroupDetails.ts`) wrappt das in TanStack Query. Der Group-Settings-Screen lädt damit einmal die Namen ALLER Gruppen des Nutzers (nicht nur der aktiven) und zeigt sie im Umschalter über `groupDisplayLabel` (mit Uuid-Präfix-Fallback für eine noch nicht geladene Zeile).

**Warum das später leicht änderbar ist:** Reine, additive Datenabfrage nach demselben Muster wie `getGroupMembers`s Profile-Join — betrifft nur den Umschalter, keine andere Business-Logik. Eine spätere Umstellung auf einen echten PostgREST-Embed (falls je eine direkte FK-Beziehung dafür entsteht) wäre eine isolierte Änderung an genau dieser Funktion.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — `groupDisplayLabel` liegt in `diaryDisplay.ts`, nicht in `groups.ts`

**Problem/Lücke:** Der naheliegende Ort für eine "Gruppenname mit Uuid-Präfix-Fallback"-Hilfsfunktion wäre `src/lib/groups.ts` (wo auch `getWatchGroupsByIds` liegt) — das würde aber jeden Screen-Test, der nur diese reine Anzeige-Funktion importiert, zwingen, das GESAMTE `groups.ts`-Modul zu mocken, weil dieses Modul beim Import einen echten Supabase-/Realtime-Client konstruiert (bricht unter Jest mit "Node.js detected but native WebSocket not found", tatsächlich während dieser Aufgabe aufgetreten und behoben).

**Entscheidung:** `groupDisplayLabel(groupId, name?)` liegt stattdessen in `src/lib/diaryDisplay.ts`, direkt neben `memberDisplayLabel`/`genreDisplayLabel` — exakt dieselbe Begründung, warum jene beiden Funktionen schon dort und nicht in `groups.ts`/`watchlist.ts` liegen.

**Warum das später leicht änderbar ist:** Eine reine Funktionsverschiebung (kein Verhaltensunterschied) — falls eine spätere Reorganisation `diaryDisplay.ts` in mehrere themenspezifische Dateien aufteilen möchte, wäre das ein reiner Import-Pfad-Wechsel an den paar Aufrufstellen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — Namensfeld-Sync ohne eigenes Dirty-Tracking

**Problem/Lücke:** Das editierbare Namensfeld im Rename-Bereich muss beim Laden/Wechseln der aktiven Gruppe mit dem Server-Wert vorbefüllt werden — aber ein serverseitiger Refetch (z.B. nach erfolgreichem Speichern, durch die Cache-Invalidierung ausgelöst) könnte ein bereits wieder verändertes, noch nicht gespeichertes Eingabefeld überschreiben.

**Entscheidung:** Bewusst KEIN separates "dirty"-Tracking — ein `useEffect` synchronisiert das Eingabefeld einfach jedes Mal neu, wenn sich `groupDetailsQuery.data?.name` ODER die aktive Gruppen-Id ändert. Für diesen einfachen Owner-Solo-Anwendungsfall (kein Multi-Device-Konflikt-Szenario in diesem Milestone vorgesehen) ist das ausreichend: der Effect feuert nur bei einer echten Namensänderung von außen (Gruppenwechsel oder erfolgreiches eigenes Speichern selbst), nicht bei jedem Tastendruck.

**Warum das später leicht änderbar ist:** Betrifft nur einen einzelnen `useEffect`-Block in `group-settings.tsx`. Ein echtes Dirty-Tracking (z.B. "warne vor Verlust ungespeicherter Änderungen bei Gruppenwechsel") wäre eine rein additive Erweiterung an dieser einen Stelle.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — `useLeaveGroup` als eigener Hook statt Wiederverwendung von `useRemoveMember`

**Problem/Lücke:** "Gruppe verlassen" (ein Mitglied entfernt seine EIGENE Mitgliedschaft) und "Entfernen" (der Owner entfernt ein ANDERES Mitglied) reduzieren sich auf exakt dasselbe `DELETE FROM watch_group_members` — dieselbe RLS-Policy (`watch_group_members_delete_owner_or_self`) deckt beide Fälle ab. Ein einziger Hook hätte also fachlich gereicht.

**Entscheidung:** Trotzdem zwei separate Hooks (`useRemoveMember`/`useLeaveGroup`, beide in `src/hooks/useGroupSettings.ts`, beide rufen intern dieselbe `removeMember()`-Wrapper-Funktion auf) — der einzige Unterschied ist die Cache-Invalidierung nach Erfolg: "Entfernen" invalidiert nur `["groupMembers", groupId]` (der ausgeschlossene Nutzer ist nicht der aufrufende Client), während "Verlassen" ZUSÄTZLICH `["userGroups", userId]` invalidiert (die eigene Gruppenmitgliedschaftsliste des aufrufenden Nutzers ändert sich).

**Warum das später leicht änderbar ist:** Beide Hooks sind dünne, wenige-Zeilen-`useMutation`-Wrapper um denselben `removeMember()`-Aufruf — eine Konsolidierung zu einem einzigen parametrisierten Hook (falls je gewünscht) wäre eine rein interne Umstrukturierung ohne Auswirkung auf die Aufrufer in `group-settings.tsx`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M9 Teil 2 — Einstiegspunkt für das Group-Settings-Screen: "⚙️"-Button im Tracker-Header

**Problem/Lücke:** Es existiert noch keine Settings/Menü-Stelle irgendwo in der App (Settings selbst ist M10-Scope) — der Task-Auftrag verlangte explizit, zuerst zu prüfen, ob bereits ein Einstiegspunkt existiert (Tab-Screens, Root-Layout), bevor einer neu hinzugefügt wird. Geprüft: `src/app/(app)/(tabs)/_layout.tsx` (reiner Tab-Bar-Shell, kein Menü), `watchlist.tsx`/`tagebuch.tsx`/`tracker.tsx` (kein bestehender Settings-Zugang) — keiner gefunden.

**Entscheidung (ausdrücklich als vorläufige Platzierung markiert, keine endgültige Entscheidung):** Ein kleiner "⚙️"-Button im Tracker-Screen-Header (`src/app/(app)/(tabs)/tracker.tsx`, `testID="tracker-group-settings-button"`, `accessibilityLabel="Gruppe verwalten"`), navigiert per `router.push("/group-settings")`. Tracker gewählt statt Watchlist, da es der dritte/letzte Tab ist und der Button dort keine bestehende Button-Reihe (Ansichts-Umschalter) verdrängt, sondern nur neben dem bereits vorhandenen "💰"-Button steht.

**Warum das später leicht änderbar ist:** Eine einzelne Button-Definition + `onPress`-Handler in genau einer Datei. Sobald M10 einen echten Settings-Hub baut, wird dieser Button ersatzlos entfernt (oder zu einem Menüpunkt innerhalb des Hubs) — die Zielroute `/group-settings` selbst bleibt unverändert erreichbar.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Realtime-Filterung für `ratings`: unfiltert abonniert, Mitgliedschaft clientseitig geprüft

**Problem/Lücke:** `watchlist_entries` hat eine eigene `group_id`-Spalte, `ratings` (M1-Schema) aber nicht — nur `watchlist_entry_id`. Supabase Realtimes `postgres_changes`-`filter`-Option unterstützt ausschließlich Spalten-Vergleiche auf der abonnierten Tabelle selbst, keine Joins — eine serverseitige "nur Ratings dieser Gruppe"-Filterung ist für `ratings` also nicht direkt möglich.

**Entscheidung:** `src/hooks/useGroupRealtimeSync.ts` abonniert `ratings` UNGEFILTERT (alle Gruppen, alle Nutzer der App) und prüft bei jedem eingehenden Event clientseitig, ob die betroffene `watchlist_entry_id` in den bereits gecachten Einträgen der aktiven Gruppe (`queryClient.getQueryData(["watchlist", groupId])`) vorkommt — nur dann wird reagiert (Cache-Invalidierung, ggf. Toast). Ist die Watchlist der aktiven Gruppe noch nicht gecacht (Screen lädt gerade zum ersten Mal), wird das Event verworfen statt geraten — ein normaler App-Durchlauf lädt die Watchlist immer vor dem ersten Render eines der drei Tabs, das Zeitfenster ist also praktisch nur "vor dem ersten Paint".

Verworfene Alternative: ein `watchlist_entry_id=in.(id1,id2,...)`-Filter (von Realtime technisch unterstützt) — hätte aber erfordert, den Channel bei jeder Änderung der Eintragsliste (neuer Film hinzugefügt/entfernt) neu zu erstellen bzw. den Filter zu aktualisieren. Für eine kleine, "chatty" Freundesgruppen-App wurde der unfiltrierte `ratings`-Stream + clientseitiger Check als deutlich simpler bewertet.

**Warum das später leicht änderbar ist:** Reine, isolierte Logik in `src/hooks/useGroupRealtimeSync.ts` (die Membership-Prüfung) und `src/lib/realtimeSync.ts` (`extractWatchlistEntryId`). Sollte `ratings` später eine eigene `group_id`-Spalte bekommen (Schema-Änderung, außerhalb dieses Tasks), ließe sich direkt auf einen echten Server-Filter umstellen, ohne die Aufrufer (die drei Tab-Screens) zu ändern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Toast-Trigger-Typen: drei Arten, generische Copy ohne Namen

**Problem/Lücke:** ADR 0006 / feature-inventory.md (Abschnitt 2.6/4.2) beschreiben nur zwei historische Push-Trigger aus der alten App (neuer Watchlist-Eintrag, Erstbewertung NULL→Wert). Der Task-Auftrag verlangte "Toast-Copy für die drei Trigger-Typen, passend zu den Event-Typen der parallelen Push-Task" — ohne Garantie, dass sich beide Tasks exakt abstimmen können (parallele, unabhängige Bearbeitung).

**Entscheidung:** Drei Typen definiert in `src/lib/realtimeSync.ts` (`RealtimeChangeKind`): `watchlist_entry_added` ("Neuer Film zur Watchlist hinzugefügt"), `rating_first` ("Jemand hat einen Film bewertet"), `payment_recorded` ("Eine Zahlung wurde erfasst" — NEU für diesen Rewrite, `paid_at` transitioniert null→Wert auf `watchlist_entries`, kein Vorbild in der alten App, aber symmetrisch zu den anderen beiden: je ein Trigger pro betroffenem Tab, Watchlist/Tagebuch/Tracker). Alle drei Texte bewusst generisch OHNE Namen (kein "Robin hat bewertet") — eine Namensauflösung hätte einen zusätzlichen Netzwerk-Roundtrip im Realtime-Handler gebraucht, außerhalb des Scopes dieser Aufgabe. Jede andere Änderung (Bewertungs-Korrektur, sonstige `watchlist_entries`-Updates, jedes DELETE) zählt als `"other"` — löst weiterhin eine stille Cache-Invalidierung aus, aber NIE einen Toast.

**Warum das später leicht änderbar ist:** Reine String-Konstanten in `REALTIME_TOAST_COPY` (`src/lib/realtimeSync.ts`) plus eine kleine Klassifizierungsfunktion pro Tabelle — falls die parallele Push-Task andere/zusätzliche Event-Typen oder eine andere Formulierung festlegt, ist ein Abgleich eine reine Textänderung an einer Stelle, keine Strukturänderung.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch — insbesondere: bitte mit der parallelen Push-Infrastruktur-Task abgleichen, ob `payment_recorded` als dritter Typ dort ein Äquivalent hat oder ergänzt werden sollte.

---

## M10 — Fokus-Tracking-Mechanismus: eigener, nicht-persistierter Store + `useFocusEffect`

**Problem/Lücke:** ADR 0006 verlangt, dass die drei betroffenen Tabs (Watchlist/Tagebuch/Tracker) erkennen können, ob der Nutzer GERADE auf einem von ihnen ist (für die "still" vs. "Toast"-Entscheidung) — der Task-Auftrag nannte als möglichen Ansatz "ein kleiner shared Store/Context, den jeder Screen bei Fokus registriert/bei Blur deregistriert".

**Entscheidung:** Neuer, bewusst NICHT über `persist()` laufender Zustand-Store `src/stores/useFocusedGroupScreen.ts` (`focusedGroupId: string | null`), getrennt von `src/stores/usePreferencesStore.ts` (das ist echte, persistierte Nutzer-Präferenz — Fokus-Zustand ist reiner, flüchtiger UI-Zustand, der einen App-Neustart nicht überleben soll). Registrierung über `expo-router`s `useFocusEffect` (re-exportiert von `expo-router`, selbst aus `@react-navigation/native`), gekapselt in einem neuen kleinen Hook `src/hooks/useRegisterFocusedGroupScreen.ts`, den jeder der drei Screens zusätzlich zu `useGroupRealtimeSync` aufruft. `src/hooks/useGroupRealtimeSync.ts` liest den Store per `.getState()` (außerhalb von React) im Moment eines eingehenden Realtime-Events.

**Warum das später leicht änderbar ist:** Der Store hat genau ein Feld + einen Setter; der Registrierungs-Hook ist von den drei Screens komplett entkoppelt. Ein Wechsel auf einen React-Context (falls je gewünscht) wäre ein reiner Austausch der internen Store-Implementierung, ohne die drei Aufrufer oder `useGroupRealtimeSync.ts`s Lesezugriff strukturell zu ändern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Toast-Anzeigedauer

**Problem/Lücke:** Der Task-Auftrag überließ die exakte Auto-Dismiss-Dauer explizit meiner Einschätzung ("your call, document it").

**Entscheidung:** 4 Sekunden (`TOAST_DURATION_MS` in `src/components/ui/Toast.tsx`) — genug Zeit, einen kurzen deutschen Einzeiler zu lesen, ohne unnötig lange am Bildschirmrand zu kleben. Ein neuer, während ein Toast noch sichtbar ist eintreffender Toast ersetzt den alten und startet den Timer neu (kein Anhängen/Stapeln mehrerer Toasts).

**Warum das später leicht änderbar ist:** Eine einzelne Zahlenkonstante.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Toast: kein Tap-to-Navigate

**Problem/Lücke:** Der Task-Auftrag nannte Tap-to-Navigate als optionales Nice-to-have ("your call whether to include, document either way").

**Entscheidung:** Nicht gebaut. Die Toast-Texte sind bewusst generisch/namenlos (siehe oben) und tragen kein konkretes Ziel (welcher Film, welcher Eintrag) — ein Tap könnte bestenfalls zum betroffenen TAB im Allgemeinen navigieren, was der Nutzer über die ohnehin sichtbare Tab-Leiste genauso einfach erreicht. Der Zusatzaufwand (Tap-Handler, Navigationsziel pro Trigger-Typ ableiten) stand in keinem Verhältnis zum Nutzen für dieses Milestone.

**Warum das später leicht änderbar ist:** `ToastHost` (`src/components/ui/Toast.tsx`) müsste nur einen `onPress`/`router.push(...)`-Aufruf ergänzen; dafür bräuchte `showToast(...)` einen optionalen zweiten Parameter (Zielroute) statt nur eines reinen Strings — additive Erweiterung der `src/lib/toast.ts`-Signatur, kein Bruch bestehender Aufrufer.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Push-Infrastruktur: ⚠️ pg_net direkt statt Database-Webhooks/Queue-Poller, Vault als neuer Secret-Store

**Problem/Lücke:** ADR 0006 legt nur das WAS fest ("Push läuft über Supabase DB-Webhook/Trigger → Edge Function → Expo Push API"), nicht das WIE. Der Task-Auftrag nannte drei mögliche technische Umsetzungen (pg_net direkt, Supabase-Dashboard-"Database Webhooks", ein `notification_queue` + Poller) und verlangte explizit, EINE konkrete zu wählen statt die Optionen nur aufzuzählen.

**Entscheidung:** `pg_net` (direkt aus den beiden `AFTER INSERT`/`AFTER UPDATE`-Triggern sowie dem `run_release_reminders()`-Cron-Job heraus, via einer gemeinsamen `enqueue_push_notification()`-Hilfsfunktion) statt Dashboard-"Database Webhooks" (nicht in einer git-versionierten SQL-Migration ausdrückbar — hätte die Kernverdrahtung dieses Milestones komplett aus dem Repo-Verlauf verschwinden lassen) und statt einer zusätzlichen `notification_queue`-Tabelle + Poller (`pg_net`s `http_post` ist selbst schon async/nicht-blockierend — dieselbe Eigenschaft, die eine Queue+Poller-Lösung erkaufen würde, nur mit zusätzlicher Latenz durch das Poll-Intervall statt echter Sofortigkeit). Die Edge-Function-URL und der Service-Role-Key werden dafür NICHT hart in die Migration geschrieben (das wäre ein Secret im Git-Verlauf), sondern zur Laufzeit aus **Postgres Vault** (`supabase_vault`, auf jedem Supabase-Projekt bereits vorinstalliert, lokal verifiziert) gelesen — ein Secret-Store, den ADR 0009 NICHT kennt (ADR 0009 nennt nur Edge Function Secrets/GitHub Actions Secrets/EAS Secrets). Die eigentlichen Secret-WERTE werden von keiner Migration geschrieben; ein Operator muss sie einmalig pro Umgebung selbst setzen (Kommando im Migrationskommentar dokumentiert, nicht committed).

**Docker-Verifikation (lokaler `supabase start`/`db reset`-Stack):** Vollständig Ende-zu-Ende bestätigt — `pg_net`/`pg_cron` sind in `pg_available_extensions` vorhanden und wurden erfolgreich aktiviert; nach dem Setzen der beiden Vault-Secrets (Edge-Function-URL auf den internen Docker-Netzwerk-Hostnamen des Kong-Containers zeigend) hat ein echtes `INSERT` in `watchlist_entries` den Trigger ausgelöst, der über `net.http_post` tatsächlich die lokal laufende `send-push`-Edge-Function erreicht hat (`net._http_response` zeigt HTTP 200 mit dem korrekten JSON-Body); dieselbe Kette wurde für den Erstbewertungs-Trigger (`ratings`-INSERT) und für `run_release_reminders()` (inkl. Dedup-Verifikation durch zweifachen Aufruf) wiederholt und bestätigt. Der einzige unverifizierte Teil ist die tatsächliche Zustellung an ein echtes Gerät (kein reales Push-Token verfügbar) — der Testlauf hat dabei sogar einen echten, ungültigen Test-Token über die echte Expo-Push-API als `DeviceNotRegistered` zurückgewiesen bekommen und ihn korrekt aus `push_tokens` gelöscht, was den Dead-Token-Pruning-Pfad ebenfalls Ende-zu-Ende bestätigt.

**Warum das später leicht änderbar ist:** Der gesamte Entscheid ist auf `enqueue_push_notification()` (eine einzige SQL-Funktion) konzentriert — ein späterer Wechsel auf Dashboard-Webhooks oder einen Queue-Poller würde nur diese eine Funktion (bzw. deren Aufrufer-Stellen, die unverändert blieben) ersetzen, nicht die Trigger-Logik selbst.

**Status:** ⚠️ Explizit als echte Infrastruktur-/Secret-Management-Entscheidung geflaggt (nicht nur eine "günstige Implementierungsdetail"-Entscheidung wie der Rest dieses Dokuments) — insbesondere die Einführung von Vault als viertem Secret-Store neben den drei in ADR 0009 genannten verdient deine explizite Bestätigung.

---

## M10 — Erstbewertungs-Trigger auf `ratings`: INSERT UND UPDATE, nicht nur UPDATE

**Problem/Lücke:** Die Spezifikation ("rating transitions from NULL/0 to a real value") liest sich zunächst wie ein reiner `AFTER UPDATE`-Fall. `src/lib/movieDetailMutations.ts`s `saveRating` ist aber ein echtes `UPSERT` (`INSERT ... ON CONFLICT DO UPDATE`) — die sehr häufige "Direkt Bewerten"-Situation (noch keine `ratings`-Zeile für dieses (watchlist_entry_id, member_id)-Paar) läuft dabei als reines `INSERT`, nicht als `UPDATE`, auf Postgres-Ebene ab.

**Entscheidung:** Der Trigger feuert auf `AFTER INSERT OR UPDATE`. Bei `INSERT` gilt jeder echte `NEW.rating`-Wert automatisch als "Erstbewertung" (es gibt kein "vorher"); bei `UPDATE` gilt weiterhin exakt die spezifizierte NULL/0→Wert-Transition. Ohne diese Erweiterung hätte der Trigger den mit Abstand häufigsten Erstbewertungs-Fall (Direktbewertung ohne vorherigen Like-Toggle) schlicht verpasst.

**Warum das später leicht änderbar ist:** Eine einzelne `tg_op`-Fallunterscheidung in `notify_first_rating()` (siehe deren ausführlichen SQL-Kommentar in der Migration).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Release-Reminder: Dedup-Log-Tabelle + tägliches pg_cron um 09:00 UTC

**Problem/Lücke:** Der Task-Auftrag spezifiziert die Milestones (14/7/1 Tage vorher, Tag selbst, "neu hinzugefügt mit <14 Tagen bis Release"), aber keinen Dedup-Mechanismus (ohne einen würde z.B. "Tag selbst" bei jedem täglichen Cron-Lauf erneut feuern) und keine exakte Cron-Uhrzeit.

**Entscheidung:** Neue reine Ledger-Tabelle `release_reminder_log(watchlist_entry_id, reminder_type)` mit `INSERT ... ON CONFLICT DO NOTHING` + `IF FOUND`-Check in `run_release_reminders()` — jedes (Eintrag, Meilenstein)-Paar feuert genau einmal, für immer. Cron-Zeitpunkt: täglich 09:00 UTC (`cron.schedule('release-reminders-daily', '0 9 * * *', ...)`).

**Warum das später leicht änderbar ist:** Die Cron-Uhrzeit ist ein einzelner String; ein `cron.alter_job`/erneutes `cron.schedule` mit demselben Job-Namen genügt für eine spätere Änderung. Die Dedup-Tabelle hat keine Client-Berührungspunkte (RLS ohne jede Policy) und könnte bei Bedarf um eine TTL/Auto-Cleanup ergänzt werden, ohne `run_release_reminders()`s Aufrufer zu ändern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — `push_subscriptions`: zusätzliche Gruppenmitgliedschafts-Prüfung in der RLS-INSERT-Policy

**Problem/Lücke:** Der Task-Auftrag spezifiziert für `push_subscriptions` wörtlich nur "a user can INSERT/DELETE their own subscription rows only" (RLS `user_id = auth.uid()`), ohne eine Prüfung der tatsächlichen Gruppenmitgliedschaft zu verlangen.

**Entscheidung:** Die INSERT-Policy prüft zusätzlich `public.is_group_member(group_id)` (derselbe Helper, den jede andere gruppen-gebundene Tabelle in diesem Schema bereits verwendet) — ein Nutzer soll sich nicht für Push-Benachrichtigungen einer Gruppe eintragen können, der er gar nicht angehört (konsistent mit ADR 0003).

**Warum das später leicht änderbar ist:** Eine einzelne `and`-Bedingung in einer RLS-Policy; ein Rückbau auf die wörtliche Spec-Fassung wäre eine Ein-Zeilen-Änderung an der Migration (bzw. einer Folge-Migration).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Expo-Push-Zustellbestätigung: nur sofortige Receipt-Prüfung (bekannte Einschränkung)

**Problem/Lücke:** Requirement 4 verlangt Dead-Token-Pruning anhand von Expos "push receipt"-API. Expos eigene Dokumentation empfiehlt, mit der Receipt-Abfrage nach dem Senden mehrere Minuten zu warten, bevor ein Ergebnis zuverlässig vorliegt — eine einzelne Edge-Function-Invocation kann das nicht sinnvoll leisten, ohne selbst minutenlang zu blockieren.

**Entscheidung:** `send-push` prunt in zwei Fällen: (1) sofortige Ticket-Level-Fehler aus der `/send`-Antwort selbst (Expo liefert `DeviceNotRegistered` teils schon hier, z.B. bei offensichtlich fehlerhaften Tokens — im Docker-Verifikationslauf tatsächlich live beobachtet), und (2) ein sofortiger, Best-Effort-`/getReceipts`-Aufruf direkt im Anschluss (ohne Wartezeit). Ein Token, dessen echter Zustellungsfehler von Expo erst SPÄTER als dieser sofortige Check erkannt wird, geht dabei nicht dauerhaft verloren — er wird schlicht beim nächsten Sendeversuch an denselben Token erneut geprüft. Ein separater, zeitversetzter Receipt-Recheck-Job wurde NICHT gebaut (Task-Framing: "mock the HTTP call, TDD the pruning logic", nicht ein zweites Scheduled-Job-System).

**Warum das später leicht änderbar ist:** `fetchExpoPushReceipts()`/die Ticket-ID-Sammlung in `sendPushForEvent()` (`supabase/functions/send-push/push-sender.ts`) sind bereits isolierte Bausteine — ein späterer verzögerter Recheck-Job (z.B. ein zweiter pg_cron-Lauf, der eine `push_ticket_log`-Tabelle abarbeitet) könnte dieselbe `fetchExpoPushReceipts`-Funktion wiederverwenden, ohne den Sende-Pfad selbst zu ändern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Push-Notification-Copy: Platzhalter-deutsche Texte

**Problem/Lücke:** Weder ADR 0006 noch feature-inventory.md geben exakte Formulierungen für Push-Titel/-Texte vor (diese drei Trigger existieren in der alten App als Web-Push, nicht als native Push-Notification-Texte).

**Entscheidung:** Einfache, generische deutsche Platzhaltertexte in `buildNotificationCopy()` (`supabase/functions/send-push/push-sender.ts`), z.B. „„{Filmname}“ wurde zur Watchlist hinzugefügt." — derselbe Copy-Platzhalter-Status wie M5s Empty-State-Texte.

**Warum das später leicht änderbar ist:** Eine reine `switch`-Funktion mit String-Literalen, keine Aufrufer-seitige Struktur betroffen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Push-Registrierung: kein EAS-Projekt konfiguriert (Fakt zur Kenntnisnahme)

**Problem/Lücke:** `Notifications.getExpoPushTokenAsync()` löst seine `projectId` standardmäßig aus `Constants.expoConfig.extra.eas.projectId` auf — dieses Repo hat weder eine `eas.json` noch einen `extra.eas.projectId`-Eintrag in `app.config.ts` (dieselbe Kategorie Infrastruktur-Lücke wie die bereits bei M4 festgehaltene "EAS Dev Client wird nötig").

**Entscheidung (kein Autonomie-Entscheid, reine Kenntnisnahme):** `usePushRegistration` ruft `getExpoPushTokenAsync()` ohne explizite `projectId` auf (Standardverhalten) und fängt einen daraus resultierenden Fehler ab (loggt eine Warnung, wirft nicht) statt eine erfundene Projekt-ID einzusetzen. Echte Token-Registrierung wird also erst funktionieren, sobald ein echtes EAS-Projekt existiert.

**Warum das später leicht änderbar ist:** n/a — reine Infrastruktur-Voraussetzung, kein Code-Entscheid; sobald ein EAS-Projekt existiert, funktioniert der bestehende Code ohne Änderung (die `projectId` wird automatisch aus `app.config.ts` aufgelöst).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Kein `setNotificationHandler` gesetzt: Koordination mit der parallelen Realtime-Task

**Problem/Lücke:** `expo-notifications` erwartet normalerweise einen registrierten `Notifications.setNotificationHandler(...)`, der bestimmt, ob eine eingehende Push-Notification im Vordergrund als System-Alert angezeigt wird. ADR 0006s "foreground = silent update / in-app toast" wird aber von der PARALLELEN Realtime-Task (`useGroupRealtimeSync.ts`) über Supabase Realtime geleistet, nicht über die Push-Notification selbst.

**Entscheidung:** Dieser Task registriert bewusst KEINEN `setNotificationHandler`. Ohne registrierten Handler zeigt Expo im Vordergrund standardmäßig keinen System-Alert — das entspricht zufällig bereits dem gewünschten Verhalten ("Vordergrund wird von Realtime bedient, nicht von einem Push-Banner"), ist aber ein Koordinationspunkt, den die parallele Realtime-Task explizit bestätigen sollte, keine verifizierte Absprache.

**Warum das später leicht änderbar ist:** Ein einzelner `Notifications.setNotificationHandler(...)`-Aufruf ließe sich jederzeit in `usePushRegistration.ts` (oder andernorts) ergänzen, falls das Standardverhalten doch nicht ausreicht.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch — insbesondere: bitte mit der parallelen Realtime-Task abgleichen.

---

## M10 — Deep-Link-Routing-Hook in `(app)/_layout.tsx` statt Root-Layout

**Problem/Lücke:** Der Cold-Start-Tap-auf-Push-Fall (`getLastNotificationResponseAsync`) muss irgendwo gemountet werden, das früh genug läuft, aber nicht so früh, dass es `useAuthGate()`s initialen Redirect überholt.

**Entscheidung:** `usePushNotificationRouting()` (und `usePushRegistration()`) werden in `src/app/(app)/_layout.tsx` gemountet, NICHT im Root-Layout (`src/app/_layout.tsx`) — dieser Layer mountet erst, nachdem `useAuthGate()` bereits in den authentifizierten Bereich umgeleitet hat, sodass ein `router.push("/movie/[tmdbId]")` beim Cold Start nie mit dem initialen Redirect um die Navigation konkurriert.

**Warum das später leicht änderbar ist:** Zwei Hook-Aufrufe in genau einer Datei; ein Verschieben in einen anderen Layout-Layer wäre eine reine Ortsänderung, keine Änderung der Hooks selbst.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — `expo-notifications`-Config-Plugin ohne Custom-Icon/Farbe

**Problem/Lücke:** `expo-notifications` bringt ein eigenes Expo-Config-Plugin mit (Android-Notification-Icon/-Farbe/-Channel, iOS-Entitlements), das optionale `icon`/`color`/`sounds`-Parameter akzeptiert.

**Entscheidung:** Plugin ohne jede Option in `app.config.ts` eingetragen (`"expo-notifications"` als reiner String-Eintrag) — es existiert noch kein dediziertes Notification-Icon-Asset in `assets/`, und ein solches zu entwerfen lag außerhalb des Scopes dieser Backend-lastigen Aufgabe.

**Warum das später leicht änderbar ist:** Eine Umwandlung des Plugin-Eintrags von einem reinen String zu einem `[name, optionsObjekt]`-Tupel, sobald ein echtes Icon-Asset existiert — keine Strukturänderung.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Settings-Hub: Struktur, "Meine Streaming-Dienste"/"Filmtitel in Grid anzeigen" bleiben Geräte-Präferenzen

**Problem/Lücke:** Der M9-Teil-2-Tracker-Button "⚙️ Gruppe verwalten" war explizit als Interim-Platzierung markiert ("Revisit once M10 builds the real Settings navigation") — weder ADR noch feature-inventory.md legen die exakte Struktur des echten Settings-Hubs fest.

**Entscheidung:** Ein einzelner Hub-Screen (`src/app/(app)/(modals)/settings.tsx`) mit einer Liste navigierbarer Sektionen (Meine Streaming-Dienste, Darstellung, Benachrichtigungen, Gruppe verwalten, Changelog, Konto löschen) plus flachen Zeilen darunter (Anzeigename/E-Mail read-only, App-Version, Abmelden) — lose an das Layout der Legacy-App angelehnt, wie vom Nutzer vorab freigegeben. Die Feature-Request-Zeile wird NICHT gebaut (Legacy-only, in der alten App selbst nicht im sichtbaren Menü verlinkt). "Meine Streaming-Dienste" (`selectedStreamingProviderIds`) und "Filmtitel in Grid anzeigen" (`showTitlesInGrid`) werden — wie vom Nutzer vorab bestätigt — als reine Geräte-Präferenzen in `usePreferencesStore` (MMKV) gehalten, nicht in einer neuen Supabase-Tabelle.

**Warum das später leicht änderbar ist:** `SECTIONS`-Array in `settings.tsx` ist eine reine Daten-Liste (Reihenfolge/Label/Route je Zeile änderbar ohne Strukturumbau); eine spätere Migration der beiden Präferenzen von MMKV zu einer Supabase-Tabelle wäre auf die beiden Store-Felder plus ihre zwei Lesestellen (`streaming-services.tsx`, `WatchlistPosterCard`/`watchlist.tsx`/`tagebuch.tsx`) beschränkt.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Darstellung-Toggle: eigener Pressable-Toggle statt React-Native-`Switch`

**Problem/Lücke:** Es gibt noch keinen Toggle/Switch-Baustein in `src/components/ui/`; "Filmtitel in Grid anzeigen" (`src/app/(app)/(modals)/settings/display.tsx`) braucht einen.

**Entscheidung:** Ein einfacher, mit NativeWind-Klassen gestylter `Pressable` (mit `accessibilityRole="switch"` + `accessibilityState={{ checked }}`) statt React Natives nativem `Switch`-Element — konsistent mit dem Look der übrigen Pressable/Button-basierten UI dieser Codebase statt einem plattform-nativen Kontrollelement.

**Warum das später leicht änderbar ist:** Genau eine Stelle (`display.tsx`); ein Wechsel zu einer echten wiederverwendbaren `Toggle`-Komponente unter `src/components/ui/` wäre ein rein lokaler Austausch, sobald ein zweiter Anwendungsfall dafür entsteht.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Tagebuch-Grid-Titel: Asymmetrie zu Watchlist aufgelöst, indem die Präferenz einen Titel ERGÄNZT statt nur zu verstecken

**Problem/Lücke:** Vor M10 zeigte Watchlists Grid-Modus IMMER einen Titel (`WatchlistPosterCard`), während Tagebuchs Grid-Modus NIE einen zeigte (nur der Karten-Modus hatte einen separaten Titel-Text unterhalb der Kachel) — die neue `showTitlesInGrid`-Präferenz sollte laut Task-Brief für beide Screens gelten, traf hier also auf zwei unterschiedliche Ausgangszustände.

**Entscheidung:** Für Watchlist steuert `showTitlesInGrid` (neue `showTitle`-Prop an `WatchlistPosterCard`, Default `true`) weiterhin nur, ob der bereits vorhandene Titel im Grid-Modus sichtbar ist. Für Tagebuch FÜGT die Präferenz (bei `true`) einen neuen Titel-Text unterhalb der `DiaryPosterTile` im Grid-Modus HINZU (analog zum bereits bestehenden Muster im Karten-Modus), statt etwas zu verstecken, das vorher gar nicht existierte. Card-Modus bleibt in beiden Screens unverändert (zeigt immer einen Titel, unabhängig von dieser Präferenz).

**Warum das später leicht änderbar ist:** Zwei unabhängige, klar benannte Stellen (`WatchlistPosterCard`s `showTitle`-Prop, Tagebuchs `tagebuch-grid-title-*`-Text) — ein Rückbau auf "beide Screens identisch behandeln" wäre eine lokale Änderung an jeweils einer Stelle.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Changelog: Starter-Array mit einem v1.0.0-Eintrag, Versions-Vergleich als reiner String-Vergleich

**Problem/Lücke:** Die ~130 Changelog-Einträge der Legacy-App werden laut Vorgabe NICHT migriert; der neue Viewer-Mechanismus (Timeline-UI, Versions-gesehen-Tracking) brauchte trotzdem mindestens einen echten Eintrag zum Testen/Anzeigen.

**Entscheidung:** `src/lib/changelog.ts` enthält genau einen Starter-Eintrag (`version: "1.0.0"`, Titel "Erste Version von WatchCrew", kurze, wahrheitsgemäße Beschreibung der bisher gebauten M0–M9-Kernfeatures). `CURRENT_CHANGELOG_VERSION` wird als reiner String (kein Semver-Parsing/-Vergleich) gegen `usePreferencesStore`s `lastSeenChangelogVersion` verglichen (Ungleichheit inkl. `null` beim ersten Start löst das "Neu"-Badge + einen Toast aus). Öffnen des Changelog-Screens markiert die aktuelle Version sofort als gesehen (`useEffect` beim Mount), passend zum Legacy-Verhalten.

**Warum das später leicht änderbar ist:** Ein reines Daten-Array plus eine Konstante; neue Releases fügen einfach einen weiteren Eintrag hinzu und erhöhen `CURRENT_CHANGELOG_VERSION` — keine Strukturänderung am Viewer selbst.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — Konto-löschen: JWT-`sub`-Dekodierung ohne eigene Signaturprüfung, Bestätigungsphrase "LÖSCHEN" im Sheet

**Problem/Lücke:** Die neue `delete-account`-Edge-Function muss die aufrufende `auth.uid()` strukturell sicher (nie aus dem Request-Body) ermitteln, ohne einen zusätzlichen Auth-API-Roundtrip zu brauchen; zusätzlich braucht eine derart irreversible Aktion eine echte Bestätigungshürde in der UI.

**Entscheidung:** `supabase/functions/delete-account/delete-account.ts`s `extractUserIdFromJwt` dekodiert die `sub`-Claim aus dem `Authorization`-Header-JWT direkt (Base64URL + `JSON.parse`), OHNE die Signatur selbst zu prüfen — sicher, weil Supabase Edge Functions das JWT bereits auf Gateway-Ebene verifizieren (`verify_jwt` bleibt am Standardwert `true`, kein `[functions.delete-account]`-Override in `supabase/config.toml`). Der Request-Body wird zwar gelesen (damit der HTTP-Request sauber abschließt), aber niemals nach einer User-ID durchsucht — strukturell unmöglich, eine fremde ID zu übergeben. Client-seitig (`src/app/(app)/(modals)/settings/delete-account.tsx`) muss der Nutzer exakt "LÖSCHEN" in ein Textfeld in einem `Sheet` eintippen, bevor der endgültige Löschen-Button aktiviert wird — kein einfaches Tap-to-confirm, gegeben die Irreversibilität.

**Warum das später leicht änderbar ist:** Sollte der `verify_jwt`-Default jemals für diese Function deaktiviert werden, müsste `extractUserIdFromJwt` durch eine echte Signaturprüfung ersetzt werden (im Modul-Kommentar von `delete-account.ts` explizit als Trust-Boundary dokumentiert). Die Bestätigungsphrase ist eine einzelne Konstante (`CONFIRMATION_PHRASE`) im Screen, austauschbar ohne Strukturänderung.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — "Abmelden"/Konto-Löschung: expliziter `router.replace("/")` statt Vertrauen auf den bestehenden Auth-Gate

**Problem/Lücke:** `useAuthGate()` (`src/hooks/useAuthGate.ts`) reagiert zwar auf das echte `SIGNED_OUT`-Supabase-Auth-Event via `onAuthStateChange` — aber nur in der Komponenteninstanz, die es tatsächlich noch gemountet hat. Der Settings-Hub bzw. der Konto-löschen-Screen liegen mehrere Navigationen tief im `(app)`-Stack, weit weg von `src/app/index.tsx`, der einzigen Stelle, die den Gate-Hook aufruft — ob `index.tsx` nach der initialen `<Redirect>` überhaupt noch gemountet bleibt, wurde nicht als gesichert angenommen (dieselbe Kategorie Auth-Gate-Lücke, die M9 Teil 2 beim Verlassen der letzten Gruppe bereits gefunden hat).

**Entscheidung:** Sowohl `settings.tsx`s "Abmelden"-Handler als auch `delete-account.tsx`s Erfolgsfall rufen nach `signOut()` explizit `router.replace("/")` auf, statt sich auf ein bereits laufendes `useAuthGate()` in einer möglicherweise nicht mehr gemounteten Komponente zu verlassen. Das erzwingt einen frischen Mount/Re-Evaluate von `index.tsx` in jedem Fall.

**Warum das später leicht änderbar ist:** Zwei identische Einzeiler; sollte sich herausstellen, dass `index.tsx` ohnehin durchgehend gemountet bleibt, wären diese beiden Zeilen redundant, aber harmlos (ein zusätzlicher `replace("/")` auf eine bereits aktive Route ist ein No-Op).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M10 — "Benachrichtigungen"-Zeile verlinkt einen Platzhalter-Screen (Abstimmungspunkt mit der parallelen Push-Task)

**Problem/Lücke:** Der Settings-Hub braucht laut Task-Brief eine "Benachrichtigungen"-Zeile, die zu `/settings/notifications` verlinkt — die echte Push-Subscription-UI wird von einer PARALLEL laufenden M10-Aufgabe gebaut, deren Fertigstellungsstand zum Zeitpunkt dieser Implementierung nicht bekannt war.

**Entscheidung:** `src/app/(app)/(modals)/settings/notifications.tsx` wurde als minimaler Platzhalter-Screen gebaut ("Benachrichtigungs-Einstellungen sind bald verfügbar."), NICHT als Dead-Link ohne Datei — damit die Navigation schon jetzt funktioniert und testbar ist. Der Datei-Kommentar markiert ihn explizit als von der parallelen Task zu ERSETZEN, nicht als finale Implementierung.

**Warum das später leicht änderbar ist:** Eine einzelne Datei, die komplett überschrieben werden kann, sobald die parallele Push-Task ihren echten Screen liefert — die Route (`/settings/notifications`) und der Verlinkungspunkt im Hub ändern sich dabei nicht.

**Status:** ✅ Abgelöst — siehe [M10 (Nachzügler) — Benachrichtigungen-Screen: echte Umsetzung ersetzt den Platzhalter](#m10-nachzügler--benachrichtigungen-screen-echte-umsetzung-ersetzt-den-platzhalter). Dieser Eintrag bleibt zur Historie stehen.

---

## M10 — `.expo/types/router.d.ts` manuell nachgezogen (kein Entscheid, Tooling-Hinweis)

**Problem/Lücke:** Dieses Projekt nutzt Expo Routers `typedRoutes`-Experiment (`app.config.ts`); die generierte Typdeklaration (`.expo/types/router.d.ts`, per `.gitignore` ausgeschlossen, wird normalerweise von `expo start`/`expo export` automatisch neu erzeugt) enthielt die sechs neuen `/settings*`-Routen dieser Aufgabe noch nicht. `expo start`/`expo export` liefen in dieser Sandbox-Umgebung nicht bis zur Typgenerierung durch (vermutlich fehlender Netzwerkzugriff für Font-/Asset-Downloads im vollständigen Bundling-Durchlauf).

**Entscheidung (kein Autonomie-Entscheid, reine Kenntnisnahme):** Die Datei wurde für die lokale `tsc --noEmit`-Verifikation dieser Aufgabe manuell um die sechs neuen statischen Routen ergänzt (gleiche Struktur wie die bestehenden Einträge, z.B. `/group-settings`). Da die Datei git-ignoriert ist, hat das keinerlei Auswirkung auf den Commit — beim nächsten echten `expo start`/`eas build` erzeugt die reale Tooling-Pipeline dieselbe Datei ohnehin neu und korrekt aus den tatsächlich vorhandenen Screen-Dateien.

**Warum das später leicht änderbar ist:** n/a — reines Tooling-Artefakt, kein Code-Entscheid; kein Handlungsbedarf.

**Status:** Zur Kenntnisnahme, keine Bestätigung nötig.

---

## M10 (Nachzügler) — Benachrichtigungen-Screen: echte Umsetzung ersetzt den Platzhalter

**Problem/Lücke:** Die parallele M10-Push-Task hatte `useGroupPushSubscription` (`src/hooks/useGroupPushSubscription.ts`) bereits fertig gebaut und getestet, aber `src/app/(app)/(modals)/settings/notifications.tsx` blieb ein bewusster Platzhalter (siehe oben, "'Benachrichtigungen'-Zeile verlinkt einen Platzhalter-Screen"). Weder ADR 0006 noch feature-inventory.md geben eine exakte Erklärungstext-Copy oder ein Lade-/Deaktivierungs-Verhalten für diesen konkreten Toggle vor.

**Entscheidung:**
- `settings/notifications.tsx` ersetzt den Platzhalter vollständig: `useActiveGroup(useCurrentUserId())` liefert die aktive Gruppe, `useGroupPushSubscription(activeGroupId, currentUserId)` liefert Zustand + Mutationen. Ein einzelner Toggle ("Push-Benachrichtigungen für diese Gruppe") — derselbe custom-Pressable-Toggle-Stil wie `settings/display.tsx` (`accessibilityRole="switch"`, kein natives `Switch`), keine neue wiederverwendbare `Toggle`-Komponente eingeführt.
- Erklärungstext (Platzhalter-Qualität, analog zu M5s Empty-State-Texten und M10s Push-Notification-Copy): „Du wirst benachrichtigt, wenn jemand aus dieser Gruppe einen neuen Film zur Watchlist hinzufügt, einen Film als Erstes bewertet, oder wenn der Kinostart eines vorgemerkten Films näher rückt." — fasst die drei tatsächlichen Push-Trigger aus `push-sender.ts`s `buildNotificationCopy` (`new_entry`/`first_rating`/`release_reminder`) in einem Satz zusammen.
- Lade-/Disabled-Verhalten: Während `isLoading` (initialer Query-Fetch) wird ein `ActivityIndicator` ANSTELLE des Toggles gezeigt (kein "Toggle sichtbar, aber disabled"-Zwischenzustand); ist die Query einmal aufgelöst, ist der Toggle nur noch während `isMutating` (Subscribe/Unsubscribe in Flight) disabled. `accessibilityState.disabled` wird trotzdem als `isMutating || isLoading` berechnet (nicht nur `isMutating`), rein defensiv/wortgetreu zur Aufgabenstellung — praktisch macht das keinen Unterschied, da der Toggle bei `isLoading` ohnehin nicht gerendert wird.
- `settings.tsx`s Modul-Kommentar wurde aktualisiert (Platzhalter-Hinweis entfernt), die Zeilen-Copy/Route selbst (`"Benachrichtigungen"` → `/settings/notifications`) blieben unverändert, da schon vorher korrekt.

**Warum das später leicht änderbar ist:** Erklärungstext ist ein einzelner String in einer Datei; das Lade-vs-Disabled-Verhalten ist eine einzelne bedingte Verzweigung (`isLoading ? <ActivityIndicator /> : <Pressable ...>`), austauschbar ohne Strukturänderung. Kein Schema-/Route-/Hook-Vertrag wurde angefasst — `useGroupPushSubscription` blieb exakt wie von der parallelen Task geliefert.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 2 — Job 1 (Inaktivitäts-Cleanup): ⚠️ E-Mail-Provider-Frage bleibt bewusst offen; Schema-/Job-/Vault-Entscheidungen drumherum

**Problem/Lücke:** ADR 0004 spezifiziert Job 1 bereits vollständig auf Business-Regel-Ebene (1 Jahr Inaktivität → Warn-Mail → 14 Tage Gnadenfrist → Löschung), flaggt aber selbst ausdrücklich, dass die Wahl des transaktionalen E-Mail-Versandwegs (Supabase Auth selbst vs. Drittanbieter wie Resend) noch nicht entschieden ist und vor Implementierung dieses Features explizit bestätigt werden muss — keine kleine Implementierungsdetail-Frage, sondern eine echte Architektur-/Kosten-/API-Key-Entscheidung.

**⚠️ NICHT autonom entschieden:** Der tatsächliche E-Mail-Versand wurde bewusst NICHT gebaut. `public.send_inactivity_warning_email(user_id)` ist ein reiner Stub — `raise notice` + ein Log-Eintrag in der neuen `email_notification_log`-Tabelle, mit explizitem `-- TODO: wire to real email provider once ADR 0004's open email-provider question is resolved`-Kommentar in der Migration (`supabase/migrations/20260921100000_account_inactivity_cleanup.sql`). Diese Frage braucht deine explizite Bestätigung, BEVOR der echte Versand angeschlossen wird.

**Entscheidungen (cheap/reversible, um den Rest des Jobs trotzdem vollständig bauen zu können):**
- `profiles.inactivity_warning_sent_at timestamptz` (nullable) erweitert die bestehende M5-`profiles`-Tabelle, statt eine neue Tabelle anzulegen (wie im Task-Auftrag verlangt) — `NULL` heißt "keine Warnung ausstehend".
- Neue reine Ledger-Tabelle `email_notification_log` (RLS aktiv, aber ohne jede Policy — gleiche Konvention wie `release_reminder_log` aus M10) statt eines generischen `email_queue`-Namens, da hier nichts tatsächlich "in eine Queue eingereiht" wird, sondern nur protokolliert, dass eine Mail fällig gewesen wäre.
- `run_inactivity_warnings()` macht zusätzlich zum Spec-Wortlaut einen "Gnadenfrist-Erholung"-Schritt: Ein Nutzer, der sich nach einer Warnung wieder einloggt (`last_sign_in_at` > `inactivity_warning_sent_at`), bekommt sein Flag automatisch zurückgesetzt — ohne diesen Schritt könnte ein einmal gewarnter Nutzer nach einer späteren, komplett neuen Inaktivitätsperiode NIE wieder gewarnt werden (das Flag bliebe für immer non-null). Kein Trigger auf `auth.users`-UPDATE nötig dafür — läuft als Teil desselben täglichen Jobs.
- Nutzer mit `last_sign_in_at is null` (nie eingeloggt, z. B. unbestätigte Registrierung) werden explizit von Warnung/Löschung ausgeschlossen — es gibt keine Login-Baseline, gegen die "über 1 Jahr inaktiv" gemessen werden könnte.
- Zweiter Job-Teil (echte Löschung) braucht Service-Role/Admin-API-Zugriff (`auth.admin.deleteUser`), den eine reine SQL-Funktion nicht hat — deshalb eine neue Edge Function `supabase/functions/cleanup-inactive-accounts/`, aufgerufen über `invoke_inactivity_cleanup()`, die exakt dasselbe Vault-Secret-basierte `pg_net`-Aufrufmuster wiederverwendet wie `enqueue_push_notification()` aus M10 (keine neue Aufruf-Architektur erfunden). Neues, eigenes Vault-Secret-Paar (`inactivity_cleanup_edge_function_url`/`inactivity_cleanup_service_role_key`) statt Wiederverwendung von `push_edge_function_url`/`push_service_role_key` — gleicher Secret-WERT (der Projekt-Service-Role-Key ist überall derselbe), aber ein eigener Name pro Concern, konsistent mit der Namensgebung der Push-Migration selbst.
- Die Eligibility-Query für die Löschung ("wer ist wirklich noch inaktiv") lebt bewusst in der Edge Function (`listWarnedProfiles`/`getLastSignInAt`/`deleteUser`, injizierbare Deps, Deno.test-abgedeckt), NICHT in einer SQL-RPC-Funktion — vermeidet eine zusätzliche `SECURITY DEFINER`-Funktion, die `auth.users` lesbar macht, wenn die Edge Function das über `auth.admin.getUserById` ohnehin schon kann.
- Cron-Zeitpunkte: `inactivity-warnings-daily` täglich 05:00 UTC, `inactivity-cleanup-daily` täglich 05:15 UTC (danach, damit eine frisch gesetzte Warnung nicht im selben Lauf sofort wieder geprüft wird) — reine Zeitstring-Wahl.

**Docker-Verifikation (lokaler `supabase start`-Stack, echte Migration angewendet):** Ende-zu-Ende bestätigt — ein Testnutzer mit `last_sign_in_at` vor 400 Tagen und noch keiner Warnung wurde von `run_inactivity_warnings()` korrekt gewarnt (`inactivity_warning_sent_at` gesetzt, `email_notification_log`-Zeile angelegt, `raise notice` sichtbar); ein nie eingeloggter Nutzer und ein kürzlich aktiver Nutzer blieben unangetastet; ein Nutzer, der nach einer vor 20 Tagen gesetzten Warnung vor 5 Tagen wieder eingeloggt war, bekam sein Flag korrekt automatisch zurückgesetzt (Gnadenfrist-Erholung bestätigt); ein Nutzer mit unverändert alter `last_sign_in_at` seit der Warnung blieb korrekt weiterhin markiert (kein erneutes Warnen). `invoke_inactivity_cleanup()` hat ohne konfigurierte Vault-Secrets korrekt nur gewarnt und ist nicht fehlgeschlagen (Fresh-Environment-Sicherheit bestätigt). Die Edge-Function-Logik selbst (`runInactivityCleanup`) ist zusätzlich mit 7 grünen `Deno.test`-Fällen abgedeckt (`supabase/functions/cleanup-inactive-accounts/cleanup-inactive-accounts.test.ts`, per Docker/`denoland/deno:latest` ausgeführt) — inklusive Grenzfall "Login exakt zum Warnzeitpunkt" (zählt als weiterhin inaktiv, keine neue Aktivität) und "ein Löschfehler bei einem Nutzer stoppt die restliche Sweep-Verarbeitung nicht".

**Warum das später leicht änderbar ist:** Der gesamte E-Mail-Teil ist auf eine einzige Funktion (`send_inactivity_warning_email`) konzentriert — sobald die Anbieter-Frage entschieden ist, ersetzt eine einzelne Funktionskörper-Änderung (z. B. ein `net.http_post` an Resend, oder ein Aufruf von Supabases eigenem Auth-E-Mail-System) den Stub, ohne dass `run_inactivity_warnings()` selbst angefasst werden muss. Die Vault-Secret-Namen/Cron-Zeiten sind einzelne Strings.

**Status:** ⚠️ Der E-Mail-Provider-Teil ist EXPLIZIT NICHT entschieden und braucht deine Bestätigung, bevor der echte Versand gebaut wird (siehe ADR 0004). Alle anderen Punkte dieses Eintrags: offen für deine finale Bestätigung / Änderungswunsch wie der Rest dieses Dokuments.

---

## M11 Teil 2 — Job 2 (Empty-Group-Hard-Delete): `emptied_at`-Spalte, Trigger-/RPC-Erweiterung statt neuer Mechanismen, defensiver Doppel-Check im Cleanup

**Problem/Lücke:** ADR 0003 spezifiziert die Business-Regel bereits vollständig (2 Wochen Soft-Retention nach dem Austritt des letzten Mitglieds, wieder beitretbar über die Gruppen-ID, danach Hard-Delete durch einen geplanten Job) — offen war nur, WO "wann wurde die Gruppe leer" getrackt wird und WO das Zurücksetzen bei einem Rejoin passiert.

**Entscheidung:**
- Neue Spalte `watch_groups.emptied_at timestamptz` (nullable, `NULL` = "aktuell mindestens ein Mitglied bzw. nie leer gewesen").
- Der bereits bestehende M1-Trigger `handle_owner_succession()` (feuert bei jedem `DELETE` auf `watch_group_members`) wird um genau einen neuen Zweig erweitert: Findet er KEINEN Nachfolger (die Gruppe ist jetzt leer — exakt der Fall, den der ursprüngliche M1-Kommentar bereits als "group row is intentionally left in place (empty)" beschrieb), stempelt er `emptied_at = now()`. Kein neuer Trigger, keine neue Tabelle — dieselbe Stelle, die laut Task-Auftrag ohnehin "der sauberste Ort dafür" ist.
- Der bestehende M9-RPC `join_watch_group_by_token()` wird um ein unbedingtes `update watch_groups set emptied_at = null where id = v_group_id` nach dem eigentlichen Beitritts-INSERT erweitert — unbedingt (nicht "nur falls gesetzt") ist bewusst die einfachste Variante, da ein No-Op-Update auf eine bereits-`null`-Spalte (der Normalfall: Beitritt zu einer nie-leeren Gruppe) keinen Unterschied macht und die Korrektheit nicht davon abhängt, welcher Fall vorliegt.
- `cleanup_empty_groups()` verlässt sich NICHT ausschließlich auf `emptied_at`, sondern prüft zusätzlich defensiv `not exists (select 1 from watch_group_members where group_id = g.id)` — genau wie im Task-Auftrag verlangt ("finds watch_groups rows with zero rows in watch_group_members ... not assumed").
- FK-Kaskaden wurden verifiziert, nicht angenommen: `watchlist_entries.group_id` und `ratings.watchlist_entry_id` (beide bereits `on delete cascade` seit M1), sowie `push_subscriptions.group_id` (M10) — ein Hard-Delete von `watch_groups` räumt bereits alles kaskadierend ab, keine neue Kaskade nötig.
- Cron-Zeitpunkt: `cleanup-empty-groups-daily` täglich 05:30 UTC (nach den beiden Job-1-Cronjobs) — reine Zeitstring-Wahl.

**Docker-Verifikation (lokaler `supabase start`-Stack, echte Migration angewendet):** Ende-zu-Ende bestätigt mit einer echten Test-Gruppe (2 Mitglieder + einem Watchlist-Eintrag): Owner-Austritt übergibt Ownership korrekt ans verbleibende Mitglied, `emptied_at` bleibt `null`; Austritt des letzten Mitglieds setzt `emptied_at` korrekt; ein anschließender `join_watch_group_by_token()`-Aufruf als `authenticated`-Rolle (über `request.jwt.claims`/`auth.uid()` simuliert) löscht `emptied_at` korrekt wieder; nach erneutem Leerwerden und künstlichem Zurückdatieren von `emptied_at` auf 15 Tage hat `cleanup_empty_groups()` die Gruppe UND den zugehörigen `watchlist_entries`-Eintrag korrekt kaskadierend hart gelöscht (0 verbleibende Zeilen in beiden Tabellen, per Query bestätigt).

**Warum das später leicht änderbar ist:** Die gesamte Logik hängt an einer einzigen Spalte plus zwei bereits bestehenden Funktionskörpern (keine neuen Funktionssignaturen, keine neuen Trigger-Bindungen) — ein Rückbau oder eine andere Fristlänge wäre eine einzelne `interval`-Änderung in `cleanup_empty_groups()`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 2 — Job 3 (Rechtstexte-Platzhalter): Duplizierte Platzhalter-Konstanten, "Wird bald ergänzt"-Toast, Register-Screen-Ergänzung

**Problem/Lücke:** ADR 0011 legt fest, dass Datenschutzerklärung/AGB später über ein iubenda-Embed kommen, das noch nicht existiert — der Task-Auftrag verlangt ausdrücklich nur die Plumbing (Config-Felder + Settings-Zeilen + Fallback-Verhalten), keine echten Rechtstexte.

**Entscheidung:**
- `app.config.ts`'s `extra.privacyPolicyUrl`/`extra.termsOfServiceUrl` bekommen Platzhalter-Default-Werte (`https://watch-crew.app/privacy`/`https://watch-crew.app/terms`) statt leerer Strings — bewusst erkennbare, dokumentierte Platzhalter statt eines stillen leeren Werts.
- Neues Modul `src/lib/legalLinks.ts` als einzige Quelle der Wahrheit für "ist das noch ein Platzhalter" (`isPlaceholderLegalUrl`) und für das eigentliche Öffnen (`openLegalUrl`, via `expo-linking`'s `Linking.openURL`, kein In-App-WebView — wie im Task-Auftrag als "einfachster verlässlicher Weg" vorgegeben). Die beiden Platzhalter-URL-Konstanten sind dort noch einmal wörtlich dupliziert (mit Kommentar, dass sie exakt mit `app.config.ts`s Defaults übereinstimmen müssen) statt von dort importiert — `app.config.ts` läuft in einem reinen Node/TS-Kontext zur Build-Zeit außerhalb von Metros `@/`-Alias-Auflösung, ein direkter Import von dort wäre kein verlässlicher Weg gewesen.
- Ist die konfigurierte URL (noch) ein Platzhalter, wird `showToast("Wird bald ergänzt")` gezeigt (Wiederverwendung des bestehenden M10-Toast-Systems) statt eines `Alert.alert` oder eines neuen UI-Elements.
- Settings-Hub: zwei neue Zeilen ("Datenschutzerklärung"/"Nutzungsbedingungen") im selben Pressable-Zeilen-Stil wie die bestehenden `SECTIONS`, aber mit eigenem Press-Handler (`openLegalUrl`) statt `router.push`, da es keine interne Route ist.
- Register-Screen-Frage ("dein Aufruf, dokumentieren"): JA, ergänzt — ein kleiner Hinweistext unter dem "Konto erstellen"-Button ("Mit der Registrierung akzeptierst du unsere Datenschutzerklärung und Nutzungsbedingungen.") mit denselben zwei tappable Links (identisches `openLegalUrl`-Verhalten, gleiche Platzhalter-Toast-Logik) — gängige App-Store/Play-Store-Erwartung, sehr günstig/reversibel (ein einzelner `<Text>`-Block), daher direkt mitgebaut statt nur als Folgeaufgabe vermerkt.

**Warum das später leicht änderbar ist:** Sobald iubenda eingerichtet ist, genügt es, die beiden `app.config.ts`-Werte auf die echten Embed-URLs zu ändern — `isPlaceholderLegalUrl` erkennt sie dann automatisch nicht mehr als Platzhalter, kein Code in `settings.tsx`/`register.tsx` muss angefasst werden.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 1 — Haptik: ausgewählte Interaktionen und Intensitäten

**Problem/Lücke:** Der Task-Auftrag verlangt explizit eine KLEINE, bewusst gewählte Menge an Haptik-Interaktionen ("nicht jeder einzelne Tap") — welche genauen Interaktionen und welche Intensität (`Haptics.ImpactFeedbackStyle`) war nicht vorgegeben.

**Entscheidung:** `expo-haptics` (`~57.0.3`, per `npx expo install`) neu installiert. Genau diese Interaktionen bekommen einen `Haptics.impactAsync(...)`-Aufruf, jeweils direkt bei der Nutzer-Geste (nicht erst nach einem Server-Roundtrip, außer explizit vermerkt):

- **Light:** jeder Stern-Tap in `StarRating.tsx` (`handleStarPress`).
- **Light:** der Like-Herz-Tap in `StarRating.tsx` (`handleHeartPress`, neu — ersetzt den direkten `onPress={onToggleLike}`).
- **Light:** erfolgreiches Hinzufügen zur Watchlist — zentral in `useAddToWatchlist`s `onSuccess` (`src/hooks/useMovieDetailMutations.ts`), NICHT an den einzelnen Call-Sites (`MovieDetailActionsBar`s "Zur Watchlist"/"Direkt bewerten"-Buttons UND Add-Movie-Modals Quick-Add-"+"-Button teilen sich denselben Hook und bekommen die Haptik dadurch automatisch einheitlich, an einer einzigen Stelle).
- **Medium:** Bestätigen einer destruktiven Lösch-Aktion — an drei Stellen mit identischem Muster (Impuls sofort beim Tap auf den Bestätigen-Button, nicht erst nach Erfolg): `MovieDetailActionsBar.handleDeleteConfirm` (Film aus Watchlist löschen), `tracker.tsx`s `confirmDelete` (Zahlung löschen), `settings/delete-account.tsx`s `handleConfirmDelete` (Konto endgültig löschen).

Bewusst NICHT mit Haptik versehen: Pull-to-Refresh — keiner der Watchlist-/Tagebuch-/Tracker-Screens hat aktuell einen Pull-to-Refresh-Mechanismus gebaut (`RefreshControl` kommt im gesamten `src/`-Baum nicht vor), daher wurde hier bewusst NICHTS ergänzt (das wäre Scope-Creep für diese Aufgabe) — als Nice-to-have für einen späteren Milestone vermerkt, falls Pull-to-Refresh dort einmal gebaut wird.

`expo-haptics`-Aufrufe sind bewusst NICHT in try/catch gewrappt (Bibliothek nootet bereits intern auf nicht unterstützter Android-Hardware, ein zusätzlicher Catch würde nur echte Bugs verschlucken können) — exakt wie im Task-Auftrag vorgegeben.

**Warum das später leicht änderbar ist:** Jeder Aufruf ist ein einzeiliger `Haptics.impactAsync(...)`-Call an einer klar benannten Stelle; Intensität oder Auswahl ändern heißt, einzelne Zeilen zu editieren/entfernen, keine Strukturänderung.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 1 — Animation: Toast nur Fade-IN, gestaffeltes Grid-/Karten-Fade-in mit gedeckeltem Stagger

**Problem/Lücke:** `ToastHost` (`src/components/ui/Toast.tsx`, M10) zeigte/versteckte bisher abrupt (kein Fade/Slide); der Task-Auftrag nennt das explizit als Beispiel für "abruptes Show/Hide". Zusätzlich sollte ein gestaffeltes Fade-in für neu geladene Listen-Einträge (MovieGrid/WatchlistPosterCard/DiaryPosterTile) ergänzt werden — beides ohne eine neue, schwere Animationsbibliothek (`react-native-reanimated` ist zwar bereits eine Dependency dieses Projekts, aber laut Task-Auftrag nur bei "starkem, spezifischem Bedarf" zu verwenden statt der eingebauten `Animated`-API; ein solcher Bedarf wurde hier nicht gesehen).

**Entscheidung:**
- `Toast.tsx`: Ein Fade+Slide-up-Entrance (`Animated.parallel` auf Opacity + `translateY`, 200ms) beim Erscheinen. Bewusst KEIN gespiegeltes Fade-OUT beim automatischen Verschwinden — ein Fade-out hätte bedeutet, das tatsächliche Unmounten bis zum Animationsende zu verzögern, was die bereits bestehenden, exakten `TOAST_DURATION_MS`-Timing-Tests (`Toast.test.tsx`) verkompliziert/verzögert hätte. Gegeben, dass dies ein Spare-Time-MVP-Projekt ohne Deadline-Druck ist (`CLAUDE.md`), wurde der Mehraufwand für einen derart kurzlebigen Toast als nicht lohnend bewertet — dokumentierter Trade-off, kein Versehen.
- Neue, wiederverwendbare `FadeInItem`-Komponente (`src/components/ui/FadeInItem.tsx`): ein `Animated.View`-Wrapper mit Fade-in (220ms) und einem index-basierten Stagger-Delay. Die Stagger-Berechnung selbst ist als reine Funktion ausgelagert (`computeStaggerDelayMs`, `src/lib/staggerAnimation.ts`) — 40ms pro Index, gedeckelt bei Index 8 (320ms Maximal-Delay), damit eine lange Liste nicht minutenlang nachstaffelt. Eingesetzt in `MovieGrid.tsx`s `FlatList`-`renderItem`, `watchlist.tsx`s Grid/Karten-`FlatList`-`renderItem` und `tagebuch.tsx`s Grid-/Karten-`.map()`-Blöcken (NICHT in Tagebuchs "Liste"-Modus oder Trackers Tabellen-Zeilen — die wurden im Task-Auftrag nicht genannt und sind reine Text-Zeilen ohne Poster-Kachel-Charakter).
- Timing-/Easing-Werte (200ms/220ms/40ms-Schritte) sind unverifiziert-visuell gewählte, plausible Defaults — in dieser Umgebung ist keine echte Geräte-/Simulator-Vorschau möglich (siehe Task-Auftrag).

**Warum das später leicht änderbar ist:** `FadeInItem`/`computeStaggerDelayMs` sind eigenständige, kleine Module — Timing-Konstanten sind einzelne benannte Werte, ein Fade-out für den Toast wäre eine lokale Ergänzung in genau einer Datei.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 1 — Keyboard-Avoiding: reine Platform-Funktionen statt gerenderter Prop-Prüfung, Scope auf Login/Register/Sheet

**Problem/Lücke:** Login/Register/`Sheet.tsx` (und darüber PaymentModal/`delete-account.tsx`) hatten kein `KeyboardAvoidingView` — auf kurzen Geräten könnte die Tastatur den Submit-Button verdecken. `RatingDialog`/Add-Movie-Modal wurden geprüft und brauchen KEINS (alle Datumsfelder nutzen `DateField`s nativen Date-Picker statt Tastatur; Add-Movies Such-Textfelder sitzen oben im Screen, keine Verdeckungsgefahr für den restlichen Inhalt). Ein technisches Zwischenproblem: RNTLs (v14) gerenderter Test-Baum exponiert nur HOST-Component-Props, `KeyboardAvoidingView`s eigenes `behavior`-Prop wird intern konsumiert und nie an die zugrunde liegende `View` weitergereicht — direktes `getByTestId(...).props.behavior` in einem Test schlägt fehl, `UNSAFE_getByType` existiert in dieser RNTL-Version nicht mehr.

**Entscheidung:**
- Die "welchen `behavior`-Wert" Entscheidung wurde in zwei reine, `Platform.OS`-String-parametrisierte Funktionen ausgelagert (`src/lib/platformKeyboardAvoiding.ts`): `screenKeyboardAvoidingBehavior` (iOS: `"padding"`, Android: `undefined` — verlässt sich auf Androids eigenes `windowSoftInputMode: "adjustResize"`) für Login/Register, und `modalKeyboardAvoidingBehavior` (iOS: `"padding"`, Android: `"height"`) für `Sheet.tsx` — Android braucht dort explizit `"height"` statt `undefined`, weil RNs `Modal` ein eigenes natives Fenster (Dialog) öffnet, auf das Androids `adjustResize`-Default (der nur für das Activity-Fenster gilt) NICHT automatisch wirkt. Diese Funktionen sind direkt unit-getestet (`__tests__/lib/platformKeyboardAvoiding.test.ts`); die Komponenten selbst rufen sie nur noch auf (`behavior={screenKeyboardAvoidingBehavior(Platform.OS)}` etc.) — kein fragiler RNTL-Test gegen die reale `KeyboardAvoidingView`-Komponente nötig.
- `create-or-join-group.tsx` (Onboarding) hat ebenfalls Text-Eingaben, bekam aber bewusst KEIN `KeyboardAvoidingView` — der Task-Auftrag nennt explizit nur Login/Register/Rating-Dialog/Add-Movie als zu prüfende Screens; dieser Screen ist nicht zentriert (Inhalt wächst von oben nach unten, kein `justify-center`), das Überdeckungsrisiko ist geringer, und eine ungefragte Ausweitung auf weitere Screens wäre über die "Review-and-fix, keine erfundenen Fälle"-Vorgabe hinausgegangen.

**Warum das später leicht änderbar ist:** Zwei reine Funktionen mit je einer Zeile Logik — ein dritter Kontext (z.B. `create-or-join-group.tsx`) bräuchte höchstens eine dritte, analoge Funktion plus einen `KeyboardAvoidingView`-Wrapper an einer Stelle.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 1 — Safe-Area: `SafeAreaView` gezielt pro Screen, nicht global

**Problem/Lücke:** Trotz `react-native-safe-area-context` als bestehender Dependency wurde `SafeAreaView`/`useSafeAreaInsets` im gesamten `src/`-Baum bisher NIRGENDS verwendet. Die drei Haupt-Tabs (`tracker.tsx`/`watchlist.tsx`/`tagebuch.tsx`) laufen mit `headerShown: false` (`(tabs)/_layout.tsx`) — ohne eigene Safe-Area-Behandlung rendert ihr Inhalt potenziell unter der Status-Leiste/Notch/Dynamic-Island. Der Movie-Detail-Overlay (`movie/[tmdbId].tsx`) überschreibt den `(modals)`-Gruppen-Default sogar explizit auf `headerShown: false` (eigener manueller Zurück-Button) UND hat eine absolut positionierte Action-Leiste am unteren Bildschirmrand (`bottom-0`, kein Home-Indicator-Inset).

**Entscheidung:**
- `tracker.tsx`/`watchlist.tsx`/`tagebuch.tsx`: äußerstes Element wird `SafeAreaView` mit `edges={["top"]}` (nicht `["top","bottom"]`) — `bottom` wird bereits vom Tabs-Navigator selbst korrekt behandelt (der Tab-Bar-Container safe-area-paddet sich intern), ein zusätzliches `bottom`-Inset hier würde nur doppelten Abstand erzeugen.
- `movie/[tmdbId].tsx`: äußeres `SafeAreaView` mit `edges={["top"]}` (der manuelle Zurück-Button sitzt sonst unter der Notch), UND separat die absolut positionierte Action-Leiste selbst wird zu einem `SafeAreaView` mit `edges={["bottom"]}` (Home-Indicator-Inset nur dort, wo er wirklich gebraucht wird, nicht am gesamten Screen-Container, da der `ScrollView`-Inhalt bereits `pb-24` als Abstand zur fixen Leiste hat).
- `create-or-join-group.tsx` (Onboarding): eigenständiger `headerShown: false`-Screen OHNE Tab-Bar darunter → `edges={["top", "bottom"]}` (beide Insets sind hier tatsächlich diese Screens eigene Verantwortung).
- Login/Register: bewusst KEIN `SafeAreaView` ergänzt — der Inhalt ist vertikal zentriert (`justify-center`), das Überlappungsrisiko am oberen/unteren Rand ist dadurch strukturell geringer als bei den anderen genannten Screens; nur das (tatsächlich nötige) `KeyboardAvoidingView` wurde dort ergänzt (siehe eigener Eintrag oben). Eine Ausweitung wäre jederzeit eine rein additive, unabhängige Änderung.
- Add-Movie-Modal und alle anderen `(modals)`-Screens mit dem Gruppen-Default `headerShown: true` brauchten KEINE Änderung — der native Header übernimmt das obere Inset bereits automatisch.
- `SafeAreaView` (statt `useSafeAreaInsets` + manuellem `style={{paddingTop: insets.top}}`) gewählt, weil es KEINEN `SafeAreaProvider`-Ancestor braucht (native, in sich geschlossene Komponente) und weil es KEIN Inline-`style`-Prop im Sinne der Projekt-Konvention ist (analog zur `Animated`-API-Ausnahme aus dem Task-Auftrag: ein dedizierter Safe-Area-Baustein statt handgerolltem `style`).

**Warum das später leicht änderbar ist:** `edges`-Prop ist pro Stelle ein einzelnes Array — Anpassungen (z.B. Login/Register doch mit Safe-Area versehen) sind lokale, unabhängige Ein-Zeilen-Änderungen ohne Strukturfolgen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 1 — StatusBar: fest `style="light"`, nicht `colorScheme`-abhängig

**Problem/Lücke:** `expo-status-bar` ist zwar eine Dependency, wurde aber nirgends als `<StatusBar>`-Komponente gerendert — ohne das folgt die Status-Leiste dem GERÄTE-eigenen Hell/Dunkel-Modus, während diese App selbst (`tailwind.config.js`s `bg-primary: "#0a0a0a"` etc.) durchgehend ein einziges, festes dunkles Farbschema hat, unabhängig vom System-Farbschema (nur die Gruppen-Akzentfarbe wechselt, nie das Grund-Theme). Auf einem Gerät im Light-Mode wären Status-Leisten-Icons/Text dann dunkel-auf-dunkel — praktisch unsichtbar.

**Entscheidung:** `<StatusBar style="light" />` (aus `expo-status-bar`) fest in `src/app/_layout.tsx` (App-weit, einmalig) — bewusst NICHT an `useColorScheme()` gekoppelt (im Gegensatz zu `ThemeProvider`s `DarkTheme`/`DefaultTheme`-Wahl direkt darüber, die nur React Navigations eigenes natives Chrome betrifft, nicht diese Apps eigenes Farbschema).

**Warum das später leicht änderbar ist:** Eine einzelne Komponenten-Zeile an einer Stelle — sollte die App später doch ein echtes Light-Theme bekommen, würde die `style`-Prop dort schlicht wieder an `colorScheme` gekoppelt.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

---

## M11 Teil 2 (EAS-Cloud-Build-Erstsetup) — Lokale portable Node-22-Laufzeit nur für `eas-cli`-Aufrufe

**Problem/Lücke:** `npx eas-cli init`/`build:configure`/`build` scheiterten auf diesem Raspberry-Pi-Host (System-Node: `nodejs` 20.19.2 via apt, kein `nvm`/`fnm`/`n` installiert) mit `Error reading Expo config at app.config.ts: Unexpected token '{'` (`SyntaxError` in Node-internem `compileSourceTextModule`). Ursache: `npx eas-cli` lädt sein EIGENES, npx-gecachtes `@expo/require-utils`@55.0.8 (unabhängig von diesem Projekts eigenem, funktionierenden `@expo/config`@57.0.9 in `node_modules/`) — diese ältere `require-utils`-Version verlässt sich auf Node's natives TS-Type-Stripping-`require()`, das auf Node 20.19.2 fehlerhaft/inkompatibel ist. Das Projekt selbst deklariert bereits `"engines": {"node": ">=22"}` in `package.json` (keine neue Entscheidung von mir — das stand schon so da), das ist also ein bereits vorausgesetzter, aber auf diesem Host nie eingerichteter Node-Major.

**Entscheidung:** Portable Node-v22.20.0-linux-arm64-Distribution von nodejs.org in einen Scratch-Ordner (`/tmp/.../scratchpad/node22/node-v22.20.0-linux-arm64/`, NICHT im Repo) entpackt und deren `bin/`-Verzeichnis nur für die einzelnen `eas-cli`-Bash-Aufrufe dieser Session vorne an `PATH` gehängt (kein systemweiter Eingriff, kein `apt`/`nvm`-Setup, keine Änderung an `scripts/android-build-env.sh`, das bewusst für die — separat abgebrochene — lokale Android-Build-Route gilt, nicht für EAS). Die eigentlichen App-/Build-Prozesse (Metro, Gradle, etc.) liefen weiterhin unverändert auf System-Node 20; nur der `eas-cli`-Client-Prozess selbst brauchte Node 22.

**Warum das später leicht änderbar ist:** Reine Host-Tooling-Randbedingung, kein Code/Config-Entscheid. Falls der Nutzer künftig öfter `eas-cli` lokal braucht, wäre die naheliegende dauerhafte Lösung ein echter Node-Version-Manager (nvm/fnm) statt des Ad-hoc-Scratch-Downloads hier — trivial nachrüstbar, ändert nichts an App-Code oder `eas.json`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M11 Teil 2 (EAS-Cloud-Build-Erstsetup) — `eas.json`: `preview`-Profil auf `android.buildType: "apk"` statt AAB-Default

**Problem/Lücke:** `eas build:configure --platform android` generierte ein Standard-`eas.json` mit `preview`-Profil ohne explizites `android.buildType` — EAS' Default ist dort `app-bundle` (AAB), das NICHT per `adb install` auf ein Gerät installierbar ist (nur für Play-Store-Submission gedacht). Für die reale Geräte-Verifikation auf dem angeschlossenen Pixel 6 Pro wird eine direkt installierbare APK gebraucht.

**Entscheidung:** `preview`-Profil um `"android": {"buildType": "apk"}` ergänzt. `development`- und `production`-Profile unverändert gelassen (production bleibt bewusst AAB-fähig für eine spätere echte Store-Submission).

**Warum das später leicht änderbar ist:** Eine einzelne `eas.json`-Zeile — für einen AAB-Build würde man einfach ein anderes Profil (`production`) oder den Wert direkt ändern.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M3-Nachbesserung (Live-Bug-Fix) — Login: fehlender expliziter `router.replace("/")` nach erfolgreichem Sign-in

**Problem/Lücke:** Realer, gemeldeter Produktions-Bug: manuell im Supabase-Dashboard angelegter (auto-confirmed) Nutzer, korrekte Credentials im Login-Screen auf dem echten Pixel 6 Pro eingegeben, "Anmelden" getippt — keine Fehlermeldung, kein Ladeindikator-Hänger, keine Navigation. Ursache: `src/app/(auth)/login.tsx` (M3) verließ sich beim erfolgreichen Sign-in ausschließlich auf `useAuthGate()`s `onAuthStateChange`-Listener, um die Navigation weg vom Login-Screen auszulösen. Dieser Listener lebt aber ausschließlich in `src/app/index.tsx` — und diese Komponente unmounted (und deabonniert damit ihren Listener) in dem Moment, in dem ihr eigenes `<Redirect href="/(auth)/login" />` beim allerersten Kaltstart-Check greift. Zum Zeitpunkt des tatsächlichen Login-Tap ist also niemand mehr auf das `SIGNED_IN`-Event abonniert — exakt dieselbe Auth-Gate-Lücken-Kategorie, die M9 Teil 2 (Gruppen-Verlassen) und M10 (Abmelden/Konto-Löschung, siehe [M10 — "Abmelden"/Konto-Löschung](#m10--abmeldenkonto-löschung-expliziter-routerreplace-statt-vertrauen-auf-den-bestehenden-auth-gate)) bereits gefunden und mit einem expliziten `router.replace("/")` behoben hatten. Der Login-Screen selbst — obwohl der ursprüngliche, älteste Betroffene dieser Lücken-Kategorie — hatte diesen Fix nie bekommen und wurde dadurch zum einzigen verbliebenen Fall, der im laufenden Betrieb tatsächlich reproduzierbar war (jeder normale Nutzer, der sich nach Cold-Start/Registrierung einloggt, ist betroffen; nur ein App-Neustart nach dem Login "korrigierte" es scheinbar, da `index.tsx` dabei neu mountet und `getSession()` die längst gültige Session vorfindet).

**Entscheidung:** `login.tsx`s `handleSubmit` ruft nach einem fehlerfreien `signInWithEmail(...)`-Ergebnis jetzt explizit `router.replace("/")` auf (analog zu `settings.tsx`s Abmelden-Handler) — das erzwingt einen frischen Mount von `index.tsx` und damit eine garantierte Neu-Auswertung von `useAuthGate()` unabhängig davon, ob irgendwo noch ein alter Listener aktiv ist. TDD: neuer Testfall `"navigates back to \"/\" on successful sign-in so useAuthGate re-evaluates"` in `__tests__/screens/Login.test.tsx` (rot ohne Fix, grün danach); alle 9 bestehenden Login-Tests sowie die verwandten `useAuthGate`/`routeIndex`/`Settings`/`Register`-Suiten (108 Tests) bleiben grün, `tsc --noEmit` sauber.

**Warum das später leicht änderbar ist:** Ein einzeiliger `router.replace("/")`-Aufruf, identisch zum bereits etablierten Muster aus M9/M10 — kein struktureller Eingriff.

**Verifikation auf dem echten Gerät:** Noch offen — reiner JS-Fix (keine native Code-Änderung), daher genügt zum Testen entweder ein neuer EAS-Build oder (falls ein Dev-Client + Metro-Workflow eingerichtet wird) ein Hot-Reload der laufenden Session; ein weiterer ~25-minütiger Cloud-Build-Zyklus wurde hier bewusst nicht selbst angestoßen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M3-Nachbesserung (Live-Bug-Fix) — `useAuthGate`: Race Condition bei parallelen `evaluate()`-Aufrufen überschrieb korrekten Zustand

**Problem/Lücke:** Realer, gemeldeter Bug: Nutzer legt erfolgreich eine Watch-Group an (Gruppe + Mitgliedschaftszeile serverseitig verifiziert vorhanden), landet nach einem Kaltstart der App aber wieder im Onboarding, als hätte er keine Gruppe. Ursache lag ausschließlich clientseitig in `src/hooks/useAuthGate.ts`: `evaluate()` wird aus zwei unabhängigen Stellen ausgelöst — dem direkten `supabase.auth.getSession().then(evaluate)`-Aufruf und dem `onAuthStateChange`-Listener (der laut Design von auth-js zusätzlich einmal für die bereits aufgelöste initiale Session feuert). Keiner der beiden Aufrufe hatte eine Sequenzierung (kein `AbortController`, kein Request-Zähler) — liefen die beiden `getUserGroups()`-Promises out-of-order zurück, gewann schlicht der zuletzt aufgelöste `setState`-Aufruf, selbst wenn er einen bereits überholten/veralteten Request beantwortete. Zusätzlich wurde JEDER Fehler aus `getUserGroups()` stillschweigend (kein `console.error`/`console.warn`, kein Sentry-Capture) in "0 Gruppen" → Onboarding-Zustand übersetzt, sodass ein echter transienter Fehler nicht von "Nutzer hat wirklich keine Gruppe" unterscheidbar war.

**Entscheidung:** Zwei Fixes in `useAuthGate()`:
1. Ein monoton hochzählender `requestIdRef`-Zähler: Jeder `evaluate()`-Aufruf erfasst beim Start seine eigene Request-ID; `setState` wird nur noch ausgeführt, wenn diese ID beim Auflösen des `getUserGroups()`-Promises noch die aktuellste ist — ein überholter, spät auflösender Aufruf wird verworfen, statt einen bereits korrekten neueren Zustand zu überschreiben.
2. Der Fehlerfall loggt jetzt via `console.warn("useAuthGate: getUserGroups failed, falling back to 'onboarding'", error)` (gleiche Konvention wie `src/hooks/usePushRegistration.ts`) — das bestehende Verhalten "Fallback auf 'onboarding' bei Fehler" (siehe [M3 — Fallback bei Gruppen-Lookup-Fehler](#m3--fallback-bei-gruppen-lookup-fehler) oben) bleibt unverändert, nur "still" wird zu "laut".

TDD: neuer Testfall `"keeps the later-started evaluate() call's result when an earlier-started call's request resolves after it (stale-response race)"` in `__tests__/useAuthGate.test.tsx` (rot ohne Fix — schlug mit `Received: "onboarding"` statt `"app"` fehl, grün danach); der bestehende Fehlerfall-Test wurde erweitert, um zusätzlich `console.warn` zu prüfen. Volle Suite (109 Test-Dateien / 992 Tests) bleibt grün, `tsc --noEmit` sauber.

**Warum das später leicht änderbar ist:** Rein interner Implementierungsdetail-Fix innerhalb eines Hooks (Request-ID-Ref + eine `console.warn`-Zeile) — keine Schema-/API-/Business-Regel-Änderung, kein anderer Aufrufer betroffen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## Datenbank-Nachbesserung (Live-Bug-Fix) — Fehlende Base-Table-GRANTs für `authenticated`/`service_role` auf allen public-Tabellen

**Problem/Lücke:** Bestätigter Bug auf dem echten `watchcrew-dev`-Projekt (`vketnadfeyovguikpaao`): keine einzige bisherige Migration hatte jemals ein explizites `GRANT` auf eine `public`-Tabelle gesetzt. Alle CRUD-RLS-Policies (angelegt in `20260919120000_watch_group_core_schema_and_rls.sql` und den folgenden Migrationen) setzen aber voraus, dass `authenticated`/`service_role` überhaupt erst die Basis-Tabellenrechte (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) besitzen, bevor RLS greifen kann — RLS filtert Zeilen, ersetzt aber nicht das Postgres-Privilegienmodell darunter. Per `pg_default_acl` auf dem Remote-Projekt verifiziert: die Default-Privileges für von der Rolle `postgres` neu angelegte Objekte in `public` enthielten für `authenticated`/`service_role` nur `TRUNCATE`/`REFERENCES`/`TRIGGER`, nie `SELECT`/`INSERT`/`UPDATE`/`DELETE`. Da alle Migrationen als `postgres` laufen, war jede neu angelegte Tabelle von diesem Loch betroffen — Clients und Edge Functions (`tmdb-proxy`, `cleanup-inactive-accounts`, die per `service_role`-Key direkt über PostgREST zugreifen) schlagen bei direkten Lese-/Schreibzugriffen mit `42501 permission denied` fehl, unabhängig davon, ob die jeweilige RLS-Policy korrekt wäre.

**Entscheidung:** Neue Migration `20260930090000_grant_authenticated_service_role_table_privileges.sql` mit expliziten, pro Tabelle exakt auf die jeweilige bestehende RLS-Policy-Abdeckung zugeschnittenen `GRANT`-Statements (kein pauschales `GRANT ALL`):
- `watch_groups`/`watch_group_members`: `SELECT, UPDATE, DELETE` für `authenticated` (kein `INSERT` — die einzigen Insert-Pfade sind die `SECURITY DEFINER`-RPCs `create_watch_group`/`join_watch_group_by_token`, die als `postgres` laufen).
- `movies`, `genres`, `movie_genres`, `movie_metadata_cache`, `streaming_availability_cache`: `SELECT` für `authenticated` (Read-only-Katalog/Cache); volles CRUD für `service_role` (Edge-Function-Schreibzugriff).
- `watchlist_entries`: volles CRUD für `authenticated`.
- `ratings`: `SELECT, INSERT, UPDATE` für `authenticated` (kein `DELETE` — keine entsprechende RLS-Policy existiert).
- `profiles`: `SELECT` für `authenticated` und `service_role` (Schreibpfad ausschließlich der `SECURITY DEFINER`-Trigger `handle_new_user`).
- `push_tokens`: `INSERT, UPDATE, DELETE` für `authenticated` (bewusst kein `SELECT` — write-only vom Client), `SELECT` für `service_role`.
- `push_subscriptions`: `SELECT, INSERT, DELETE` für `authenticated` (kein `UPDATE` — keine entsprechende RLS-Policy).
- `release_reminder_log`/`email_notification_log`: bewusst unangetastet — keine RLS-Policies, nur von `SECURITY DEFINER`-Funktionen unter `postgres` berührt.
- `anon` bewusst unangetastet — keine RLS-Policy zielt irgendwo auf `anon`/`public`.
- Zusätzlich `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role` als Root-Cause-Fix, damit künftige `CREATE TABLE`-Migrationen dasselbe Loch nicht erneut reproduzieren (wirkt nur auf künftig angelegte Tabellen, nicht rückwirkend).

Nutzer hat den Push auf das reale `watchcrew-dev`-Projekt explizit freigegeben ("ok du kannst pushen"). Migration per `npx supabase db push` angewendet; Erfolg per Read-only-Query gegen `information_schema.role_table_grants` (gefiltert auf `table_schema = 'public'` und `grantee in ('authenticated', 'service_role')`) verifiziert — alle oben aufgeführten Grants sind exakt wie in der Migration vorhanden, `release_reminder_log`/`email_notification_log`/`anon` unverändert.

**Warum das später leicht änderbar ist:** Reine additive `GRANT`-Statements, kein Schema-/RLS-Eingriff — ein fehlendes oder zu weit gefasstes Recht lässt sich pro Tabelle mit einer weiteren `GRANT`/`REVOKE`-Migration nachschärfen, ohne bestehende Policies anzufassen.

**Status:** ✅ Umgesetzt und auf `watchcrew-dev` (`vketnadfeyovguikpaao`) angewendet, Grants verifiziert. Nicht mehr offen.

---

## M10-Nachbesserung (Live-Bug-Fix) — `useGroupRealtimeSync`: von mehreren gleichzeitig gemounteten Tabs unabhängig aufgebauter Channel führte zu `.on()` nach `.subscribe()`-Absturz

**Problem/Lücke:** Bestätigter, auf einem echten Gerät per Maestro zweimal reproduzierter, 100%-deterministischer Absturz: der Watchlist-Tab crasht sofort mit dem React-Render-Error `cannot add \`postgres_changes\` callbacks for realtime:group-realtime-sync-<groupId> after \`subscribe()\`.`, ausgelöst in `src/hooks/useGroupRealtimeSync.ts:84` (ein `.on("postgres_changes", ...)`-Aufruf), aufgerufen aus `src/app/(app)/(tabs)/watchlist.tsx:83` (`WatchlistScreen`). Root Cause: `useGroupRealtimeSync(activeGroupId)` wird von ALLEN DREI Gruppen-Tabs (Tracker/Watchlist/Tagebuch) mit derselben `activeGroupId` aufgerufen, und `expo-router`s Tab-Navigator hält einen einmal besuchten Tab-Screen weiter gemountet (kein `unmountOnBlur`) — sobald ein Nutzer mehr als einen der drei Tabs besucht hat, rufen also mehrere gleichzeitig gemountete Screens den Hook für dieselbe Gruppe auf. Jeder Hook-Aufruf baute bislang unabhängig seine eigene `.channel(...).on(...).on(...).subscribe()`-Kette auf demselben Topic-String (`group-realtime-sync-<groupId>`) auf. `@supabase/realtime-js`s `RealtimeClient.channel(topic)` dedupliziert aber nach Topic-String — ein zweiter Aufruf mit demselben Topic liefert dasselbe (bereits `.subscribe()`te) Channel-Objekt statt eines neuen zurück (siehe `node_modules/@supabase/realtime-js/dist/main/RealtimeClient.js`s `channel()`). Und `RealtimeChannel.on()` wirft genau dann eine Exception, wenn der Channel bereits "joined"/"joining" ist. Landet die App also (Standard-Tab-Reihenfolge: Tracker zuerst) zunächst auf Tracker — der dort zuerst mountende Hook-Aufruf baut Channel + `subscribe()` auf — und wechselt der Nutzer danach zum Watchlist-Tab, bekommt dessen Hook-Instanz beim `.channel(...)`-Aufruf das bereits abonnierte Tracker-Channel-Objekt zurück; ihre eigenen `.on(...)`-Aufrufe darauf werfen dann exakt den gemeldeten Fehler.

**Entscheidung:** `useGroupRealtimeSync.ts` behandelt den Channel jetzt als geteilte, referenzgezählte Ressource pro `groupId` (modul-weites `Map<string, { channel, refCount }>`): Channel-Aufbau + beide `.on()`-Registrierungen + der einzige `.subscribe()`-Aufruf laufen exakt einmal — ausgelöst vom zuerst mountenden Screen — und werden erst per `supabase.removeChannel(...)` abgebaut, wenn der LETZTE der gleichzeitig gemounteten Konsumenten für diese `groupId` unmounted (oder sich die `groupId` ändert; jeder Konsument inkrementiert/dekrementiert nur den `refCount` seines Map-Eintrags). TDD: neuer Testfall in `__tests__/useGroupRealtimeSync.test.tsx` mit einem für diesen Test lokal installierten, gegenüber `@supabase/realtime-js`s echtem Verhalten treuen Mock (Topic-Deduplizierung + `.on()`-Wurf nach `.subscribe()`, exakter Original-Fehlertext) — reproduziert den exakten gemeldeten Fehler 1:1 bei zwei gleichzeitig für dieselbe `groupId` gemounteten Hook-Aufrufen (rot ohne Fix, mit genau der gemeldeten Fehlermeldung an `useGroupRealtimeSync.ts:84`; grün danach, inklusive der Prüfung `mockChannelFn` genau einmal statt zweimal aufgerufen). Alle 17 Tests der Datei sowie die volle Suite (109 Testdateien/993 Tests) bleiben grün, `tsc --noEmit` sauber.

**Warum das später leicht änderbar ist:** Rein interne Implementierungsdetail-Änderung innerhalb eines einzelnen Hooks (ein modul-weites Map + Referenzzählung) — keine Änderung der öffentlichen Hook-Signatur, keine Schema-/API-Änderung, kein Aufrufer (`watchlist.tsx`/`tracker.tsx`/`tagebuch.tsx`) muss angepasst werden.

**Verifikation auf dem echten Gerät:** Noch offen — reiner JS-Fix (keine native Code-Änderung); die nächste Maestro-Runde auf dem Pixel 6 Pro (derselbe Flow, der den Absturz ursprünglich reproduziert hat) sollte den Watchlist-Tab jetzt ohne Absturz laden, wurde hier aber nicht selbst angestoßen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — expo-image: `className` wurde von NativeWind verworfen (Poster mit Größe 0)

**Problem/Lücke:** Auf dem echten Gerät (Pixel 6 Pro, Maestro) rendern Such-Grid, Ähnliche-Filme-Grid und Detail-Poster keine Bilder, nur Platzhalter/leere Flächen. Root Cause: `MovieGrid.tsx`, `DiaryPosterTile.tsx` und `MovieDetailPosterTrailer.tsx` importieren `Image` aus `expo-image` und setzen Größe/Rundung ausschließlich per `className` (`aspect-[2/3] w-full ...`). NativeWind v4 wrappt aber nur React-Native-Core-Komponenten automatisch; `expo-image` ist nirgends per `cssInterop` registriert (`grep cssInterop src` = leer), `className` wurde daher still ignoriert und das Bild hatte Höhe 0.

**Entscheidung:** Neues Modul `src/components/ui/Image.tsx` registriert `expo-image`s `Image` per `cssInterop(Image, { className: "style" })` und re-exportiert es; die drei Komponenten importieren jetzt von dort. TDD: `__tests__/components/ui/Image.test.tsx` (rot ohne die Registrierung, grün mit). Jest hat kein kompiliertes NativeWind-CSS, daher prüft der Test die Registrierung, nicht das gerenderte Style.

**Warum das später leicht änderbar ist:** Nur ein Modul + drei Import-Zeilen; alternativ ließe sich `className` durch explizites `style` ersetzen.

**Verifikation auf dem echten Gerät:** Noch offen — nächste Maestro-Runde auf dem Pixel 6 Pro.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Gespeicherter Poster-Pfad ohne TMDB-Basis-URL

**Problem/Lücke:** `movies.poster` speichert (korrekt, `movie-upsert.ts:265`, per Test fixiert) nur den rohen TMDB-Pfad (`/abc.jpg`). `WatchlistPosterCard` (RN-`Image`, `source={{ uri: movie.poster }}`), Tagebuch (`DiaryPosterTile posterUrl={entry.movie.poster}`) und Detail-Overlay (`posterUrl = storedMovie?.poster`) benutzten den Pfad direkt als URL, nur `MovieGrid` baute die Basis-URL selbst zusammen. Daher auch Watchlist-Karten ohne Poster.

**Entscheidung:** Neuer Helper `src/lib/tmdbImage.ts` (`buildTmdbImageUrl(path, size = "w342")`; `null` für leer, absolute `http(s)`-URLs bleiben unverändert). Genutzt in `MovieGrid` (ersetzt die lokale Kopie), `WatchlistPosterCard`, `tagebuch.tsx` (beide Tile-Aufrufe) und im Detail-Overlay (Größe `w780`, Wahl der Größen `w342` Grid/Karten und `w780` Detail ist eine Schätzung). DB-Spalte/Edge Function bleiben unverändert (kein Datenbestand muss migriert werden).

**Warum das später leicht änderbar ist:** Größen-Konstanten leicht anpassbar; alternativ könnte die Edge Function künftig volle URLs speichern (würde Migration der Bestandsdaten erfordern, deshalb nicht gewählt).

**Verifikation auf dem echten Gerät:** Noch offen — nächste Maestro-Runde auf dem Pixel 6 Pro.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Detail-Overlay ignorierte Live-`details` (Titel "Film", kein Poster, Overview leer)

**Problem/Lücke:** Aus der Suche geöffnete Filme (nicht in der Watchlist) haben nur `tmdbId` als Route-Param; `movie/[tmdbId].tsx` leitete Titel/Poster/Overview/Release-Datum ausschließlich aus `storedMovie` (DB-Zeile oder `movieJson`) ab, daher der Fallback `"Film"`. Die `details`-Action liefert `title`/`overview`/`posterPath`/`releaseDate` längst mit (seit M7 part 1, per curl gegen das Live-Proxy verifiziert), der Client-Typ `NormalizedMovieDetails` kannte sie aber nicht.

**Entscheidung:** `NormalizedMovieDetails` (`movieDetailTypes.ts`) additiv um die vier Felder erweitert (optional); Screen nutzt `storedMovie?.x ?? liveDetails?.x` (DB-Zeile behält Vorrang), "Film" bleibt letzter Platzhalter. Tests in `__tests__/screens/MovieDetail.test.tsx` (Titel, Poster-URL, gespeicherter Bare-Pfad).

**Warum das später leicht änderbar ist:** Reine Screen-Ableitung, keine API-Änderung.

**Verifikation auf dem echten Gerät:** Noch offen — nächste Maestro-Runde auf dem Pixel 6 Pro.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Release-Datum im Detail-Overlay roh als ISO-Datetime

**Problem/Lücke:** Die deutsche `release_dates`-Action liefert `2010-07-29T00:00:00.000Z`; `MovieDetailMetaRow` zeigte den String unformatiert ("Kino 2010-07-29T00:00:00.000Z"), während die Watchlist-Karte über `watchlistDateBadge` formatiert.

**Entscheidung:** Der Screen formatiert das Datum für die Meta-Zeile mit dem bereits vorhandenen `formatDateForInput` (`ratingLogic.ts`, schneidet auf `YYYY-MM-DD` und liefert `DD.MM.YYYY`) — "Kino 29.07.2010". `releaseInfo.date` selbst bleibt roh (wird für `isReleased` und den RatingDialog weiterverwendet). Test siehe oben.

**Warum das später leicht änderbar ist:** Einzeiliger Aufruf im Screen.

**Verifikation auf dem echten Gerät:** Noch offen — nächste Maestro-Runde auf dem Pixel 6 Pro.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Modal-Header zeigten rohe Routennamen (`add-movie`, `similar/[tmdbId]`)

**Problem/Lücke:** `(modals)/_layout.tsx` schaltet `headerShown: true` für alle Modals, vergibt aber keine Titel; Expo Router fällt dann auf den Routennamen zurück. In `docs/feature-inventory.md`, `docs/adr/` und `planning-report.html` sind keine Header-Titel für diese beiden Screens dokumentiert.

**Entscheidung:** Eigene Wahl: `add-movie` → "Film hinzufügen" (Funktion des Screens), `similar/[tmdbId]` → "Ähnliche Filme" (Button-Label/Feature-Name aus feature-inventory 2.10). Gesetzt per `Stack.Screen options.title` im Layout; Test `__tests__/modalsLayout.test.tsx`. Nicht angefasst: `collection/…`, `filmography/…` und `settings/…` haben vermutlich dasselbe Problem (eigene Titel-Entscheidung nötig).

**Warum das später leicht änderbar ist:** Zwei Strings im Layout.

**Verifikation auf dem echten Gerät:** Noch offen — nächste Maestro-Runde auf dem Pixel 6 Pro.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Tab-Bar-Icons als "Kasten mit X" (fehlendes `tabBarIcon`)

**Problem/Lücke:** `(tabs)/_layout.tsx` setzte kein `tabBarIcon`; React Navigation fällt dann auf `MissingIcon` (Kasten mit X) zurück. Das Zahnrad funktionierte, weil es ein Emoji-Text ("⚙️") ist, kein Icon-Font. Kein Font-/Build-Problem — `Ionicons` wird bereits auf anderen Screens genutzt.

**Entscheidung:** Eigene Wahl: Ionicons `film` (Tracker), `bookmark` (Watchlist), `book` (Tagebuch); aktiv gefüllt, inaktiv `-outline`, Farbe/Größe von der Tab-Bar. Test `__tests__/tabsLayout.test.ts`.

**Warum das später leicht änderbar ist:** Ein `icon`-Feld je Eintrag in `TAB_SCREENS`.

**Verifikation auf dem echten Gerät:** Noch offen — nächste Maestro-Runde auf dem Pixel 6 Pro.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Navigation & Header: Watchlist/Tagebuch nicht antippbar, Filmreihe-Referenz ungültig, rohe Header-Titel, Regie/Schauspieler-Taps wirkungslos

**Problem/Lücke:** Beim Geräte-Test: (1) Einträge in Watchlist und Tagebuch reagierten nicht auf Taps. (2) Filmreihen-Navigation lieferte "Ungültige Filmreihen-Referenz", weil die `tmdbId` nicht mitgegeben wurde. (3) Modal-Header von Settings, Filmreihe und Filmografie zeigten rohe Routennamen (Nachzügler zum Eintrag "Modal-Header zeigten rohe Routennamen"). (4) Tap auf Regisseur/Schauspieler im Detail öffnete die Filmografie nicht. (5) Tagebuch-Ansichtsmodus-Buttons ohne erkennbaren aktiven Zustand.

**Entscheidung:** Watchlist- und Tagebuch-Einträge navigieren über `navigateToMovieDetail` (`src/lib/movieDetailNavigation.ts`); die Filmreihen-Navigation übergibt jetzt die `tmdbId`. Header-Titel (eigene Wahl, per `Stack.Screen options.title` in `(modals)/_layout.tsx`): `settings` → "Einstellungen", `settings/streaming-services` → "Meine Streaming-Dienste", `settings/display` → "Darstellung", `settings/notifications` → "Benachrichtigungen", `settings/changelog` → "Changelog", `settings/delete-account` → "Konto löschen", `collection/[collectionId]` → "Filmreihe", Filmografie → "Filmografie: Regisseur" / "Filmografie: Schauspieler:in" / "Filmografie: Studio". Regie/Schauspieler-Taps: `pointerEvents="none"` auf dem unsichtbaren Mess-Text in `MovieDetailDescription.tsx` — die Ursache ist aus dem Code ABGELEITET, nicht auf dem Gerät bestätigt. Tagebuch-Ansichtsmodus-Buttons nutzen die `Button`-Varianten primary (aktiv) / secondary (inaktiv). Tests: `__tests__/movieDetailNavigation.test.tsx`, `modalsLayout.test.tsx`, `screens/Watchlist|Tagebuch|MovieDetail.test.tsx`, `components/movie/MovieDetailDescription.test.tsx`.

**Warum das später leicht änderbar ist:** Navigation in einer Helper-Funktion; Titel sind reine Strings im Layout; Button-Varianten sind je eine Prop.

**Offene Punkte:** Die Ursache des Regie/Schauspieler-Tap-Problems (Mess-Text fängt Touches ab) ist nicht am Gerät belegt — falls der Fix nicht greift, erneut analysieren. Die Titelwahl (s.o.) ist deine Entscheidung.

**Verifikation auf dem echten Gerät:** Noch offen — Maestro-/adb-Runde auf dem Pixel 6 Pro (siehe Bericht).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Sheets/Dialoge & Datum: durchscheinende Sheets, UTC-Datum, umbrechende Tracker-Datumsspalte, veraltete Action-Bar, Gruppen-Chip nach Umbenennen

**Problem/Lücke:** Beim Geräte-Test: (1) Sortieren-/Zahlungs-Sheet halbtransparent und mit Speichern-Button unter der System-Navigation; RatingDialog schien durch. (2) Datumsvorgaben nutzten UTC (`toISOString().slice(0,10)`) und lagen abends/nachts einen Tag daneben. (3) Zahlungsdatum in der Tracker-Spalte brach um. (4) Nach "Zur Watchlist" aus der Suche blieb die Action-Bar im Detail unverändert (Detail ohne Route-Gruppen-Kontext beobachtete keine Watchlist). (5) Nach Gruppe umbenennen aktualisierte sich der Chip "Deine Gruppen" nicht.

**Entscheidung:** `Sheet.tsx`: opakes `bg-bg-primary` plus unterer `SafeAreaView`. Lokale Datums-Helper in `src/lib/localDate.ts` ersetzen die UTC-Schnitte in `RatingDialog`, `PaymentModal` und `DateField`. Tracker-Datumsspalte `w-28`. Detail ohne Route-Gruppen-Kontext beobachtet die Watchlist der aktiven Gruppe (`src/lib/movieDetailEntryContext.ts`, `movie/[tmdbId].tsx`). `useRenameGroup` invalidiert zusätzlich `["userGroups"]`. Tests: `__tests__/Sheet.test.tsx`, `lib/localDate.test.ts`, `components/movie/localDateDefaults.test.tsx`, `lib/movieDetailEntryContext.test.ts`, `useGroupSettings.test.tsx`, `screens/Tracker.test.tsx`.

**Warum das später leicht änderbar ist:** Sheet-Hintergrund = eine Klasse; Datum = ein Helper-Modul; Spaltenbreite = eine Klasse; Invalidierung = eine Zeile.

**Offene Punkte:** (a) Einheitliche Datumsformate ungeklärt: Zahlung speichert/zeigt `YYYY-MM-DD`, Bewertung `DD.MM.YYYY`. (b) `resolvePaymentDate`-Fallback und `daysSincePayment` rechnen weiterhin UTC-basiert. (c) Kein Erfolgs-Feedback nach Umbenennen und nach "Zur Watchlist". (d) "Button-busy" >10 s nicht reproduziert. (e) `navigationBarTranslucent` am Modal nicht gesetzt.

**Verifikation auf dem echten Gerät:** Noch offen — Maestro-/adb-Runde auf dem Pixel 6 Pro (siehe Bericht).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Gruppen-Chip nach Umbenennen (`groupNames`) & Regie/Schauspieler-Taps (Mess-Text-Overlay)

**Problem/Lücke:** Geräte-Test Pixel 6 Pro: (1) Nach Umbenennen zeigte der Chip "Deine Gruppen" weiter den alten Namen. (2) Antippen von Regisseur/Schauspieler im Detail löste nichts aus; der frühere Fix `pointerEvents="none"` auf dem Mess-Text half nicht.

**Ursache:** (1) Der Chip liest den Namen über `useGroupNames` (Query-Key `["groupNames", groupIds]`, `src/hooks/useGroupDetails.ts`); `useRenameGroup` invalidierte nur `groupDetails`/`userGroups`. (2) Der unsichtbare Mess-Text in `MovieDetailDescription` ist `absolute` ohne Insets: Yoga setzt ihn an den Parent-Start, er ist vollbreit und mehrzeilig und lag damit über Titel/Genre/Regie/Cast. Am Gerät kam nicht einmal `onTouchStart` der Pressables an (temporäre Logs, danach entfernt; `uiautomator` zeigte die Elemente nur als klickbar); "Mehr anzeigen" darunter funktionierte. `pointerEvents` auf `Text` wird von der nativen Android-Text-View nicht zuverlässig beachtet.

**Entscheidung:** (1) `useRenameGroup` invalidiert zusätzlich `["groupNames"]`. (2) Mess-Text liegt in einem Wrapper `absolute h-0 w-full overflow-hidden` (testID `movie-detail-description-measure-wrapper`) und hat damit keine Trefferfläche; `pointerEvents`-Prop entfernt. Tests: `__tests__/useGroupSettings.test.tsx` (rot/grün), `__tests__/components/movie/MovieDetailDescription.test.tsx` (Test auf Wrapper-Klassen ersetzt; Test und Fix in einem Schritt, kein separater Rot-Lauf; jest kann das native Hit-Testing nicht abbilden, nur die Struktur).

**Warum das später leicht änderbar ist:** Eine Invalidierungs-Zeile; ein Wrapper mit zwei Klassen.

**Offene Punkte:** Andere `absolute`-Elemente ohne Insets im Projekt nicht systematisch geprüft.

**Verifikation auf dem echten Gerät:** Pixel 6 Pro, Kaltstart: Umbenennen auf "Testrename" und zurück aktualisiert den Chip sofort (PASS); Regisseur- und Schauspieler-Tap öffnen "Filmografie: Regisseur" bzw. "Filmografie: Schauspieler:in" (PASS). Screenshots in `.scratch-screenshots/verify-fixes-2026-10-01/`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Datumsformat TT.MM.JJJJ vereinheitlicht, UTC-Reste & YouTube-Trailer Fehler 153

**Problem/Lücke:** (1) Zahlungs-Modal zeigte `YYYY-MM-DD`, Bewertungsdialog `DD.MM.YYYY`; `resolvePaymentDate`-Fallback und `daysSincePayment` rechneten noch UTC-basiert. (2) Trailer im Film-Detail zeigte "Fehler 153 – Fehler bei der Konfiguration des Videoplayers" (Screenshot `38-trailer.png`).

**Ursache:** (1) `PaymentModal`, Tracker-Bearbeiten und Add-Movie-Datumssheet übergaben den ISO-Wert direkt als `displayText` an `DateField`; `ratingLogic.resolvePaymentDate` nutzte `now.toISOString()`, `trackerLogic.daysSincePayment` das UTC-Datum von `now`. (2) `MovieDetailPosterTrailer.tsx` lud `https://www.youtube.com/embed/<key>?playsinline=1` als `source={{ uri }}` direkt als Top-Level-Seite im WebView, ohne einbettende Seite und ohne Referer; YouTube lehnt solche Embeds mit Fehler 153 ab (Belege: Komponente/URL gelesen; nach Fix lädt derselbe Player-Aufbau auf dem Gerät ohne Fehler).

**Entscheidung:** (1) Alle getippten/angezeigten Datumsfelder zeigen `TT.MM.JJJJ` (über `formatDateForInput`), gespeichert wird weiter ISO. `resolvePaymentDate` fällt auf `toLocalIsoDate(now)` zurück (Format nun `YYYY-MM-DD` statt Timestamp; `paid_at` ist eine `date`-Spalte), `daysSincePayment` vergleicht gegen das lokale Datum; `rated_at` bleibt ein echter Timestamp. (2) Neuer Helper `src/lib/trailerEmbed.ts` (`buildTrailerWebViewProps`): `youtube-nocookie.com/embed/<key>?playsinline=1&rel=0&origin=…` plus `Referer`-Header, `originWhitelist` `https://*`, `allowsInlineMediaPlayback`, `allowsFullscreenVideo`, `mediaPlaybackRequiresUserAction=false`. Passt zur Legacy-Spezifikation (feature-inventory.md: YouTube-iframe, nocookie-Domain); kein Spec-Konflikt. Tests: `__tests__/localDateLogic.test.ts` (TZ Europe/Berlin, 22:10Z), `__tests__/lib/trailerEmbed.test.ts`; bestehende Tests auf das neue Format angepasst (PaymentModal, localDateDefaults, ratingLogic, useSaveRating, useTrackerPayments).

**Warum das später leicht änderbar ist:** Ein Helper für die Trailer-Props (Origin an einer Stelle); Anzeigeformat über einen Aufruf von `formatDateForInput` pro Feld.

**Offene Punkte:** Referer/Origin ist `https://www.youtube-nocookie.com`, keine eigene App-Domain; YouTube könnte das Verhalten ändern. Der Fullscreen-Modal-Pfad nutzt dieselben Props, wurde am Gerät nicht separat geprüft.

**Verifikation auf dem echten Gerät:** Pixel 6 Pro, Kaltstart: Zahlungs-Modal-Datumsfeld zeigt `01.10.2026` (PASS, `t1-payment-modal.png`); Interstellar-Trailer lädt ohne Fehler 153, YouTube-Player mit Titel und Play-Button sichtbar (PASS, `t2-trailer.png`; Wiedergabe selbst nicht gestartet). Screenshots in `.scratch-screenshots/verify-fixes-2026-10-01/`.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Erfolgs-Toasts (Gruppe umbenannt, Watchlist, Bewertung, Zahlung)

**Problem/Lücke:** Gruppe umbenennen, "Zur Watchlist" und Zahlung speichern gaben keinerlei Rückmeldung; das Speichern einer Bewertung zeigte einen nativen Alert ("Gespeichert – Deine Bewertung wurde gespeichert.").

**Ursache:** Die Toast-Infrastruktur (`showToast`/`ToastHost`, M10) wurde nur für Realtime-Sync und den Changelog-Hinweis genutzt; der Alert im `RatingDialog` stammte aus M7 Teil 2b, als es noch keinen Toast gab.

**Entscheidung:** Kurze Toasts über das bestehende System: "Gruppe umbenannt" (`useRenameGroup.onSuccess`), "Zur Watchlist hinzugefügt" (`useAddToWatchlist.onSuccess`, daher auch beim Quick-Add im Add-Movie-Modal und bei "Direkt bewerten"), "Bewertung gespeichert" (`RatingDialog`, ersetzt den nativen Success-Alert; Fehler-Alerts bleiben), "Zahlung gespeichert" (`PaymentModal`). Sichtbarkeit: `Sheet` basiert auf RN `Modal` (eigenes natives Fenster, liegt über dem im Root-Layout eingebundenen `ToastHost`). Der Toast wird im selben Tick wie `onClose()` ausgelöst; er läuft 4 s, ist also sichtbar, sobald die Slide-Down-Animation des Sheets endet (nur die ca. 200-300 ms Entrance-Animation laufen darunter ab). Kein Eingriff in `Sheet`/`ToastHost`. Group-Settings ist ein normaler Stack-Screen (kein `Modal`), dort ist der Toast direkt sichtbar. Spec-Abgleich: ADR 0006 regelt nur den Realtime-Fall (Toast bei Vordergrund auf anderem Screen); feature-inventory.md nennt kein Alert-Verhalten für Bewertung speichern; die Alert-Entscheidung stand nur in docs/interim-decisions.md "M7 Teil 2b" und wird hiermit abgelöst. Kein Konflikt. Tests: `RatingDialog`, `PaymentModal`, `useGroupSettings`, `useMovieDetailMutations`.

**Warum das später leicht änderbar ist:** Je eine `showToast(...)`-Zeile mit Textkonstante pro Stelle.

**Offene Punkte:** Bei "Direkt bewerten" öffnet sich direkt der Bewertungsdialog; der "Zur Watchlist hinzugefügt"-Toast erscheint dort ggf. unter dem Modal und ist erst nach dessen Schließen (kurz) sichtbar. Ein Toast ersetzt einen laufenden (Single-Slot-Host).

**Verifikation auf dem echten Gerät:** Noch nicht erfolgt (Sichtbarkeit nach Sheet-Schließen nur per Analyse, nicht auf Gerät geprüft).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Anzeigename bei Registrierung, Änderung in den Einstellungen, einheitlicher Namens-Fallback

**Problem/Lücke:** Der Testaccount erschien überall als "Mitglied 1798f686" (Tracker-Zahler-Chips, Tagebuch-Bewertungen, Mitgliederliste); das Anzeigenamen-Feld in den Einstellungen war leer und nicht editierbar.

**Ursache:** Der Trigger `handle_new_user` las keine Sign-up-Metadaten (nur E-Mail-Präfix), die Registrierung fragte keinen Namen ab, und `authenticated` hat nur SELECT auf `profiles` (kein UPDATE/INSERT) — es gab keinen Schreibpfad. Ältere Accounts haben teils gar keine `profiles`-Zeile (daher der uuid-Fallback).

**Entscheidung:** (1) Registrierung: Pflichtfeld "Anzeigename", wird als `options.data.display_name` an `supabase.auth.signUp` übergeben. (2) Neue Migration `20260930100000_profiles_display_name_signup_metadata_and_rpc.sql`: Trigger bevorzugt `display_name`-Metadaten, dann E-Mail-Präfix, dann "Mitglied"; neue SECURITY-DEFINER-RPC `set_display_name(text)` (Upsert auf die eigene Zeile, 1-50 Zeichen, Fehlercodes WC005/WC006) statt Spalten-GRANT + UPDATE-Policy, weil ein UPDATE fehlende Zeilen nicht anlegen würde. (3) Einstellungen: editierbares Anzeigenamen-Feld + "Speichern" (Hook `useUpdateDisplayName`, invalidiert `ownProfile`/`groupDetails`/`watchlist`, Toast "Anzeigename gespeichert"). (4) Fallback zentral in `memberDisplayLabel` (`src/lib/diaryDisplay.ts`, war schon der einzige Ort, der "Mitglied <id8>" erzeugt): Name getrimmt, leer/null/nur Leerzeichen -> "Mitglied <id8>". Fremde E-Mails sind für den Client nicht lesbar, daher kein clientseitiger E-Mail-Fallback. (5) Backfill-Entwurf `20260930100100_profiles_backfill_missing_display_names.sql` (legt fehlende `profiles`-Zeilen aus `auth.users` an und füllt leere Namen mit dem E-Mail-Präfix; idempotent). Tests: `auth.test.ts`, `Register.test.tsx`, `Settings.test.tsx`, `lib/profile.test.ts`, `useUpdateDisplayName.test.tsx`, `diaryDisplay.test.ts`; SQL lokal in einer zurückgerollten Transaktion geprüft.

**Warum das später leicht änderbar ist:** Ein Helper für den Fallback, eine RPC mit zentraler Validierung, Backfill als separate Datei.

**Offene Punkte:** Beide Migrationen sind NICHT auf das Remote-Projekt angewendet (Push nötig); ohne Push schlägt "Speichern" fehl und neue Registrierungen speichern den Namen nicht. Bestehende Accounts (z.B. robintrautmann@gmx.de) zeigen weiter "Mitglied <id>", bis der Backfill läuft oder der Name einmal in den Einstellungen gesetzt wird. Maximale Namenslänge 50 ist eine Annahme. Keine Eindeutigkeitsprüfung für Namen.

**Verifikation auf dem echten Gerät:** Noch nicht erfolgt (Registrierung mit Namen, Namen in den Einstellungen ändern, Anzeige in Tracker/Tagebuch/Mitgliederliste nach Remote-Push der Migration).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung „Ähnliche Filme“: Poster/Score serverseitig per TMDB-Anreicherung

**Problem/Lücke:** Die Ansicht "Ähnliche Filme" zeigte nur Platzhalter ohne Poster/Score, weil Trakt nur `title`/`year`/`ids` liefert (bisherige Annahme in `similar/[tmdbId].tsx`, um bis zu 40 Einzelabrufe zu vermeiden).

**Entscheidung (Nutzer: Poster müssen von TMDB kommen):** Serverseitige Anreicherung innerhalb der bestehenden `trakt_related`-Aktion der Edge Function `tmdb-proxy` (`related-posters.ts`, `enrichRelatedWithPosters`): pro Treffer ein `fetchMovieDetails`-Lookup, Ergebnis `posterPath` + `voteAverage` je Eintrag. Ein Client-Roundtrip statt bis zu 40; Nebenläufigkeit begrenzt auf 8, Reihenfolge bleibt erhalten; Fallback pro Eintrag: bei Fehler oder fehlender `ids.tmdb` bleiben beide Felder `null` (Platzhalter wie zuvor). Kein Caching in `movie_metadata_cache` (die Treffer sind keine Bibliotheksfilme; Caching wäre eine separate Entscheidung). Client: `TraktRelatedMovie` bekommt optionale `posterPath`/`voteAverage`; der Screen reicht sie an `MovieGrid` durch. Tests: 4 Deno-Tests (`related-posters.test.ts`), `SimilarMovies.test.tsx`.

**Warum das später leicht änderbar ist:** Ein Modul mit injizierbarem Lookup und einer Konstante für die Nebenläufigkeit; Aufruf an einer Stelle in `index.ts`.

**Offene Punkte:** Edge Function `tmdb-proxy` muss neu deployt werden (bisher NICHT deployt); ohne Deploy bleiben die Platzhalter. Latenz steigt (bis zu 40 TMDB-Calls, ca. 5 Wellen à 8).

**Verifikation auf dem echten Gerät:** Noch nicht erfolgt (Darstellung von 40 Postern, Ladezeit der Ansicht).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Anzeigenamen-Cache & Toast beim Bearbeiten einer Zahlung

**Problem/Lücke:** (1) Nach dem Ändern des Anzeigenamens in den Einstellungen zeigten Tracker-Zahler, Tagebuch, Bewertungsdialog und Zahlungs-Sheet den alten Namen bis zum App-Neustart. (2) Das Speichern einer bearbeiteten Zahlung im Tracker zeigte keinen Toast.

**Ursache:** (1) Alle diese Stellen bauen ihre Namenslisten aus `useGroupMembers` (Query-Key `["groupMembers", groupId]`); `useUpdateDisplayName` invalidierte nur `ownProfile`, `groupDetails`, `watchlist`. (2) Nur der `PaymentModal`-Pfad rief `showToast`; `saveEdit` in `tracker.tsx` nicht.

**Entscheidung:** (1) Zusätzlich Präfix-Key `["groupMembers"]` invalidieren (alle Gruppen, minimal). (2) `showToast("Zahlung gespeichert")` im `onSuccess` von `saveEdit`; Löschen zeigt bewusst keinen Toast. Tests: `useUpdateDisplayName.test.tsx`, `Tracker.test.tsx`.

**Warum das später leicht änderbar ist:** Je eine Zeile in `useUpdateDisplayName.ts` bzw. `tracker.tsx`.

**Verifikation auf dem echten Gerät:** siehe Bericht der Nachbesserung (Pixel 6 Pro).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Einladungs-Deep-Link, Push-Toggles pro Gruppe, Tracker-Feature-Flag

**Problem/Lücke:** (1) Der Einladungslink `watchcrew://join/<token>` hatte keine Route (unmatched route); Beitritt ging nur per manuellem Einfügen. (2) Push-Opt-in war nur ein einzelner Schalter für die aktive Gruppe, und bei verweigerter OS-Berechtigung zeigte der Screen nichts an. (3) Das Tracker-Feature-Flag (Inventar 4.12) fehlte.

**Entscheidung:**
- **Deep Link:** neue Route `src/app/join/[token].tsx`. Eingeloggt: `joinWatchGroupByToken` (idempotent, „bereits Mitglied“ ist kein Fehler), `activeGroupId` auf die beigetretene Gruppe, `userGroups`-Query invalidieren, dann `router.replace("/")` (Gate wählt den Start-Tab). Ungültiger/deaktivierter Token (`isInvalidInviteTokenError`) bzw. keine UUID: Text „Ungültiger oder deaktivierter Einladungscode.“ plus Button „Weiter“. Ausgeloggt: Token wird gespeichert und zu `/` weitergeleitet (-> Login).
- **Pending-Token-Speicher:** eigener kleiner, MMKV-persistierter Zustand-Store `src/stores/usePendingInviteStore.ts` (nicht im Preferences-Store, um Konflikte mit parallelen Änderungen zu vermeiden; persistiert, damit der Beitritt auch einen App-Neustart während der Registrierung/E-Mail-Bestätigung übersteht). `src/app/index.tsx` leitet bei Gate `app` oder `onboarding` mit gesetztem Token auf `/join/<token>` um; die Join-Route leert den Token. Universal Links bleiben aufgeschoben.
- **Push pro Gruppe:** `settings/notifications.tsx` zeigt eine Liste mit einem Schalter je Gruppe (`useUserGroups` + `useGroupNames`, Label via `groupDisplayLabel`; `useGroupPushSubscription` je Zeile). Neuer Hook `usePushPermissionStatus` (`getPermissionsAsync`, Re-Check bei App-Vordergrund). Bei `denied`: deutscher Hinweis mit plattformspezifischen Schritten (iOS: Einstellungen > WatchCrew > Mitteilungen; Android: Einstellungen > Apps > WatchCrew > Benachrichtigungen) und Button „Systemeinstellungen öffnen“ (`Linking.openSettings()`). Android-Push braucht weiterhin Firebase/FCM (nicht konfiguriert, offene Nutzeraufgabe) - nicht Teil dieser Änderung.
- **Tracker-Flag:** `trackerEnabled` (Default `true`) im Preferences-Store (MMKV, pro Gerät), Schalter „Tracker aktiv“ auf `settings/display.tsx`. Aus: Tracker-Tab per `href: null` ausgeblendet (Route bleibt registriert), `initialRouteName` und Root-Redirect (`src/lib/homeRoute.ts`) auf Watchlist; ist der ausgeblendete Tracker-Tab beim Zurückkehren aus den Einstellungen noch fokussiert, leitet das Tabs-Layout auf Watchlist um. `RatingDialog` blendet „Wer hat bezahlt?“ samt Zahlungsdatum aus und sendet bei aus **nie** einen `payment`-Block - `paid_by_member_id`/`paid_at` bleiben unangetastet (auch nicht neu gestempelt bei bereits gesetztem Zahler).

**Warum das später leicht änderbar ist:** Je eine Route/Datei bzw. ein Flag; Tests: `__tests__/app/join/join-token.test.tsx`, `routeIndex.test.tsx`, `SettingsNotifications.test.tsx`, `usePushPermissionStatus.test.tsx`, `tabsLayout.test.ts`, `SettingsDisplay.test.tsx`, `RatingDialog.test.tsx`.

**Gerätetest nötig:** Deep Link `watchcrew://join/<token>` per `adb shell am start` (ausgeloggt/eingeloggt/ungültig), Tab-Ausblenden samt Redirect beim Zurückkehren aus den Einstellungen, Berechtigungs-Hinweis und `openSettings` auf echtem Gerät.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Audit: aktive Gruppe in Modals, Tagebuch-Mitgliederzeilen, Push-Tap-Routing, Changelog-Startup-Toast, Gruppenfarbe ändern

**Problem/Lücke:** (1) Add-Movie, „Ähnliche Filme“, Filmreihe und die Regisseur-/Schauspieler-/Studio-Filmografie nahmen `userGroupsQuery.data?.[0]` statt der persistierten aktiven Gruppe - bei 2+ Gruppen zielten „Zur Watchlist“ und die Bibliotheks-Icons auf die falsche Gruppe. (2) Das Tagebuch zeigte „–“-Zeilen nur für Mitglieder, die irgendwo eine Bewertung haben (Roster per `deriveGroupMemberIds`). (3) Ein Push-Tap öffnete `/movie/[tmdbId]` ohne `source` (kein Gruppenkontext) und wechselte nie die aktive Gruppe. (4) Der Startup-Toast „Neue Features“ (Inventar 2.8) wurde nie ausgelöst. (5) Die Gruppenfarbe war nach dem Erstellen nicht änderbar.

**Entscheidung:**
- **Aktive Gruppe:** alle sechs Screens nutzen `useActiveGroup`. Tests laufen jetzt über einen globalen Jest-Mock `__mocks__/react-native-mmkv.js` (der Preferences-Store wird dadurch in Screen-Tests ladbar); neuer Regressionstest `__tests__/screens/ActiveGroupModals.test.tsx`.
- **Tagebuch:** `deriveGroupMemberIds(entries, memberUserIds)` bildet die Vereinigung aus echten Mitgliedern (`useGroupMembers`) und Bewertungs-Autoren (ehemalige Mitglieder behalten ihre sichtbaren Bewertungen); jedes Mitglied bekommt eine Zeile, „–“ ohne Bewertung.
- **Push-Tap:** `usePushNotificationRouting` setzt vor dem Navigieren `activeGroupId` aus dem Payload, wenn der Nutzer Mitglied ist (Session + `ensureQueryData(userGroupsQueryOptions)`, bei Fehler bleibt die Gruppe unverändert), und übergibt `source: "watchlist"` (zusammen mit `groupId` + `watchlistEntryId`). Eigene Wahl: alle Push-Events (new_entry, first_rating, release_reminder) betreffen Mitglieder ohne eigene Bewertung, also Watchlist-Einträge; das Payload enthält kein `source`. Der Cold-Start-Response wird jetzt vor der (nun asynchronen) Navigation geleert.
- **Changelog-Toast:** neuer Hook `useChangelogStartupToast` (gemountet in `(app)/_layout.tsx`): 1,5 s nach App-Start, wenn `lastSeenChangelogVersion !== CURRENT_CHANGELOG_VERSION`, Text „Neue Features – Tippe, um das Changelog zu öffnen“, 6 s sichtbar, Tap öffnet `/settings/changelog`. `showToast(message, options)` (`durationMs`, `onPress`) und `ToastHost` (neues `toast-press`-Pressable nur bei `onPress`) wurden dafür erweitert; als gesehen markiert wird weiterhin nur beim Öffnen des Changelogs. Badge und der bestehende „Neue Funktionen verfügbar“-Toast beim Öffnen der Einstellungen bleiben unverändert (kann doppelt erscheinen, wenn die Einstellungen innerhalb der Sichtbarkeit geöffnet werden).
- **Gruppenfarbe:** Owner-Sektion „Farbthema“ in `group-settings.tsx` mit den 6 Themes (Swatch-Reihe wie beim Erstellen; Konstanten `GROUP_THEME_OPTIONS/LABELS` jetzt zentral in `groupTheme.ts`), Tap speichert sofort (kein Speichern-Button), Erfolg per Toast „Farbthema geändert“. Neu: `setGroupColorTheme` (`src/lib/groups.ts`) + `useSetGroupTheme`. Es ist **keine DB-Änderung nötig**: `watch_groups_update_owner_only` (Migration 20260919120000, `using`/`with check` = `is_group_owner`) und der UPDATE-Grant für `authenticated` (20260930090000) decken die Spalte ab. Hinweis: es gibt serverseitig keine Validierung von `color_theme` beim UPDATE (nur `create_watch_group` prüft die 6 Namen) - ein CHECK-Constraint oder Trigger wäre optional und wurde nicht angelegt.

**Warum das später leicht änderbar ist:** Je ein Hook/eine Funktion; Tests: `ActiveGroupModals.test.tsx`, `diaryDisplay.test.ts`, `Tagebuch.test.tsx`, `usePushNotificationRouting.test.tsx`, `useChangelogStartupToast.test.tsx`, `toast.test.ts`, `Toast.test.tsx`, `appLayoutPushWiring.test.tsx`, `groups.test.ts`, `useGroupSettings.test.tsx`, `GroupSettings.test.tsx`.

**Gerätetest nötig:** Push-Tap bei 2+ Gruppen (aus anderer Gruppe, kalt und warm; Detail zeigt Gruppenkontext/Aktionen), Changelog-Toast beim App-Start samt Tap, Farbwechsel im Gruppen-Verwaltung-Screen (Swatch-Optik/Checkmark), Add-Movie bei 2 Gruppen mit zweiter aktiv.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Audit: Streaming-Verfügbarkeit (ADR 0005), „Meine Streaming-Dienste“, Sortierung/Filter pro Gruppe merken

**Problem/Lücke:** (1) Die Edge Function `tmdb-proxy` hatte zwar einen `streaming`-Kind mit 24h-TTL (ADR 0005), der Client rief ihn aber nie auf (nur das live abgerufene `providers`) - `streaming_availability_cache` blieb leer, `streamingAvailability` war immer leer: „Kommt noch“ zeigte jeden datumslosen Film, das Badge „Streaming verfügbar“ stimmte nur im Detail. Außerdem zählte `buildStreamingAvailabilityLookup` jede Cache-Zeile als „verfügbar“, auch ohne Flatrate. (2) Die gespeicherten „Meine Streaming-Dienste“ (MMKV) wurden nirgends benutzt (Sortierung war ein Stub „(bald verfügbar)“, Add-Movie-Toggle ein Passthrough, Kategorie-Pills ohne Bezug zu den eigenen Diensten). (3) Sortierung/Filter gingen beim Verlassen der Gruppe/App verloren; leerer Zustand unterschied nicht zwischen „Suche ohne Treffer“ und „Liste leer“.

**Entscheidung:**
- **Server (ADR 0005):** `providers` und `streaming` laufen jetzt Cache-Aside über `streaming_availability_cache` (Region DE, Datenform `{ flatrate, rent, buy }`, 24h TTL); der M1-Stub `fetchStreamingFromTmdb` wird nicht mehr benutzt (er hätte die Tabelle mit `{ providers: [] }` vergiftet). Neuer Kind `providers_batch` (`tmdbIds`, max. 200): liest alle Zeilen mit einer Query, holt nur fehlende/abgelaufene Ids von TMDB (Nebenläufigkeit 8, Fehler pro Id werden übersprungen) und schreibt sie in einem Upsert zurück (`providers-cache.ts`). `fetchMovieProviders` bekam einen optionalen `region`-Parameter (Default DE).
- **Client-Roundtrips:** Cache-Zeilen werden direkt gelesen (RLS-SELECT, 1 Query); nur wenn Ids fehlen/älter als 24h sind, folgt EIN `providers_batch`-Call (`loadStreamingRows`, `getMoviesProvidersBatch` teilt >200 Ids in Chunks). `useGroupWatchlist` frischt nur datumslose Filme auf (Spec 2.2: Verfügbarkeit nur für Filme ohne `releaseDate`), liest aber alle Ids. Ein Fehler beim Auffrischen ist best effort (kein Query-Fehler).
- **Lookup:** `buildStreamingAvailabilityLookup` verlangt mindestens einen Flatrate-Anbieter (Leihen/Kaufen allein zählt nicht als „streambar“, konsistent mit dem Detail-Screen).
- **„Meine Streaming-Dienste“:** `my_streaming` filtert Watchlist und Tagebuch auf Filme, die (DE) bei einem der gespeicherten Dienste in den aktiven Kategorien-Pills (Flatrate/Leihen/Kaufen) angeboten werden (`matchesOwnProviders`, `filterByMyStreaming`). Die Provider-Daten werden nur bei aktiver Sortierung über `useMyStreamingProviders` geladen (ein `providers_batch`-Call, auch für nicht-datumslose Filme). Das Label „(bald verfügbar)“ ist entfernt. Add-Movie-Toggle: eigene Dienste in irgendeiner Kategorie. Filmreihe/Ähnliche Filme: die bestehende Kategorie-Pill wird zusätzlich auf die eigenen Dienste eingeengt.
- **Persistenz:** Neues Preferences-Feld `listFilters` (MMKV), Schlüssel `watchlist:<groupId>` / `diary:<groupId>`: Sortierung, Genre-Auswahl, Jahr, Kategorie-Pills. Der Suchtext wird bewusst NICHT gespeichert (Inventar Abschnitt 5 nennt für persistierte Präferenzen Sortierung/Filter, nicht den Suchtext). Leere Zustände: „Keine Treffer für „…““ (Suche, 2+ Zeichen) bzw. „Keine Einträge für diese Auswahl.“ (Filter) getrennt von „Deine Watchlist ist leer.“ / „Noch keine bewerteten Filme.“.

**Mehrdeutigkeiten / einfachste Lesart:** (a) Standard der Kategorie-Pills ist nur „Flatrate“ (mind. 1 aktiv). (b) Ohne ausgewählte eigene Dienste filtert `my_streaming` nur nach Kategorie (Filme, die irgendwo in den aktiven Kategorien angeboten werden); dasselbe gilt für Filmreihe/Ähnliche Filme. (c) Reihenfolge bei `my_streaming` bleibt die Eingabereihenfolge (keine eigene Sortierung). (d) Das Filter-Panel-Auf/Zu der Legacy-App (Tune-Icon) gibt es hier nicht, daher nichts zu merken.

**Warum das später leicht änderbar ist:** Reine Funktionen (`matchesOwnProviders`, `toggleProviderCategory`, `findIdsNeedingProviders`/`resolveProvidersBatch` serverseitig), eine Konstante für Default-Kategorien (`DEFAULT_PROVIDER_CATEGORIES`) und TTL (`STREAMING_TTL_MS`). Tests: `providers-cache.test.ts`, `tmdb-client.test.ts` (Deno), `watchlistLogic.test.ts`, `movieProviderFilter.test.ts`, `listFilters.test.ts`, `streamingAvailability.test.ts`, `useGroupWatchlist.test.tsx`, `useMyStreamingProviders.test.tsx`, `usePreferencesStore.test.ts`, `Watchlist.test.tsx`, `Tagebuch.test.tsx`, `AddMovie.test.tsx`, `Collection.test.tsx`, `SimilarMovies.test.tsx`.

**Offener Punkt:** Edge Function `tmdb-proxy` muss neu deployt werden (neuer Kind `providers_batch`, `providers` jetzt Cache-gestützt) - ohne Deploy schlägt der Batch-Call fehl (best effort: „Kommt noch“ bleibt dann wie bisher leer). `useMoviesProviders` (Filmreihe/Ähnliche/Add-Movie) ruft weiterhin pro Film `providers` auf (jetzt serverseitig gecacht); ein Umstieg auf den Batch wäre eine Folgeoptimierung.

**Gerätetest nötig:** Watchlist „Kommt noch“/Badge „Streaming verfügbar“ nach erstem Laden (nach Deploy), Sortierung „Meine Streaming-Dienste“ in Watchlist und Tagebuch mit gespeicherten Diensten (Pills, Mindestens-eins-Regel, Ladezeit bei großer Liste), Add-Movie-TV-Toggle, Sortierung/Filter nach App-Neustart und Gruppenwechsel, leere-Zustand-Texte.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Offline-Stufe 1: Query-Cache-Persistenz (MMKV), Offline-Banner

**Problem/Lücke:** Roadmap (Abschnitt C) sieht „Offline Stufe 1“ vor (Read-Cache über TanStack Query + MMKV-Persistenz, keine Mutation-Queue); der Cache lag bisher nur im RAM, ein Kaltstart ohne Netz zeigte nichts.

**Entscheidung (vom Nutzer freigegeben: `persistQueryClient` + MMKV-Adapter):**
- **Persistenz:** `PersistQueryClientProvider` im Root-Layout mit eigenem MMKV-Persister (`src/lib/queryPersistence.ts`, eigene MMKV-Instanz `watchcrew-query-cache`, getrennt von den Preferences). Schreibzugriffe gedrosselt (1 s, letzter Stand gewinnt). Neue Dependency `@tanstack/react-query-persist-client` (reines JS, kein nativer Rebuild).
- **Was wird gespeichert:** nur erfolgreiche Queries (`shouldDehydrateQuery`); flüchtige Such-Queries (`movieSearch`, `personSearch`, `companySearch`) nicht. `maxAge` 24 h; `buster` = App-Version + `CACHE_SCHEMA_VERSION` (bei geänderter Datenform hochzählen). `gcTime` des QueryClient von 10 min auf 24 h (= maxAge) erhöht, sonst würden wiederhergestellte Queries sofort wieder verworfen. Der frühere Kommentar „nie persistieren“ in `queryClient.ts` wurde entsprechend ersetzt.
- **Nutzerbindung:** Auth-State-Listener (`useQueryCacheLifecycle`, `auth.ts` unangetastet): `SIGNED_OUT` (auch durch Konto-Löschung) leert RAM- und MMKV-Cache; zusätzlich wird bei Session eines anderen Nutzers als dem gespeicherten Besitzer geleert.
- **Konnektivität:** weder `netinfo` noch `expo-network` sind Dependencies, daher kein neues natives Modul: `onlineManager` wird per fetch-Probe (`HEAD <supabaseUrl>/auth/v1/health`, jede HTTP-Antwort = online, Timeout 4 s, alle 15 s und bei App-Vordergrund) gespeist (`src/lib/connectivity.ts`). Nach Reconnect greift `refetchOnReconnect`.
- **UI:** schlanker roter Banner oben (`OfflineBanner`): „Offline – gespeicherte Daten werden angezeigt“.
- **Nicht umgesetzt:** Offline-Mutation-Queue (Stufe 2, laut Roadmap bewusst später); Mutationen brauchen weiterhin Verbindung.

**Mehrdeutigkeiten / einfachste Lesart:** (a) Banner nutzt `SafeAreaView` (top); Screens mit eigenem Top-Inset haben offline einen doppelten Abstand. (b) Probe-Intervall/Timeout sind Schätzwerte. (c) Bilder (Poster) werden nicht offline gecacht, nur Daten.

**Warum das später leicht änderbar ist:** Konstanten `PERSIST_MAX_AGE_MS`, `PERSIST_THROTTLE_MS`, `CACHE_SCHEMA_VERSION`, Filter `NON_PERSISTED_ROOTS`; Probe austauschbar gegen `@react-native-community/netinfo` (erfordert neuen Dev-Client-Build). Tests: `queryPersistence.test.ts`, `queryCacheLifecycle.test.ts`, `connectivity.test.ts`, `OfflineBanner.test.tsx`.

**Gerätetest nötig:** Flugmodus + App-Kaltstart zeigt gecachte Watchlist/Tagebuch; Banner erscheint/verschwindet; Abmelden leert Cache (danach Flugmodus: nichts mehr sichtbar); Konto-Löschung; Reconnect lädt neu.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Passwort vergessen, Auth-Deep-Link (Reset + Signup-Bestätigung)

**Problem/Lücke:** Es gab keinen „Passwort vergessen“-Ablauf, und die Links aus den Supabase-Mails (Passwort zurücksetzen, Registrierung bestätigen) öffneten die App nicht gezielt (kein Deep-Link-Handler).

**Entscheidung:** (Nutzerentscheid: Supabase-eigene Mechanismen.) Login hat den Link „Passwort vergessen?“ zu `(auth)/forgot-password` (E-Mail-Feld, Validierung, ruft `requestPasswordReset` in `src/lib/auth.ts` -> `supabase.auth.resetPasswordForEmail(email, { redirectTo: "watchcrew://auth/callback" })`; zeigt IMMER die neutrale Meldung „Wenn die Adresse existiert, haben wir eine E-Mail gesendet.“, auch bei API-Fehler, gegen Account-Enumeration). Der Client nutzt den supabase-js-Default `flowType: 'implicit'` (auth-js 2.116.0, `DEFAULT_OPTIONS`; `src/lib/supabase.ts` setzt nichts anderes): der Mail-Link kommt als `watchcrew://auth/callback#access_token=...&refresh_token=...&type=recovery` (bzw. `type=signup`; Fehler: `#error=access_denied&error_code=otp_expired&error_description=...`). `detectSessionInUrl` ist auf RN aus (auth-js liest URLs nur im Browser), daher parst `src/lib/authDeepLink.ts` (`parseAuthLink`, Fragment vor Query, auch `?code=` für PKCE) die URL und die öffentliche Route `src/app/auth/callback.tsx` (außerhalb der Gruppen, kein Auth-Gate) setzt die Session via `setSession` (bzw. `exchangeCodeForSession` bei `code`), genau einmal pro URL. `type=recovery` -> Formular „Neues Passwort setzen“ (2 Felder, min. 6 Zeichen aus `src/lib/passwordRules.ts`, geteilt mit Register, Übereinstimmung) -> `updateUser({ password })` -> `router.replace("/")`; anderer Typ (Signup-Bestätigung) -> direkt `router.replace("/")`; Fehlerparameter/ungültige Tokens/kein URL nach 4 s -> Meldung „Der Link ist ungültig oder abgelaufen…“ mit Buttons zu forgot-password und Login. `signUpWithEmail` setzt zusätzlich `emailRedirectTo: "watchcrew://auth/callback"`.

**Mehrdeutigkeiten / einfachste Lesart:** (a) Eine Route für alle Auth-Mails (`auth/callback`) statt `auth/reset-password`. (b) Fehlertext ist generisch (unterscheidet nicht abgelaufen/benutzt). (c) Nach erfolgreichem Passwortwechsel kein Toast, direkt Home. (d) Bleibt der Nutzer mit Recovery-Session ohne Passwort zu setzen, ist er trotzdem eingeloggt (Eigenschaft des Supabase-Recovery-Flows). (e) Wechsel auf PKCE wäre eine Client-Config-Änderung (`flowType: 'pkce'`); der Code-Pfad ist vorbereitet, aber ohne `type` im Link würde ein Recovery-Code direkt nach Home führen (dann `?type=recovery` an `redirectTo` hängen).

**Warum das später leicht änderbar ist:** Eine Konstante (`AUTH_CALLBACK_URL`), reine Parser-Funktion, vier dünne Wrapper in `auth.ts`. Tests: `authDeepLink.test.ts`, `auth.test.ts`, `ForgotPassword.test.tsx`, `AuthCallback.test.tsx`, `Login.test.tsx`.

**Offener Punkt (Dashboard, vom Nutzer):** Auth > URL Configuration: Redirect-URLs `watchcrew://**` (bzw. mindestens `watchcrew://auth/callback`; für Dev-Client ggf. `exp://**`) in die Allow-List, Site URL beachten; ohne Eintrag leitet Supabase auf die Site URL um. E-Mail-Templates „Reset Password“ und „Confirm signup“ nutzen `{{ .ConfirmationURL }}` (Standard passt, deutsche Texte optional). Der eingebaute Mailer ist stark ratenlimitiert (nur wenige Mails/Stunde, nur Teammitglieder-Adressen); für echten Versand ist Custom-SMTP nötig (hängt an der zurückgestellten E-Mail-Provider-Entscheidung).

**Gerätetest nötig:** Reset-Mail anfordern, Link tippen (App kalt und warm) -> Formular -> Passwort ändern -> Home; abgelaufener/zweiter Klick auf denselben Link -> Fehlermeldung; Signup-Bestätigungslink -> Home; `adb shell am start -a android.intent.action.VIEW -d "watchcrew://auth/callback#access_token=...&refresh_token=...&type=recovery"` (ggf. `&` escapen); prüfen, dass Android/iOS das Fragment an `Linking.useLinkingURL()` durchreichen.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Erscheinungsdatum pro Gruppe bearbeiten

**Problem/Lücke:** Die Legacy-App erlaubte „Bearbeiten“ von Titel und Datum (`editMovie`). Neu entschieden: nur das Erscheinungsdatum eines Watchlist-Eintrags ist nachträglich änderbar (Titel bleibt fix, kommt von TMDB), und zwar pro Gruppe.

**Entscheidung:**
- **Datenmodell:** Das Datum lag nur in `movies.release_date` (geteilt, TMDB, nur per Service-Role schreibbar). Neue additive, nullable Spalte `watchlist_entries.release_date_override date` (Migration `20261001090000_watchlist_entries_release_date_override.sql`); `NULL` = TMDB-Datum. Keine RLS-/Grant-Änderung nötig: `watchlist_entries_update_group_members` + UPDATE-Grant für `authenticated` decken die Spalte ab. Andere Gruppen und die `movies`-Zeile bleiben unberührt.
- **Wirksames Datum:** `getEffectiveReleaseDate(entry)` = Override, sonst `movie.release_date` (`watchlistLogic.ts`); `withEffectiveReleaseDate` für Komponenten, die nur ein `Movie` nehmen (Poster-Karte). Genutzt von „Kommt noch“ (`isUpcoming`/`filterUpcoming`), Jahresfilter, Jahres-Pills, Listenansicht, Datums-Badge/Dimmung und der „datumslos“-Auswahl für die Streaming-Auffrischung in `useGroupWatchlist`.
- **Push-Erinnerungen:** `run_release_reminders()` wird in derselben Migration per `create or replace` angepasst (`coalesce(we.release_date_override, m.release_date)`), sonst Rest unverändert. Folge: `release_reminder_log` dedupliziert pro (Eintrag, Typ) für immer; wer das Datum ändert, nachdem z. B. „14_days“ schon gesendet wurde, bekommt diesen Typ nicht erneut (die anderen Stufen feuern normal).
- **UI (überholt, siehe „Nachbesserung: Datum in Bearbeiten, Aktionsleiste, Glas“ – es gibt keinen eigenen Button mehr, das Datum wird über „Bearbeiten“ geändert):** Neue Aktion „Erscheinungsdatum bearbeiten“ (`erscheinungsdatum`) in der Detail-Aktionsleiste, nur bei Gruppenkontext mit `source = watchlist` (Tagebuch-Einträge nicht). Öffnet ein Sheet mit dem bestehenden `DateField` (Anzeige DD.MM.YYYY, Speicherung ISO); Datum wählen speichert sofort und schließt, „Auf TMDB-Datum zurücksetzen“ (nur sichtbar bei vorhandenem Override) speichert `NULL`. Toasts: „Erscheinungsdatum gespeichert“ bzw. „Erscheinungsdatum zurückgesetzt“. Mutation `useSetReleaseDateOverride` invalidiert `["watchlist", groupId]` (auch die Detailansicht liest daraus). Die Detailansicht zeigt bei Override „Erscheinungsdatum <Datum>“ statt dem deutschen Kino-/Digital-Datum; auch der „Gesehen am = Erscheinungsdatum“-Haken im Bewertungsdialog nutzt dann das Override.

**Mehrdeutigkeiten / einfachste Lesart:** (a) Mitgliedschaft wird nur über den Gruppenkontext der Route + RLS durchgesetzt (kein eigener Client-Check). (b) Beim Zurücksetzen gibt es einen eigenen Toast-Text (nicht „gespeichert“). (c) Bei Override hat das Detail-Label immer „Erscheinungsdatum“.

**Warum das später leicht änderbar ist:** Eine Spalte, ein Helper, eine Mutation. Tests: `watchlistLogic.test.ts`, `movieDetailMutations.test.ts`, `useMovieDetailMutations.test.tsx`, `movieDetailLogic.test.ts`, `MovieDetailActionsBar.test.tsx`, `MovieDetail.test.tsx`.

**Offener Punkt:** Migration `20261001090000` muss auf dem Remote angewendet werden (`supabase db push`), bis dahin schlägt das Speichern fehl (Spalte fehlt).

**Gerätetest nötig:** Datum ändern (Sheet, nativer Picker), Badge/„Kommt noch“/Jahresfilter/Sortierung danach, Zurücksetzen, Detailansicht-Anzeige, zweite Gruppe mit demselben Film bleibt unverändert, Realtime-Sync auf zweitem Gerät.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Geräte-Test Welle 2: Map-Cache-Absturz, Settings-Aussperrung, Gruppenfarbe, Offline-Kaltstart

**Problem/Lücke:** Vier am Pixel 6 Pro reproduzierte Fehler: (1) Absturz „Render Error: undefined is not a function“ (`watchlistLogic.ts:152`, `providersByTmdbId.get`) bei aktiver Sortierung „Meine Streaming-Dienste“ nach Force-Stop, bei jedem Start; (2) bei ausgeschaltetem „Tracker aktiv“ waren die Einstellungen unerreichbar (Zahnrad nur im Tracker-Tab); (3) Gruppenfarbe wechselte nur Swatch/Header-Punkt, nie die App; (4) Offline-Kaltstart landete im Onboarding.

**Ursache:** (1) Die Offline-Persistenz serialisiert den Query-Cache als JSON; `useMyStreamingProviders` (und `useGroupWatchlist.streamingAvailability`) legten eine `Map` im Cache ab, die als `{}` wiederhergestellt wurde. (2) Kein Einstiegspunkt außerhalb des Trackers. (3) Der Tab-Layout-Code nutzte hart `resolveGroupTheme(undefined)` und kein `GroupThemeProvider` umschloss die App. (4) `useAuthGate` rief `getUserGroups` direkt auf (nicht über den persistierten Cache) und fiel bei Fehler auf `onboarding`; zusätzlich meldet auth-js 2.116 bei abgelaufenem Access-Token offline `session: null` (+ `INITIAL_SESSION(null)`), obwohl die Session im Storage bleibt (nur ein nicht-retrybarer Fehler räumt sie ab).

**Entscheidung:**
- **Cache JSON-sicher (Klasse, nicht nur Instanz):** Alle `queryFn`-Ergebnisse unter `src/` geprüft; nur diese zwei Hooks hatten eine `Map`. Sie speichern jetzt Arrays (`[tmdbId, providers][]` bzw. `streamingAvailableIds: number[]`) und bauen die `Map` in einem modulweiten `select` (nicht-Array/alte Form ergibt leere Map statt Absturz). Zusätzlich verwirft `shouldPersistQuery` per `isJsonSafe()` jede Query, deren Daten Map/Set/Date/Klasseninstanzen enthalten (Schutz für künftige Hooks; Tests dazu). `CACHE_SCHEMA_VERSION` 1 → 2, damit schon persistierte falsche Formen auf Geräten verworfen werden.
- **Einstellungen:** Neue gemeinsame `SettingsButton` (`src/components/ui/SettingsButton.tsx`, Prop `testID`) in Tracker (`tracker-group-settings-button`, unverändert), Watchlist (`watchlist-settings-button`) und Tagebuch (`tagebuch-settings-button`). Tagebuch bekam dafür eine Kopfzeile mit Titel „Tagebuch“ (wie Watchlist/Tracker).
- **Gruppenfarbe:** `GroupThemeProvider` stellt zusätzlich einen Context bereit (`useGroupTheme()`, Gold ohne Provider). Neuer `ActiveGroupThemeProvider` (aktive Gruppe via `useActiveGroup` + `useGroupDetails().color_theme`) umschließt in `src/app/(app)/_layout.tsx` Tabs und Modals; Tab-Leiste und die Roh-Hex-Sternfarbe (Tagebuch, Film-Detail) lesen `useGroupTheme()`, Klassen wie `bg-accent` folgen über die `.theme-*`-CSS-Variablen. `useSetGroupTheme` invalidiert `groupDetails` → Live-Update. Fallback Gold, solange Details unbekannt sind. Onboarding bleibt Gold (noch keine Gruppe).
- **Offline-Kaltstart:** `useAuthGate` wartet auf `useIsRestoring()`, liest bei `getUserGroups`-Fehler `queryClient.getQueryData(userGroupsQueryOptions(userId).queryKey)` und wertet ≥ 1 gecachte Gruppe als `app`, sonst `onboarding` (Warn-Log und Request-ID-Race-Guard unverändert). Auth-Session offline: bei `session: null` (außer Event `SIGNED_OUT`) liest `readStoredSession()` (`src/lib/storedSession.ts`) die Session direkt aus SecureStore (`auth.storageKey` + `largeSecureStore`); in `useAuthGate` und `useCurrentUserId` (Letzteres, damit die Tabs die Cache-Queries mit der User-ID überhaupt abfragen). Nach Reconnect refresht auth-js den Token selbst.

**Mehrdeutigkeiten / einfachste Lesart:** (a) Das Singleton `queryClient` wird in `useAuthGate` direkt importiert statt `useQueryClient()` (Hook läuft auch in Tests ohne Provider). (b) Warten auf Cache-Restore verzögert den Gate-Start minimal, auch online. (c) `readStoredSession` greift auf das nicht öffentlich typisierte `supabase.auth.storageKey` zu.

**Warum das später leicht änderbar ist:** Kleine, isolierte Helper (`isJsonSafe`, `SettingsButton`, `ActiveGroupThemeProvider`, `readStoredSession`); die Cache-Version steuert künftige Formänderungen.

**Gerätetest nötig:** Siehe Verifikationsreport Welle 2 (`.scratch-screenshots/verify-wave2-2026-10-01/`).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

## M12-Vorbereitung (Live-Bug-Fix) — Nachbesserung Datenquellen-Attribution (Settings), Inline-Style-Audit

**Problem/Lücke:** (1) Inventar 2.7 verlangt Attributions-Links (TMDB, Trakt, KinoCheck); TMDB und JustWatch fordern Nennung in den Nutzungsbedingungen. Die App zeigte nichts an. (2) Globale Regel „CSS-Klassen statt Inline-Styles“: Audit der `style={{...}}`-Nutzungen in `src/`.

**Entscheidung:**
- **Attribution:** Neuer Abschnitt „Datenquellen“ im Settings-Hub (`settings.tsx`), nur Text, keine Logos (Logo-Assets brauchen eine Nutzerentscheidung). Drei Zeilen im Stil der Legal-Zeilen (Card-Pressable): TMDB-Pflichthinweis (deutsch), „Ähnliche Filme werden von Trakt bereitgestellt.“, „Streaming-Daten: JustWatch via TMDB“; jede öffnet die Seite per `Linking.openURL` (`expo-linking`, wie `legalLinks.ts`), testIDs `settings-attribution-tmdb/-trakt/-justwatch`. KinoCheck bewusst NICHT genannt: im Code nicht verwendet (Trailer = TMDB/YouTube, Ähnliche Filme = Trakt). Der englische TMDB-Originaltext steht nicht im Inventar und wurde nicht ergänzt.
- **Inline-Styles:** Statisches umgestellt: `borderWidth: 1` der Zahler-Buttons (`PaymentModal.tsx`, `tracker.tsx`) ist jetzt Klasse `border` (nur unselektiert, wie zuvor); inline bleibt nur die Laufzeitfarbe. Bleibt inline (begründet): `MovieGrid` Balkenbreite (Laufzeit-Prozent, M6-Cleanup-Ausnahme), Zahler-Farben (`backgroundColor`/`borderColor`, M8-Ausnahme), `Toast.tsx` und `FadeInItem.tsx` (Animated-Werte, `opacity`/`translateY`). Expo-Template-Reste (`themed-view`/`themed-text`/`collapsible`/`hint-row`/`web-badge`/`animated-icon*`, `StyleSheet`) nicht angefasst: kein Produktcode bzw. dynamische Theme-Werte; Entfernung/Umstellung wäre eigene Entscheidung.

**Warum das später leicht änderbar ist:** Attributionsliste ist ein Array (`ATTRIBUTIONS`); Logos können pro Eintrag ergänzt werden.

**Gerätetest nötig:** Zahler-Buttons (Zahlungs-Modal, Tracker-Bearbeiten): selektiert/unselektiert gleiche Größe/Rahmenfarbe wie vorher; Settings: Datenquellen-Zeilen, Links öffnen Browser.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

## M12-Vorbereitung — Entscheidung Legacy-Cron "Erscheinungsdatum nachtragen" entfällt, Lazy-Refresh date-loser Filme

**Problem/Lücke:** Nutzerfrage: Braucht es den Legacy-Cron (NULL-Erscheinungsdaten nachtragen, „neues Datum gefunden“-Push)? Prüfung: ADR 0005 ersetzt den Cron-Bulk-Refresh (`cron-releases.php`) ausdrücklich durch serverseitiges Cache-Aside („ersetzt den alten Cron-basierten Bulk-Refresh“); als Cron bleibt NUR der schlanke Release-Reminder-Job (14/7/1 Tage + Tag selbst), der „nur noch anstehende Erscheinungstermine prüft“ und „kein Bulk-Metadaten-Refresh mehr“ ist (ADR 0005 Entscheidung + Konsequenzen; `docs/planning-report.html` Abschnitt „Cache-Aside statt Cron-Bulk-Refresh“, „Release-Reminder bleibt eigener Job“). Ein Push „neues Datum gefunden“ steht weder in ADR 0005 noch in der Roadmap. Code-Ist: `useGroupWatchlist` aktualisierte nur die Streaming-Verfügbarkeit (`providers_batch`) date-loser Filme; `movies.release_date` wurde nirgends nachgeladen (`upsert_movie` schreibt es nur beim Erstanlegen, `metadata`/`details` aktualisieren nur den Cache). Ein Film, dessen TMDB-Datum erst später erscheint, blieb damit für immer date-los („Kommt noch“ ohne Datum, keine Reminder).

**Entscheidung:**
- **Kein Cron** für Datums-Nachtrag; `run_release_reminders()` bleibt unverändert. **Kein „neues Datum gefunden“-Push** (von ADR/Roadmap nicht vorgesehen, nicht gebaut).
- **Lazy-Refresh (ADR-0005-Cache-Aside):** Neue Edge-Function-Action `refresh_release_dates` (`{ tmdbIds }`, max. 200, Batch, begrenzte Parallelität 8, Fehler pro Id übersprungen; `release-date-refresh.ts`). Pro Id: Prüfzeitpunkt in `movie_metadata_cache.data.releaseDateCheckedAt`; älter als TTL oder fehlend -> TMDB (deutsches Datum vor globalem, wie `upsert_movie`) -> bei Fund `movies.release_date` setzen, aber nur wo noch NULL (überschreibt nie ein vorhandenes oder manuell gesetztes Datum). Danach Prüfzeit schreiben, auch wenn TMDB noch kein Datum hat (max. 1 TMDB-Abruf pro Film und TTL).
- **TTL 24 h** (Annahme: ADR 0005 nennt für nicht erschienene Filme keinen Wert; gleicher Wert wie Streaming; Konstante `RELEASE_DATE_CHECK_TTL_MS`).
- **Client:** `refreshReleaseDates` (`tmdbProxy.ts`, 200er-Chunks); `useGroupWatchlist` ruft es parallel zum Streaming-Laden EINMAL für Filme ohne wirksames Datum (Gruppen-Override zählt als Datum) auf; wurde ein Datum gefunden, liest die queryFn die Einträge erneut (statt Invalidierung, vermeidet Schleifen). Fehler/Throw werden ignoriert (best effort).

**Mehrdeutigkeiten / einfachste Lesart:** (a) ADR-Konsequenzen-Satz nennt „Release-Datum-Checks“ im Reminder-Job; gelesen als: Job liest nur die gespeicherten Termine, kein TMDB-Refresh. Falls ein TMDB-Abgleich im Cron gewünscht ist, wäre das eine Gegenentscheidung. (b) Nur Filme ohne Datum werden geprüft; verschobene Termine bereits datierter Filme werden nicht aktualisiert (der Legacy-Cron füllte ebenfalls nur NULL).

**Warum das später leicht änderbar ist:** Eigene Action + Datei; TTL ist eine Konstante; Client-Aufruf ein einzelner Helper im Hook.

**Gerätetest nötig:** Edge Function `tmdb-proxy` muss neu deployt werden (neue Action; ohne Deploy schlägt der Aufruf still fehl, Liste lädt wie bisher). Danach: date-loser Film, dessen TMDB-Datum existiert, bekommt beim Öffnen der Watchlist sein Datum.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

## Design-Angleichung Welle 1 — Legacy-Look: Hintergrundfoto, Glas ohne Blur, AppHeader, Tab-Leiste, Icons

**Problem/Lücke:** Nutzerwunsch: Die App soll wie die Legacy-App aussehen (Referenzen: `docs/reference-screenshots/`, aus `docs/planning-report.html` Abschnitt 11). Der frühere Eintrag „M2 — Sheet: reduzierter Blur auf kleinen Screens ist ein Platzhalter“ (Glas/Blur „später“) und „M2 — Card-Hintergrund-Token-Wahl“ werden damit **überholt**: Glas-Optik wird jetzt umgesetzt, aber nur mit JS/Asset-Mitteln, weil der installierte Dev-Client keinen neuen nativen Code ohne Cloud-Rebuild aufnehmen kann.

**Entscheidung:**
- **Hintergrund:** Das Legacy-Foto (Unsplash `photo-1478720568477-152d9b164e26`, wie im Legacy-CSS) wurde einmal als Graustufen-Hochformat-Ausschnitt 720x1280 JPEG (~25 KB) vorberechnet und bereits auf ca. 27 % abgedunkelt (entspricht Legacy `opacity .25` + Luminosity). `assets/images/cinema-bg.jpg`, gerendert genau einmal in `src/app/_layout.tsx` (`AppBackground`, `expo-image`, `cover`) hinter allen Navigatoren. Alle Screen-Wurzeln haben kein `bg-bg-primary` mehr (transparent); der React-Navigation-Hintergrund ist transparent (`APP_NAV_THEME`, dark-only, kein Light-Theme).
- **Film-Grain bewusst weggelassen:** Legacy-Grain ist ein SVG-Filter mit 3 % Deckkraft (praktisch unsichtbar); ein Bild-Asset dafür lohnt nicht.
- **Glas ohne Blur:** `Glass`-Komponente (`default`/`strong`) und `Card`: Fülltoken `bg-card` .62 (Legacy .5/.55 mit Blur, hier dichter, weil ohne Blur das Foto sonst durchscheint), 1px-Rand `glass-border` (weiß 8 %), `rounded-xl`. Neue Tokens: `bg-glass-strong`, `bg-sheet` (.97, Sheet bleibt nahezu deckend wegen Lesbarkeit), `bg-tab-bar` (.94), `glass-border`. Toast: `Glass strong` + Akzent-Rand (vorher nur dünne Kontur). Kein `expo-blur` (nicht installiert, nativ).
- **AppHeader** (`src/components/ui/AppHeader.tsx`): Filmrollen-Icon (Ionicons `film-outline`, keine Spulen-Grafik), Wortmarke „WATCHCREW“ in Playfair Bold, `accent-light`, Linien links/rechts, Screen-Name als Untertitel, rundes Einstellungen-Icon rechts, `actions`-Slot darunter. Genutzt von Tracker/Watchlist/Tagebuch; testIDs unverändert. Kein Gruppenname im Header (gab es vorher dort nicht; Prop `groupName` ist vorbereitet).
- **Tab-Leiste:** dunkle Leiste + Haarlinie, goldene Linie über dem aktiven Tab (`TabBarButton`).
- **Emoji -> Icons:** ⚙️ -> `settings-outline`, 💰 -> `cash-outline` in runden Buttons; Leer-Text des Trackers angepasst („Tippe auf den Geld-Button“).
- **Modals:** nativer Header dunkel (#0a0a0a, ohne Schatten, goldene Playfair-Titel); doppelte Überschrift im Body entfernt (Settings, Unterseiten, Ähnliche Filme, Filmografien). Collection behält ihre Body-Überschrift (zeigt den Reihen-Namen, Header „Filmreihe“).
- **Wichtig (Fund):** `@/global.css` wurde bisher nur indirekt über `constants/theme.ts` geladen; ohne diesen Import (durch Umbau der Tab-Layout-Imports) fehlten alle NativeWind-Stile. Jetzt expliziter Import im Root-Layout.

**Abweichungen von der Legacy:** kein Blur, kein Grain, Filmrolle statt Spulen-Logo, keine Gruppen-Hintergrundposition (`--bg-pos`).

**Warum das später leicht änderbar ist:** Alle Werte sind Tokens (`tailwind.config.js`) bzw. eine Datei (`Glass.tsx`, `AppBackground.tsx`); Blur kann nach einem Dev-Client-Rebuild in `Glass` ergänzt werden.

**Gerätetest nötig:** Scroll-Performance auf dem Gerät, Lesbarkeit von Text über dem Foto, Sheet/Toast.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.


## Design-Angleichung Welle 2A — Tracker, Watchlist, Tagebuch

**Problem/Lücke:** Die drei Haupt-Tabs sahen nach Welle 1 noch nicht wie die Legacy-Referenzen (`docs/reference-screenshots/02/04/05/10/13`) aus: Tracker-Zeilen direkt auf dem Foto, Watchlist-Karten als ein riesiges Poster pro Screen, Tagebuch-Liste mit unbeschrifteten Zahlen, schwere Textbuttons in den Steuerzeilen.

**Entscheidung:**
- **Gemeinsam:** Suchzeile in einem `Glass strong`-Panel mit runden Icon-Buttons (Gold-Aktion rechts, Sortieren als runder Outline-Button). Karten/Grid/Liste-Umschalter als drei kleine runde Icon-Buttons (`ViewModeToggle`, Ionicons `albums-outline`/`grid-outline`/`list-outline`) im Header-Aktionsslot; testIDs und Accessibility-Labels unverändert. Neu: `ChangelogBanner` (goldenes "Neue Features"-Banner, nur sichtbar solange `lastSeenChangelogVersion` != `CURRENT_CHANGELOG_VERSION`, Tap öffnet `/settings/changelog`, markiert nicht als gesehen); aktuell nur im Tracker eingebunden.
- **Tracker:** Tabelle in EINER Glas-Karte (ScrollView statt FlatList, `tracker-list`); Zahler-Spalte `w-24` mit `numberOfLines={1}`/Ellipsis in Mitgliedsfarbe (dokumentierte Inline-Style-Ausnahme, Laufzeitfarbe), Datum fix `w-28`, Filmtitel flexibel (max. 2 Zeilen). Zahlungs-Button jetzt rund in der Suchzeile (testID `tracker-log-payment-button`), nicht mehr im Header. Inline-Aktionen Bearbeiten/Löschen klein, Outline (Löschen nur rot umrandet/rote Schrift); die Löschen-Bestätigung bleibt der rote Danger-Button.
- **Watchlist:** "Karten" = kompakte Legacy-Glas-Zeile (Poster 96px breit 2:3, goldener Playfair-Titel, Datums-/Status-Badge-Text, Beschreibung 2 Zeilen kursiv bzw. "Keine Beschreibung vorhanden", TMDB-Badge, Fortschrittsbadge und Abdunkelregeln unverändert). "Grid" unverändert (Poster mit Pills). "Liste" = dichte, zusammenhängende Textliste mit Titel, Datum und TMDB-Score. "+" ist der runde Gold-Button in der Suchzeile, Sortieren runder Icon-Button.
- **Tagebuch:** "Karten" = Legacy-Zeile (`DiaryEntryCard`): Glas, kleines Poster, goldener Titel, "Gesehen am ...", pro Mitglied eine beschriftete Sternzeile (kompakte Sterne, "–" bei fehlender Bewertung), Durchschnitts-Stern oben rechts (Zahl im Stern), Herz bei Gefallen, TMDB-Badge. "Grid" unverändert (`DiaryPosterTile` mit Stern-/Herz-Badges). "Liste" = Glas-Tabelle mit Spaltenköpfen (Film/Gesehen/Ø/TMDB). Sortier-Button zeigt weiterhin das aktuelle Kriterium (Icon + Kurztext), da kein Platz für eine eigene Zeile.
- `StarRating` bekommt die optionale Prop `compactBox` (22px-Box statt 48px-Touch-Ziel, nur read-only Listen); `MemberRatingRow` die Prop `compact`.

**Abweichungen von der Legacy:** keine Blur/Gradient im Banner (Vollfarbe `bg-accent`); TMDB-Badge als Text "TMDB" + Score statt Logo; Beschreibung ist nur da, wenn der Film-Datensatz sie enthält (`movie.overview`); Tagebuch-Karten zeigen zusätzlich die kleine Zahl neben den Sternen (bestehende Tests/Logik).

**Gerätetest nötig:** Lesbarkeit der Glas-Karten über dem Foto, Zahler-Spalte bei langen Namen, Banner über der Tab-Leiste, Watchlist-Zeilenhöhe bei langen Titeln, Tap-Ziele der 36px-Umschalter, Scrollperformance Tracker (ScrollView).

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## Design-Angleichung Welle 2B — Detail-Overlay, Bewertungsdialog, Film hinzufügen

- **Detail** (`movie/[tmdbId].tsx`, `MovieDetail*`): Poster hochkant zentriert (55 % Breite, Glas-Rahmen; beim Trailer-Abspielen wieder 16:9), Titel Playfair-Bold in `accent-light`, TMDB-Badge (cyan, "TMDB" + Score) plus roter Herz-Button, goldumrandete Genre-Pills, "Regie"-Zeile, runde Besetzungsfotos (`profile_path`, Fallback `person`-Icon) mit Name/Rolle. Aktionsleiste unten: `bg-bg-sheet` + Glas-Rand, Aktionen als Icon-Glas-Buttons (umbrechend, Löschen rot). Alle testIDs, Sichtbarkeitsregeln und der Null-Höhe-Wrapper der Beschreibung unverändert.
- **Bewertungsdialog**: Checkboxen nebeneinander, Sterne größer (neues optionales `iconSize` in `StarRating`, Default unverändert), Gruppen-Sektion "Bewertungen der Gruppe" zeigt alle anderen Mitglieder (ohne Bewertung: leere Sterne), Zahler-Chips einzeilig als Pills, Buttons Abbrechen/Speichern mit Icons; Speichern während des Ladens als gedämpftes Glas statt halbtransparentem Gold. Tracker-Flag-Verhalten unverändert.
- **Film hinzufügen / `MovieGrid`**: neue optionale Prop `columns` (Default 3, Suche nutzt 4), Kachel als Glas-Karte mit Titel (1 Zeile) und cyan Score-Badge darunter, Poster-Fallback mit `film-outline` + Titel-Overlay, Leerzustand mit Icon. Modus-Chips als gleich breite Pills, goldumrandetes Suchfeld.
- **Abweichungen**: Poster nicht gekippt (Referenz 06 zeigt es gerade); Modus-Chips stehen weiter über dem Suchfeld (Referenz: darunter), da pro Modus unterschiedliche Eingabefelder; Sheet-Dialog statt Vollbild; keine Blur.

**Gerätetest nötig:** Aktionsleiste mit vielen Aktionen (Umbruch), Rating-Dialog-Höhe bei vielen Mitgliedern/Tastatur, 4-Spalten-Raster Lesbarkeit.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## Design-Angleichung Welle 2C — Settings, Changelog, Auth, Onboarding, EmptyState

**Entscheidung (reversibel, nur Optik):**
- Neue Komponenten: `Brand` (Spulen-Icon + WATCHCREW-Wortmarke, mittig, für Auth/Onboarding), `SettingsRow` (Glas-Zeile, linkes Ionicon, goldener Chevron, optionales Badge), `EmptyState` (Icon in Glaskreis + gedämpfter Text, exportiert für andere Screens), `GLASS_INPUT_CLASSNAME` in `Glass.tsx`.
- Settings-Hub: Zeilen mit Icons (`tv-outline`, `color-palette-outline`, `notifications-outline`, `people-outline`, `newspaper-outline`, `trash-outline`, `document-text-outline`); Abmelden als Glas-Button mit `log-out-outline`; Datenquellen-Karten gedämpft; alle testIDs unverändert.
- Abweichung vom Referenz-Screenshot: Changelog bleibt eine Zeile in der Liste (mit "Neu"-Badge) statt eigenem Glas-Button; Datenquellen ohne Logos (kein neues Asset ohne Freigabe), KinoCheck weiterhin absichtlich nicht aufgeführt.
- Changelog: goldene vertikale Linie links je Eintrag, Serifen-Titel, Datum klein darüber (ohne Punkte, wie im Referenz-Screenshot).
- Login/Registrieren/Passwort vergessen/Callback: Brand-Header über Glas-Karte, Glas-Eingabefelder; Onboarding: zwei Glas-Karten mit `add-circle-outline` / `enter-outline`; Join-Screen zeigt Brand.
- Prettier lief über die Auth-/Onboarding-Dateien (Einrückung/Quotes), daher größere Diffs.

**Gerätetest nötig:** Lesbarkeit, Tastatur-Verhalten bei Register (4 Felder in Glas-Karte), Chevron-/Icon-Farben, Abmelden-Button.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## Design-Angleichung Geräte-Prüfung

Geräteprüfung auf Pixel 6 Pro (2026-10-01), Screenshots in `.scratch-screenshots/design-wave2-2026-10-01/`. Geprüft: Tracker, Watchlist (Karten/Grid/Liste, Sortieren-Sheet), Tagebuch (Karten/Grid/Liste), Detail, Bewertungsdialog, Film hinzufügen (Treffer + leer), Settings-Hub, Changelog, Gruppe verwalten, Ähnliche Filme, Toast, Auth-Callback (Deep-Link). Login/Register/Passwort-vergessen nur per Unit-Test (kein Abmelden).

Behoben:
- Tracker: fehlender `key` auf den Zeilen (LogBox-Fehler).
- Detail: Cast-Fotos `rounded-full` auf expo-image warf "Cannot set prop borderRadius" -> `rounded-[32px]`.
- Detail-Aktionsleiste: umbrach schon bei 3 Buttons auf zwei Zeilen und ragte aus dem Bildschirm; jetzt eine Zeile bis 4 Aktionen (Umbruch erst ab 5), Hintergrund wieder `bg-bg-primary` (Inhalt schimmerte durch).
- `bg-sheet`-Token auf voll deckend (1.0): Sheets/Dialoge/Toast zeigten durchscheinenden Text; Toast nutzt `bg-bg-sheet`.
- Tagebuch-Karte: Ø-Stern 40px, Zahl 9px (Zahl ragte aus dem Stern).
- Maestro `tabs-tour`: Assertion auf `tagebuch-search-input` statt Text "Suche im Tagebuch".

Ergebnis: 6 Maestro-Flows zweimal hintereinander grün; tsc sauber; jest vollständig grün.

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

---

## Nachbesserung nach Praxistest (UI)

Rückmeldung nach Test mit dem echten Preview-Build.

- **Kreis vs. Box:** `rounded-full` nur noch für Elemente mit gleicher Breite/Höhe (Icon-Buttons, Avatare/Cast-Fotos, Punkte, Switch-Tracks, Fortschrittsbalken, Tab-Indikator). Alles mit Text (Filter-/Genre-/Jahr-/Anbieter-Pills, Zahler-Chips, Modus-Chips in Film hinzufügen, Bewertungs-Chips, Genre-Tags, Text-Badges) ist eine Box: `rounded-lg` (Pills/Chips), `rounded-md` (kleine Overlay-Badges). Ovale gibt es nicht mehr.
- **Filter/Sortieren:** immer rein Icon-Button (`options-outline`, rund 48px), öffnet das Sheet. Tagebuch zeigte bisher Text im Button; jetzt nur Icon, `accessibilityLabel` = "Sortieren, aktuell: <Name>", aktuelle Sortierung im Sheet fett/akzentfarben (Test-ID `tagebuch-sort-button` bleibt, `tagebuch-sort-button-label` entfällt).
- **Ansichts-Umschalter:** aus dem Header entfernt, jetzt zweite Zeile in derselben Glas-Karte wie die Suche (Zeile 1: Suche, Watchlist: Gold-"+", Filter; Zeile 2: segmentierter Umschalter, drei gleich breite Icon-Segmente, aktiv Gold). Test-IDs unverändert.
- **Raster:** Letzte Zeile mit weniger Einträgen als Spalten dehnte den Rest auf volle Breite (`flex-1`). Lösung: `padToFullRows` (`src/lib/gridPadding.ts`) füllt mit unsichtbaren Platzhaltern auf; angewandt in MovieGrid, Watchlist-Grid und Streaming-Dienste-Raster.
- **Detail-Aktionsleiste:** Label "Datum" (volle Beschriftung als `accessibilityLabel`), Labels einzeilig; bis 4 Aktionen eine Zeile gleich breit, bei 5 ein 3+2-Raster (zweite Zeile zentriert, `w-[31%]`), kein `flex-wrap` mehr. Scroll-Inhalt mit mehr Bodenabstand (`pb-60`/`pb-40`). Unterer Inset bleibt über das `SafeAreaView` der Leiste im Screen (kein zusätzliches `useSafeAreaInsets`, um doppeltes Padding und Provider-Pflicht in Tests zu vermeiden).

**Status:** Geräte-Prüfung steht aus.

---

## Nachbesserung nach Praxistest (Plattform)

Rückmeldung nach Test mit dem echten EAS-Preview-APK (Release-JS). Alle Fixes sind reines JS, kein neuer EAS-Build wegen nativer Module nötig (nur ein neuer Build, damit der Preview-APK die Fixes enthält).

- **Hintergrundbild fehlte:** Das Bild war im APK enthalten (`res/1a.jpg`, 25173 Byte = `cinema-bg.jpg`, git-getrackt, nicht ignoriert); Ursache war die Geometrie: `AppBackground` bekam Position/Größe nur über NativeWind-Klassen (`absolute inset-0`, `h-full w-full` auf `expo-image`). Im Release-Bundle (lokal mit `expo start --no-dev --minify` reproduziert: flacher #0a0a0a-Hintergrund) kollabierte das Bild auf Größe 0. Fix: `StyleSheet.absoluteFill` für Wrapper und Bild (statische Styles); Test `AppBackground.test.tsx`. Mit Production-Metro auf dem Gerät verifiziert.
- **Tab-Wisch:** neue `TabSwipeView` (`react-native-gesture-handler` `Gesture.Pan`, `activeOffsetX` ±25, `failOffsetY` ±20, min. 60 px und überwiegend horizontal, Spec 4.10) um den Tab-Navigator; Ziel über reine Logik `getAdjacentTab` (`src/lib/tabSwipe.ts`): nächster/vorheriger SICHTBARER Tab, kein Wrap-Around, Tracker-Flag berücksichtigt. Vertikales Scrollen bleibt frei (Pan scheitert bei frühem vertikalem Versatz). Horizontaler Scroller (Besetzung) liegt in der Detail-Modal-Route, außerhalb des Wrappers.
- **Tastatur:** Android-`Modal` und (Edge-to-Edge) auch das Hauptfenster werden nicht von der Tastatur verkleinert; `KeyboardAvoidingView` allein half nicht. Neu: `useKeyboardHeight` (Keyboard-Events); `Sheet` hebt das Panel auf Android um die Tastaturhöhe, begrenzt `maxHeight` (`sheetMaxHeight`) und scrollt den Inhalt (`ScrollView`, `keyboardShouldPersistTaps="handled"`); iOS bleibt bei `padding`. Für Vollbild-Screens `KeyboardInsetView` (Padding um Tastaturhöhe, add-movie) und `KeyboardAwareScrollView` (zusätzlich scrollt das fokussierte Feld über `measureInWindow` ins Bild; Settings, Gruppen-Einstellungen). Die inline `paddingBottom`/`maxHeight`-Werte sind bewusst dynamisch (Tastatur-/Fensterhöhe), nicht als Klasse ausdrückbar. `softwareKeyboardLayoutMode` unverändert (Expo-Default).

**Status:** Geräte-Prüfung durch dich steht aus (neuer Preview-Build nötig).

## Praxistest-Nachbesserungen Geräte-Prüfung

Prüfung auf Pixel 6 Pro (Dev-Client, Metro, Maestro-Konto), Screenshots in `.scratch-screenshots/postfix-verify-2026-10-01/`.

- **Geprüft und in Ordnung:** Hintergrundbild sichtbar (alle Screens); Filter/Sort nur als Icon, Sheet hebt aktuelle Sortierung hervor (Watchlist, Tagebuch); EINE Glass-Karte mit Suchzeile (Watchlist inkl. Gold-+) und darunter Ansichts-Umschalter; Grid-Letztzeile (Ähnliche Filme 37 Treffer, Filmreihe, Watchlist/Tagebuch-Grid) gleiche Kachelbreite, linksbündig; Detail-Leiste mit 5 Aktionen als 3+2, "Datum" einzeilig, "Löschen" rot, Inhalt scrollt bis über die Leiste; 4 Aktionen einreihig; Tab-Wisch links/rechts (auch mit ausgeblendetem Tracker, danach wieder eingeschaltet), vertikales Scrollen in Ähnliche Filme intakt; Tastatur: Zahlungs-Sheet, Anzeigename, Gruppenname, Tagebuch-Suche, Add-Movie-Suche (Text jeweils sichtbar).
- **Gefunden und behoben:** (1) React-`key` im Props-Spread der Aktionsleiste (`MovieDetailActionsBar`) löste in Dev eine LogBox-Meldung aus, die die untere Leiste verdeckte; jetzt `Fragment key` pro Aktion. (2) Ovale statt Boxen: `rounded-full` ist im Tailwind-Config `50%` (nur für Quadrate Kreis), und `rounded-lg` (12px) auf 24-dp-Chips wirkte wie eine Pille. Kleine Textchips/Badges (Genre-Tags, Flatrate/Leihen/Kaufen, Jahr/Genre-Pillen, Zahlungs-/Rating-Chips, Score-/Datums-Badges) nutzen jetzt `rounded-sm` (6px), Rating-Dialog-Payer-Chips `rounded-md`.
- **Tests:** tsc sauber; Jest 147 Suites / 1286 Tests grün; alle 6 Maestro-Flows zweimal in README-Reihenfolge grün (keine Selektor-Anpassung nötig).
- **Offen:** Genre-Tags/Chips nach der letzten Radius-Änderung nur teilweise per Screenshot nachgeprüft (Genre-Tags, Filmreihe-Chips ok); Add-Movie-Modus-Chips und Settings-Zeilen weiterhin `rounded-lg`/`rounded-xl` (Boxen, aber bei kleiner Höhe rundlich).

---

---

Neue Einträge werden von den Implementierungs-Subagents laufend ergänzt, sobald weitere Milestones reversible Detailentscheidungen treffen.

## Nachbesserung: Datum in Bearbeiten, Aktionsleiste, Glas

Rückmeldung zum Detail-Screenshot, Stand 2026-10-01.

- **Datum in „Bearbeiten“:** Die separate Aktion `erscheinungsdatum` („Datum“) ist entfernt (`ActionButtonId`, `getVisibleActions`, Label/Icon). Bei Einträgen der Watchlist (`source = watchlist`) öffnet „Bearbeiten“ jetzt das Sheet „Eintrag bearbeiten“ mit dem Feld „Erscheinungsdatum“ (`DateField`, Anzeige DD.MM.YYYY, Speicherung ISO), „Auf TMDB-Datum zurücksetzen“ nur bei vorhandenem Override, Toasts „Erscheinungsdatum gespeichert“ / „…zurückgesetzt“ (unverändert, `useSetReleaseDateOverride`). Bei Tagebuch-Einträgen öffnet „Bearbeiten“ weiter den Bewertungsdialog. Nur das Datum ist editierbar, nicht der Titel. Die Leiste bekommt dafür die Prop `source`.
- **Aktionsleiste:** Bis 4 Aktionen eine Zeile mit gleich breiten Buttons; bei 5 (Bewerten, Bearbeiten, Ähnliche Filme, Löschen, Filmreihe) zentriertes 3+2-Raster (Fallback unverändert). Labels einzeilig.
- **Glas (JS-only, ohne Blur):** Hellere, durchscheinende Füllungen plus deutlich sichtbarer Rand. Tokens in `tailwind.config.js`: `bg-card` rgba(100,100,108,.55), `bg-glass` rgba(72,72,80,.62), `bg-glass-strong` rgba(62,62,70,.74), `bg-sheet`/`bg-tab-bar` rgba(30,30,36,.95), `glass-border` rgba(255,255,255,.18). Sheet/Leiste/Tab-Leiste bewusst .95 statt ~.85: darunterliegender Text scheint sonst durch die Buttons. Zentrale Konstanten in `Glass.tsx` (`GLASS_CLASSNAMES`, `GLASS_TILE/BAR/SHEET_CLASSNAME`, `GLASS_TAB_BAR_STYLE`, `GLASS_SEARCH_INPUT_CLASSNAME`), damit ein späterer `expo-blur`-`BlurView` an wenigen Stellen eingehängt werden kann (Glass, Sheet-Surface, Detail-Leiste, `tabBarBackground`).
- **Status:** Offen für deine finale Bestätigung / Änderungswunsch.

## Echter Blur (expo-blur)

- **Entscheidung:** Du willst echtes Glas. `expo-blur` (~57.0.3, natives Modul, kein Config-Plugin nötig) ist installiert.
- **Wrapper/Fallback:** `src/components/ui/GlassBlur.tsx` lädt `expo-blur` per `require` in try/catch. Fehlt das native Modul (alter Dev-Client), wird die bisherige getönte Füllung (`bg-bg-sheet` .95) gerendert, nichts crasht. Mit Blur: `BlurView` (tint dark, intensity 40, `blurMethod="dimezisBlurView"`) + darüberliegende transparente Tönung (`bg-bg-sheet-blur` rgba(24,24,30,.55), Tab-Leiste `bg-tab-bar-blur` .5). Jest-Mock in `__mocks__/expo-blur.js`.
- **Android-Einschränkung:** expo-blur 57 blurrt auf Android nur den Inhalt einer `BlurTargetView`. Diese umschließt im Root-Layout den App-Hintergrund (`GlassBlurTarget`), geblurrt wird also das Foto, nicht darüber scrollende Listeninhalte. RN `Modal` ist ein eigenes Android-Fenster; ein BlurView darin kann die App dahinter nicht blurren. Entscheidung (sichere Variante): **Sheet bleibt** getönt-translucent (.95) mit abgedunkeltem Modal-Backdrop, kein Blur im Sheet.
- **Eingesetzt:** Toast (`Glass variant="panel"`), Aktionsleiste im Film-Detail, Tab-Leiste (`tabBarBackground`). Karten/Zeilen bleiben bewusst ohne Blur (Performance, Listen-Scrollen).
- **Wichtig:** Neuer Dev-Client UND neuer Preview-Build nötig (neues natives Modul); der alte Dev-Client nutzt den Fallback.
- **Status:** Offen für deine Geräte-Prüfung nach dem Neubau.

## Einstellungen neu gegliedert, Logos, Badges, Trailer

- **Einstellungen:** Hub gegliedert in "Aktueller Nutzer" plus je eine Glas-Karte pro Abschnitt (Konto mit Anzeigename-Editor und rotem "Konto löschen", Gruppe, App mit "N ausgewählt"/Neu-Badge, Rechtliches), darunter Datenquellen, Abmelden als volle Glas-Schaltfläche, Version. Trennlinien nur ZWISCHEN Zeilen (`SettingsGroup`, `SettingsRow` ohne eigenen Kasten, `SettingsToggleRow`). Unterseiten haben unten eine Glas-"Zurück"-Schaltfläche (`SettingsBackBar`) zusätzlich zum Header-Pfeil. Alle testIDs bleiben (Badge `settings-streaming-badge` entfällt, ersetzt durch Text "N ausgewählt").
- **Hintergrund:** Settings-Routen (Hub, Unterseiten, Gruppe verwalten) bekommen in `(modals)/_layout.tsx` `contentStyle` `#0a0a0a`: kein Projektor-Foto dort, Tabs/Detail unverändert.
- **Zahnrad:** `SettingsButton` ist eine eigene Pressable (`h-11 w-11 aspect-square shrink-0`). Ursache des Ovals: `min-h-touch-min` des Buttons wird von twMerge nicht durch `min-h-0` ersetzt.
- **Streaming-Logos:** `logo_path` kam schon vom Edge-Function-Endpoint durch (kein Deploy nötig). Liste = umbrechende Chips mit 40px-Logo (w92) links vom Namen; Detail-Anbieter zeigen 24px-Logo.
- **Tabellen:** keine Trennlinie nach der letzten Zeile (Tracker, Tagebuch-Liste, Add-Movie-Ergebnislisten).
- **YouTube:** eigenes Vollbild (Modal, zweites WebView, Button, Orientation-Lock) entfernt; Standard-Player mit `allowsFullscreenVideo`. `expo-screen-orientation` wird nicht mehr importiert (Paket bleibt in package.json).
- **Badges:** Durchschnitts-Stern in 44x44-Box mit zentrierter Zahl (nicht abgeschnitten). TMDB-Badge bündig in der Ecke unten rechts (`absolute bottom-0 right-0 rounded-tl-xl`) bei Tagebuch-/Watchlist-Karten, Watchlist-Grid und Tagebuch-Kachel; `MovieGrid` unverändert (Score steht dort unter dem Poster).
- **Datenquellen:** nur TMDB und Trakt mit Logos (`assets/images/tmdb-logo.png` 240x103, `trakt-logo.png` 96x96; aus den SVGs des Legacy-Repos per Headless-Chromium gerendert, nichts aus dem Netz). JustWatch-Zeile entfällt; der Pflicht-Credit steht im TMDB-Text ("Streaming-Daten: JustWatch.").
- **Status:** Offen für deine Geräte-Prüfung.

## Blur flächendeckend, Sheet ohne Modal

- **Ursache "grauer Schleier":** Blur lief technisch (Dev-Client mit ExpoBlur, Log ohne Warnungen, Testkasten zeigt unscharfes Foto), war aber unsichtbar: Foto ist stark abgedunkelt, `tint="dark"` dunkelte weiter ab, und Cards/Tabellen/Karten hatten gar keinen BlurView (nur `panel`, Tab-Bar, Detail-Leiste). Außerdem existiert die Klasse `bg-card` im Tailwind-Setup nicht (Token heißt `bg-bg-card`), die Fills waren teils wirkungslos.
- **Glass:** alle Varianten (`default`, `strong`, `panel`) laufen über `GlassBlur` (BlurView, `tint="default"`, Intensität 30, helle Overlay-Tints `bg-bg-card-blur` 9 %, `bg-bg-glass-strong-blur` 14 %; Panel/Sheet/Tab-Bar dunkel 42 %). `Card` nutzt `Glass`. Fallback ohne Modul/Jest: getönte Fläche wie vorher. `GlassBlur` kann `onPress` (Pressable). Watchlist-Listenzeilen sind `GlassBlur`.
- **Sheet:** kein RN-`Modal` mehr (eigenes Android-Fenster, BlurView sieht das Foto dort nicht). Overlay im Fenster, `position:absolute`, `zIndex/elevation 1000`, im Baum des aufrufenden Screens (funktioniert auch in Modal-Routen, Foto wird geblurt). Slide-up per Animated, Backdrop-Tap und Android-Zurück schließen, API unverändert. Tastatur: Anhebung nur um den Teil, der das Overlay überlappt (Overlay-Unterkante vs. Tastatur-Oberkante).
- **Einschränkung:** In Tab-Screens endet das Sheet über der Tab-Bar (Backdrop deckt die Leiste nicht ab). Grid-Kacheln (`WatchlistPosterCard` Grid via `Card`) blurren pro Kachel; Poster decken fast alles ab.
- **Status:** Rein JS, kein neuer EAS-Build nötig (ExpoBlur steckt im Dev-Client 17db0985; die EAS-Preview f1ca9c0f enthielt es bereits). Offen für deine Geräte-Prüfung.

## Geräte-Prüfung final (Blur, Einstellungen, Logos)

- **Geprüft** auf Pixel 6 Pro (Dev-Client, Screenshots in `.scratch-screenshots/final-2026-10-02/`): Glass/Blur auf Karten, Tracker-Tabelle, Sheets, Toast, Tab-Bar, Detail-Leiste; Einstellungen-Hub und Unterscreens; Streaming-Dienste mit Logos; Tagebuch-/Watchlist-Badges; Trailer; Scroll-Performance der Add-Movie-Ergebnisse (gfxinfo: 0,4 % Janky Frames, kein `blur={false}` nötig).
- **Fix Sheets in der Detail-Leiste:** "Eintrag bearbeiten" und "Film löschen?" lagen in der unteren Leiste und wurden dort abgeschnitten (Overlay füllt nur den nächsten Eltern-View). Neu: `SheetHost` in `Sheet.tsx`; Sheets unterhalb eines Hosts zeichnen ihr Overlay im Host. Der Movie-Detail-Screen hostet auf Screen-Ebene. Ohne Host unverändertes Verhalten.
- **Fix Trailer-Vollbild:** App ist portrait-gesperrt, YouTube-Vollbild blieb deshalb im Hochformat. Die eingebettete Seite meldet `fullscreenchange` per injiziertem JS; `expo-screen-orientation` sperrt nur währenddessen auf Landscape und danach wieder auf Portrait (auch beim Verlassen des Screens). Kein eigenes Vollbild-UI.
- **Fix Lesbarkeit:** `text-secondary` von `#888888` auf `#a8a8a8` angehoben (grauer Text auf Glas war kaum lesbar).
- **Fix Konsistenz:** "Gruppe verwalten" hat jetzt die untere "Zurück"-Leiste wie die übrigen Einstellungs-Unterscreens.
- **Sheets in Tab-Screens:** enden über der Tab-Bar, Backdrop dimmt sie nicht; als akzeptabel bewertet (Tab-Bar bleibt bedienbar, Optik stimmig). Ein Overlay über der Tab-Bar bräuchte einen Host oberhalb des Navigators und gefährdet das Blur-Sampling; nicht umgesetzt.
- **Perf-Overlay:** der Dev-Menü-Schalter "Toggle performance monitor" ließ das Overlay stehen; ausgeblendet über "Open React Native dev menu" > Perf Monitor und App-Neustart.
- **Tests:** tsc sauber, Jest 149 Suites / 1312 Tests grün, alle 6 Maestro-Flows zweimal grün. Neue EAS-Preview des Arbeitsbaums: Build fb867d39-02a5-4681-b6af-1e3e6531f848.
- **Status:** Offen für deine Geräte-Prüfung.

## Glas dunkler (wie Legacy), Settings mit Hintergrundbild, Stern-Zentrierung

- **Anlass:** Glas wirkte grau/hell; Legacy ist dunkles Rauchglas (`--bg-card` rgba(20,20,20,.5), Blur 12-20px, Rand 6 Prozent weiss).
- **Blur:** `GlassBlur` Standard `tint="dark"`, `intensity` 30 (Sheet 40). Fuell-Tokens (`tailwind.config.js`): `bg-card`/`bg-card-blur` rgba(10,10,12,.5); `bg-glass-strong-blur` .62; `bg-sheet-blur`/`bg-tab-bar-blur` .62. Kein-Blur-Fallback (dunkel, deckender): `bg-glass` .72, `bg-glass-strong` .82, `bg-sheet`/`bg-tab-bar` rgba(12,12,14,.96).
- **Rand:** `glass-border` rgba(255,255,255,.12); neu `glass-border-strong` .16 (Variante `strong`); Tab-Bar-Top-Border .12.
- **Hintergrundfoto:** `assets/images/cinema-bg.jpg` Helligkeit x2.0 (Graustufen, Mittelwert 19 auf 39, Max 85 auf 170), damit Karten dunkler als das Foto wirken.
- **Settings:** kein opakes `#0a0a0a` mehr; `contentStyle` rgba(0,0,0,.35) (Foto gedimmt; Hub, Unterscreens, Gruppen-Einstellungen). `SettingsGroup` nutzt jetzt `Glass` (echter Blur; auf dem Geraet geprueft, Blur funktioniert in der Modal-Route).
- **Stern-Badge (`DiaryEntryCard`):** Ziffern-Mitte lag 5,5 px (Pixel 6 Pro, 3,5x) ueber dem Stern-Schwerpunkt; `pt-[3px]` am Overlay, danach Abweichung dx 0,2 px / dy 0,1 px.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Glas-Buttons, 3D-Kante statt Rand, Stern-Zentrierung

- **Ein Button-System** (`src/components/ui/Button.tsx`): Varianten `primary` (Akzent-Fuellung, dunkler Text, Top-Highlight `border-t-white/40`, gedrueckt `accent-light`), `secondary` (Glas: Fuellung `white/10`, gedrueckt `white/20`, Kante wie Karten, Text `font-medium` hell), `ghost` (nur Text/Icon, gedrueckt `white/10`), `danger` (Text `danger-text` #e5675a auf `danger/15`, Kante `danger/30`). Disabled hat eigene gedaempfte Klassen (`white/10` bzw. `white/5`, Text `white/35`), kein `opacity-50` mehr (kein braunes Gold). Groessen `default` (48), `sm` (44), `xs` (36, Chips/Inline-Buttons); `iconOnly` = exaktes Quadrat (48/44/36), `rounded-full`, ohne `min-h-*` (twMerge ersetzt `min-h-touch-*` nicht). Export `BUTTON_ICON_COLORS`.
- **Migriert:** Settings (Speichern, Abmelden), `SettingsBackBar`, Zahnrad (`SettingsButton`), Sheet-Schliessen, Filter-/Sortier-Icon, Add-Button, Zahlung-Button (Tracker), Tracker Bearbeiten/Loeschen, Filter-Chips (Tagebuch, Watchlist, MovieGrid), Add-Movie-Modi/Streaming-Chip, Bewertungsdialog (Abbrechen/Speichern, Zahler-Chips), Gruppenwechsel + Einladungs-Toggle, Detail-Zurueck. Nicht migriert (bewusst): ViewModeToggle (Segment, Inset-Container), Zahler-Chips mit Mitgliedsfarbe (Tracker/PaymentModal), Aktionsleisten-Kacheln (Glas-Kachel), Zeilen/Sortier-Optionen. testIDs und a11y-Labels unveraendert.
- **3D-Kante statt Outline** (zentral in `Glass.tsx` + `tailwind.config.js`): `glass-border` .06 (rundum), `glass-border-strong` .08, `glass-edge-top` rgba(255,255,255,.16), `glass-edge-bottom` rgba(0,0,0,.35), `glass-inset-bottom` rgba(255,255,255,.10). `GLASS_EDGE` = `border border-glass-border border-t-glass-edge-top border-b-glass-edge-bottom` fuer Glass/Card/Tile/Buttons; Sheet nur Top-Highlight (`border-t-glass-edge-top`); Tab-Bar `borderTopColor` .16. Inputs invertiert (`GLASS_INSET_EDGE`: oben dunkel, unten hell .10, Fuellung `black/35`). Per-Seite-Borderfarben mit Radius rendern auf Android (Pixel 6 Pro) sauber.
- **Stern-Zentrierung:** Mass ist der Mittelpunkt des Inkreises (= Umkreismitte, aus Stern-Bbox: R = B/1,902 bzw. H/1,809), nicht der Pixel-Schwerpunkt; Ziffern-Bbox aus dunklen Pixeln. Vorher (40dp-Stern, 11px, `pt-[3px]`): Ziffern 1,0 px links und 3,1 px ueber der Sternmitte (Inkreis-r ca. 26 px < Ziffernbreite 47 px). Jetzt: Stern 44dp, Ziffern 10px bold, `pl-[2px] pt-[7.5px]`: dx +0,5 px, dy +0,3 px (3,5x). Konstanten in `DiaryEntryCard.tsx` (`STAR_BADGE_*`), Unit-Test.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Tagebuch-Karte: Bewertung als Eck-Badge

- **Entscheidung:** Der Stern mit Zahl (44dp-Stern, Ziffern darueber) in `DiaryEntryCard` ist ersetzt, nachdem die Zentrierung wiederholt nicht stimmte. Neu: Eck-Badge `absolute top-0 right-0 rounded-bl-xl bg-black/60 px-3 py-1` (Gegenstueck zum TMDB-Badge unten rechts, bündig an der Kartenecke): gelber Stern (14px, `starColor`) + Durchschnitt (`text-xs font-semibold text-white`). Gelikt: rotes Herz (14px, `#e05c6e`) vor dem Stern im selben Badge. Titelzeile mit `pr-20`, damit Titel vor dem Badge abgeschnitten wird.
- **Entfernt:** `STAR_BADGE_*`-Konstanten samt Messkommentar und Test. testIDs unveraendert (`poster-card-average-badge`, `-average-value`, `-like-badge`, `-like-icon`).
- **Status:** Offen fuer deine Geraete-Pruefung.

## Kacheln: Poster randlos

- **Entscheidung:** Alle Grid-Kacheln (Watchlist `WatchlistPosterCard` grid, Tagebuch `DiaryPosterTile`, `MovieGrid` fuer Aehnliche Filme/Filmreihe/Filmografien/Add-Movie) sind eine Glas-`Card` mit `overflow-hidden` und ohne Innenabstand. Das Poster (expo-image, `contentFit="cover"`, `aspect-[2/3] w-full`, ohne eigenen Radius) sitzt buendig an Links/Oben/Rechts; die oberen Ecken folgen dem Radius der Kachel, die Unterkante ist ein gerader Schnitt. Darunter ein Infobereich mit eigenem Padding (`px-2 py-1.5`, MovieGrid `px-1 py-1.5`) fuer den Titel.
- **TMDB-Score:** In allen Kacheln buendig in der Poster-Ecke unten rechts (`absolute bottom-0 right-0 rounded-tl-xl bg-black/60`), nur die Zahl (Kacheln sind klein). In MovieGrid wandert der Score damit aus der Infozeile aufs Poster. Datums-/Fortschritts-/Auge-/Bookmark-/Plus-Badges bleiben oben auf dem Poster.
- **Technik:** `DiaryPosterTile` ist jetzt selbst die `Card` und nimmt den Titel als `children` (Infobereich nur wenn vorhanden); Tagebuch-Screen reicht den Titel hinein. `MovieGrid`-Kachel nutzt `Card` statt eigener Pressable-Klassen. `WatchlistPosterCard` grid nutzt `expo-image` (`@/components/ui/Image`). testIDs, a11y-Labels, Press-Handler, Dimming und feste Breiten (`padToFullRows`) unveraendert.
- **Status:** Offen fuer deine Geraete-Pruefung.

## TMDB-Logo im Sheet-Badge, Changelog entfernt

- **Begriffe (Vokabular):** "Sheet" = Listeneintrag mit Bild links und Text rechts (Karten-Ansicht: `DiaryEntryCard`, `WatchlistPosterCard` Card-Variante). "Kachel" (tile) = Poster oben, Titel darunter (Grid-Ansicht).
- **TMDB-Logo:** Das Badge zeigt statt des Texts "TMDB" das echte TMDB-Kurzlogo (wie die Legacy-App; Asset `assets/images/tmdb-logo.png`, schon im Settings-Footer genutzt, kein neues Asset noetig) plus Score. Neue gemeinsame Komponente `src/components/ui/TmdbBadge.tsx` (Logo 14dp hoch / 32dp breit, `contentFit="contain"`, a11y-Label "TMDB Bewertung 8.4"), genutzt in beiden Sheets (Eck-Badge `absolute bottom-0 right-0 rounded-tl-xl bg-black/60 px-3 py-1`) und in der Titelzeile des Film-Details. Kacheln (Grid) behalten das reine Score-Eck-Badge. testIDs unveraendert.
- **Changelog komplett entfernt (Entscheidung des Nutzers):** "Changelog koennen wir entfernen, auch die Toasts dazu; Updates und Features werden ueber die Store-Infos kommuniziert." Entfernt: Settings-Zeile samt "Neu"-Badge, Route/Screen `settings/changelog`, `ChangelogBanner` im Tracker, Start-Toast (`useChangelogStartupToast`), Toast "Neue Funktionen verfuegbar" in den Einstellungen, `src/lib/changelog.ts` (`CURRENT_CHANGELOG_VERSION`), Preference `lastSeenChangelogVersion` samt Setter, zugehoerige Tests und der Changelog-Schritt in `.maestro/flows/tabs-tour.yaml`. Alte Installationen: Zustand-persist ignoriert den unbekannten Key (per Test abgesichert). Das Toast-System selbst bleibt.
- **Ersetzt:** Alle frueheren Changelog-Eintraege in diesem Dokument (M10 Settings-Hub Changelog, Startup-Toast, "Neu"-Badge) sind damit hinfaellig; der Verlauf bleibt als Historie stehen. `docs/feature-inventory.md` (Legacy-Spec) bleibt unveraendert.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Einheitliche Chips, Besetzung-Rahmen, ruhiger Glas-Hintergrund für Detail-Views

- **Ein Chip-Stil für die ganze App** (`src/components/ui/Chip.tsx`, Tokens exportiert): `h-9`, `rounded-lg` (12px, bewusst keine Ovale), `px-3`, `border`, Text `text-sm`. Inaktiv: Gold-getönte Fläche `bg-accent-a15` + Rand `border-accent-a40` + Text `text-accent-light`. Aktiv: massives Gold `bg-accent`/`border-accent` + dunkler Text `text-bg-primary font-semibold`. `Chip` (Pressable, `active`, a11y `selected`) und `ChipTag` (statisch, Genre-Tags).
- **Ursache der "dunklen Ovale":** NativeWinds `/NN`-Opacity-Modifier funktioniert nicht auf `var()`-Farben (`border-accent/60` rendert dunkel). Deshalb neue Alpha-Tokens `accent-a15/a30/a40/a45` (Tailwind-Config + pro Theme in `src/global.css`). Nie mehr `bg-accent/NN` verwenden.
- **Migriert:** Genre-Tags im Detail, Filter-/Kategorie-Chips in `MovieGrid` (Flatrate/Leihen/Kaufen, auch Ähnliche/Filmreihe/Filmografie), Watchlist- und Tagebuch-Genre/Jahr/Provider-Pillen, Add-Movie-Modus-Chips und Streaming-Toggle, Zahler-Chips im `RatingDialog`, Provider-Auswahl in "Meine Streaming-Dienste" (gleiche Farb-Tokens, Logo-Layout bleibt). Zahler-Chips in `PaymentModal`/Tracker behalten die Mitglieds-Farben.
- **Besetzung-Rahmen:** `movie-detail-cast-frame` mit Haarlinien oben/unten (`border-y border-accent-a30`), Avatare mit goldenem Ring (`border-[1.5px] border-accent-a45`). Regie bleibt darüber.
- **Ruhiger Glas-Hintergrund:** `ScreenBackdrop` (`src/components/ui/ScreenBackdrop.tsx`): statischer Vollbild-`GlassBlur` (Intensität 90, Tint `bg-black/70`, Fallback `bg-black/85`) hinter Filmdetail, Ähnliche Filme, Filmreihe, Filmografie (Regie/Schauspieler/Studio) und Add-Movie. Angebunden über `screenLayout` des (modals)-Stacks (expo-router verwirft ein `layout`-Prop an `Stack.Screen`), gefiltert nach Routenname. Tabs und Settings unverändert. Blur samplet auch hinter Modal-Routen den Foto-Hintergrund (am Gerät geprüft).
- **Zurück-Button im Filmdetail:** jetzt fix (nicht mehr im ScrollView), innerhalb der Safe-Area oben links; scrollt nicht weg.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Chips lesbar auf dem Foto, Parallax-Hintergrund

- **Chips (inaktiv) zweilagig:** Dunkle, fast deckende Basis `bg-chip-base` = `rgba(14,12,8,.88)` (theme-neutral, Tailwind-Token) plus Gold-Tönung `bg-accent-a15` als eigene Layer-View (`<testID>-tint`, absoluteFill per Style-Objekt, `borderRadius` 7), Rand `border-accent-a55` (neuer Token, pro Theme in `global.css`, vorher a40), Text `text-accent-light font-medium`. Aktiv unverändert massives Gold. Platzierung: Chip-Reihen bleiben unter der Glas-Karte (nicht hineinverschoben, Karte ist schon hoch; testIDs unverändert); die deckende Basis macht sie auf dem Foto lesbar (am Gerät geprüft). Gilt für alle Nutzungen (`Chip`, `ChipTag`, exportierte Tokens).
- **Legacy-Parallax (filmkritiker `js/tabs.js` `BG_POSITIONS`, `styles.css` `body::before`):** fixiertes Foto, 140vw breit (left -20vw), `background-position` X pro Tab (Tracker 30 %, Watchlist 50 %, Tagebuch 70 %) mit 600 ms `cubic-bezier(.4,0,.2,1)`. Kein Scroll-Link, kein Neigungssensor (kein `expo-sensors` nötig).
- **Umsetzung (Update 2026-10-03, Framing wie Legacy):** `AppBackground` zeigt das Foto per Cover-Fit nach Höhe (ganzer Projektor sichtbar wie in der Legacy-App, kein Zoom; Asset 720x1280, Pixel 6 Pro: Foto 1.05 x Bildschirmhöhe, Breite = Höhe x 0.5625). Kein 140 %/120 %-Overscan mehr. Reanimated auf dem UI-Thread: (1) Tab-Pan über den realen horizontalen Spielraum (`slackX = boxBreite - Bildschirmbreite`): `translateX = -((pos-50)/100) * slackX`, Positionen Tracker 15 / Watchlist 50 / Tagebuch 85 (Weg Tracker->Tagebuch = 0.7 x slackX, Pixel 6 Pro ca. 295 px = 112 dp; vorher ca. 92 px = 35 dp), 600 ms Ease; (2) Scroll-Drift: `translateY = -min(scrollY * 0.2, 0.05 * Höhe)` (5 % vertikaler Overscan, Box oben bündig). Reine Funktionen in `src/lib/parallax.ts` (`backgroundLayout`, getestet). `ParallaxProvider` (Root-Layout) hält `scrollY`/`tabPosition` als Shared Values; Screens spreaden `useParallaxScroll()` (`onScroll`, Throttle 16) auf Tracker, Watchlist, Tagebuch, Settings, Gruppen-Einstellungen, Benachrichtigungen, Streaming-Dienste, Filmdetail, Add-Movie, `MovieGrid`. Tabs-Layout setzt bei Routenwechsel `scrollY` mit 300 ms auf 0 und aktualisiert den Tab-Pan. Reduce-Motion: kein Parallax. Blur samplet das bewegte Foto weiter. Reanimated nur in Provider/AppBackground, Jest-Mock `__mocks__/react-native-reanimated.js`.
- **Gerät:** Settings-Scroll 470 px -> Foto-Detail verschiebt sich ~94 px (Faktor 0,2); gfxinfo beim Scrollen 0,5 % (Settings) bzw. 3,5 % (Add-Movie-Raster) Janky Frames. Auf Detail-Routen mit ruhigem Backdrop (Blur 90 + 70 % Schwarz) ist die Bewegung kaum sichtbar.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Speichern als runder Icon-Button hinter Namensfeldern

- **Muster:** Einzelfeld-Editoren mit "Speichern" (Anzeigename in den Einstellungen, Gruppenname in den Gruppen-Einstellungen) zeigen Eingabefeld (`flex-1`) und einen runden Icon-Button (`Button iconOnly`, 48px, `rounded-full`, primary/Gold wie Plus- und Zahlungs-Button, Ionicons `save-outline` in `BUTTON_ICON_COLORS.primary`) in EINER Zeile (`settings-display-name-row`, `group-settings-rename-row`). Fehlertext steht unter der Zeile.
- **Zustände:** Deaktiviert (muted, kein Matsch-Gold, Icon `BUTTON_ICON_COLOR_DISABLED`), solange der Name unverändert oder leer ist; während des Speicherns Spinner im Button (`loading`). Toasts ("Anzeigename gespeichert", "Gruppe umbenannt"), Validierung, `KeyboardAwareScrollView` und alle testIDs unverändert. A11y: "Anzeigename speichern" bzw. "Gruppenname speichern", Rolle button.
- **Bewusst unverändert:** Vollbreite Primär-Buttons bei Formularen mit mehreren Feldern oder Haupt-CTAs (Login, Registrierung, Onboarding, Konto löschen).
- **Änderung später:** Reine Klassen-/Struktur-Änderung in `settings.tsx` und `group-settings.tsx`.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Icons: Material Icons über zentrale Icon-Komponente

- **Familie:** `MaterialIcons` (`@expo/vector-icons`), Ionicons komplett ersetzt. Zugriff nur über `src/components/ui/Icon.tsx`: Prop `name` ist eine semantische Rolle (`back`, `close`, `film`, `heart`, `heartEmpty`, `tabWatchlist` ...), nie ein Roh-Glyph; `ICON_ROLES` mappt Rolle -> Glyph (per Test gegen die Glyph-Map geprüft).
- **Größen:** Tokens `S` = 16 (Badges/inline, vorher 14-18), `M` = 24 (Buttons/Zeilen/Tab-Bar, vorher 20-28), `L` = 40 (Poster-Platzhalter/Empty-State/Theme-Swatch, vorher 32-56). `StarRating` `iconSize` ist jetzt ein Token.
- **Stil:** Material ist überwiegend gefüllt; `-border`/`-outline`-Glyphen nur dort, wo sie Zustand tragen (leerer Stern, leeres Herz, Checkbox aus, Watchlist-Tab inaktiv, Watchlist-Aktionsbutton). Tracker- und Tagebuch-Tab haben keine Outline-Variante und bleiben gefüllt (aktiv/inaktiv nur über Farbe).
- **Vereinheitlicht:** ein Zurück-Icon `arrow-back` (SettingsBackBar, Filmdetail); Sheet-Schließen-"×" jetzt `close`-Icon; Bearbeiten `edit`; Sortieroption "Mag ich" ohne Text-Herz; Auswahl-Häkchen `check-circle` gefüllt wie alle anderen Glyphen.
- **Änderung später:** Rolle in `ICON_ROLES` umhängen -> wirkt überall.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Einklappbares Filter-Panel (Watchlist, Tagebuch)

- **Muster (wie Legacy):** Eingeklappt zeigt die Glas-Karte nur Suchfeld, (Watchlist) Plus-Button und Filter-Button (`options`/tune). Sortierung (Button "Sortieren: <aktuell>", öffnet weiter das Sort-Flyout), `ViewModeToggle` und alle Chip-Reihen (Genre, Jahr, Flatrate/Leihen/Kaufen) liegen im Panel. Tracker unverändert.
- **Komponente:** `src/components/ui/CollapsibleFilterPanel.tsx`, von beiden Tabs genutzt. testIDs: `<tab>-filter-toggle`, `<tab>-filter-panel`, `<tab>-filter-active-dot` (Tab `watchlist`/`tagebuch`). Panel-Inhalt wird nur gemountet, wenn offen.
- **Animation:** RN-eigene `LayoutAnimation` (easeInEaseOut), keine neue Abhängigkeit.
- **Aktiv-Zustand:** Filter-Button gold gefüllt (`primary`), wenn offen. Goldener Punkt am Button (`hasActiveListFilters` in `src/lib/listFilters.ts`) bei nicht-Standard-Sortierung, anderen Provider-Kategorien oder Ansicht ungleich Karten.
- **Persistenz:** `filterPanelOpen: { watchlist, diary }` im `usePreferencesStore` (MMKV, pro Gerät und Tab, nicht pro Gruppe), Standard zu.
- **Änderung später:** Reine Layout-Änderung in der Komponente bzw. den zwei Tab-Screens.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Flat-Material-Stil, Backdrop-Dimmung, Danger-Styleguide

- **Referenz:** `docs/style-guide.md` (Tokens, Varianten nach Funktion, Border-, Backdrop-, Danger-Regel).
- **Flat statt 3D:** Eine gleichmaessige Border `border-glass-border` = `rgba(255,255,255,.10)`, 1px. Entfernt: Top-Highlight, dunkle Unterkante, Inset-Kanten, `shadow-card`, Doppel-Border an Glass, Button, Sheet, SortButton, ViewModeToggle, Inputs, Poster, Leisten. Tokens `glass-edge-*`, `glass-inset-bottom`, `glass-border-strong` und `boxShadow.card` entfallen. Blur/Transluzenz bleiben.
- **Backdrop:** Nur Tracker/Watchlist/Tagebuch ungedimmt. `ScreenBackdrop` hat `level` `calm` (black 70%, Detail-Referenz) und `dim` (black 80%) bei Blur 90; Settings-`contentStyle`-Dim entfaellt. `dim` auch fuer Auth/Onboarding/Join/Callback per Root-`screenLayout`.
- **Danger:** Ein roter Look (`bg-danger/15`, Border `danger/30`, Text/Icon `#e5675a`) als gemeinsame Tokens in `Button.tsx`, genutzt von `Button variant="danger"`, `SettingsRow danger`, Icon-Button (`RatingDialog` Reset) und Loesch-Kachel in `MovieDetailActionsBar`.
- **Warum leicht aenderbar:** Alles ueber wenige Tokens/Konstanten (`tailwind.config.js`, `Glass.tsx`, `Button.tsx`, `ScreenBackdrop.tsx`).
- **Status:** Offen fuer deine Geraete-Pruefung.

## Verifikations-Workflow: vollständige Maestro-Suite + alle Screenshots nach jeder Änderung

- **Regel (Nutzervorgabe):** Nach jeder App-Änderung: `tsc` + `jest`, dann `scripts/maestro-all.sh` auf dem Pixel 6 Pro (alle Flows, jeder Screen, jede Funktion; Laufzeit egal), Screenshots selbst sichten und **alle** Screenshots per SendUserFile an den Nutzer schicken, plus kurze Zusammenfassung.
- **Umsetzung:** `scripts/maestro-all.sh` (feste Flow-Reihenfolge, sammelt jeden `takeScreenshot` mit geordneten Namen `NN-<flow>--<shot>.png` in ein Ausgabeverzeichnis, Pass/Fail je Flow, Exit-Code != 0 bei Fehler). Abdeckung: `docs/maestro-coverage.md` (Screen/Funktion -> Flow -> Screenshot -> Status).
- **Definition of Done:** Flows (inkl. Screenshots) für neue Features/Screens gehören zum Feature; `docs/maestro-coverage.md` wird mitgepflegt.
- **Flow-Regeln:** Flows stellen den Testzustand wieder her (Name Robin, Gruppe "Maestro Test Gruppe", Theme Gold, Netflix aus, Watchlist-Sortierung "Meine Streaming-Dienste" / Grid / Panel zu, Tagebuch "Mein Tagebuch" / Karten / Panel zu, Tracker leer). Destruktive Dialoge werden gezeigt und abgebrochen; echte Schreibzyklen nur mit selbst angelegten Daten und anschließendem Rückbau.
- **Screenshot-Helfer:** Maestros `takeScreenshot` scheitert bei posterlastigen Screens (PNG > 4 MB gRPC-Limit). Dafür `.maestro/subflows/shot.yaml` + `scripts/maestro-shot-server.py` (`adb screencap`), vom Runner gestartet.
- **Änderung später:** Flow-Liste nur in `scripts/maestro-all.sh` (Array `FLOWS`) und `docs/maestro-coverage.md`.
- **Status:** Offen fuer deine Geraete-Pruefung.

## Maestro: Use-Case-Bereiche (Areas), schnellere Flows, Animationen aus

**Anlass:** Vollständiger Lauf dauerte ca. 43 Min. Messung: Kosten stecken nicht in der App-Animation, sondern in Maestro/UiAutomator (Hierarchie-Abruf ca. 2,2 s selbst auf dem Launcher, ein Screenshot ca. 1,4 s, `waitForAnimationToEnd` = 2 Screenshots = ca. 3 s auch auf statischem Screen, Tap per testID = 2 Hierarchie-Abrufe = ca. 3,5-4,5 s, Kaltstart ca. 20 s).
**Entscheidung (vom Nutzer freigegeben, "Preview-APK" ausdrücklich abgelehnt):**
- Kein `waitForAnimationToEnd` mehr; stattdessen `assertVisible`/`assertNotVisible`/`extendedWaitUntil` auf konkrete testIDs (vorhandene testIDs genügten, keine App-Änderung).
- Tab-Wechsel per Punkt-Tap auf die Tab-Bar (`subflows/go-<tab>.yaml`, ca. 2 s schneller als Label-Tap) mit Screen-testID-Assertion.
- `subflows/ensure-app.yaml` ersetzt den Kaltstart am Flow-Anfang: Relaunch nur, wenn die Tab-Bar nicht sichtbar ist (zwei `back`, dann `launch.yaml`). Echte Kaltstarts bleiben für `login`, `auth-screens` (Login), `deeplinks`.
- Der Runner setzt `window_animation_scale`/`transition_animation_scale`/`animator_duration_scale` auf 0 und stellt die vorher gelesenen Werte per `trap` wieder her (ursprünglich nicht gesetzt = `delete`).
- `.maestro/areas.json` + `scripts/maestro-areas.py` + `docs/maestro-areas.md`: Bereiche -> Flows und Quellpfad-Muster -> Bereiche; `scripts/maestro-all.sh --area/--changed/--smoke/--list-areas`. Ohne Flag weiterhin voller Lauf.
- Flow-Bugfixes: `tabs-tour` Screenshot 01 zeigte die Watchlist (jetzt `go-tracker` + Tracker-only-Element); `movie-detail` tippte per Text "Inception" ins Suchfeld statt aufs Ergebnis (Detail öffnete nie) -> Tap per testID `add-movie-film-grid-item-27205`.
- **Prozess-Doku:** Alle Arbeitsprozess-Regeln stehen gebündelt in `docs/working-process.md` (Pointer in `CLAUDE.md`).
- **Änderung später:** Alles rein Test-Infrastruktur; Rückbau = Flows auf `launch.yaml` zurück, Runner-Flags entfernen.
- **Status:** Offen fuer deine Pruefung.

## Toast-Varianten (grün/rot), Touch-Targets (48dp), Bewertungs-Sterne enger

- **Toasts:** `showToast(msg, { variant })` mit `success` (grün: `bg-success/15`, Border `success/40`, Text `success-text`, Icon check-circle), `error` (rot: gleiche Danger-Tokens, Icon error) und `info` (neutral, Standard, Accent-Border). Neue Tokens `success` `#2e9e5b` / `success-text` `#5fcf8a` in `tailwind.config.js`. Alle Speichern/Hinzufügen-Toasts sind `success`; alle Fehlerpfade (Bewertung speichern/zurücksetzen, Watchlist-Add, Zahlung, Gruppe umbenennen, Farbthema, Erscheinungsdatum, Anzeigename) zeigen jetzt einen roten Fehler-Toast statt `Alert.alert` bzw. gar kein Feedback. Realtime-Hinweise und "Wird bald ergänzt" bleiben `info`. Error-Toasts haben `accessibilityLiveRegion="assertive"`.
- **Touch-Targets:** `src/components/ui/touchTarget.ts` (`MIN_TOUCH_TARGET` 48, `MIN_TOUCH_TARGET_IOS` 44, `hitSlopFor`). Kleine Controls behalten ihre Optik und bekommen `hitSlop` (Button sm/xs, Chip, Reset-Icon, Payer-Pillen) oder eine 48er Touch-Box um das kleine Visual (View-Mode-Segmente, "+" im MovieGrid). Sheet-Schließen-X jetzt 48 statt 44 (a11y-Label "Schließen").
- **Sterne:** Touch-Box 44x48 statt 48x48 (Glyph bleibt 40, Lücke 8 -> 4dp); 5 Sterne + Herz + Reset = 300dp passt in 328dp Inhaltsbreite eines 360dp-Phones. 44 breit = iOS-Minimum; Android-Soll 48 wird in der Breite bewusst um 4dp unterschritten (kein Overlap-hitSlop), Höhe 48. Zahl hinter den Sternen im Bewertungsdialog (Gruppenzeilen) entfernt (`MemberRatingRow hideValue`).
- **Änderung später:** `STAR_TOUCH_WIDTH` auf 48 setzen (Reset-Button dann ggf. umbrechen); Farben nur in `tailwind.config.js`/`Toast.tsx` (`TOAST_VARIANT_STYLES`).
- **Status:** Offen für deine Geräte-Prüfung.

## Brand-Assets: Legacy-Icon, Splash mit Verlauf

- **Icon:** Das Glyph (goldener Ring + Mittelpunkt + drei gedimmte Punkte auf `#0a0a0a`) stammt aus dem Legacy-Icon (`filmkritiker/icon-512.png`, nur lesend). Geometrie/Farben wurden vermessen und in `scripts/generate-brand-assets.py` als Vektor neu gezeichnet (Legacy-PNG hat nur 512px). Ausgabe: `icon.png` 1024, Adaptive-Layer (Ring = 55 % der Fläche, innerhalb der 61 %-Safe-Zone), Monochrom (weiss), `splash-icon.png`, `favicon.png`, `splash-bg.png`. `ios.icon` (Expo-Template `expo.icon`) entfernt, iOS nutzt `icon.png`.
- **Splash:** Nativ schwarz (`#000000`) + Glyph (`imageWidth` 288, Android-12-Splash kann nur zentriertes Icon, keinen Vollbild-Verlauf; iOS-Vollbild ungetestet, daher gleich). In-App (`AnimatedSplashOverlay`): `splash-bg.png` (schräger Verlauf, oben links `#2c2c2c` nach Schwarz unten rechts) + Glyph. Kein `expo-linear-gradient` (nicht installiert) -> vorgerenderte Grafik.
- **Verlauf:** linear (35 Grad) statt radial: gleichmässigeres diagonales Auslaufen wie gewünscht, radial lässt oben rechts einen Lichtfleck. Vorschau beider Kandidaten im Scratchpad.
- **Änderung später:** Konstanten in `generate-brand-assets.py` ändern (`--kind radial`, `lift`) und neu ausführen. Icon/nativer Splash brauchen einen neuen EAS-Build.

## Material-3-Switch (`SwitchIndicator`) und Auth-Links mit lesbarer Farbe

- **Switch:** Der alte Toggle hatte einen dunklen Daumen (`bg-bg-primary`) auf Gold und wirkte kaputt. Neu: `src/components/ui/Switch.tsx` (`SwitchIndicator`), Track 52x32; an = Accent-Track + heller 24dp-Daumen (`text-primary`), aus = grau umrandeter Track + 16dp-Daumen. Bewusst ein eigener Baustein statt React Natives `Switch`: der Android-`Switch` ist ein M2-Control (duenner Track) und nicht M3. Alle Switch-Zeilen laufen ueber `SettingsToggleRow` (Darstellung, Benachrichtigungen, Gruppe verwalten "Einladungen aktiv"). Streaming-Dienste sind Chips (`checkbox`), keine Switches. Aenderung spaeter: nur `Switch.tsx`.
- **Auth-Links:** `className` auf expo-routers `<Link>` erreicht den Text nicht -> Standard-Schwarz auf dunkler Karte. Jetzt `<Link asChild><Pressable><Text className="text-accent-light"/></Pressable></Link>` (48dp Touch-Hoehe).

## Hintergrund v2: Original-Foto, Höhen-Fit, horizontaler Swipe-Parallax

- **Ursache der Pixeligkeit:** `cinema-bg.jpg` war ein 720x1280-Graustufen-Ausschnitt (32 KB), auf ca. 3100 px Bildschirmhöhe hochskaliert. Jetzt das unveränderte Original der Legacy-App (Unsplash `photo-1478720568477-152d9b164e26?w=1920&q=80`, 1920x1280 Farb-JPEG, 426831 Byte, byte-genau, nicht neu kodiert/optimiert).
- **Dimmen ohne Neukodierung:** `mixBlendMode: "luminosity"` + `opacity` 0.6 (`BG_IMAGE_OPACITY`) über dem dunklen App-Hintergrund (wie Legacy `mix-blend-mode: luminosity`; ergibt Graustufen, Helligkeit etwa wie das alte vorgedimmte Asset).
- **Layout:** Foto auf 100 % Bildschirmhöhe (Skalierung = Höhe / 1280), kein vertikaler Overscan, kein Zoom, kein vertikaler Parallax (Scroll-Link entfernt, `useParallaxScroll` ist No-Op). Schmalere Bilder als der Bildschirm: Cover-Fallback ohne negativen Spielraum.
- **Parallax:** nur horizontal, Positionen aus der Tab-Anzahl N (sichtbare Tabs): Tab 0 = translateX `-BG_PARALLAX_EDGE_INSET_DP` (40 dp, ca. 140 px auf dem Pixel 6 Pro; Projektor-Anfang bleibt sichtbar), letzter Tab = `-(Spielraum - 40)` (Linse sichtbar), Mitte zentriert, dazwischen linear (`tabPanFraction`); Inset auf Spielraum/2 geklemmt. Pixel 6 Pro (Spielraum 926 dp): Weg vorher 926 dp (0 bis -926), jetzt 846 dp (-40 bis -886). Position folgt dem Wisch live (`TabSwipeView`: Pan-Update als UI-Thread-Worklet schreibt `tabProgress`), Tab-Leiste/Loslassen glättet mit 600 ms. Wisch-Schwellen (`src/lib/tabSwipe.ts`, `shouldCommitSwipe`): Wechsel bei Weg > 18 % Bildschirmbreite ODER Fling > 550 px/s in Wischrichtung (min. 24 dp Weg); Pan aktiviert ab 10 dp horizontal, bricht bei 15 dp vertikal ab (vorher 60 px Mindestweg, 25/20). Nicht-Tab-Screens behalten die letzte Position.

## Glas sichtbar ueber dem Vollfoto-Hintergrund

- **Ursache:** Blur-Radius war nur 30/4 = ~7px (zu schwach gegen das scharfe Vollfoto), Tints nur .5-.62; bei "Kommt noch" lag `opacity-50` auf der ganzen Karte inkl. Glas-Flaeche.
- **Aenderung:** `GLASS_BLUR_INTENSITY` = 100 (25px) fuer alle GlassBlur/Sheet; Tints angehoben (siehe style-guide); Dim nur noch auf Inhaltsschicht (`WatchlistPosterCard` `*-content`).
- **Fallback, falls Blur auf dem Geraet weiter fehlt:** dichterer Tint reicht fuer Lesbarkeit; Ursache dann wohl `mixBlendMode` im Blur-Target.
- **Status:** Geraete-Pruefung offen (Pixel 6 Pro nicht erreichbar).

## Toast-X, Loeschen rechts, nativer M3-Switch

- **Toast/Trailer-X:** Sprachdiktat "Poster" gedeutet als Toasts (bleiben zu lange stehen): jeder Toast hat ein 48dp-Schliessen-X (`toast-close`); zusaetzlich X am Trailer-Player (`movie-detail-trailer-close-button`), vorher gab es keins.
- **Loeschen immer rechts/zuletzt:** Tracker-Flyout (`Speichern | Loeschen`) und Film-Aktionsleiste (`filmreihe` vor `loeschen`) umsortiert; Regel in style-guide + working-process.
- **Switch:** `@expo/ui` (seit 2026-09-19 in package.json, Native-Modul `expo.modules.ui.ExpoUIModule` inkl. `SwitchView` im installierten Dev-Client) -> auf Android echter M3-Compose-Switch in Gruppen-Akzentfarbe, kein neuer Build noetig. Fallback (iOS/Jest/Web) = `FallbackSwitch`, M3-exakt (Check-Icon, 28dp pressed, State-Layer, disabled). Kein RN-Core-`Switch` (M2).

## Button-Icons ueberall, Zahler-Hinweis nur im Zahlungs-Modal

- **Button-Icons:** Jeder beschriftete Aktions-`Button` hat ein fuehrendes Material-Icon (`icon`-Prop, Rolle aus `Icon.tsx`; Farbe/Groesse automatisch nach Variante/`size`). Neue Rollen: `login`, `next`, `share`, `regenerate`, `reset`, `send`, `register`, `leave`, `removeMember`, `change`. Ausnahmen: Chips/Pillen/Segmente/Listenzeilen/Tabs/Textlinks, `iconOnly`, Gruppen-Umschalter in Gruppen-Einstellungen. Durchgesetzt per `__tests__/buttonIcons.test.ts`. Tabelle: `docs/style-guide.md` "Button-Icons".
- **Zahler-Hinweis:** Ursache fuer "heute" im Tracker-Flyout: der Hinweis nahm das letzte `paid_at` des Mitglieds ueber ALLE Eintraege (inkl. des bearbeiteten, hier 15.10.2026 = Zukunft) und `daysSincePayment` klemmte `diff <= 0` auf "heute". Entscheid: im Bearbeiten-Flyout entfaellt der Hinweis ganz (das eigene Datum steht im Datumsfeld); im "Zahlung erfassen"-Modal (nur unbezahlte Filme, also nur fruehere Zahlungen) bleibt er, explizit beschriftet ("zuletzt bezahlt: vor 3 Tagen" / "... gestern" / "... heute" / "noch nie bezahlt"; Zukunftsdatum als absolutes Datum). Zweck laut Legacy (`daysSince()`): Hilfe, wer als naechstes dran ist. Aenderung spaeter: `lastPaidHint` in `trackerLogic.ts`.

## Motion: gestaffeltes Einblenden auch beim Tab-Wechsel

- **Bestand:** Beim Ansichtswechsel (Sheet/Tile/Liste) remountet die FlatList (`key={viewMode}`); jeder Eintrag (`FadeInItem`) blendet 220 ms (RN Animated, Standard-Easing inOut(ease), Native-Driver) mit 40 ms Versatz pro Index (max. Index 8) ein.
- **Neu:** dieselbe Animation beim Tab-Wechsel. Tabs bleiben gemountet, daher Replay ueber `TabSwitchContext` (Epoche nur bei Tab-zu-Tab-Wechsel, `nextTabSwitchState`) + `FadeInItem replayTab`. Tracker-Zeilen bekommen ebenfalls `FadeInItem`. Konstanten zentral in `src/lib/motion.ts`; Reduce-Motion = keine Animation.
- **Aenderung spaeter:** nur `motion.ts` (Werte) bzw. `FadeInItem`/`_layout.tsx` (Trigger). Siehe style-guide "Motion".

## Highlight-Farbe folgt überall dem Gruppen-Theme

- **Anlass:** Bei Theme Rot blieben einzelne Stellen gelb (Reel-Icon in Header/Brand, Chevron-Pfeile in Settings-Zeilen, Watchlist-Bookmark im Grid, Zurück-Pfeil/Titel der Modal-Header, Navigation-`primary`), weil sie feste Hex-Werte hatten.
- **Entscheid:** Alle Highlight-/Brand-Akzente laufen über Theme-Tokens: Klassen `accent*` (CSS-Variablen aus `global.css`, inkl. `accent-aNN`) bzw. `useGroupTheme().colors.*` für Props, die einen Hex brauchen. Navigation-Theme-Farben in `src/lib/navTheme.ts` (Root = Gold-Default, `(app)/_layout.tsx` setzt den Akzent der aktiven Gruppe).
- **Bewusste Ausnahmen (bleiben fix):** Danger rot, Success grün, Like-Herz rosa, Gesehen-Auge grün, TMDB-Badge; Splash/App-Icon-Assets (statisches Brand-Gold, laufen vor jeder Gruppe); Auth-/Onboarding-Screens ohne Gruppe (Gold-Default). Sterne folgen dem Theme-Token `star-color` (bestehende Regel, Gold = `#FFD700`, andere Themes = Akzent).
- **Durchsetzung:** `__tests__/theme/noHardcodedAccent.test.ts` scheitert, wenn Gold-Hex/gelbe Tailwind-Klassen in `src/` ausserhalb von `groupTheme.ts`/`global.css` auftauchen; Komponententests in `__tests__/theme/`. Geräte-Tour: Flow `theme-tour` (Rot, Blau-Stichprobe, Gold wird per `onFlowComplete` wiederhergestellt).

## Sterne fest gelb, Header weiss, Logo wechselt Gruppe

- **Anlass:** Nutzerwunsch nach der Theme-Umstellung: Sterne sollen wie vorher immer gelb sein; Header-Schriftzug, Gruppenname und Icon immer weiss; Tippen aufs Logo wechselt die Gruppe.
- **Entscheid:** `starColor` ist in allen Themes `#FFD700` (`STAR_YELLOW` in `groupTheme.ts`, `--color-star` in `global.css`; der alte Gold-Wert aus dem Theme-Gold-Eintrag). `AppHeader`/`Brand`: Schriftzug `text-white`, Icon `#ffffff`, Gruppenname weiss (wird aus der aktiven Gruppe gelesen, wenn keine `groupName`-Prop kommt). Logo-Tap (`useGroupQuickSwitch`, `nextGroupId` in `src/lib/groupCycle.ts`) setzt `activeGroupId` (persistiert wie im Gruppen-Switcher, Store-Write synchron = optimistisch), Info-Toast mit neuem Gruppennamen; bei nur einer Gruppe Toast "Nur eine Gruppe". Trennlinien bleiben `glass-border` (neutral).
- **Aenderung spaeter:** Sternfarbe nur `STAR_YELLOW`/`global.css`; Toast-Texte im Hook; Header-Farben in `AppHeader.tsx`/`Brand.tsx`.

## Zurück-Wischgeste: Navigations-Stack, Android-BackSwipeView, Ähnliche Filme ersetzt statt stapelt

- **Befund:** Der Android-Systemgest (Kantenwisch) und die Hardware-Zurück-Taste funktionieren (per Gerät verifiziert, `enableOnBackInvokedCallback=false`), starten aber nur direkt am Bildschirmrand. Das erwartete "von links nach rechts irgendwo wischen" gab es nicht (iOS: `(modals)` war als `presentation: "modal"` eingebunden, dort hat der erste Screen keine Zurück-Wischgeste).
- **Entscheidung:** (1) `(modals)` im `(app)`-Stack ist eine normale Karte statt "modal". (2) `(modals)`-Stack: `gestureEnabled` + `fullScreenGestureEnabled` (iOS Vollbild-Wisch). (3) Android: `BackSwipeView` (`src/components/BackSwipeView.tsx`, Pan aus der linken 25 % der Breite, Logik `src/lib/backSwipe.ts`) per `modalScreenLayout` um jeden `(modals)`-Screen. (4) `useSafeBack` für eigene Zurück-Buttons (Fallback `replace("/")` ohne History, z.B. Deep-Link). (5) Ähnliche Filme: Tipp auf einen Film nutzt `router.replace` statt `push`, damit Zurück vom ähnlichen Film direkt im Detail des vorherigen Films landet, dann beim Ursprung.
- **Aenderung spaeter:** Zone/Schwellen nur in `src/lib/backSwipe.ts`; Raster in "Ähnliche Filme" erhalten = in `similar/[tmdbId].tsx` `replace` wieder auf `push`; `presentation: "modal"` wieder in `(app)/_layout.tsx` (dann ohne iOS-Wisch am ersten Screen).

## ESLint: eslint-config-expo (flat config)

- **Anlass:** `npm run lint` (`expo lint`) war ohne Config/Pakete faktisch tot (R2 in `docs/code-health-r-items.md`). Nutzer hat `eslint-config-expo` als devDependency freigegeben.
- **Entscheidung:** devDependencies `eslint` (^9) + `eslint-config-expo` (~57.0.2, passend zum SDK); `eslint.config.js` (flat) = `eslint-config-expo/flat` + Ignores (`dist`, `.expo`, `node_modules`, `supabase/functions`). Keine eigenen Zusatzregeln, keine Regel-Abschaltungen, kein Auto-Fix über die Codebase. `react-native/no-inline-styles` ist in der Expo-Config nicht enthalten (kein Plugin) und wurde nicht ergänzt.
- **Aenderung spaeter:** Regeln/Ignores nur in `eslint.config.js`; Schärfen (z. B. no-require-imports in Tests, no-inline-styles-Plugin) ist eine eigene Entscheidung.

## Tooling — ESLint: `no-require-imports` und `import/first` nur in `__tests__/**` aus

**Entscheidung (vom Nutzer freigegeben):** In `eslint.config.js` sind `@typescript-eslint/no-require-imports` und `import/first` per Flat-Config-Override ausschließlich für `__tests__/**` deaktiviert. Grund: Jest-Tests nutzen `jest.mock()` + `require()` nach Mocks bzw. Imports hinter Mock-Aufrufen; das ist dort idiomatisch, die Regeln erzeugten nur Rauschen (Lint auf `__tests__`: 381 Probleme -> 37, 3 Errors bleiben anderer Art).

**Folgen einer Änderung:** Override entfernen -> Warnungen/Errors in Tests kehren zurück. Produktionscode (`src/**`) ist unverändert streng geprüft.

## R3/R4 — Tagebuch/Watchlist: Controller-Hooks, Sektionskomponenten, gemeinsame Filter-Logik

**Entscheidung (Nutzer hat R3/R4 freigegeben):** Reiner Refactor ohne Verhaltens-/Optikaenderung. `useTagebuchScreen`/`useWatchlistScreen` (src/hooks/) halten den View-State, gemeinsamer Filter-State in `useEntryFilters(tab, groupId, defaultSort)`; JSX in `src/components/{tagebuch,watchlist}/` (FilterPanel, EntryList, SortSheet) plus geteilte Pill-Reihen in `src/components/entries/EntryFilterPills.tsx` (per `testIDPrefix`, Maestro-testIDs unveraendert). Reine Helfer in `lib/entryFilters.ts` und `lib/dateFormat.ts` (`formatPlainDate(date, fallback)`; `formatSeenAtDate`/`formatDateForInput` delegieren). Sort-Sheets nicht geteilt, weil testIDs/Accessibility-Props je Screen verschieden sind und identisch bleiben muessen; `watchlistDateBadge.formatDate` nicht umgestellt (pad2-Verhalten).

## Abmelden: erst nach /(auth)/login navigieren, dann signOut (Android ScreenStackFragment-Crash)

**Problem:** Auf Android crashte der Tipp auf "Abmelden" (Maestro `auth-screens`) mit `IllegalStateException: ScreenStackFragment added into a non-stack container` (react-native-screens, `ScreenStackHeaderConfig.onUpdate`).

**Ursache (per Bisect auf dem Pixel 6 Pro):** Nicht die Layouts. Weder das Vereinheitlichen des Root-`screenLayout` noch dessen Entfernen noch das Entfernen des `(modals)`-`screenLayout` behob den Crash. Ursache war die Reihenfolge: `signOut()` leert Query-Cache und Gruppen-Theme (Header-Farben der `(modals)`-Stack-Screens aendern sich), waehrend der Stack noch gemountet ist und erst danach per `router.replace("/")` abgebaut wird -> Header-Update auf einem gerade entfernten Screen.

**Entscheidung:** `handleSignOut` in `settings.tsx` navigiert zuerst (`router.replace("/(auth)/login")`), dann `await signOut()`; das nachgelagerte `replace("/")` entfaellt. Optik unveraendert, Layouts unveraendert. Jest prueft die Reihenfolge (`__tests__/screens/Settings.test.tsx`).

**Folgen einer Aenderung:** Die gleiche Reihenfolge-Falle besteht potenziell in `settings/delete-account.tsx` (signOut, dann `replace("/")`); dort bisher kein Crash beobachtet, nicht angefasst.
