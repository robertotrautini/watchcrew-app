# Maestro-Bereiche (Use-Case-Areas)

Ziel: nach einer Änderung nur die Flows laufen lassen, die dazu passen. Maschinenlesbare Quelle: `.maestro/areas.json` (Bereiche -> Flows, Quellpfad-Muster -> Bereiche), ausgewertet von `scripts/maestro-areas.py` und `scripts/maestro-all.sh`.

## Aufruf

```
scripts/maestro-all.sh                    # ALLE Flows (Default ohne Flag)
scripts/maestro-all.sh --list-areas       # Bereiche -> Flows
scripts/maestro-all.sh --area tracker     # ein oder mehrere Bereiche: --area tracker,rating
scripts/maestro-all.sh --changed          # Bereiche aus git (read-only: diff HEAD + staged + status) abgeleitet
scripts/maestro-all.sh --changed --base main
scripts/maestro-all.sh --smoke            # login, tabs-tour, movie-detail (Add-Movie-Pfad), tracker-payment (Schreibzyklus)
scripts/maestro-all.sh tracker-payment    # einzelne Flows (nur beim Flow-Entwickeln)
```

`--changed`: cross-cutting Datei (Abschnitt `full` in areas.json, z.B. Root-Layout, Supabase-Client, package.json, Subflows) => voller Lauf. Datei ohne Muster => Smoke + Warnung (Muster in areas.json ergänzen). Nur Tests/Docs geändert => keine Flows. Geänderte `.maestro/flows/<x>.yaml` => dieser Flow. Die Reihenfolge ist immer die kanonische des Runners; ein Flow läuft nie doppelt.

## Bereiche

| Bereich | Flows | Typische Pfade |
|---|---|---|
| auth | login, auth-screens | `src/app/(auth)/**`, `lib/auth*.ts` |
| onboarding | create-test-group, onboarding-explore | `src/app/(onboarding)/**`, `lib/groups.ts` |
| navigation | tabs-tour | `(tabs)/_layout.tsx`, `TabBarButton`, `AppHeader`, `TabSwipeView` |
| navigation-back | back-navigation | `BackSwipeView`, `backSwipe.ts`, `useSafeBack`, `(app)/_layout`, `(modals)/_layout`, `Sheet` |
| tracker | tracker-payment | `(tabs)/tracker.tsx`, `Tracker*`, `PaymentModal`, `trackerLogic` |
| watchlist | watchlist-filter-sort, watchlist-open-detail, watchlist-add-remove | `(tabs)/watchlist.tsx`, `WatchlistPosterCard`, `watchlist*.ts`, `listFilters` |
| tagebuch | tagebuch-filter-sort | `(tabs)/tagebuch.tsx`, `Diary*`, `listFilters` |
| movie-detail | movie-detail, movie-detail-full, movie-collection, watchlist-open-detail | `(modals)/movie/**`, `MovieDetail*`, `similar/`, `collection/`, `filmography/` |
| add-movie | add-movie-modes, movie-detail, watchlist-add-remove | `(modals)/add-movie.tsx`, `MovieGrid`, `addMovieLogic` |
| rating | rating-cycle | `RatingDialog`, `StarRating`, `ratingLogic`, `useSaveRating` |
| settings | settings-edit | `(modals)/settings*`, `components/settings/**`, `profile.ts` |
| toasts | toasts | `ui/Toast.tsx`, `lib/toast.ts` |
| group-settings | group-settings-edit | `(modals)/group-settings.tsx`, `groupTheme.ts`, Theme-Provider |
| offline-deeplinks | deeplinks, offline-banner | `app/join/**`, `app/auth/**`, `OfflineBanner`, `connectivity.ts` |
| theme | theme-tour | `global.css`, `groupTheme.ts`, `navTheme.ts`, Theme-Provider, `tailwind.config.js` |
| design-system (global) | tabs-tour, tracker-payment, watchlist-open-detail, movie-detail, group-settings-edit, theme-tour, auth-screens | `src/components/ui/**`, `tailwind.config.js`, `global.css`, `assets/**`, Konstanten/Theme-Hooks |

design-system ist die repräsentative Stichprobe über alle Screen-Typen (Tabs, Sheets, Detail, Settings/Themes, Auth). Ändert eine Änderung gemeinsame Komponenten tiefgreifend (z.B. Sheet, Glass, Backdrop auf allen Screens), danach zusätzlich den vollen Lauf.

## Wann voll, wann Bereich

- Bereichslauf (`--changed`): normale Feature-/Bugfix-Änderungen an einem Screen.
- Voller Lauf: cross-cutting/Shared-Komponenten, auf ausdrücklichen Wunsch, vor Meilensteinen.
- Neue Flows/Screens: in `areas.json` (Flows + Pfadmuster) und `scripts/maestro-all.sh` (`FLOWS`-Reihenfolge) eintragen und `docs/maestro-coverage.md` (Spalte Bereich) pflegen.

## Schnelle Flows: Bausteine

- `subflows/ensure-app.yaml`: Flow-Start ohne Relaunch, wenn die Tab-Bar sichtbar ist; sonst 2x back, dann Kaltstart (`launch.yaml`).
- `subflows/go-tracker|watchlist|tagebuch.yaml`: Tab per Punkt-Tap (17 / 50 / 83 % x, 96 % y) + Screen-testID-Assertion.
- Kein `waitForAnimationToEnd`: auf konkretes Zielelement warten (`assertVisible`, `assertNotVisible`, `extendedWaitUntil`).
- Runner stellt System-Animationen aus und danach per trap wieder her.
