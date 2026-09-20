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

**Status:** Offen für deine finale Bestätigung / Änderungswunsch.

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

Neue Einträge werden von den Implementierungs-Subagents laufend ergänzt, sobald weitere Milestones reversible Detailentscheidungen treffen.
