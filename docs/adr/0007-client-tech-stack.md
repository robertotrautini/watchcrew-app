# 0007 — Client-Tech-Stack (Sprache, State, UI, Navigation)

**Status:** Entschieden (2026-09-19)

## Kontext

Für die React-Native/Expo-App (siehe ADR 0001) musste der vollständige Client-seitige Tech-Stack festgelegt werden: Sprache, Server-State-Management, Client-/UI-State-Management, lokale Persistenz, Navigation, Paketmanager, Komponentenbibliothek/Styling und Internationalisierung. Dies wurde in derselben Grill-Session am 2026-09-19 vollständig durchgesprochen und explizit einzeln bestätigt.

## Entscheidung

- **Sprache:** TypeScript.
- **Server-State:** TanStack Query (passt zu Supabase; liefert außerdem das "Stufe 1"-Offline-Read-Cache-Verhalten, siehe unten).
- **Client-/UI-State:** Zustand (für rein lokalen State: Sortier-/Filter-Auswahl, temporäre Rating-Widget-Werte während ein Dialog offen ist, aktive Gruppe, Feature-Flags — das Äquivalent zum alten `state.js`).
- **Lokale Persistenz (überlebt App-Neustart, Äquivalent zu `localStorage`):** MMKV (nicht AsyncStorage) für Präferenzen; Expo SecureStore für das Supabase-Auth-/Session-Token.
- **Navigation:** Expo Router (dateibasiert, baut auf React Navigation auf, automatisches Deep-Linking für Push-Notification-Ziele).
- **Paketmanager:** npm (identisch zum bestehenden `filmkritiker`-Repo, kein neues Tooling).
- **Komponentenbibliothek:** React Native Reusables (shadcn/ui-Stil — Komponenten werden als eigener Source-Code ins Repo kopiert, nicht als opakes Paket installiert), gepaart mit **NativeWind** fürs Styling.
- **Realtime:** siehe ADR 0006 (Supabase Realtime, v1-Scope).
- **Internationalisierung:** Deutschsprachiger Content für v1, aber von Anfang an über eine i18n-Bibliothek (z. B. react-i18next) verdrahtet, sodass eine zweite Sprache nur eine neue Übersetzungsdatei erfordert, kein Rewrite.

**Explizite Ausnahme von der "Zero-autonome-Entscheidungen"-Regel:** Claude hat ausdrücklich die Standing-Erlaubnis, während der Implementierung auch englische Übersetzungen von UI-Texten direkt selbst zu erstellen (ohne separate Grill-Runde pro String), sobald tatsächlicher UI-Text geschrieben wird — dies ist eine bewusst eng begrenzte Ausnahme, keine generelle Freigabe.

## Begründung

- **TanStack Query statt eigenem Fetch-Wrapper:** deckt Server-State inkl. Caching/Invalidierung/Refetch strukturiert ab und ersetzt damit das alte manuelle `cache.movies[group]` + `invalidateCache()`-Muster aus `js/api.js` durch ein etabliertes Pattern; liefert nebenbei den "Stufe 1"-Offline-Modus (siehe Scope-Hinweis in ADR 0013/README) ohne zusätzliche Bibliothek.
- **Zustand statt Redux/Context:** leichtgewichtig genug für rein lokalen UI-State, ohne den Boilerplate größerer State-Management-Lösungen — passt zur Größe des Projekts (Solo-Entwickler, Spare-Time-Projekt).
- **MMKV statt AsyncStorage:** schneller, synchroner Zugriff, verbreiteter 2026er-Standard für RN-Apps mit gutem Expo-Config-Plugin-Support.
- **SecureStore explizit nur für das Auth-Token:** Trennung von "normale Präferenzen" (MMKV, unverschlüsselt ausreichend) und "sicherheitskritischer Session-Token" (SecureStore, OS-Keychain-gestützt).
- **Expo Router statt reinem React Navigation:** dateibasiertes Routing plus automatisches Deep-Linking passt gut zum Push-Notification-Deep-Link-Bedarf (siehe ADR 0006) und ist 2026 der von Expo empfohlene Default.
- **React Native Reusables statt gluestack-ui:** maximale Styling-Kontrolle über den eigenen, unverwechselbaren App-Look war Robin wichtig — Copy-in-Source-Komponenten lassen sich freier anpassen als eine Blackbox-Paket-Bibliothek.
- **NativeWind:** im Rahmen der Recherche als 2026er-Mainstream-Standard für neue RN-Apps bestätigt (nicht als Nischen-Wahl), passt außerdem konzeptionell gut zu React Native Reusables.
- **i18n von Anfang an, auch bei Deutsch-only-Content:** vermeidet einen späteren String-Extraktions-Rewrite, falls doch mal eine zweite Sprache gebraucht wird — geringer Mehraufwand jetzt gegen potenziell großen Aufwand später.

## Konsequenzen

- Jede neue Bibliotheks-/Tooling-Entscheidung, die NICHT in dieser Liste steht, fällt unter die harte "Zero-autonome-Entscheidungen"-Regel (siehe CLAUDE.md) und muss Robin explizit vorgelegt werden, bevor sie verwendet wird — auch scheinbar offensichtliche Ergänzungen.
- Alle sichtbaren UI-Strings laufen von Anfang an durch die i18n-Bibliothek, auch wenn v1 nur Deutsch ausliefert.
- Server-seitige Datenabfragen (Filme, Ratings, Gruppen) laufen ausschließlich über TanStack-Query-Hooks gegen Supabase; rein lokale UI-Zustände laufen über Zustand-Stores — diese Trennung ist strukturell einzuhalten, nicht optional.
