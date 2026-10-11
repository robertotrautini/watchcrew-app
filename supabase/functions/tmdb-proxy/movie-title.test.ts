// Deno tests for the title rule "German if TMDB has a real German translation,
// else English, else original" (docs/tmdb-proxy-refresh-contract.md) and its
// use inside fetchMovieDetails (EN fallback). No network: fake fetchJson.
//
// Run with: deno test --allow-env supabase/functions/tmdb-proxy/movie-title.test.ts

import {
  fetchMovieDetails,
  isTranslatedTitle,
  resolveMovieTitle,
} from "./tmdb-client.ts";

Deno.env.set("TMDB_API_KEY", "test-tmdb-api-key-not-real");

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  actual:   ${a}\n  expected: ${e}`);
}

Deno.test("isTranslatedTitle: differs from original_title -> translated", () => {
  assertEquals(
    isTranslatedTitle({ title: "Das Boot", original_title: "Das Boot", original_language: "de" }, "de"),
    true,
    "german original counts as german",
  );
  assertEquals(
    isTranslatedTitle({ title: "Chihiros Reise ins Zauberland", original_title: "千と千尋の神隠し", original_language: "ja" }, "de"),
    true,
    "different from original -> translated",
  );
});

Deno.test("isTranslatedTitle: title equals original_title and language differs -> not translated", () => {
  assertEquals(
    isTranslatedTitle({ title: "Parasite", original_title: "Parasite", original_language: "en" }, "de"),
    false,
    "TMDB fallback to original",
  );
  assertEquals(
    isTranslatedTitle({ title: "千と千尋の神隠し", original_title: "千と千尋の神隠し", original_language: "ja" }, "en"),
    false,
    "japanese original has no english translation",
  );
});

Deno.test("isTranslatedTitle: empty/missing title -> not translated; missing original_title -> trusted", () => {
  assertEquals(isTranslatedTitle({ title: "  ", original_title: "X" }, "de"), false, "blank");
  assertEquals(isTranslatedTitle({}, "de"), false, "missing title");
  assertEquals(isTranslatedTitle({ title: "Matrix" }, "de"), true, "no original info -> trust");
});

Deno.test("resolveMovieTitle: german wins", () => {
  const r = resolveMovieTitle(
    { title: "Matrix", original_title: "The Matrix", original_language: "en" },
    { title: "The Matrix", original_title: "The Matrix", original_language: "en" },
  );
  assertEquals(r, { title: "Matrix", source: "de" }, "german");
});

Deno.test("resolveMovieTitle: english when german missing", () => {
  const r = resolveMovieTitle(
    { title: "Perfect Days", original_title: "Perfect Days", original_language: "ja" },
    { title: "Perfect Days", original_title: "PERFECT DAYS", original_language: "ja" },
  );
  assertEquals(r, { title: "Perfect Days", source: "en" }, "english");
});

Deno.test("resolveMovieTitle: english original film without german translation -> english", () => {
  const r = resolveMovieTitle(
    { title: "Some Film", original_title: "Some Film", original_language: "en" },
    { title: "Some Film", original_title: "Some Film", original_language: "en" },
  );
  assertEquals(r, { title: "Some Film", source: "en" }, "en original is english");
});

Deno.test("resolveMovieTitle: neither -> original", () => {
  const r = resolveMovieTitle(
    { title: "千と千尋", original_title: "千と千尋", original_language: "ja" },
    { title: "千と千尋", original_title: "千と千尋", original_language: "ja" },
  );
  assertEquals(r, { title: "千と千尋", source: "original" }, "original");
});

Deno.test("resolveMovieTitle: no english response -> original; nothing at all -> none", () => {
  assertEquals(
    resolveMovieTitle({ title: "A", original_title: "A", original_language: "fr" }, null),
    { title: "A", source: "original" },
    "no en",
  );
  assertEquals(resolveMovieTitle({}, null), { title: null, source: "none" }, "none");
});

Deno.test("fetchMovieDetails: german translation present -> only one request (de-DE)", async () => {
  const urls: string[] = [];
  const fetchJson = (url: string) => {
    urls.push(url);
    return Promise.resolve({
      id: 1, title: "Matrix", original_title: "The Matrix", original_language: "en",
      runtime: 100, genres: [], belongs_to_collection: null, vote_average: 1,
    });
  };
  const d = await fetchMovieDetails(1, fetchJson);
  assertEquals(d.title, "Matrix", "german");
  assertEquals(urls.length, 1, "one request");
  assertEquals(urls[0].includes("language=de-DE"), true, "de-DE");
});

Deno.test("fetchMovieDetails: german missing -> english title via en-US request, response shape unchanged", async () => {
  const fetchJson = (url: string) => {
    const lang = new URL(url).searchParams.get("language");
    return Promise.resolve({
      id: 2, title: lang === "en-US" ? "Perfect Days" : "PERFECT DAYS",
      original_title: "PERFECT DAYS", original_language: "ja",
      overview: "Ueberschrift", runtime: 123, genres: [], belongs_to_collection: null, vote_average: 7,
    });
  };
  const d = await fetchMovieDetails(2, fetchJson);
  assertEquals(d.title, "Perfect Days", "english fallback");
  assertEquals(
    Object.keys(d).sort(),
    ["belongs_to_collection", "genreIds", "genres", "id", "overview", "posterPath", "releaseDate", "runtime", "title", "vote_average"],
    "same keys as before",
  );
});

Deno.test("fetchMovieDetails: german missing and en-US request fails -> original title, no throw", async () => {
  const fetchJson = (url: string) => {
    if (new URL(url).searchParams.get("language") === "en-US") return Promise.reject(new Error("boom"));
    return Promise.resolve({
      id: 3, title: "X", original_title: "X", original_language: "ja",
      runtime: null, genres: [], belongs_to_collection: null, vote_average: null,
    });
  };
  const d = await fetchMovieDetails(3, fetchJson);
  assertEquals(d.title, "X", "original fallback");
});
