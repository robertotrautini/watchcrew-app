// Deno tests for poster enrichment of Trakt related movies.
// Run with: deno test supabase/functions/tmdb-proxy/related-posters.test.ts

import { enrichRelatedWithPosters } from "./related-posters.ts";
import type { TraktRelatedMovie } from "./trakt-client.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function related(tmdb: number | undefined): TraktRelatedMovie {
  return { title: `M${tmdb}`, ids: { tmdb } };
}

Deno.test("enrichRelatedWithPosters: adds posterPath and voteAverage per item", async () => {
  const result = await enrichRelatedWithPosters(
    [related(1), related(2)],
    (id) => Promise.resolve({ posterPath: `/p${id}.jpg`, voteAverage: id + 0.5 }),
  );
  assert(result[0].posterPath === "/p1.jpg", "poster of item 1");
  assert(result[1].voteAverage === 2.5, "vote of item 2");
  assert(result[0].title === "M1", "original fields kept");
});

Deno.test("enrichRelatedWithPosters: failing lookup falls back to null, others unaffected", async () => {
  const result = await enrichRelatedWithPosters(
    [related(1), related(2)],
    (id) => id === 1 ? Promise.reject(new Error("boom")) : Promise.resolve({ posterPath: "/x.jpg", voteAverage: 7 }),
  );
  assert(result[0].posterPath === null && result[0].voteAverage === null, "failed item has nulls");
  assert(result[1].posterPath === "/x.jpg", "other item enriched");
});

Deno.test("enrichRelatedWithPosters: items without tmdb id get nulls and no lookup", async () => {
  let calls = 0;
  const result = await enrichRelatedWithPosters([related(undefined)], () => {
    calls++;
    return Promise.resolve({ posterPath: "/x", voteAverage: 1 });
  });
  assert(calls === 0, "no lookup without tmdb id");
  assert(result[0].posterPath === null, "null poster");
});

Deno.test("enrichRelatedWithPosters: respects concurrency bound and keeps order", async () => {
  let active = 0;
  let maxActive = 0;
  const items = Array.from({ length: 20 }, (_, i) => related(i + 1));
  const result = await enrichRelatedWithPosters(items, async (id) => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return { posterPath: `/p${id}`, voteAverage: null };
  }, 4);
  assert(maxActive <= 4, `max concurrency ${maxActive} exceeds 4`);
  assert(result.every((r, i) => r.posterPath === `/p${i + 1}`), "order preserved");
});
