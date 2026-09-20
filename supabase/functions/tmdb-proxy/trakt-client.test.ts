// Deno.test suite for the `trakt_related` orchestration logic
// (TMDB-ID -> Trakt-slug resolution, related-movies fetch, 40-item cap)
// using hand-built fixture data shaped like Trakt's documented API
// responses. No network call is made — functions take an injected
// `fetchJson` fake.
//
// Run with: deno test supabase/functions/tmdb-proxy/trakt-client.test.ts

import {
  extractTraktSlug,
  fetchTraktRelated,
  fetchTraktRelatedBySlug,
  limitRelatedMovies,
  resolveTraktSlugFromTmdbId,
  TRAKT_RELATED_LIMIT,
  type TraktRelatedMovie,
} from "./trakt-client.ts";

// Dummy, non-real placeholder value — never sent over the network (every
// test below injects a fake `fetchJson`). Satisfies the "key configured"
// guard clause only; standing rule #2 forbids inventing a real Trakt key.
Deno.env.set("TRAKT_API_KEY", "test-trakt-api-key-not-real");

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function relatedMovie(id: number): TraktRelatedMovie {
  return { title: `Movie ${id}`, ids: { trakt: id, slug: `movie-${id}` } };
}

// --- extractTraktSlug --------------------------------------------------------

Deno.test("extractTraktSlug: picks the first movie-type result's slug", () => {
  const slug = extractTraktSlug([
    { type: "show" },
    { type: "movie", movie: { title: "The Matrix", ids: { slug: "the-matrix-1999" } } },
  ]);
  assert(slug === "the-matrix-1999", "expected the movie-type result's slug to be extracted");
});

Deno.test("extractTraktSlug: no movie-type result returns null", () => {
  assert(extractTraktSlug([{ type: "show" }]) === null, "expected null when no movie-type result exists");
  assert(extractTraktSlug([]) === null, "expected null for an empty result list");
  assert(extractTraktSlug(null) === null, "expected null for a null result list");
});

// --- limitRelatedMovies -------------------------------------------------------

Deno.test("limitRelatedMovies: caps the list at TRAKT_RELATED_LIMIT (40)", () => {
  const movies = Array.from({ length: 60 }, (_, i) => relatedMovie(i));
  const limited = limitRelatedMovies(movies);
  assert(limited.length === TRAKT_RELATED_LIMIT, `expected exactly ${TRAKT_RELATED_LIMIT} results, got ${limited.length}`);
  assert(limited[0].ids.trakt === 0, "expected the cap to keep the first N entries in order");
});

Deno.test("limitRelatedMovies: a list shorter than the limit is returned unchanged", () => {
  const movies = [relatedMovie(1), relatedMovie(2)];
  const limited = limitRelatedMovies(movies);
  assert(limited.length === 2, "expected a short list to pass through unchanged");
});

Deno.test("limitRelatedMovies: null/undefined input yields an empty array", () => {
  assert(limitRelatedMovies(null).length === 0, "expected null to yield []");
  assert(limitRelatedMovies(undefined).length === 0, "expected undefined to yield []");
});

// --- resolveTraktSlugFromTmdbId / fetchTraktRelatedBySlug --------------------

Deno.test("resolveTraktSlugFromTmdbId: resolves via the TMDB-ID search endpoint", async () => {
  const fetchJson = (url: string) => {
    assert(url.includes("/search/tmdb/603"), "expected the TMDB-ID search URL to include the id");
    return Promise.resolve([
      { type: "movie", movie: { title: "The Matrix", ids: { slug: "the-matrix-1999" } } },
    ]);
  };
  const slug = await resolveTraktSlugFromTmdbId(603, fetchJson);
  assert(slug === "the-matrix-1999", "expected the resolved slug from the fake search response");
});

Deno.test("fetchTraktRelatedBySlug: fetches and caps related movies for a given slug", async () => {
  const movies = Array.from({ length: 50 }, (_, i) => relatedMovie(i));
  const fetchJson = (url: string) => {
    assert(url.includes("/movies/the-matrix-1999/related"), "expected the related-movies URL to include the slug");
    return Promise.resolve(movies);
  };
  const result = await fetchTraktRelatedBySlug("the-matrix-1999", fetchJson);
  assert(result.length === TRAKT_RELATED_LIMIT, "expected the related-movies fetch to be capped at 40");
});

// --- fetchTraktRelated (full orchestration) ----------------------------------

Deno.test("fetchTraktRelated: resolves the slug then fetches capped related movies", async () => {
  const fetchJson = (url: string) => {
    if (url.includes("/search/tmdb/603")) {
      return Promise.resolve([
        { type: "movie", movie: { title: "The Matrix", ids: { slug: "the-matrix-1999" } } },
      ]);
    }
    if (url.includes("/movies/the-matrix-1999/related")) {
      return Promise.resolve([relatedMovie(1), relatedMovie(2)]);
    }
    throw new Error(`unexpected URL: ${url}`);
  };
  const result = await fetchTraktRelated(603, fetchJson);
  assert(result.length === 2, "expected the full orchestration to return the related movies");
});

Deno.test("fetchTraktRelated: unresolvable TMDB ID returns an empty array without fetching related movies", async () => {
  let relatedFetchCalled = false;
  const fetchJson = (url: string) => {
    if (url.includes("/search/tmdb/")) return Promise.resolve([]);
    relatedFetchCalled = true;
    return Promise.resolve([]);
  };
  const result = await fetchTraktRelated(999999, fetchJson);
  assert(result.length === 0, "expected an empty array when the TMDB ID can't be resolved");
  assert(!relatedFetchCalled, "expected the related-movies endpoint to never be called without a resolved slug");
});
