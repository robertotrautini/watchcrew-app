// M7 part 1 — `upsert_movie` action.
//
// Resolves the known RLS gap documented in docs/interim-decisions.md
// ("M6-Cleanup / M7-Vorgriff — `movies`-Tabelle ohne INSERT/UPDATE-RLS"):
// `public.movies`/`genres`/`movie_genres` have no `authenticated` INSERT/
// UPDATE policy (see supabase/migrations/20260919120000_..._rls.sql), so a
// brand-new-to-the-app movie cannot be written by an authenticated client
// directly. This action is Option 2 from that decision entry: a
// service-role-backed Edge Function action that upserts the catalog rows on
// the client's behalf, bypassing RLS the same way the existing cache-aside
// actions already do (see `getSupabaseClient()` in index.ts).
//
// Design: the orchestration logic (`upsertMovie`) takes an injected
// `MovieUpsertDb` (a small set of named async DB operations) instead of a
// raw `SupabaseClient`, mirroring this file's existing `FetchJson`
// injection pattern in tmdb-client.ts. This keeps `upsertMovie` unit-testable
// with plain fakes (assert exactly which DB calls happen, with what
// payload) without needing to mock Postgrest's full chainable query
// builder. `createSupabaseMovieUpsertDb` is the real, production
// implementation, used by index.ts.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  fetchGermanReleaseDates,
  fetchMovieCredits,
  fetchMovieDetails,
  mapGenreIds,
  type FetchJson,
  type GermanReleaseDate,
  type NormalizedCredits,
  type NormalizedMovieDetails,
} from "./tmdb-client.ts";

export interface MovieRow {
  id: string;
  tmdb_id: number;
}

export interface GenreRow {
  id: string;
  tmdb_genre_id: number;
  name: string;
}

export interface InsertMovieInput {
  tmdb_id: number;
  name: string;
  release_date: string | null;
  poster: string | null;
  overview: string | null;
  runtime: number | null;
  director: string | null;
  director_id: number | null;
  vote_average: number | null;
}

export interface InsertGenreInput {
  tmdb_genre_id: number;
  name: string;
}

export interface InsertMovieGenreInput {
  movie_id: string;
  genre_id: string;
}

/** Injectable DB operations backing `upsertMovie` — see file header. */
export interface MovieUpsertDb {
  findMovieByTmdbId(tmdbId: number): Promise<MovieRow | null>;
  insertMovie(row: InsertMovieInput): Promise<MovieRow>;
  findGenresByTmdbGenreIds(tmdbGenreIds: number[]): Promise<GenreRow[]>;
  insertGenres(rows: InsertGenreInput[]): Promise<GenreRow[]>;
  insertMovieGenres(rows: InsertMovieGenreInput[]): Promise<void>;
}

/**
 * Real, production `MovieUpsertDb` — wraps the service-role Supabase client
 * (bypasses RLS by default, same as every other write in this Edge
 * Function). Every operation uses the Supabase JS client's normal
 * `.insert()`/`.select()`/`.eq()`/`.in()` query builder, which parameterizes
 * values internally — no raw string-concatenated SQL anywhere here, so
 * names containing apostrophes/quotes/newlines (feature-inventory.md
 * Section 4.11: movie/person/studio names can contain arbitrary special
 * characters) round-trip safely by construction.
 */
