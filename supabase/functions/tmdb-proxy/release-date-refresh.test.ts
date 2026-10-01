// Deno tests for the lazy release-date refresh of date-less movies (ADR 0005).
// Run with: deno test --allow-env --allow-net supabase/functions/tmdb-proxy/release-date-refresh.test.ts

import {
  findIdsNeedingDateCheck,
  type ReleaseDateRefreshDeps,
  refreshReleaseDatesBatch,
  RELEASE_DATE_CHECK_TTL_MS,
} from "./release-date-refresh.ts";
import type { MetadataCacheRow } from "./freshness.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const NOW = new Date("2026-10-01T12:00:00Z");
const FRESH = "2026-10-01T06:00:00Z";
const STALE = "2026-09-29T06:00:00Z";

function row(tmdb_id: number, checkedAt?: string, extra: Record<string, unknown> = {}): MetadataCacheRow {
  return {
    tmdb_id,
    data: { ...(checkedAt ? { releaseDateCheckedAt: checkedAt } : {}), ...extra },
    last_fetched_at: checkedAt ?? null,
  };
}

Deno.test("TTL is 24h", () => {
  assert(RELEASE_DATE_CHECK_TTL_MS === 24 * 60 * 60 * 1000, "ttl");
});

Deno.test("findIdsNeedingDateCheck: no row / no marker / stale need a check, fresh does not", () => {
  const ids = findIdsNeedingDateCheck([1, 2, 3, 4], [row(1, FRESH), row(2, STALE), row(3)], NOW);
  assert(
    ids.length === 3 && ids.includes(2) && ids.includes(3) && ids.includes(4),
    `got ${JSON.stringify(ids)}`,
  );
});

function makeDeps(rows: MetadataCacheRow[], dates: Record<number, string | null | "throw">) {
  const updated: Array<{ tmdbId: number; date: string }> = [];
  const written: Array<{ tmdb_id: number; data: Record<string, unknown> }> = [];
  const fetched: number[] = [];
  const deps: ReleaseDateRefreshDeps = {
    readRows: () => Promise.resolve(rows),
    fetchReleaseDate: (id) => {
      fetched.push(id);
      const d = dates[id];
      if (d === "throw") return Promise.reject(new Error("tmdb down"));
      return Promise.resolve(d ?? null);
    },
    updateMovieReleaseDate: (tmdbId, date) => {
      updated.push({ tmdbId, date });
      return Promise.resolve();
    },
    writeRows: (r) => {
      written.push(...r);
      return Promise.resolve();
    },
    now: () => NOW,
  };
  return { deps, updated, written, fetched };
}

Deno.test("refresh: fetches only stale ids, updates movies for found dates, marks all checked", async () => {
  const { deps, updated, written, fetched } = makeDeps(
    [row(1, FRESH), row(2, STALE, { runtime: 90 })],
    { 2: "2026-12-24", 3: null },
  );
  const result = await refreshReleaseDatesBatch([1, 2, 3], deps);
  assert(fetched.length === 2 && !fetched.includes(1), `fetched ${JSON.stringify(fetched)}`);
  assert(updated.length === 1 && updated[0].tmdbId === 2 && updated[0].date === "2026-12-24", "update");
  assert(result[2] === "2026-12-24" && result[3] === null && !(1 in result), `result ${JSON.stringify(result)}`);
  assert(written.length === 2, "marks both checked");
  const w2 = written.find((w) => w.tmdb_id === 2)!;
  assert(w2.data.runtime === 90, "existing cache data preserved");
  assert(w2.data.releaseDateCheckedAt === NOW.toISOString(), "checked marker set");
});

Deno.test("refresh: a failing TMDB fetch is skipped, not marked checked, others still processed", async () => {
  const { deps, updated, written } = makeDeps([], { 1: "throw", 2: "2027-01-01" });
  const result = await refreshReleaseDatesBatch([1, 2], deps);
  assert(!(1 in result) && result[2] === "2027-01-01", `result ${JSON.stringify(result)}`);
  assert(updated.length === 1 && written.length === 1 && written[0].tmdb_id === 2, "only 2 persisted");
});

Deno.test("refresh: a failing movies update is skipped per id", async () => {
  const { deps } = makeDeps([], { 1: "2027-01-01", 2: "2027-02-02" });
  deps.updateMovieReleaseDate = (id) =>
    id === 1 ? Promise.reject(new Error("db")) : Promise.resolve();
  const result = await refreshReleaseDatesBatch([1, 2], deps);
  assert(!(1 in result) && result[2] === "2027-02-02", `result ${JSON.stringify(result)}`);
});

Deno.test("refresh: all fresh -> no fetch, no write", async () => {
  const { deps, written, fetched } = makeDeps([row(1, FRESH)], {});
  const result = await refreshReleaseDatesBatch([1], deps);
  assert(fetched.length === 0 && written.length === 0 && Object.keys(result).length === 0, "noop");
});
