// `refresh_movie` action: fills gaps in (or, with fillGapsOnly=false, refreshes)
// an EXISTING `movies` row from TMDB. Never creates rows. Contract:
// docs/tmdb-proxy-refresh-contract.md. Same injection design as movie-upsert.ts
// (named async DB operations instead of a raw Postgrest client).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  fetchGermanReleaseDates,
  fetchMovieCredits,
  fetchRawMovieDetails,
  mapGenreIds,
  normalizeMovieDetails,
  resolveMovieTitle,
  type FetchJson,
  type GermanReleaseDate,
  type NormalizedCredits,
  type RawTmdbMovieDetails,
  TmdbHttpError,
} from "./tmdb-client.ts";
import type { GenreRow, InsertGenreInput, InsertMovieGenreInput } from "./movie-upsert.ts";

export type { GenreRow } from "./movie-upsert.ts";

export interface RefreshMovieRow {
  id: string;
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

export type RefreshPatch = Partial<Omit<RefreshMovieRow, "id" | "tmdb_id">>;

export interface MovieRefreshDb {
  findMovieFull(tmdbId: number): Promise<RefreshMovieRow | null>;
  updateMovie(id: string, patch: RefreshPatch): Promise<void>;
  findGenresByTmdbGenreIds(tmdbGenreIds: number[]): Promise<GenreRow[]>;
  insertGenres(rows: InsertGenreInput[]): Promise<GenreRow[]>;
  /** genre uuids already linked to the movie via movie_genres */
  findLinkedGenreIds(movieId: string): Promise<string[]>;
  insertMovieGenres(rows: InsertMovieGenreInput[]): Promise<void>;
}

export function createSupabaseMovieRefreshDb(supabase: SupabaseClient): MovieRefreshDb {
  return {
    async findMovieFull(tmdbId) {
      const { data, error } = await supabase
        .from("movies")
        .select("id, tmdb_id, name, release_date, poster, overview, runtime, director, director_id, vote_average")
        .eq("tmdb_id", tmdbId)
        .maybeSingle();
      if (error) throw error;
      return (data as RefreshMovieRow | null) ?? null;
    },
    async updateMovie(id, patch) {
      const { error } = await supabase.from("movies").update(patch).eq("id", id);
      if (error) throw error;
    },
    async findGenresByTmdbGenreIds(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("genres")
        .select("id, tmdb_genre_id, name")
        .in("tmdb_genre_id", ids);
      if (error) throw error;
      return (data as GenreRow[] | null) ?? [];
    },
    async insertGenres(rows) {
      if (rows.length === 0) return [];
      const { data, error } = await supabase.from("genres").insert(rows).select("id, tmdb_genre_id, name");
      if (error) throw error;
      return (data as GenreRow[] | null) ?? [];
    },
    async findLinkedGenreIds(movieId) {
      const { data, error } = await supabase.from("movie_genres").select("genre_id").eq("movie_id", movieId);
      if (error) throw error;
      return ((data as { genre_id: string }[] | null) ?? []).map((r) => r.genre_id);
    },
    async insertMovieGenres(rows) {
      if (rows.length === 0) return;
      const { error } = await supabase.from("movie_genres").insert(rows);
      if (error) throw error;
    },
  };
}

export interface RefreshMovieDeps {
  db: MovieRefreshDb;
  fetchJson?: FetchJson;
  fetchRawDetails?: (tmdbId: number, language: string, fetchJson?: FetchJson) => Promise<RawTmdbMovieDetails>;
  fetchReleaseDates?: (tmdbId: number, fetchJson?: FetchJson) => Promise<GermanReleaseDate | null>;
  fetchCredits?: (tmdbId: number, fetchJson?: FetchJson) => Promise<NormalizedCredits>;
}

export type RefreshField =
  | "name" | "release_date" | "overview" | "runtime" | "director"
  | "director_id" | "vote_average" | "poster" | "genres";

export type RefreshResult =
  | {
    status: "updated" | "unchanged";
    movieId: string;
    tmdbId: number;
    updatedFields: RefreshField[];
    titleSource: "de" | "en" | "kept";
  }
  | { status: "movie_not_found" }
  | { status: "tmdb_not_found" };

function isEmptyText(v: string | null | undefined): boolean {
  return v == null || v.trim() === "";
}
function text(v: string | null | undefined): string | null {
  return isEmptyText(v) ? null : v!.trim();
}

export async function refreshMovie(
  tmdbId: number,
  deps: RefreshMovieDeps,
  options: { fillGapsOnly?: boolean } = {},
): Promise<RefreshResult> {
  const fillGapsOnly = options.fillGapsOnly ?? true;
  const {
    db,
    fetchJson,
    fetchRawDetails = fetchRawMovieDetails,
    fetchReleaseDates = fetchGermanReleaseDates,
    fetchCredits = fetchMovieCredits,
  } = deps;

  const row = await db.findMovieFull(tmdbId);
  if (!row) return { status: "movie_not_found" };

  let de: RawTmdbMovieDetails;
  let en: RawTmdbMovieDetails;
  let germanRelease: GermanReleaseDate | null;
  let credits: NormalizedCredits;
  try {
    [de, en, germanRelease, credits] = await Promise.all([
      fetchRawDetails(tmdbId, "de-DE", fetchJson),
      fetchRawDetails(tmdbId, "en-US", fetchJson),
      fetchReleaseDates(tmdbId, fetchJson),
      fetchCredits(tmdbId, fetchJson),
    ]);
  } catch (error) {
    if (error instanceof TmdbHttpError && error.status === 404) return { status: "tmdb_not_found" };
    throw error;
  }

  const details = normalizeMovieDetails(de);
  const patch: RefreshPatch = {};
  const fields: RefreshField[] = [];

  // `write` decides per column: gap-only fills empty columns, force overwrites
  // whenever TMDB has a value. A missing TMDB value never changes the column.
  const put = <K extends keyof RefreshPatch>(
    field: RefreshField,
    column: K,
    current: unknown,
    isGap: boolean,
    next: RefreshPatch[K] | null | undefined,
  ) => {
    if (next === null || next === undefined) return;
    if (fillGapsOnly && !isGap) return;
    if (current === next) return;
    patch[column] = next;
    fields.push(field);
  };

  // Title: special rule, applies regardless of fillGapsOnly (contract section 4).
  const resolved = resolveMovieTitle(de, en);
  const titleSource = resolved.source === "de" || resolved.source === "en" ? resolved.source : "kept";
  if (titleSource !== "kept" && resolved.title && resolved.title !== row.name) {
    patch.name = resolved.title;
    fields.push("name");
  }

  put("release_date", "release_date", row.release_date, isEmptyText(row.release_date),
    text(germanRelease?.release_date) ?? text(details.releaseDate));
  put("overview", "overview", row.overview, isEmptyText(row.overview),
    text(de.overview) ?? text(en.overview));
  put("runtime", "runtime", row.runtime, row.runtime == null || row.runtime <= 0,
    details.runtime && details.runtime > 0 ? details.runtime : null);
  put("director", "director", row.director, isEmptyText(row.director), text(credits.director?.name));
  put("director_id", "director_id", row.director_id, row.director_id == null, credits.director?.id ?? null);
  put("vote_average", "vote_average", row.vote_average, row.vote_average == null, details.vote_average);
  put("poster", "poster", row.poster, isEmptyText(row.poster), text(details.posterPath));

  if (fields.length > 0) await db.updateMovie(row.id, patch);

  // Genres: additive only (never delete links).
  const genreIds = details.genreIds;
  if (genreIds.length > 0) {
    const linked = new Set(await db.findLinkedGenreIds(row.id));
    if (!fillGapsOnly || linked.size === 0) {
      const existing = await db.findGenresByTmdbGenreIds(genreIds);
      const byTmdbId = new Map(existing.map((g) => [g.tmdb_genre_id, g]));
      const missing = genreIds.filter((id) => !byTmdbId.has(id));
      if (missing.length > 0) {
        const created = await db.insertGenres(
          missing.map((id) => ({ tmdb_genre_id: id, name: mapGenreIds([id])[0] ?? String(id) })),
        );
        for (const g of created) byTmdbId.set(g.tmdb_genre_id, g);
      }
      const newLinks = genreIds
        .map((id) => byTmdbId.get(id))
        .filter((g): g is GenreRow => Boolean(g) && !linked.has(g!.id))
        .map((g) => ({ movie_id: row.id, genre_id: g.id }));
      if (newLinks.length > 0) {
        await db.insertMovieGenres(newLinks);
        fields.push("genres");
      }
    }
  }

  return {
    status: fields.length > 0 ? "updated" : "unchanged",
    movieId: row.id,
    tmdbId,
    updatedFields: fields,
    titleSource,
  };
}
