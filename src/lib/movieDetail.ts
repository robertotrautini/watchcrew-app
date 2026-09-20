import { supabase } from "./supabase";
import type {
  GermanReleaseDate,
  NormalizedCredits,
  NormalizedMovieDetails,
  TmdbMovieProviders,
  TmdbVideo,
} from "./movieDetailTypes";

// M6 part 2a (Movie-Detail-Overlay): thin client-side wrapper around the
// `tmdb-proxy` Supabase Edge Function (supabase/functions/tmdb-proxy/index.ts).
//
// No prior client-side caller of `tmdb-proxy` existed anywhere in src/
// before this file (confirmed by grepping src/ for "tmdb-proxy" and
// "functions.invoke" — no hits) — this `invokeTmdbProxy` helper is newly
// introduced here, following the same "never throw, always return
// Supabase's raw { data, error } tuple" convention as src/lib/watchlist.ts,
// so src/hooks/useMovieDetail.ts can branch on `error` exactly like
// src/hooks/useGroupWatchlist.ts does.
//
// Response-envelope note: the Edge Function wraps its real payload as
// `{ data: <result> }` on success (HTTP 200) or `{ error: string }` on
// failure (400/500). supabase-js's `functions.invoke` already turns a
// non-2xx response into its own `error` (a FunctionsHttpError, with
// `data: null`), so the only unwrapping this helper does on the success
// path is peeling off that one extra `{ data: ... }` envelope layer.

type TmdbProxyKind = "details" | "videos" | "credits" | "release_dates" | "providers";

interface TmdbProxyResult<T> {
  data: T | null;
  error: unknown;
}

async function invokeTmdbProxy<T>(
  kind: TmdbProxyKind,
  tmdbId: number,
  region: string = "DE"
): Promise<TmdbProxyResult<T>> {
  const { data, error } = await supabase.functions.invoke("tmdb-proxy", {
    body: { kind, tmdbId, region },
  });

  if (error) {
    return { data: null, error };
  }

  return { data: ((data as { data: T } | null)?.data ?? null) as T | null, error: null };
}

export function getMovieDetails(tmdbId: number): Promise<TmdbProxyResult<NormalizedMovieDetails>> {
  return invokeTmdbProxy<NormalizedMovieDetails>("details", tmdbId);
}

export function getMovieTrailer(tmdbId: number): Promise<TmdbProxyResult<TmdbVideo | null>> {
  return invokeTmdbProxy<TmdbVideo | null>("videos", tmdbId);
}

export function getMovieCredits(tmdbId: number): Promise<TmdbProxyResult<NormalizedCredits>> {
  return invokeTmdbProxy<NormalizedCredits>("credits", tmdbId);
}

export function getGermanReleaseDate(
  tmdbId: number
): Promise<TmdbProxyResult<GermanReleaseDate | null>> {
  return invokeTmdbProxy<GermanReleaseDate | null>("release_dates", tmdbId);
}

export function getMovieProviders(tmdbId: number): Promise<TmdbProxyResult<TmdbMovieProviders>> {
  return invokeTmdbProxy<TmdbMovieProviders>("providers", tmdbId);
}
