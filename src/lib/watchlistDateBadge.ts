// Part of M5 Watchlist screen work: the Watchlist "date badge" copy shown
// on a card/grid tile, per docs/feature-inventory.md (verbatim rule,
// extracted into the M5-part-2 task brief):
//
//   "Kommt am DD.MM.YYYY"   — movie has a release date in the future
//   "DD.MM.YYYY"            — release date is today or in the past (released)
//   "Streaming verfügbar"   — no release date, but streaming availability found
//   "Kein Datum"            — no release date and not streaming-available
//
// Pure, presentational-logic only (no network/Supabase access) — mirrors the
// style of `watchlistLogic.ts`'s pure functions, but kept in its own module
// since it's about a UI string/classification, not a sort/filter option.

import type { Movie, StreamingAvailabilityLookup } from "./watchlistTypes";

/** The subset of `Movie` this module actually needs. */
export type DateBadgeMovie = Pick<Movie, "release_date" | "tmdb_id">;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `release_date` comes back as Postgres `date` -> "YYYY-MM-DD" (see watchlistLogic.ts). */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${pad2(Number(day))}.${pad2(Number(month))}.${year}`;
}

/**
 * "Released" means the release date is today or earlier. Compared by
 * calendar day (not exact instant), same approach as `isFutureDate` in
 * `watchlistLogic.ts` — a release date has no time component.
 */
function isReleased(dateStr: string, now: Date): boolean {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const release = new Date(`${dateStr}T00:00:00Z`);
  return release.getTime() <= today.getTime();
}

function isStreamingAvailable(
  movie: DateBadgeMovie,
  streamingAvailability: StreamingAvailabilityLookup
): boolean {
  return streamingAvailability.get(movie.tmdb_id) ?? false;
}

export function getDateBadgeText(
  movie: DateBadgeMovie,
  streamingAvailability: StreamingAvailabilityLookup,
  now: Date = new Date()
): string {
  const { release_date } = movie;

  if (release_date != null) {
    return isReleased(release_date, now) ? formatDate(release_date) : `Kommt am ${formatDate(release_date)}`;
  }

  return isStreamingAvailable(movie, streamingAvailability) ? "Streaming verfügbar" : "Kein Datum";
}

/**
 * Whether a Watchlist tile should render dimmed: neither released yet nor
 * available on streaming (per the M5-part-2 task brief's card/grid spec).
 */
export function isEntryDimmed(
  movie: DateBadgeMovie,
  streamingAvailability: StreamingAvailabilityLookup,
  now: Date = new Date()
): boolean {
  const released = movie.release_date != null && isReleased(movie.release_date, now);
  return !released && !isStreamingAvailable(movie, streamingAvailability);
}
