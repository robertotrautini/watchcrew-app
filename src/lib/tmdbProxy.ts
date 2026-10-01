import { supabase } from "./supabase";

// M6 part 2b (movie sub-view screens: collection/filmography/similar-movies):
// thin client-side wrappers around the additional `tmdb-proxy` Supabase Edge
// Function actions (supabase/functions/tmdb-proxy/index.ts) used by the
// collection, director/actor/studio filmography, similar-movies, and
// providers sub-views. Follows the same "never throw, always resolve
// { data, error }" convention as src/lib/movieDetail.ts (M6 part 2a).
//
// Interim-decision note (log centrally in docs/interim-decisions.md, not
// done here): real TMDB API items for the movie-shaped responses below
// (collection parts, director/actor/studio results) carry extra fields like
// `poster_path`/`vote_average` beyond what some of the proxy's own TS
// interfaces formally type — `TmdbMovieLike` below is intentionally
// permissive (`[key: string]: unknown`) to model that loosely rather than
// mirroring a stricter upstream type.

export interface TmdbProxyResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface TmdbMovieLike {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  [key: string]: unknown;
}

export interface TmdbCollectionResponse {
  id: number;
  name: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  /** Already sorted chronologically ascending server-side (undated last) — do NOT re-sort client-side. */
  parts: TmdbMovieLike[];
}

export interface TmdbStudioMoviesResponse {
  page: number;
  results: TmdbMovieLike[];
  total_pages: number;
  total_results: number;
}

export interface TraktMovieIds {
  trakt?: number;
  slug?: string;
  imdb?: string;
  tmdb?: number;
}

export interface TraktRelatedMovie {
  title: string;
  year?: number;
  ids: TraktMovieIds;
  /** Added server-side by the tmdb-proxy (TMDB lookup); null/absent when unavailable. */
  posterPath?: string | null;
  voteAverage?: number | null;
}

export interface TmdbProviderRef {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
  display_priority?: number;
}

export interface TmdbMovieProviders {
  flatrate: TmdbProviderRef[];
  rent: TmdbProviderRef[];
  buy: TmdbProviderRef[];
}

function toErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

async function invokeTmdbProxy<T>(body: Record<string, unknown>): Promise<TmdbProxyResult<T>> {
  const { data, error } = await supabase.functions.invoke("tmdb-proxy", { body });

  if (error) {
    return { data: null, error: { message: toErrorMessage(error) } };
  }

  return { data: ((data as { data: T } | null)?.data ?? null) as T | null, error: null };
}

export function getCollection(
  tmdbId: number,
  collectionId: number
): Promise<TmdbProxyResult<TmdbCollectionResponse>> {
  return invokeTmdbProxy<TmdbCollectionResponse>({ kind: "collection", tmdbId, collectionId });
}

export function getDirectorMovies(personId: number): Promise<TmdbProxyResult<TmdbMovieLike[]>> {
  return invokeTmdbProxy<TmdbMovieLike[]>({ kind: "director_movies", personId });
}

export function getActorMovies(personId: number): Promise<TmdbProxyResult<TmdbMovieLike[]>> {
  return invokeTmdbProxy<TmdbMovieLike[]>({ kind: "person_movies", personId });
}

export function getStudioMovies(
  companyId: number,
  page?: number
): Promise<TmdbProxyResult<TmdbStudioMoviesResponse>> {
  const body: Record<string, unknown> = { kind: "studio_movies", companyId };
  if (page !== undefined) {
    body.page = page;
  }
  return invokeTmdbProxy<TmdbStudioMoviesResponse>(body);
}

export function getSimilarMovies(tmdbId: number): Promise<TmdbProxyResult<TraktRelatedMovie[]>> {
  return invokeTmdbProxy<TraktRelatedMovie[]>({ kind: "trakt_related", tmdbId });
}

export function getMovieProviders(tmdbId: number): Promise<TmdbProxyResult<TmdbMovieProviders>> {
  return invokeTmdbProxy<TmdbMovieProviders>({ kind: "providers", tmdbId });
}

/** Server-side cap per `providers_batch` request (supabase/functions/tmdb-proxy/providers-cache.ts). */
const PROVIDERS_BATCH_CHUNK_SIZE = 200;

/**
 * ADR 0005: many movies' DE watch providers in ONE round trip. The Edge
 * Function serves fresh `streaming_availability_cache` rows and only hits
 * TMDB for missing/stale ones (24h TTL). Result: tmdb_id (string key) ->
 * providers; ids whose TMDB lookup failed are simply absent. Lists longer
 * than the server cap are split into sequential chunks and merged.
 */
