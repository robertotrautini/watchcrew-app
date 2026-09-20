// Deno.test suite for M7 part 1's `upsert_movie` orchestration logic
// (idempotency, new-movie insert shape, genre upsert-if-missing linking,
// special-character round-tripping) using a fully mocked `MovieUpsertDb` —
// no real Supabase client, Postgrest, or TMDB network call involved.
//
// Run with: deno test supabase/functions/tmdb-proxy/movie-upsert.test.ts

import {
  type GenreRow,
  type InsertGenreInput,
  type InsertMovieGenreInput,
  type InsertMovieInput,
  type MovieRow,
  type MovieUpsertDb,
  upsertMovie,
} from "./movie-upsert.ts";
import type {
  GermanReleaseDate,
  NormalizedCredits,
  NormalizedMovieDetails,
} from "./tmdb-client.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}\n  actual:   ${a}\n  expected: ${e}`);
  }
}

// --- fixtures ---------------------------------------------------------

function details(overrides: Partial<NormalizedMovieDetails> = {}): NormalizedMovieDetails {
  return {
    id: 603,
    title: "The Matrix",
    overview: "A hacker discovers reality is a simulation.",
    posterPath: "/poster.jpg",
    releaseDate: "1999-03-30",
    runtime: 136,
    genres: ["Action", "Science Fiction"],
    genreIds: [28, 878],
    belongs_to_collection: null,
    vote_average: 8.1,
    ...overrides,
  };
}

function credits(overrides: Partial<NormalizedCredits> = {}): NormalizedCredits {
  return {
    cast: [],
    crew: [],
    director: { id: 62, name: "Lana Wachowski", job: "Director" },
    ...overrides,
  };
}

// --- fake MovieUpsertDb -------------------------------------------------

interface FakeDbCalls {
  findMovieByTmdbId: number[];
  insertMovie: InsertMovieInput[];
  findGenresByTmdbGenreIds: number[][];
  insertGenres: InsertGenreInput[][];
  insertMovieGenres: InsertMovieGenreInput[][];
}

function createFakeDb(options: {
  existingMovie?: MovieRow | null;
  existingGenres?: GenreRow[];
} = {}): { db: MovieUpsertDb; calls: FakeDbCalls } {
  const calls: FakeDbCalls = {
    findMovieByTmdbId: [],
    insertMovie: [],
    findGenresByTmdbGenreIds: [],
    insertGenres: [],
    insertMovieGenres: [],
  };

  let nextGenreId = 900;

  const db: MovieUpsertDb = {
    findMovieByTmdbId: async (tmdbId) => {
      calls.findMovieByTmdbId.push(tmdbId);
      return options.existingMovie ?? null;
    },
    insertMovie: async (row) => {
      calls.insertMovie.push(row);
      return { id: "new-movie-uuid", tmdb_id: row.tmdb_id };
    },
    findGenresByTmdbGenreIds: async (ids) => {
      calls.findGenresByTmdbGenreIds.push(ids);
      const existing = options.existingGenres ?? [];
      return existing.filter((g) => ids.includes(g.tmdb_genre_id));
    },
    insertGenres: async (rows) => {
      calls.insertGenres.push(rows);
      return rows.map((r) => ({
        id: `genre-uuid-${nextGenreId++}`,
        tmdb_genre_id: r.tmdb_genre_id,
        name: r.name,
      }));
    },
    insertMovieGenres: async (rows) => {
      calls.insertMovieGenres.push(rows);
    },
  };

  return { db, calls };
}

// --- idempotency ------------------------------------------------------

Deno.test("upsertMovie: existing movie -> returns its id, no insert/select-genre calls happen", async () => {
  const { db, calls } = createFakeDb({
    existingMovie: { id: "existing-uuid", tmdb_id: 603 },
  });

  const result = await upsertMovie(603, { db });

  assertEquals(result, { movieId: "existing-uuid" }, "expected the existing row's id to be returned");
  assertEquals(calls.findMovieByTmdbId, [603], "expected exactly one lookup by tmdb_id");
  assert(calls.insertMovie.length === 0, "expected NO insertMovie call for an already-cataloged movie");
  assert(calls.findGenresByTmdbGenreIds.length === 0, "expected no genre lookups either — nothing to link");
  assert(calls.insertGenres.length === 0, "expected no genre inserts");
  assert(calls.insertMovieGenres.length === 0, "expected no movie_genres inserts");
});

