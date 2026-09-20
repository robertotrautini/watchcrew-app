// M6 part 2a: pure business logic for the Movie-Detail-Overlay screen.
//
// Everything here is a pure function over already-fetched/normalized data —
// no Supabase/network access (that lives in `src/lib/movieDetail.ts`) and no
// React/React Query (that lives in `src/hooks/useMovieDetail.ts`). This file
// only decides WHAT the screen should show given already-known inputs
// (formatting, stored-vs-live precedence, which action buttons apply, etc.).

import type { GermanReleaseDate, TmdbMovieProviders } from "./movieDetailTypes";
import type { MovieGenreLink } from "./watchlistTypes";

// ============================================================================
// Runtime
// ============================================================================

/**
 * Formats a runtime in minutes as "Xh Ymin" (e.g. 125 -> "2h 5min").
 *
 * Interim decision: the hours component is always shown literally, even when
 * it's 0 (e.g. 45 -> "0h 45min"), for a simple, consistent format across all
 * runtimes — the spec's literal example format is "Xh Ymin", not a
 * conditionally-omitted variant. This is a reversible interim choice.
 */
export function formatRuntime(minutes: number | null): string | null {
  if (minutes == null) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Prefers `storedRuntime` when present, else falls back to `liveRuntime`.
 *
 * Interim decision: "present" uses a `!= null` check (not truthiness), so a
 * `storedRuntime` of exactly 0 still counts as present and is used as-is
 * rather than falling back to `liveRuntime` — 0 is a real (if unusual)
 * stored value, not "missing".
 */
export function pickRuntime(storedRuntime: number | null, liveRuntime: number | null): number | null {
  if (storedRuntime != null) {
    return storedRuntime;
  }
  return liveRuntime;
}

// ============================================================================
// Release date
// ============================================================================

/**
 * Picks the preferred release date to display. If a German release date is
 * present (the server already picked the single best-priority DE entry),
 * it's used, labeled with its literal category ("Kino"/"Digital"/"TV").
 * Otherwise, if only a generic fallback release date is present, it's used
 * with the German UI label "Erscheinungsdatum" (interim
 * translation-adjacent choice, per the project's narrow allowance for
 * producing German UI copy during implementation). Returns `null` if
 * neither is present.
 */
export function pickPreferredReleaseDate(
  germanReleaseDate: GermanReleaseDate | null,
  fallbackReleaseDate: string | null
): { label: string; date: string } | null {
  if (germanReleaseDate != null) {
    return { label: germanReleaseDate.category, date: germanReleaseDate.release_date };
  }
  if (fallbackReleaseDate != null) {
    return { label: "Erscheinungsdatum", date: fallbackReleaseDate };
  }
  return null;
}

// ============================================================================
// Genres
// ============================================================================

function mapGenreLinksToNames(fallbackGenreLinks: MovieGenreLink[] | null | undefined): string[] {
  return (fallbackGenreLinks ?? [])
    .map((link) => link.genres?.name)
    .filter((name): name is string => name != null);
}

/**
 * Prefers the live (TMDB-normalized) genre names once loaded — including an
 * empty array, since "loaded but has none" is a valid state once `details`
 * has loaded and shouldn't fall back to stale data. While not yet loaded
 * (`liveGenres` is null/undefined), falls back to mapping the stored
 * `movie_genres` join rows to their names, dropping any without a name.
 */
export function pickGenres(
  liveGenres: string[] | null | undefined,
  fallbackGenreLinks: MovieGenreLink[] | null | undefined
): string[] {
  if (liveGenres != null) {
    return liveGenres;
  }
  return mapGenreLinksToNames(fallbackGenreLinks);
}

// ============================================================================
// "Mehr anzeigen" (overview text) toggle
// ============================================================================

/** Show the "more" toggle only once the measured line count exceeds the allowed max. */
export function shouldShowMoreToggle(measuredLineCount: number, maxLines: number): boolean {
  return measuredLineCount > maxLines;
}

// ============================================================================
// "Alle Anbieter anzeigen" (streaming providers) toggle
// ============================================================================

function countNonEmptySections(providers: TmdbMovieProviders): number {
  return [providers.flatrate, providers.rent, providers.buy].filter(
    (section) => section.length > 0
  ).length;
}

function countTotalProviders(providers: TmdbMovieProviders): number {
  return providers.flatrate.length + providers.rent.length + providers.buy.length;
}

/**
 * Show the "Alle Anbieter anzeigen" toggle if more than 1 of the 3 provider
 * sections (flatrate/rent/buy) is non-empty, OR the total provider count
 * across all 3 sections is greater than 3. These two clauses are
 * independently OR'd (e.g. 2 sections with 1 item each show the toggle even
 * though the total is only 2).
 */
export function shouldShowAllProvidersToggle(providers: TmdbMovieProviders | null): boolean {
  if (providers == null) {
    return false;
  }
  return countNonEmptySections(providers) > 1 || countTotalProviders(providers) > 3;
}

// ============================================================================
// Action buttons
// ============================================================================

export type ActionButtonId =
  | "bewerten"
  | "bearbeiten"
  | "aehnliche"
  | "loeschen"
  | "filmreihe"
  | "zur_watchlist"
  | "direkt_bewerten";

export interface GetVisibleActionsContext {
  hasGroupContext: boolean;
  source: "watchlist" | "diary" | undefined;
  isReleased: boolean;
  isOnStreaming: boolean;
  hasCollection: boolean;
}

function getVisibleActionsWithGroupContext(context: GetVisibleActionsContext): ActionButtonId[] {
  const actions: ActionButtonId[] = [];
  if (context.source === "watchlist" && (context.isReleased || context.isOnStreaming)) {
    actions.push("bewerten");
  }
  actions.push("bearbeiten");
  actions.push("aehnliche");
  actions.push("loeschen");
  if (context.hasCollection) {
    actions.push("filmreihe");
  }
  return actions;
}

function getVisibleActionsWithoutGroupContext(context: GetVisibleActionsContext): ActionButtonId[] {
  const actions: ActionButtonId[] = ["zur_watchlist", "direkt_bewerten", "aehnliche"];
  if (context.hasCollection) {
    actions.push("filmreihe");
  }
  return actions;
}

/**
 * Builds the ordered list of action buttons shown on the Movie-Detail
 * Overlay. Two entirely separate rule sets depending on whether the overlay
 * was opened with group + source context (from within a group's
 * Watchlist/Diary) or without it (search/recommendation flow, where
 * `source`/`isReleased`/`isOnStreaming` are irrelevant and ignored).
 */
export function getVisibleActions(context: GetVisibleActionsContext): ActionButtonId[] {
  if (context.hasGroupContext) {
    return getVisibleActionsWithGroupContext(context);
  }
  return getVisibleActionsWithoutGroupContext(context);
}