export async function getMoviesProvidersBatch(
  tmdbIds: number[]
): Promise<TmdbProxyResult<Record<string, TmdbMovieProviders>>> {
  const merged: Record<string, TmdbMovieProviders> = {};
  for (let i = 0; i < tmdbIds.length; i += PROVIDERS_BATCH_CHUNK_SIZE) {
    const chunk = tmdbIds.slice(i, i + PROVIDERS_BATCH_CHUNK_SIZE);
    const { data, error } = await invokeTmdbProxy<Record<string, TmdbMovieProviders>>({
      kind: "providers_batch",
      tmdbIds: chunk,
    });
    if (error) {
      return { data: null, error };
    }
    Object.assign(merged, data ?? {});
  }
  return { data: merged, error: null };
}

/**
 * ADR 0005 (replaces the legacy "fill NULL release dates" cron): asks the
 * Edge Function to re-check the TMDB release date of date-less films (server
 * side 24h TTL, writes `movies.release_date`). Result: tmdb_id -> found date,
 * or null when TMDB still has none; failed ids are absent. Chunked like
 * `getMoviesProvidersBatch`.
 */
export async function refreshReleaseDates(
  tmdbIds: number[]
): Promise<TmdbProxyResult<Record<string, string | null>>> {
  const merged: Record<string, string | null> = {};
  for (let i = 0; i < tmdbIds.length; i += PROVIDERS_BATCH_CHUNK_SIZE) {
    const chunk = tmdbIds.slice(i, i + PROVIDERS_BATCH_CHUNK_SIZE);
    const { data, error } = await invokeTmdbProxy<Record<string, string | null>>({
      kind: "refresh_release_dates",
      tmdbIds: chunk,
    });
    if (error) {
      return { data: null, error };
    }
    Object.assign(merged, data ?? {});
  }
  return { data: merged, error: null };
}

/**
 * M10 Settings hub ("Meine Streaming-Dienste" picker,
 * src/app/(app)/(modals)/settings/streaming-services.tsx): the full DE-region
 * TMDB provider catalog, per the `providers_list` action
 * (supabase/functions/tmdb-proxy/tmdb-client.ts's `fetchProvidersList`,
 * already implemented server-side since M6 but never given a client wrapper
 * until now). No params — the server hardcodes `watch_region: "DE"`, same
 * convention as `getMovieProviders` above.
 */
export function getProvidersList(): Promise<TmdbProxyResult<TmdbProviderRef[]>> {
  return invokeTmdbProxy<TmdbProviderRef[]>({ kind: "providers_list" });
}

// ---------------------------------------------------------------------------
// M7 part 2 (Add-Movie-Modal): search actions + the M7 part 1 write action.
// ---------------------------------------------------------------------------

export interface TmdbSearchResult {
  id: number;
  title: string;
  original_title?: string;
  original_language?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  [key: string]: unknown;
}

export interface TmdbPerson {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string;
}

export interface TmdbCompany {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string;
}

export interface UpsertMovieResponse {
  movieId: string;
}

/** Film mode (M7 part 2): fuzzy DE+EN-merged movie search, per `search`. */
export function searchMovies(query: string): Promise<TmdbProxyResult<TmdbSearchResult[]>> {
  return invokeTmdbProxy<TmdbSearchResult[]>({ kind: "search", query });
}

/** Regisseur/Besetzung mode (M7 part 2): person autocomplete, per `search_person`. */
export function searchPerson(query: string): Promise<TmdbProxyResult<TmdbPerson[]>> {
  return invokeTmdbProxy<TmdbPerson[]>({ kind: "search_person", query });
}

/** Studio mode (M7 part 2): company autocomplete, per `search_company` (server-side fuzzy+prefix+logo scored). */
export function searchCompany(query: string): Promise<TmdbProxyResult<TmdbCompany[]>> {
  return invokeTmdbProxy<TmdbCompany[]>({ kind: "search_company", query });
}

/**
 * M7 part 1's `upsert_movie` action, now given its first real caller (M7
 * part 2's rewired `addToWatchlist`, see src/lib/movieDetailMutations.ts):
 * gets-or-creates the local `movies` row for a TMDB id, idempotently.
 *
 * `manualReleaseDate` (M7 consolidation Item 1, see
 * docs/interim-decisions.md): an optional ISO date string, forwarded
 * verbatim to the `upsert_movie` Edge Function action. Omitted from the
 * request body entirely when not given, same convention as
 * `getStudioMovies`'s optional `page` above — the server-side safety rule
 * (a real TMDB release date always wins, this only fills a genuine gap)
 * lives in supabase/functions/tmdb-proxy/movie-upsert.ts, not here.
 */
export function upsertMovie(
  tmdbId: number,
  manualReleaseDate?: string
): Promise<TmdbProxyResult<UpsertMovieResponse>> {
  const body: Record<string, unknown> = { kind: "upsert_movie", tmdbId };
  if (manualReleaseDate !== undefined) {
    body.manualReleaseDate = manualReleaseDate;
  }
  return invokeTmdbProxy<UpsertMovieResponse>(body);
}