export function createSupabaseMovieUpsertDb(
  supabase: SupabaseClient,
): MovieUpsertDb {
  return {
    async findMovieByTmdbId(tmdbId) {
      const { data, error } = await supabase
        .from("movies")
        .select("id, tmdb_id")
        .eq("tmdb_id", tmdbId)
        .maybeSingle();
      if (error) throw error;
      return (data as MovieRow | null) ?? null;
    },

    async insertMovie(row) {
      const { data, error } = await supabase
        .from("movies")
        .insert(row)
        .select("id, tmdb_id")
        .single();

      if (error) {
        // Interim decision (docs/interim-decisions.md): `movies.tmdb_id` is
        // UNIQUE (M1 schema). Two concurrent `upsert_movie` calls for the
        // same brand-new tmdb_id could both pass the initial
        // findMovieByTmdbId "doesn't exist yet" check before either has
        // inserted, so the second insert here can legitimately hit a
        // unique-violation (Postgres code 23505) — not a real error from
        // the caller's point of view, since the desired end state (a
        // `movies` row for this tmdb_id exists) is already true. Re-read
        // and return that row instead of surfacing a 500, so `upsert_movie`
        // stays idempotent under this race too, not just under sequential
        // repeat calls.
        if ((error as { code?: string }).code === "23505") {
          const { data: raceRow, error: raceError } = await supabase
            .from("movies")
            .select("id, tmdb_id")
            .eq("tmdb_id", row.tmdb_id)
            .single();
          if (raceError) throw raceError;
          return raceRow as MovieRow;
        }
        throw error;
      }

      return data as MovieRow;
    },

    async findGenresByTmdbGenreIds(tmdbGenreIds) {
      if (tmdbGenreIds.length === 0) return [];
      const { data, error } = await supabase
        .from("genres")
        .select("id, tmdb_genre_id, name")
        .in("tmdb_genre_id", tmdbGenreIds);
      if (error) throw error;
      return (data as GenreRow[] | null) ?? [];
    },

    async insertGenres(rows) {
      if (rows.length === 0) return [];
      const { data, error } = await supabase
        .from("genres")
        .insert(rows)
        .select("id, tmdb_genre_id, name");
      if (error) throw error;
      return (data as GenreRow[] | null) ?? [];
    },

    async insertMovieGenres(rows) {
      if (rows.length === 0) return;
      const { error } = await supabase.from("movie_genres").insert(rows);
      if (error) throw error;
    },
  };
}

export interface UpsertMovieDeps {
  db: MovieUpsertDb;
  /** Injectable JSON fetcher, forwarded to the TMDB fetch functions below (tests never need this — they inject fetchDetails/fetchReleaseDates/fetchCredits fakes directly instead). */
  fetchJson?: FetchJson;
  fetchDetails?: (
    tmdbId: number,
    fetchJson?: FetchJson,
  ) => Promise<NormalizedMovieDetails>;
  fetchReleaseDates?: (
    tmdbId: number,
    fetchJson?: FetchJson,
  ) => Promise<GermanReleaseDate | null>;
  fetchCredits?: (
    tmdbId: number,
    fetchJson?: FetchJson,
  ) => Promise<NormalizedCredits>;
}

/**
 * Deterministic placeholder used only in the (expected-rare) case where
 * TMDB has no title for a movie at all — `movies.name` is NOT NULL (M1
 * schema), so we must insert *something*. Interim decision (see
 * docs/interim-decisions.md): a stable, greppable placeholder rather than
 * an empty string, so a future data-quality pass can find these.
 */
function placeholderMovieName(tmdbId: number): string {
  return `TMDB #${tmdbId}`;
}

/**
 * `upsert_movie` orchestration — idempotent by `tmdb_id`.
 *
 * 1. Looks up an existing `movies` row by `tmdb_id` (service-role, bypasses
 *    RLS). If found, returns its id immediately — no TMDB calls, no writes.
 * 2. Otherwise fetches details/German-release-date/credits from TMDB
 *    (reusing the already-built M6 `tmdb-client.ts` functions), maps them
 *    onto the exact M1 `movies` column names, inserts the row, then
 *    upserts-if-missing the `genres` rows and links them via `movie_genres`.
 *
 * @param manualReleaseDate M7 consolidation (Item 1, see
 *   docs/interim-decisions.md): an optional ISO date string collected by the
 *   Add-Movie-Modal's manual-date fallback UI when TMDB has no release date
 *   at all for this movie. This is the LOWEST-priority fallback in the
 *   release-date resolution chain — it only ever fills a genuine gap left by
 *   TMDB (both the German-region and the global release date being absent).
 *   SAFETY: a client-supplied `manualReleaseDate` is NEVER allowed to
 *   silently override a real TMDB release date — if TMDB has EITHER a
 *   German or a global release date, that value wins outright and
 *   `manualReleaseDate` is ignored (logged, not silently dropped) for this
 *   tmdb_id. Only relevant on the new-movie insert path — an already-
 *   cataloged movie (the early-return branch above) is never updated by
 *   this action at all, manual or otherwise.
 */
