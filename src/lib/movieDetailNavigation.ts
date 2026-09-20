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
 * `as never` on `pathname` is a temporary cast — `.expo/types/router.d.ts`
 * (Expo Router's typed-routes generation) hasn't been regenerated since
 * the M6-part-2b routes landed, so this literal isn't in its type union
 * yet. Drop the cast once `npx expo` (or a dev-server run) regenerates it.
 */
export function navigateToDirectorFilmography(router: Router, personId: number): void {
  router.push({
    pathname: "/filmography/director/[personId]" as never,
    params: { personId: String(personId) },
  });
}

/**
 * Real M6-part-2b route: `src/app/(app)/(modals)/filmography/actor/[personId].tsx`.
 * See `navigateToDirectorFilmography` for the `as never` rationale.
 */
export function navigateToActorFilmography(router: Router, personId: number): void {
  router.push({
    pathname: "/filmography/actor/[personId]" as never,
    params: { personId: String(personId) },
  });
}

/**
 * Real M6-part-2b route: `src/app/(app)/(modals)/collection/[collectionId].tsx`.
 * See `navigateToDirectorFilmography` for the `as never` rationale.
 */
export function navigateToCollection(router: Router, collectionId: number): void {
  router.push({
    pathname: "/collection/[collectionId]" as never,
    params: { collectionId: String(collectionId) },
  });
}

/**
 * Real M6-part-2b route: `src/app/(app)/(modals)/similar/[tmdbId].tsx`.
 * See `navigateToDirectorFilmography` for the `as never` rationale.
 */
export function navigateToSimilarMovies(router: Router, tmdbId: number): void {
  router.push({
    pathname: "/similar/[tmdbId]" as never,
    params: { tmdbId: String(tmdbId) },
  });
}

/**
 * PLACEHOLDER — coordinate exact path with M7 (rating dialog) task, this
 * route does not exist yet.
 */
export function navigateToRatingDialog(router: Router, watchlistEntryId: string): void {
  router.push({
    pathname: "/movie/rate/[watchlistEntryId]" as never,
    params: { watchlistEntryId },
  });
}

/**
 * PLACEHOLDER — coordinate exact path with M7 (edit flow) task, this route
 * does not exist yet.
 */
export function navigateToEditFlow(router: Router, watchlistEntryId: string): void {
  router.push({
    pathname: "/movie/edit/[watchlistEntryId]" as never,
    params: { watchlistEntryId },
  });
}
