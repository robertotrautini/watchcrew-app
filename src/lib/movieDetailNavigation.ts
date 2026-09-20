import { useRouter } from "expo-router";

/**
 * Centralizes navigation targets pushed from the movie-detail overlay
 * screen (`src/app/(app)/(modals)/movie/[tmdbId].tsx`, M6 part 1).
 *
 * Some targets are REAL, already-landed sibling routes from the parallel
 * M6 part 2b task (director/actor filmography, collection, similar
 * movies) — these push to their actual file-based route paths. Others
 * (rating dialog, edit flow) are genuine M7 placeholders: those screens
 * don't exist yet, so their paths are best-effort guesses that MUST be
 * confirmed against the real M7 route once it lands.
 *
 * `Router` is derived from `useRouter()`'s return type since `expo-router`
 * does not export a plain `Router` type of its own.
 */
type Router = ReturnType<typeof useRouter>;

/**
 * Real M6-part-2b route: `src/app/(app)/(modals)/filmography/director/[personId].tsx`.
 *
 * No `as never` cast needed (M6-Cleanup pass) — `.expo/types/router.d.ts`
 * has been regenerated since the M6-part-2b routes landed, and this literal
 * now type-checks against `tsc` cleanly.
 */
export function navigateToDirectorFilmography(router: Router, personId: number): void {
  router.push({
    pathname: "/filmography/director/[personId]",
    params: { personId: String(personId) },
  });
}

/**
 * Real M6-part-2b route: `src/app/(app)/(modals)/filmography/actor/[personId].tsx`.
 */
export function navigateToActorFilmography(router: Router, personId: number): void {
  router.push({
    pathname: "/filmography/actor/[personId]",
    params: { personId: String(personId) },
  });
}

/**
 * Real M6-part-2b route: `src/app/(app)/(modals)/collection/[collectionId].tsx`.
 */
export function navigateToCollection(router: Router, collectionId: number): void {
  router.push({
    pathname: "/collection/[collectionId]",
    params: { collectionId: String(collectionId) },
  });
}

/**
 * Real M6-part-2b route: `src/app/(app)/(modals)/similar/[tmdbId].tsx`.
 */
export function navigateToSimilarMovies(router: Router, tmdbId: number): void {
  router.push({
    pathname: "/similar/[tmdbId]",
    params: { tmdbId: String(tmdbId) },
  });
}

// M7 consolidation (Item 2, see docs/interim-decisions.md): the former
// `navigateToRatingDialog`/`navigateToEditFlow` placeholders (pointing at a
// `/movie/rate/[watchlistEntryId]` route that never existed) were removed
// here entirely — the real `RatingDialog` is now rendered directly by
// movie/[tmdbId].tsx as a controlled overlay instead of a separate route,
// matching that screen's own delete-confirmation `Sheet` convention. See
// src/components/movie/MovieDetailActionsBar.tsx's `onOpenRatingDialog`/
// `onDirectRateEntryCreated` callback props for the replacement wiring.
