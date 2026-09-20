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

Neue Einträge werden von den Implementierungs-Subagents laufend ergänzt, sobald weitere Milestones reversible Detailentscheidungen treffen.
