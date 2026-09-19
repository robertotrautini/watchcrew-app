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

Neue Einträge werden von den Implementierungs-Subagents laufend ergänzt, sobald weitere Milestones reversible Detailentscheidungen treffen.
