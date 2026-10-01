// Deno tests for the batched, cache-backed watch-provider lookup (ADR 0005).
// Run with: deno test --allow-env --allow-net supabase/functions/tmdb-proxy/providers-cache.test.ts

import { type BatchDeps, findIdsNeedingFetch, resolveProvidersBatch } from "./providers-cache.ts";
import type { StreamingCacheRow } from "./freshness.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const NOW = new Date("2026-10-01T12:00:00Z");
const FRESH = "2026-10-01T06:00:00Z";
const STALE = "2026-09-29T06:00:00Z";

function row(tmdb_id: number, last_fetched_at: string, data: Record<string, unknown> = {}): StreamingCacheRow {
  return { tmdb_id, region: "DE", data, last_fetched_at };
}

Deno.test("findIdsNeedingFetch: missing and stale ids need a fetch, fresh ones do not", () => {
  const ids = findIdsNeedingFetch([1, 2, 3], [row(1, FRESH), row(2, STALE)], NOW);
  assert(ids.length === 2 && ids.includes(2) && ids.includes(3), `got ${JSON.stringify(ids)}`);
});

Deno.test("findIdsNeedingFetch: de-duplicates input ids", () => {
  const ids = findIdsNeedingFetch([3, 3], [], NOW);
  assert(ids.length === 1, "dedupe");
});

function makeDeps(rows: StreamingCacheRow[], overrides: Partial<BatchDeps> = {}) {
  const written: Array<{ tmdb_id: number; data: unknown }> = [];
  const fetched: number[] = [];
  const deps: BatchDeps = {
    readRows: () => Promise.resolve(rows),
    fetchProviders: (id) => {
      fetched.push(id);
      return Promise.resolve({ flatrate: [{ provider_id: id }], rent: [], buy: [] });
    },
    writeRows: (r) => {
      written.push(...r);
      return Promise.resolve();
    },
    now: () => NOW,
    ...overrides,
  };
  return { deps, written, fetched };
}

Deno.test("resolveProvidersBatch: serves fresh rows from cache, fetches + writes only the stale/missing ones", async () => {
  const { deps, written, fetched } = makeDeps([row(1, FRESH, { flatrate: [], rent: [], buy: [] }), row(2, STALE)]);
  const result = await resolveProvidersBatch([1, 2, 3], deps);
  assert(fetched.length === 2 && !fetched.includes(1), "only stale + missing fetched");
  assert(written.length === 2, "stale + missing written back in one call");
  assert(Object.keys(result).length === 3, "all three resolved");
  assert((result[2] as { flatrate: unknown[] }).flatrate.length === 1, "fresh data returned for stale id");
});

Deno.test("resolveProvidersBatch: a failing TMDB fetch omits that id, others unaffected", async () => {
  const { deps, written } = makeDeps([], {
    fetchProviders: (id) =>
      id === 1 ? Promise.reject(new Error("boom")) : Promise.resolve({ flatrate: [], rent: [], buy: [] }),
  });
  const result = await resolveProvidersBatch([1, 2], deps);
  assert(!(1 in result) && 2 in result, "failed id omitted");
  assert(written.length === 1 && written[0].tmdb_id === 2, "only the success is written");
});

Deno.test("resolveProvidersBatch: all fresh -> no fetch, no write", async () => {
  const { deps, written, fetched } = makeDeps([row(1, FRESH, { flatrate: [] })]);
  await resolveProvidersBatch([1], deps);
  assert(fetched.length === 0 && written.length === 0, "nothing to do");
});
