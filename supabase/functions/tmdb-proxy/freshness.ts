// Pure, framework-agnostic freshness/TTL decision logic for the TMDB/Trakt
// cache-aside pattern (ADR 0005). No I/O happens here — these functions only
// look at an already-fetched cache row (and, for streaming, a clock), so
// they can be unit-tested with Deno.test without touching Postgres or the
// network.

/** Mirrors the `movie_metadata_cache` table (tmdb_id, data jsonb, last_fetched_at). */
export interface MetadataCacheRow {
  tmdb_id: number;
  data: Record<string, unknown> | null;
  last_fetched_at: string | null;
}

/** Mirrors the `streaming_availability_cache` table (tmdb_id, region, data jsonb, last_fetched_at). */
export interface StreamingCacheRow {
  tmdb_id: number;
  region: string;
  data: Record<string, unknown> | null;
  last_fetched_at: string | null;
}

/** Streaming/watch-provider availability TTL per ADR 0005: 24 hours. */
export const STREAMING_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Static metadata fields named explicitly in ADR 0005
 * ("Laufzeit/Regie/Genres/Poster bereits erschienener Filme").
 * These have no real TTL — they're cached indefinitely and only re-fetched
 * when one of them is still null.
 */
export const REQUIRED_METADATA_FIELDS = [
  "runtime",
  "director",
  "genres",
  "poster",
] as const;

/**
 * Decides whether a cached metadata row can be served as-is, or whether
 * fresh data must be fetched from TMDB.
 *
 * - No row, or row with no `data` at all -> not fresh, must fetch.
 * - Any required field missing/null on `data` -> not fresh, must fetch.
 * - All required fields present -> fresh forever (no TTL for metadata).
 */
export function isMetadataFresh(
  row: MetadataCacheRow | null | undefined,
): boolean {
  if (!row || !row.data) return false;

  const data = row.data;
  return REQUIRED_METADATA_FIELDS.every((field) => {
    const value = data[field];
    return value !== null && value !== undefined;
  });
}

/**
 * Decides whether a cached streaming-availability row is still within the
 * 24h TTL from ADR 0005.
 *
 * @param now injected clock (defaults to `new Date()`) so callers/tests
 *            don't depend on wall-clock time.
 */
export function isStreamingFresh(
  row: StreamingCacheRow | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!row || !row.last_fetched_at) return false;

  const lastFetchedAt = new Date(row.last_fetched_at);
  if (Number.isNaN(lastFetchedAt.getTime())) return false;

  const ageMs = now.getTime() - lastFetchedAt.getTime();
  return ageMs >= 0 && ageMs < STREAMING_TTL_MS;
}

/**
 * M6 part 1 — generic per-field variant of `isMetadataFresh` for the new
 * `details`/`videos`/`credits`/`release_dates`/`collection` actions, which
 * share the SAME `movie_metadata_cache` row (keyed by tmdb_id) as the
 * existing `kind: "metadata"` stub but are namespaced under their own keys
 * in `data` (e.g. `data.details`, `data.videos`, ...) so they never collide
 * with the stub's `runtime`/`director`/`genres`/`poster` keys.
 *
 * Interim decision (see docs/interim-decisions.md): feature-inventory.md
 * gives no server-side TTL for these actions at all, so — same as
 * `isMetadataFresh` — this applies the "static, no TTL, refetch only if
 * still null" rule from ADR 0005 to a single named field instead of the
 * whole row.
 *
 * Known edge case (documented, not fixed here): for a movie with genuinely
 * no collection, `data.collection` legitimately stays `null` forever, which
 * this simple null-check reads as "never fetched" and will keep re-fetching
 * on every request. Accepted as a cheap, documented tradeoff given no TTL
 * spec exists for this data class.
 */
export function isCacheAsideFieldFresh(
  data: Record<string, unknown> | null | undefined,
  fieldKey: string,
): boolean {
  if (!data) return false;
  const value = data[fieldKey];
  return value !== null && value !== undefined;
}
