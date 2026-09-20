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