Deno.test("upsertMovie: calling twice for the same already-existing tmdb_id is idempotent (no duplicate work either time)", async () => {
  const { db, calls } = createFakeDb({
    existingMovie: { id: "existing-uuid", tmdb_id: 603 },
  });

  const first = await upsertMovie(603, { db });
  const second = await upsertMovie(603, { db });

  assertEquals(first, second, "expected both calls to return the same movieId");
  assertEquals(calls.findMovieByTmdbId, [603, 603], "expected two lookups, one per call");
  assert(calls.insertMovie.length === 0, "expected no insert on either call");
});

// --- new-movie path -----------------------------------------------------

Deno.test("upsertMovie: new movie -> inserts a movies row with correctly-mapped fields, preferring the German release date", async () => {
  const { db, calls } = createFakeDb({ existingGenres: [] });

  const result = await upsertMovie(603, {
    db,
    fetchDetails: async () => details(),
    fetchReleaseDates: async () =>
      ({ category: "Kino", release_date: "1999-04-15", type: 3 }) as GermanReleaseDate,
    fetchCredits: async () => credits(),
  });

  assertEquals(result, { movieId: "new-movie-uuid" }, "expected the newly inserted row's id");
  assertEquals(
    calls.insertMovie,
    [{
      tmdb_id: 603,
      name: "The Matrix",
      release_date: "1999-04-15",
      poster: "/poster.jpg",
      overview: "A hacker discovers reality is a simulation.",
      runtime: 136,
      director: "Lana Wachowski",
      director_id: 62,
      vote_average: 8.1,
    }],
    "expected the mapped movies row, German release date (1999-04-15) preferred over the global one (1999-03-30)",
  );
});