export async function upsertMovie(
  tmdbId: number,
  deps: UpsertMovieDeps,
  manualReleaseDate?: string,
): Promise<{ movieId: string }> {
  const {
    db,
    fetchJson,
    fetchDetails = fetchMovieDetails,
    fetchReleaseDates = fetchGermanReleaseDates,
    fetchCredits = fetchMovieCredits,
  } = deps;

  const existing = await db.findMovieByTmdbId(tmdbId);
  if (existing) {
    return { movieId: existing.id };
  }

  const [details, germanReleaseDate, credits] = await Promise.all([
    fetchDetails(tmdbId, fetchJson),
    fetchReleaseDates(tmdbId, fetchJson),
    fetchCredits(tmdbId, fetchJson),
  ]);

  // Interim decision (docs/interim-decisions.md): German release date
  // preferred over the global TMDB one, per feature-inventory.md's exact
  // metadata list ("deutsches Kino-/Digital-/TV-Releasedatum ... bevorzugt
  // vor globalem TMDB-Datum"). Falls back to the global `release_date` from
  // `details` when TMDB has no DE-region release_dates entry at all.
  //
  // M7 consolidation (Item 1): `manualReleaseDate` is a THIRD, lowest-
  // priority fallback, only reached when TMDB gave us neither a German nor
  // a global release date — see this function's own doc comment above for
  // the full safety rationale. The `??` chain already encodes that priority
  // correctly by construction (a real TMDB value short-circuits before
  // `manualReleaseDate` is ever consulted); the explicit check below only
  // exists to make that safety behavior observable (logged), not to change
  // the resolution itself.
  const tmdbReleaseDate = germanReleaseDate?.release_date ?? details.releaseDate ?? null;
  if (manualReleaseDate && tmdbReleaseDate) {
    console.log(
      `upsertMovie: ignoring client-supplied manualReleaseDate ("${manualReleaseDate}") for tmdb_id ${tmdbId} — TMDB already has a release date ("${tmdbReleaseDate}"), which always wins.`,
    );
  }
  const releaseDate = tmdbReleaseDate ?? manualReleaseDate ?? null;

  const movieRow = await db.insertMovie({
    tmdb_id: tmdbId,
    name: details.title ?? placeholderMovieName(tmdbId),
    release_date: releaseDate,
    poster: details.posterPath ?? null,
    overview: details.overview ?? null,
    runtime: details.runtime ?? null,
    director: credits.director?.name ?? null,
    director_id: credits.director?.id ?? null,
    vote_average: details.vote_average ?? null,
  });

  const genreIds = details.genreIds ?? [];
  if (genreIds.length > 0) {
    const existingGenres = await db.findGenresByTmdbGenreIds(genreIds);
    const genreByTmdbId = new Map(existingGenres.map((g) => [g.tmdb_genre_id, g]));

    const missingGenreIds = genreIds.filter((id) => !genreByTmdbId.has(id));
    const missingGenreRows: InsertGenreInput[] = missingGenreIds.map((id) => ({
      tmdb_genre_id: id,
      // mapGenreIds([id])[0] re-derives the (German) name from the same
      // static table fetchMovieDetails already used for `details.genres` —
      // reused, not reimplemented. An id absent from the static table
      // (should not happen with real TMDB genre ids) falls back to its
      // stringified id rather than crashing.
      name: mapGenreIds([id])[0] ?? String(id),
    }));

    const insertedGenres = missingGenreRows.length > 0
      ? await db.insertGenres(missingGenreRows)
      : [];
    for (const g of insertedGenres) genreByTmdbId.set(g.tmdb_genre_id, g);

    const movieGenreRows: InsertMovieGenreInput[] = genreIds
      .map((id) => genreByTmdbId.get(id))
      .filter((g): g is GenreRow => Boolean(g))
      .map((g) => ({ movie_id: movieRow.id, genre_id: g.id }));

    await db.insertMovieGenres(movieGenreRows);
  }

  return { movieId: movieRow.id };
}
