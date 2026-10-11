// Deno tests for the `refresh_movie` orchestration (fill gaps / force, title
// rule, not-found, idempotency) with a fully faked DB and faked TMDB fetchers.
//
// Run with: deno test --allow-env supabase/functions/tmdb-proxy/movie-refresh.test.ts

import {
  type GenreRow,
  type MovieRefreshDb,
  type RefreshMovieRow,
  refreshMovie,
} from "./movie-refresh.ts";
import {
  type GermanReleaseDate,
  type NormalizedCredits,
  type RawTmdbMovieDetails,
  TmdbHttpError,
} from "./tmdb-client.ts";

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  actual:   ${a}\n  expected: ${e}`);
}

const EMPTY_ROW: RefreshMovieRow = {
  id: "movie-1", tmdb_id: 603, name: "Legacy Name", release_date: null, poster: null,
  overview: null, runtime: null, director: null, director_id: null, vote_average: null,
};

function rawDe(o: Partial<RawTmdbMovieDetails> = {}): RawTmdbMovieDetails {
  return {
    id: 603, title: "Matrix", original_title: "The Matrix", original_language: "en",
    overview: "Deutsche Beschreibung", poster_path: "/p.jpg", release_date: "1999-06-17",
    runtime: 136, genres: [{ id: 28, name: "Action" }, { id: 878, name: "SF" }],
    belongs_to_collection: null, vote_average: 8.2, ...o,
  };
}
function rawEn(o: Partial<RawTmdbMovieDetails> = {}): RawTmdbMovieDetails {
  return rawDe({ title: "The Matrix", overview: "English overview", release_date: "1999-03-31", ...o });
}
const CREDITS: NormalizedCredits = {
  cast: [], crew: [], director: { id: 62, name: "Lana Wachowski", job: "Director" },
};
const DE_RELEASE: GermanReleaseDate = { category: "Kino", release_date: "1999-06-17", type: 3 };

function setup(opts: {
  row?: RefreshMovieRow | null;
  linkedGenres?: string[];
  existingGenres?: GenreRow[];
  de?: RawTmdbMovieDetails;
  en?: RawTmdbMovieDetails;
  deThrows?: Error;
  release?: GermanReleaseDate | null;
} = {}) {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const insertedGenres: unknown[] = [];
  const links: unknown[] = [];
  let tmdbCalls = 0;
  let next = 800;
  const db: MovieRefreshDb = {
    findMovieFull: async () => (opts.row === undefined ? { ...EMPTY_ROW } : opts.row),
    updateMovie: async (id, patch) => { updates.push({ id, patch }); },
    findGenresByTmdbGenreIds: async (ids) =>
      (opts.existingGenres ?? []).filter((g) => ids.includes(g.tmdb_genre_id)),
    insertGenres: async (rows) => {
      insertedGenres.push(rows);
      return rows.map((r) => ({ id: `g-${next++}`, tmdb_genre_id: r.tmdb_genre_id, name: r.name }));
    },
    findLinkedGenreIds: async () => opts.linkedGenres ?? [],
    insertMovieGenres: async (rows) => { links.push(rows); },
  };
  const deps = {
    db,
    fetchRawDetails: async (_id: number, lang: string) => {
      tmdbCalls++;
      if (lang === "de-DE") {
        if (opts.deThrows) throw opts.deThrows;
        return opts.de ?? rawDe();
      }
      return opts.en ?? rawEn();
    },
    fetchReleaseDates: async () => (opts.release === undefined ? DE_RELEASE : opts.release),
    fetchCredits: async () => CREDITS,
  };
  return { deps, updates, insertedGenres, links, calls: () => tmdbCalls };
}

Deno.test("not found: no TMDB call, nothing written, no insert", async () => {
  const s = setup({ row: null });
  const r = await refreshMovie(603, s.deps);
  assertEquals(r, { status: "movie_not_found" }, "result");
  assertEquals(s.calls(), 0, "no tmdb");
  assertEquals(s.updates.length, 0, "no update");
});

Deno.test("tmdb 404 -> tmdb_not_found, nothing written", async () => {
  const s = setup({ deThrows: new TmdbHttpError(404, "nope") });
  const r = await refreshMovie(603, s.deps);
  assertEquals(r, { status: "tmdb_not_found" }, "result");
  assertEquals(s.updates.length, 0, "no update");
});

Deno.test("other tmdb error propagates", async () => {
  const s = setup({ deThrows: new TmdbHttpError(500, "boom") });
  let threw = false;
  try { await refreshMovie(603, s.deps); } catch { threw = true; }
  assertEquals(threw, true, "throws");
});

Deno.test("fills all empty fields, uses german title, DE release date", async () => {
  const s = setup();
  const r = await refreshMovie(603, s.deps);
  assertEquals(s.updates.length, 1, "one update");
  assertEquals(s.updates[0].patch, {
    name: "Matrix", release_date: "1999-06-17", overview: "Deutsche Beschreibung",
    runtime: 136, director: "Lana Wachowski", director_id: 62, vote_average: 8.2, poster: "/p.jpg",
  }, "patch");
  assertEquals(r, {
    status: "updated", movieId: "movie-1", tmdbId: 603,
    updatedFields: ["name", "release_date", "overview", "runtime", "director", "director_id", "vote_average", "poster", "genres"],
    titleSource: "de",
  }, "result");
  assertEquals(s.links, [[{ movie_id: "movie-1", genre_id: "g-800" }, { movie_id: "movie-1", genre_id: "g-801" }]], "genre links");
});

Deno.test("fillGapsOnly: existing values untouched (except name rule)", async () => {
  const row: RefreshMovieRow = {
    ...EMPTY_ROW, release_date: "2000-01-01", overview: "alt", runtime: 90, director: "X",
    director_id: 5, vote_average: 5, poster: "/old.jpg", name: "Matrix",
  };
  const s = setup({ row, linkedGenres: ["g-1"] });
  const r = await refreshMovie(603, s.deps);
  assertEquals(s.updates.length, 0, "nothing to write");
  assertEquals(r.status, "unchanged", "unchanged");
  assertEquals(s.links.length, 0, "no genre links when some exist");
});

Deno.test("fillGapsOnly: empty strings and whitespace count as gaps", async () => {
  const row: RefreshMovieRow = { ...EMPTY_ROW, name: "Matrix", overview: "  ", director: "", poster: "", release_date: "1999-06-17", runtime: 136, vote_average: 8.2, director_id: 62 };
  const s = setup({ row, linkedGenres: ["g-1"] });
  await refreshMovie(603, s.deps);
  assertEquals(s.updates[0].patch, { overview: "Deutsche Beschreibung", director: "Lana Wachowski", poster: "/p.jpg" }, "patch");
});

Deno.test("force overwrites existing values but never with missing TMDB values", async () => {
  const row: RefreshMovieRow = {
    ...EMPTY_ROW, name: "Matrix", release_date: "2000-01-01", overview: "alt", runtime: 90,
    director: "X", director_id: 5, vote_average: 5, poster: "/old.jpg",
  };
  const s = setup({ row, linkedGenres: ["g-1"], de: rawDe({ poster_path: null, runtime: 0 }) });
  const r = await refreshMovie(603, s.deps, { fillGapsOnly: false });
  assertEquals(s.updates[0].patch, {
    release_date: "1999-06-17", overview: "Deutsche Beschreibung", director: "Lana Wachowski",
    director_id: 62, vote_average: 8.2,
  }, "patch: poster/runtime kept");
  assertEquals(r.status, "updated", "updated");
});

Deno.test("title: german missing -> english title", async () => {
  const s = setup({
    de: rawDe({ title: "Perfect Days", original_title: "Perfect Days", original_language: "ja" }),
    en: rawEn({ title: "Perfect Days", original_title: "PERFECT DAYS", original_language: "ja" }),
  });
  const r = await refreshMovie(603, s.deps);
  assertEquals(r.status === "updated" && r.titleSource, "en", "source");
  assertEquals((s.updates[0].patch as { name: string }).name, "Perfect Days", "name");
});

Deno.test("title: neither translated -> existing name kept (even with force)", async () => {
  const jp = { title: "千", original_title: "千", original_language: "ja" };
  const s = setup({ de: rawDe(jp), en: rawEn(jp) });
  const r = await refreshMovie(603, s.deps, { fillGapsOnly: false });
  assertEquals("name" in s.updates[0].patch, false, "name untouched");
  assertEquals(r.status === "updated" && r.titleSource, "kept", "source");
});

Deno.test("title overwrites legacy name when german exists, even in fillGapsOnly", async () => {
  const s = setup({ row: { ...EMPTY_ROW, name: "Legacy Name", overview: "x", release_date: "1", poster: "p", runtime: 1, director: "d", director_id: 1, vote_average: 1 }, linkedGenres: ["g"] });
  await refreshMovie(603, s.deps);
  assertEquals(s.updates[0].patch, { name: "Matrix" }, "only name");
});

Deno.test("overview falls back to english when german overview empty; no date at all -> stays null", async () => {
  const s = setup({
    de: rawDe({ overview: "", release_date: "" }),
    en: rawEn({ overview: "English overview", release_date: "" }),
    release: null,
  });
  await refreshMovie(603, s.deps);
  const p = s.updates[0].patch;
  assertEquals(p.overview, "English overview", "en overview");
  assertEquals("release_date" in p, false, "no date written");
});

Deno.test("genres: reuses existing genre rows, creates missing ones; force adds only missing links", async () => {
  const s = setup({
    existingGenres: [{ id: "g-existing", tmdb_genre_id: 28, name: "Action" }],
    linkedGenres: ["g-existing"],
  });
  await refreshMovie(603, s.deps, { fillGapsOnly: false });
  assertEquals(s.insertedGenres, [[{ tmdb_genre_id: 878, name: "Science Fiction" }]], "created missing");
  assertEquals(s.links, [[{ movie_id: "movie-1", genre_id: "g-800" }]], "only missing link");
});

Deno.test("idempotent: applying the patch then re-running yields unchanged", async () => {
  const first = setup();
  const r1 = await refreshMovie(603, first.deps);
  const patch = first.updates[first.updates.length - 1].patch;
  const filled = { ...EMPTY_ROW, ...patch } as RefreshMovieRow;
  const second = setup({ row: filled, linkedGenres: ["g-800", "g-801"] });
  const r2 = await refreshMovie(603, second.deps);
  assertEquals(r1.status, "updated", "first");
  assertEquals(r2, { status: "unchanged", movieId: "movie-1", tmdbId: 603, updatedFields: [], titleSource: "de" }, "second");
  assertEquals(second.updates.length, 0, "no writes second time");
});
