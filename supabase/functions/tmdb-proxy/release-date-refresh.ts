// Lazy release-date refresh for date-less movies (ADR 0005: cache-aside
// instead of the legacy cron bulk refresh). On a Watchlist load the client
// sends the tmdb ids of films WITHOUT a release date; ids whose last check is
// older than the TTL are re-looked-up on TMDB (bounded concurrency), a newly
// found date is written to `movies.release_date` (only where still NULL), and
// the check time is stored in `movie_metadata_cache.data.releaseDateCheckedAt`
// so a film that still has no date is re-checked at most once per TTL.
// All I/O is injected so the logic is unit-testable.

import type { MetadataCacheRow } from "./freshness.ts";

/** Same 24h as the streaming TTL (ADR 0005 gives no value for unreleased films; see interim-decisions). */
export const RELEASE_DATE_CHECK_TTL_MS = 24 * 60 * 60 * 1000;
export const RELEASE_DATE_FETCH_CONCURRENCY = 8;
export const MAX_RELEASE_DATE_BATCH_SIZE = 200;
export const RELEASE_DATE_CHECKED_KEY = "releaseDateCheckedAt";

export interface ReleaseDateRefreshDeps {
  readRows: (tmdbIds: number[]) => Promise<MetadataCacheRow[]>;
  /** German-priority TMDB release date (ISO) or null when TMDB has none. May throw. */
  fetchReleaseDate: (tmdbId: number) => Promise<string | null>;
  /** Sets `movies.release_date` for the tmdb id, only if it is still NULL. */
  updateMovieReleaseDate: (tmdbId: number, date: string) => Promise<void>;
  writeRows: (
    rows: Array<{ tmdb_id: number; data: Record<string, unknown> }>,
  ) => Promise<void>;
  now?: () => Date;
  concurrency?: number;
}

function isChecked(row: MetadataCacheRow | undefined, now: Date): boolean {
  const raw = row?.data?.[RELEASE_DATE_CHECKED_KEY];
  if (typeof raw !== "string") return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  const age = now.getTime() - t;
  return age >= 0 && age < RELEASE_DATE_CHECK_TTL_MS;
}

/** Ids (de-duplicated) whose release date was not checked within the TTL. */
export function findIdsNeedingDateCheck(
  tmdbIds: number[],
  rows: MetadataCacheRow[],
  now: Date = new Date(),
): number[] {
  const checked = new Set(rows.filter((r) => isChecked(r, now)).map((r) => r.tmdb_id));
  return Array.from(new Set(tmdbIds)).filter((id) => !checked.has(id));
}

/**
 * Returns tmdb_id -> found date (or null = checked, TMDB still has none) for
 * every id that was actually re-checked. Ids whose TMDB/DB step failed are
 * omitted (best effort, retried on the next load).
 */
export async function refreshReleaseDatesBatch(
  tmdbIds: number[],
  deps: ReleaseDateRefreshDeps,
): Promise<Record<number, string | null>> {
  const now = deps.now?.() ?? new Date();
  const uniqueIds = Array.from(new Set(tmdbIds));
  const rows = await deps.readRows(uniqueIds);
  const toCheck = findIdsNeedingDateCheck(uniqueIds, rows, now);
  const existing = new Map(rows.map((r) => [r.tmdb_id, r]));

  const result: Record<number, string | null> = {};
  const toWrite: Array<{ tmdb_id: number; data: Record<string, unknown> }> = [];
  let next = 0;
  async function worker(): Promise<void> {
    while (next < toCheck.length) {
      const id = toCheck[next++];
      try {
        const date = await deps.fetchReleaseDate(id);
        if (date) await deps.updateMovieReleaseDate(id, date);
        result[id] = date;
        toWrite.push({
          tmdb_id: id,
          data: {
            ...(existing.get(id)?.data ?? {}),
            [RELEASE_DATE_CHECKED_KEY]: now.toISOString(),
          },
        });
      } catch {
        // best effort: id stays unresolved
      }
    }
  }
  const concurrency = deps.concurrency ?? RELEASE_DATE_FETCH_CONCURRENCY;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, toCheck.length)) }, worker),
  );

  if (toWrite.length > 0) await deps.writeRows(toWrite);
  return result;
}