Deno.test("upsertMovie: falls back to the global TMDB release date when there is no German one", async () => {
  const { db, calls } = createFakeDb({ existingGenres: [] });

  await upsertMovie(603, {
    db,
    fetchDetails: async () => details({ releaseDate: "1999-03-30" }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits(),
  });

  const inserted = calls.insertMovie[0];
  assertEquals(inserted.release_date, "1999-03-30", "expected fallback to the global release date");
});

Deno.test("upsertMovie: no director credited -> director/director_id are null, not a throw", async () => {
  const { db, calls } = createFakeDb({ existingGenres: [] });

  await upsertMovie(603, {
    db,
    fetchDetails: async () => details({ genres: [], genreIds: [] }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits({ director: null }),
  });

  const inserted = calls.insertMovie[0];
  assertEquals(inserted.director, null, "expected null director");
  assertEquals(inserted.director_id, null, "expected null director_id");
});

Deno.test("upsertMovie: missing title falls back to a deterministic placeholder rather than inserting NULL into a NOT NULL column", async () => {
  const { db, calls } = createFakeDb({ existingGenres: [] });

  await upsertMovie(603, {
    db,
    fetchDetails: async () => details({ title: null, genres: [], genreIds: [] }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits({ director: null }),
  });

  const inserted = calls.insertMovie[0];
  assertEquals(inserted.name, "TMDB #603", "expected a deterministic placeholder name when TMDB has no title");
});

// --- genre linking --------------------------------------------------------

Deno.test("upsertMovie: links movie_genres for each genre, reusing already-existing genre rows and inserting only the missing one", async () => {
  // 3 genres on the movie: 28 (Action) and 878 (Science Fiction) already
  // exist in `genres`; 12 (Abenteuer) does not yet.
  const existingGenres: GenreRow[] = [
    { id: "genre-action", tmdb_genre_id: 28, name: "Action" },
    { id: "genre-scifi", tmdb_genre_id: 878, name: "Science Fiction" },
  ];

  const { db, calls } = createFakeDb({ existingGenres });

  await upsertMovie(603, {
    db,
    fetchDetails: async () =>
      details({ genres: ["Action", "Science Fiction", "Abenteuer"], genreIds: [28, 878, 12] }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits(),
  });

  assertEquals(
    calls.findGenresByTmdbGenreIds,
    [[28, 878, 12]],
    "expected one lookup covering all 3 genre IDs",
  );
  assertEquals(
    calls.insertGenres,
    [[{ tmdb_genre_id: 12, name: "Abenteuer" }]],
    "expected ONLY the missing genre (12) to be inserted, not the two that already exist",
  );

  const linkedGenreIds = calls.insertMovieGenres[0].map((r) => r.genre_id).sort();
  assertEquals(
    linkedGenreIds,
    ["genre-action", "genre-scifi", "genre-uuid-900"].sort(),
    "expected movie_genres rows for all three genres (two existing + one newly inserted)",
  );
  for (const row of calls.insertMovieGenres[0]) {
    assertEquals(row.movie_id, "new-movie-uuid", "expected every movie_genres row to reference the newly inserted movie's id");
  }
});

Deno.test("upsertMovie: a movie with zero genres skips all genre-table work", async () => {
  const { db, calls } = createFakeDb({ existingGenres: [] });

  await upsertMovie(603, {
    db,
    fetchDetails: async () => details({ genres: [], genreIds: [] }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits({ director: null }),
  });

  assert(calls.findGenresByTmdbGenreIds.length === 0, "expected no genre lookup for a movie with zero genres");
  assert(calls.insertGenres.length === 0, "expected no genre insert");
  assert(calls.insertMovieGenres.length === 0, "expected no movie_genres insert");
});

Deno.test("upsertMovie: all genres already exist -> no genre insert, but movie_genres still links all of them", async () => {
  const existingGenres: GenreRow[] = [
    { id: "genre-action", tmdb_genre_id: 28, name: "Action" },
    { id: "genre-scifi", tmdb_genre_id: 878, name: "Science Fiction" },
  ];
  const { db, calls } = createFakeDb({ existingGenres });

  await upsertMovie(603, {
    db,
    fetchDetails: async () => details({ genres: ["Action", "Science Fiction"], genreIds: [28, 878] }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits(),
  });

  assert(calls.insertGenres.length === 0, "expected no genre insert when all genres already exist");
  assertEquals(
    calls.insertMovieGenres[0].map((r) => r.genre_id).sort(),
    ["genre-action", "genre-scifi"],
    "expected movie_genres rows linking both pre-existing genres",
  );
});

// --- special characters ----------------------------------------------------

Deno.test("upsertMovie: apostrophes/quotes/newlines in the movie name round-trip unmodified into the insert payload", async () => {
  const { db, calls } = createFakeDb({ existingGenres: [] });
  const trickyName = `Mr. O'Brien's "Best" Day\nEver`;

  await upsertMovie(603, {
    db,
    fetchDetails: async () => details({ title: trickyName, genres: [], genreIds: [] }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits({ director: null }),
  });

  const inserted = calls.insertMovie[0];
  assert(
    inserted.name === trickyName,
    `expected the exact tricky name to round-trip unmodified into the insert payload, got: ${inserted.name}`,
  );
});

Deno.test("upsertMovie: apostrophes/quotes in the director name round-trip unmodified", async () => {
  const { db, calls } = createFakeDb({ existingGenres: [] });
  const trickyDirector = `D'Angelo "The Auteur" O'Neil`;

  await upsertMovie(603, {
    db,
    fetchDetails: async () => details({ genres: [], genreIds: [] }),
    fetchReleaseDates: async () => null,
    fetchCredits: async () => credits({ director: { id: 7, name: trickyDirector, job: "Director" } }),
  });

  const inserted = calls.insertMovie[0];
  assertEquals(inserted.director, trickyDirector, "expected the exact tricky director name to round-trip unmodified");
});
