// Deno.test suite for the M6-part-1 TMDB client logic (search merge, trailer
// selection, German release-date priority, genre mapping, credits/director
// extraction, collection sorting, company scoring) using hand-built fixture
// data shaped like the real TMDB API responses. No network call is made —
// orchestration functions take an injected `fetchJson` fake.
//
// Run with: deno test supabase/functions/tmdb-proxy/tmdb-client.test.ts

import {
  CAST_DISPLAY_LIMIT,
  extractDirector,
  fetchCollection,
  fetchDirectorMovies,
  fetchGermanReleaseDates,
  fetchMovieCredits,
  fetchMovieDetails,
  fetchMovieProviders,
  fetchMovieVideos,
  fetchPersonMovies,
  filterDirectorCredits,
  mapGenreIds,
  mergeSearchResults,
  scoreCompanyMatch,
  searchCompany,
  searchMovies,
  selectGermanReleaseDate,
  selectTrailer,
  sortCollectionParts,
  type TmdbCastMember,
  type TmdbCollectionPart,
  type TmdbCompany,
  type TmdbCrewMember,
  type TmdbSearchResult,
  type TmdbVideo,
} from "./tmdb-client.ts";

// Dummy, non-real placeholder value — never sent over the network. Every
// test below injects a fake `fetchJson`, but the orchestration functions
// still build a request URL (which requires *some* key to be configured)
// before ever calling it. Standing rule #2 forbids inventing a real TMDB
// API key; this satisfies the "key configured" guard clause only.
Deno.env.set("TMDB_API_KEY", "test-tmdb-api-key-not-real");

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}\n  actual:   ${a}\n  expected: ${e}`);
  }
}

// --- mapGenreIds -----------------------------------------------------------

Deno.test("mapGenreIds: maps known TMDB IDs to German names in order", () => {
  assertEquals(
    mapGenreIds([28, 18, 878]),
    ["Action", "Drama", "Science Fiction"],
    "expected known genre IDs to map to their German names",
  );
});

Deno.test("mapGenreIds: unknown IDs are dropped, not crashed on", () => {
  assertEquals(
    mapGenreIds([28, 999999]),
    ["Action"],
    "expected an unmapped genre ID to be silently dropped",
  );
});

Deno.test("mapGenreIds: null/undefined/empty input yields an empty array", () => {
  assertEquals(mapGenreIds(null), [], "expected null to yield []");
  assertEquals(mapGenreIds(undefined), [], "expected undefined to yield []");
  assertEquals(mapGenreIds([]), [], "expected [] to yield []");
});

// --- selectTrailer -----------------------------------------------------------

function video(type: string, key: string): TmdbVideo {
  return { id: key, key, site: "YouTube", type };
}

Deno.test("selectTrailer: prefers a Trailer-type video over anything else", () => {
  const videos = [video("Teaser", "teaser1"), video("Trailer", "trailer1"), video("Clip", "clip1")];
  const result = selectTrailer(videos);
  assert(result?.key === "trailer1", "expected the Trailer-type video to win");
});

Deno.test("selectTrailer: falls back to Teaser when no Trailer exists", () => {
  const videos = [video("Clip", "clip1"), video("Teaser", "teaser1")];
  const result = selectTrailer(videos);
  assert(result?.key === "teaser1", "expected the Teaser-type video when no Trailer exists");
});

Deno.test("selectTrailer: falls back to the first video when neither Trailer nor Teaser exists", () => {
  const videos = [video("Clip", "clip1"), video("Featurette", "feat1")];
  const result = selectTrailer(videos);
  assert(result?.key === "clip1", "expected the first video as last-resort fallback");
});

Deno.test("selectTrailer: no videos at all returns null", () => {
  assert(selectTrailer([]) === null, "expected [] to return null");
  assert(selectTrailer(null) === null, "expected null to return null");
  assert(selectTrailer(undefined) === null, "expected undefined to return null");
});

// --- selectGermanReleaseDate -------------------------------------------------

Deno.test("selectGermanReleaseDate: prefers Kino (type 3) over Digital/TV", () => {
  const result = selectGermanReleaseDate({
    results: [
      {
        iso_3166_1: "DE",
        release_dates: [
          { type: 6, release_date: "2026-01-01T00:00:00.000Z" },
          { type: 4, release_date: "2026-02-01T00:00:00.000Z" },
          { type: 3, release_date: "2026-03-01T00:00:00.000Z" },
        ],
      },
    ],
  });
  assertEquals(
    result,
    { category: "Kino", release_date: "2026-03-01T00:00:00.000Z", type: 3 },
    "expected type 3 (Theatrical) to win over Digital/TV",
  );
});

Deno.test("selectGermanReleaseDate: prefers type 3 over type 2 when BOTH Kino types are present", () => {
  const result = selectGermanReleaseDate({
    results: [
      {
        iso_3166_1: "DE",
        release_dates: [
          { type: 2, release_date: "2026-01-15T00:00:00.000Z" },
          { type: 3, release_date: "2026-03-01T00:00:00.000Z" },
        ],
      },
    ],
  });
  assertEquals(
    result,
    { category: "Kino", release_date: "2026-03-01T00:00:00.000Z", type: 3 },
    "expected type 3 to win over type 2 when both are present, regardless of array order",
  );
});

Deno.test("selectGermanReleaseDate: falls back to type 2 (limited theatrical) as Kino-equivalent when type 3 is absent", () => {
  const result = selectGermanReleaseDate({
    results: [
      {
        iso_3166_1: "DE",
        release_dates: [
          { type: 4, release_date: "2026-02-01T00:00:00.000Z" },
          { type: 2, release_date: "2026-01-15T00:00:00.000Z" },
        ],
      },
    ],
  });
  assertEquals(
    result,
    { category: "Kino", release_date: "2026-01-15T00:00:00.000Z", type: 2 },
    "expected type 2 to be used as a Kino fallback when type 3 is absent",
  );
});

Deno.test("selectGermanReleaseDate: falls back to Digital (type 4) when no Kino types exist", () => {
  const result = selectGermanReleaseDate({
    results: [
      {
        iso_3166_1: "DE",
        release_dates: [
          { type: 6, release_date: "2026-01-01T00:00:00.000Z" },
          { type: 4, release_date: "2026-02-01T00:00:00.000Z" },
        ],
      },
    ],
  });
  assertEquals(
    result,
    { category: "Digital", release_date: "2026-02-01T00:00:00.000Z", type: 4 },
    "expected type 4 (Digital) to win when no Kino type exists",
  );
});

Deno.test("selectGermanReleaseDate: falls back to TV (type 6) when only TV exists", () => {
  const result = selectGermanReleaseDate({
    results: [
      { iso_3166_1: "DE", release_dates: [{ type: 6, release_date: "2026-01-01T00:00:00.000Z" }] },
    ],
  });
  assertEquals(
    result,
    { category: "TV", release_date: "2026-01-01T00:00:00.000Z", type: 6 },
    "expected type 6 (TV) as the last-resort match",
  );
});

Deno.test("selectGermanReleaseDate: ignores non-DE regions entirely", () => {
  const result = selectGermanReleaseDate({
    results: [
      { iso_3166_1: "US", release_dates: [{ type: 3, release_date: "2026-01-01T00:00:00.000Z" }] },
    ],
  });
  assert(result === null, "expected a non-DE-only response to yield null");
});

Deno.test("selectGermanReleaseDate: no DE region or no results at all yields null", () => {
  assert(selectGermanReleaseDate({ results: [] }) === null, "expected empty results to yield null");
  assert(selectGermanReleaseDate(null) === null, "expected null response to yield null");
  assert(selectGermanReleaseDate(undefined) === null, "expected undefined response to yield null");
});

// --- mergeSearchResults ------------------------------------------------------

function searchResult(overrides: Partial<TmdbSearchResult>): TmdbSearchResult {
  return {
    id: 1,
    title: "Titel",
    original_title: "Title",
    original_language: "en",
    ...overrides,
  };
}

Deno.test("mergeSearchResults: keeps the DE title when a German translation exists", () => {
  const de = [searchResult({ id: 1, title: "Der Herr der Ringe", original_title: "The Lord of the Rings", original_language: "en" })];
  const en = [searchResult({ id: 1, title: "The Lord of the Rings", original_title: "The Lord of the Rings", original_language: "en" })];
  const merged = mergeSearchResults(de, en);
  assert(merged[0].title === "Der Herr der Ringe", "expected the real German title to be kept");
});

Deno.test("mergeSearchResults: falls back to the EN title when DE has no translation (title === original_title, non-German original)", () => {
  const de = [searchResult({ id: 42, title: "Some Movie", original_title: "Some Movie", original_language: "en" })];
  const en = [searchResult({ id: 42, title: "Some Movie (EN)", original_title: "Some Movie", original_language: "en" })];
  const merged = mergeSearchResults(de, en);
  assert(merged[0].title === "Some Movie (EN)", "expected the EN title fallback when no DE translation exists");
});

Deno.test("mergeSearchResults: a movie whose original language IS German is never treated as untranslated", () => {
  const de = [searchResult({ id: 7, title: "Das Boot", original_title: "Das Boot", original_language: "de" })];
  const en = [searchResult({ id: 7, title: "Das Boot (US title)", original_title: "Das Boot", original_language: "de" })];
  const merged = mergeSearchResults(de, en);
  assert(merged[0].title === "Das Boot", "expected the original German title to be kept, not swapped for the EN result");
});

Deno.test("mergeSearchResults: missing EN counterpart leaves the DE (untranslated) title as-is", () => {
  const de = [searchResult({ id: 99, title: "Some Movie", original_title: "Some Movie", original_language: "en" })];
  const merged = mergeSearchResults(de, []);
  assert(merged[0].title === "Some Movie", "expected the DE title to be kept when no EN counterpart is found");
});

Deno.test("mergeSearchResults: empty/null inputs are handled gracefully", () => {
  assertEquals(mergeSearchResults([], []), [], "expected [] + [] to yield []");
  assertEquals(mergeSearchResults(null, null), [], "expected null + null to yield []");
});

Deno.test("searchMovies: orchestrates DE+EN fetch and merges via mergeSearchResults", async () => {
  const deResponse = {
    results: [searchResult({ id: 1, title: "Some Movie", original_title: "Some Movie", original_language: "en" })],
  };
  const enResponse = {
    results: [searchResult({ id: 1, title: "Some Movie (EN)", original_title: "Some Movie", original_language: "en" })],
  };

  const fetchJson = (url: string) => {
    if (url.includes("language=de-DE")) return Promise.resolve(deResponse);
    if (url.includes("language=en-US")) return Promise.resolve(enResponse);
    throw new Error(`unexpected URL: ${url}`);
  };

  const results = await searchMovies("some movie", fetchJson);
  assert(results.length === 1, "expected one merged result");
  assert(results[0].title === "Some Movie (EN)", "expected the orchestrated search to apply the EN-title fallback");
});

// --- extractDirector / filterDirectorCredits --------------------------------

function crewMember(overrides: Partial<TmdbCrewMember>): TmdbCrewMember {
  return { id: 1, name: "Jane Doe", job: "Editor", ...overrides };
}

Deno.test("extractDirector: finds the first crew member with job === 'Director'", () => {
  const crew = [crewMember({ job: "Producer" }), crewMember({ id: 2, name: "Denis Villeneuve", job: "Director" })];
  const director = extractDirector(crew);
  assert(director?.name === "Denis Villeneuve", "expected the Director-job crew member to be extracted");
});

Deno.test("extractDirector: no Director in crew returns null", () => {
  assert(extractDirector([crewMember({ job: "Producer" })]) === null, "expected null when no Director exists");
  assert(extractDirector(null) === null, "expected null crew to return null");
});

Deno.test("filterDirectorCredits: filters crew to Director-job entries only", () => {
  const crew = [
    crewMember({ id: 1, job: "Director" }),
    crewMember({ id: 2, job: "Producer" }),
    crewMember({ id: 3, job: "Director" }),
  ];
  const directors = filterDirectorCredits(crew);
  assertEquals(directors.map((d) => d.id), [1, 3], "expected only Director-job entries to remain");
});

Deno.test("filterDirectorCredits: empty/null crew yields an empty array", () => {
  assertEquals(filterDirectorCredits([]), [], "expected [] to yield []");
  assertEquals(filterDirectorCredits(null), [], "expected null to yield []");
});

// --- fetchMovieCredits (cast cap + director extraction orchestration) ------

Deno.test("fetchMovieCredits: caps cast at CAST_DISPLAY_LIMIT (10) but passes crew through uncapped", async () => {
  const cast: TmdbCastMember[] = Array.from({ length: 15 }, (_, i) => ({ id: i, name: `Actor ${i}` }));
  const crew: TmdbCrewMember[] = [
    crewMember({ id: 100, name: "Director Person", job: "Director" }),
    ...Array.from({ length: 20 }, (_, i) => crewMember({ id: 200 + i, job: "Grip" })),
  ];

  const fetchJson = () => Promise.resolve({ cast, crew });
  const result = await fetchMovieCredits(603, fetchJson);

  assert(result.cast.length === CAST_DISPLAY_LIMIT, `expected cast capped at ${CAST_DISPLAY_LIMIT}, got ${result.cast.length}`);
  assert(result.crew.length === 21, "expected crew to be passed through uncapped");
  assert(result.director?.name === "Director Person", "expected the director to be extracted from crew");
});

// --- fetchMovieVideos / fetchGermanReleaseDates / fetchMovieDetails --------

Deno.test("fetchMovieVideos: applies selectTrailer to the fetched videos response", async () => {
  const fetchJson = () =>
    Promise.resolve({ results: [video("Teaser", "t1"), video("Trailer", "tr1")] });
  const result = await fetchMovieVideos(603, fetchJson);
  assert(result?.key === "tr1", "expected the Trailer video to be selected from the fetched response");
});

Deno.test("fetchGermanReleaseDates: applies selectGermanReleaseDate to the fetched response", async () => {
  const fetchJson = () =>
    Promise.resolve({
      results: [{ iso_3166_1: "DE", release_dates: [{ type: 4, release_date: "2026-05-01" }] }],
    });
  const result = await fetchGermanReleaseDates(603, fetchJson);
  assertEquals(result, { category: "Digital", release_date: "2026-05-01", type: 4 }, "expected Digital category to be selected");
});

Deno.test("fetchMovieDetails: normalizes runtime/vote_average/collection and maps genre IDs via the static table", async () => {
  const fetchJson = () =>
    Promise.resolve({
      id: 603,
      title: "Matrix",
      overview: "Ein Hacker entdeckt, dass die Realität eine Simulation ist.",
      poster_path: "/matrix-poster.jpg",
      release_date: "1999-03-30",
      runtime: 136,
      genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
      belongs_to_collection: { id: 2, name: "The Matrix Collection" },
      vote_average: 8.1,
    });
  const result = await fetchMovieDetails(603, fetchJson);
  assertEquals(
    result,
    {
      id: 603,
      runtime: 136,
      genres: ["Action", "Science Fiction"],
      belongs_to_collection: { id: 2, name: "The Matrix Collection" },
      vote_average: 8.1,
      title: "Matrix",
      overview: "Ein Hacker entdeckt, dass die Realität eine Simulation ist.",
      posterPath: "/matrix-poster.jpg",
      releaseDate: "1999-03-30",
      genreIds: [28, 878],
    },
    "expected normalized details with genres mapped via the static table, plus the M7 title/overview/poster/releaseDate/genreIds additions",
  );
});

Deno.test("fetchMovieDetails: missing title/overview/poster/release_date normalize to null, not undefined", async () => {
  const fetchJson = () =>
    Promise.resolve({
      id: 603,
      runtime: null,
      genres: [],
      belongs_to_collection: null,
      vote_average: null,
    });
  const result = await fetchMovieDetails(603, fetchJson);
  assertEquals(
    result,
    {
      id: 603,
      runtime: null,
      genres: [],
      belongs_to_collection: null,
      vote_average: null,
      title: null,
      overview: null,
      posterPath: null,
      releaseDate: null,
      genreIds: [],
    },
    "expected all missing optional fields to normalize to null/[] rather than undefined",
  );
});

// --- sortCollectionParts / fetchCollection -----------------------------------

function part(id: number, releaseDate?: string): TmdbCollectionPart {
  return { id, title: `Part ${id}`, release_date: releaseDate };
}

Deno.test("sortCollectionParts: sorts ascending by release_date", () => {
  const parts = [part(3, "2003-05-01"), part(1, "1999-03-31"), part(2, "2001-05-15")];
  const sorted = sortCollectionParts(parts);
  assertEquals(sorted.map((p) => p.id), [1, 2, 3], "expected parts sorted chronologically ascending");
});

Deno.test("sortCollectionParts: undated parts are pushed to the end", () => {
  const parts = [part(1, undefined), part(2, "2001-05-15")];
  const sorted = sortCollectionParts(parts);
  assertEquals(sorted.map((p) => p.id), [2, 1], "expected the undated part to sort after the dated one");
});

Deno.test("fetchCollection: sorts fetched parts chronologically", async () => {
  const fetchJson = () =>
    Promise.resolve({
      id: 2,
      name: "The Matrix Collection",
      parts: [part(3, "2003-05-01"), part(1, "1999-03-31")],
    });
  const result = await fetchCollection(2, fetchJson);
  assertEquals(result.parts.map((p) => p.id), [1, 3], "expected fetched collection parts to be chronologically sorted");
});

// --- scoreCompanyMatch / searchCompany ---------------------------------------

function company(overrides: Partial<TmdbCompany>): TmdbCompany {
  return { id: 1, name: "Studio", ...overrides };
}

Deno.test("scoreCompanyMatch: exact match scores higher than a distant fuzzy match", () => {
  const exact = scoreCompanyMatch("Pixar", company({ name: "Pixar" }));
  const distant = scoreCompanyMatch("Pixar", company({ name: "Warner Bros" }));
  assert(exact > distant, "expected an exact name match to score much higher than an unrelated name");
});

Deno.test("scoreCompanyMatch: prefix match gets a bonus over a same-fuzzy-score non-prefix match", () => {
  const prefix = scoreCompanyMatch("Marvel", company({ name: "Marvel Studios" }));
  const noPrefixBonus = scoreCompanyMatch("Marvel", company({ name: "New Marvel Group" }));
  assert(prefix > noPrefixBonus, "expected the prefix-matching company to score higher");
});

Deno.test("scoreCompanyMatch: presence of a logo adds a bonus, all else equal", () => {
  const withLogo = scoreCompanyMatch("Pixar", company({ name: "Pixar", logo_path: "/logo.png" }));
  const withoutLogo = scoreCompanyMatch("Pixar", company({ name: "Pixar", logo_path: null }));
  assert(withLogo > withoutLogo, "expected the logo bonus to raise the score");
});

Deno.test("searchCompany: sorts fetched results by descending composite score", async () => {
  const fetchJson = () =>
    Promise.resolve({
      results: [
        company({ id: 1, name: "Marvel Unrelated Group", logo_path: null }),
        company({ id: 2, name: "Marvel Studios", logo_path: "/logo.png" }),
      ],
    });
  const results = await searchCompany("Marvel", fetchJson);
  assertEquals(results.map((c) => c.id), [2, 1], "expected the best-scoring (prefix + logo) company to sort first");
});

// --- fetchPersonMovies / fetchDirectorMovies (person credits split) --------

Deno.test("fetchPersonMovies: returns the cast side of person movie credits", async () => {
  const fetchJson = () =>
    Promise.resolve({
      cast: [{ id: 1, title: "Movie A" }],
      crew: [{ id: 2, title: "Movie B", job: "Director", name: "Someone" }],
    });
  const result = await fetchPersonMovies(500, fetchJson);
  assertEquals(result, [{ id: 1, title: "Movie A" }], "expected fetchPersonMovies to return only the cast array");
});

Deno.test("fetchDirectorMovies: returns only Director-job crew entries from person movie credits", async () => {
  const fetchJson = () =>
    Promise.resolve({
      cast: [{ id: 1, title: "Movie A" }],
      crew: [
        { id: 2, title: "Movie B", job: "Director", name: "Someone" },
        { id: 3, title: "Movie C", job: "Producer", name: "Someone" },
      ],
    });
  const result = await fetchDirectorMovies(500, fetchJson);
  assertEquals(
    result,
    [{ id: 2, title: "Movie B", job: "Director", name: "Someone" }],
    "expected fetchDirectorMovies to filter the crew array to Director-job entries",
  );
});

Deno.test("fetchMovieProviders: picks the requested region (default DE) and tolerates a missing region", async () => {
  const fixture = {
    results: {
      DE: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }] },
      AT: { rent: [{ provider_id: 2, provider_name: "Apple" }] },
    },
  };
  const fetchJson = () => Promise.resolve(fixture);
  const de = await fetchMovieProviders(1, fetchJson);
  if (de.flatrate.length !== 1 || de.rent.length !== 0) throw new Error("default DE");
  const at = await fetchMovieProviders(1, fetchJson, "AT");
  if (at.rent.length !== 1 || at.flatrate.length !== 0) throw new Error("explicit AT");
  const fr = await fetchMovieProviders(1, fetchJson, "FR");
  if (fr.flatrate.length + fr.rent.length + fr.buy.length !== 0) throw new Error("missing region");
});
