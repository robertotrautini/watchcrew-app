// Batched, cache-backed watch-provider lookup (ADR 0005: server-side
// cache-aside, 24h TTL, shared across the whole group). One client round trip
// resolves many movies: fresh rows are served from `streaming_availability_cache`,
// only missing/stale ids hit TMDB (bounded concurrency) and are written back in
// a single upsert. All I/O is injected so the logic is unit-testable.

import { isStreamingFresh, type StreamingCacheRow } from "./freshness.ts";

export const PROVIDERS_FETCH_CONCURRENCY = 8;

/** Upper bound for one batch request (guards the Edge Function against huge bodies). */
export const MAX_PROVIDERS_BATCH_SIZE = 200;

export interface BatchDeps {
  readRows: (tmdbIds: number[]) => Promise<StreamingCacheRow[]>;
  fetchProviders: (tmdbId: number) => Promise<unknown>;
  writeRows: (rows: Array<{ tmdb_id: number; data: unknown }>) => Promise<void>;
  now?: () => Date;
  concurrency?: number;
}

/** Ids (de-duplicated) that have no fresh (within 24h) cache row. */
export function findIdsNeedingFetch(
  tmdbIds: number[],
  rows: StreamingCacheRow[],
  now: Date = new Date(),
): number[] {
  const freshIds = new Set(rows.filter((r) => isStreamingFresh(r, now)).map((r) => r.tmdb_id));
  return Array.from(new Set(tmdbIds)).filter((id) => !freshIds.has(id));
}

/**
 * Resolves providers for every id: tmdb_id -> provider data. An id whose TMDB
 * fetch fails is omitted (best effort, never fails the whole batch).
 */
export async function resolveProvidersBatch(
  tmdbIds: number[],
  deps: BatchDeps,
): Promise<Record<number, unknown>> {
  const now = deps.now?.() ?? new Date();
  const uniqueIds = Array.from(new Set(tmdbIds));
  const rows = await deps.readRows(uniqueIds);
  const result: Record<number, unknown> = {};
  for (const r of rows) {
    if (isStreamingFresh(r, now)) result[r.tmdb_id] = r.data;
  }

  const toFetch = findIdsNeedingFetch(uniqueIds, rows, now);
  const fetched: Array<{ tmdb_id: number; data: unknown }> = [];
  let next = 0;
  async function worker(): Promise<void> {
    while (next < toFetch.length) {
      const id = toFetch[next++];
      try {
        const data = await deps.fetchProviders(id);
        fetched.push({ tmdb_id: id, data });
        result[id] = data;
      } catch {
        // best effort: id stays unresolved
      }
    }
  }
  const concurrency = deps.concurrency ?? PROVIDERS_FETCH_CONCURRENCY;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, toFetch.length)) }, worker),
  );

  if (fetched.length > 0) {
    await deps.writeRows(fetched);
  }
  return result;
}
