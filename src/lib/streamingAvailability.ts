import type { TmdbMovieProviders } from "./tmdbProxy";
import { getMoviesProvidersBatch } from "./tmdbProxy";
import { getStreamingAvailabilityForTmdbIds } from "./watchlist";
import type { StreamingAvailabilityCacheRow } from "./watchlistTypes";

// ADR 0005 client side: `streaming_availability_cache` (DE, 24h TTL) is
// shared across the group. The client reads it directly (1 query, RLS SELECT)
// and only asks the Edge Function's `providers_batch` action to (re)fill the
// ids that are missing or older than the TTL -- at most 2 round trips for
// any number of movies, 1 when everything is fresh.

export const STREAMING_TTL_MS = 24 * 60 * 60 * 1000;

export function findIdsNeedingProviders(
  tmdbIds: number[],
  rows: StreamingAvailabilityCacheRow[],
  now: Date = new Date()
): number[] {
  const freshIds = new Set(
    rows
      .filter((row) => {
        const age = now.getTime() - new Date(row.last_fetched_at).getTime();
        return age >= 0 && age < STREAMING_TTL_MS;
      })
      .map((row) => row.tmdb_id)
  );
  return Array.from(new Set(tmdbIds)).filter((id) => !freshIds.has(id));
}

function isProvidersShape(data: unknown): data is TmdbMovieProviders {
  const d = data as Partial<TmdbMovieProviders> | null | undefined;
  return !!d && Array.isArray(d.flatrate) && Array.isArray(d.rent) && Array.isArray(d.buy);
}

/** tmdb_id -> providers, skipping rows without the `{ flatrate, rent, buy }` shape. */
export function rowsToProvidersMap(
  rows: StreamingAvailabilityCacheRow[]
): Map<number, TmdbMovieProviders> {
  const map = new Map<number, TmdbMovieProviders>();
  for (const row of rows) {
    if (isProvidersShape(row.data)) {
      map.set(row.tmdb_id, row.data);
    }
  }
  return map;
}

/**
 * Reads the cache rows for `readIds`, then refreshes the stale/missing ones
 * among `fetchIds` via one `providers_batch` call and merges the result in.
 * Never throws; a cache READ error is returned, a failing refresh is ignored
 * (best effort -- the movies just keep their old/no availability).
 */
export async function loadStreamingRows(
  readIds: number[],
  fetchIds: number[],
  now: Date = new Date()
): Promise<{ data: StreamingAvailabilityCacheRow[] | null; error: { message: string } | null }> {
  const { data, error } = await getStreamingAvailabilityForTmdbIds(readIds);
  if (error) {
    return { data: null, error: error as { message: string } };
  }
  const rows = (data ?? []) as StreamingAvailabilityCacheRow[];

  const needed = findIdsNeedingProviders(fetchIds, rows, now);
  if (needed.length === 0) {
    return { data: rows, error: null };
  }

  const refreshed = await getMoviesProvidersBatch(needed);
  if (refreshed.error || !refreshed.data) {
    return { data: rows, error: null };
  }

  const byId = new Map(rows.map((row) => [row.tmdb_id, row]));
  for (const [id, providers] of Object.entries(refreshed.data)) {
    byId.set(Number(id), {
      tmdb_id: Number(id),
      region: "DE",
      data: providers,
      last_fetched_at: now.toISOString(),
    });
  }
  return { data: Array.from(byId.values()), error: null };
}
