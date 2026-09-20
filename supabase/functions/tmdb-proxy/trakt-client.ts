// Trakt.tv fetch calls for the `trakt_related` action.
//
// Per feature-inventory.md ("`trakt_related`-Action in `tmdb.php`, ersetzt
// frühere TMDB-Similar/Recommendations-Kombination — Changelog 2026-04-03"),
// "similar movies" comes from Trakt.tv, NOT TMDB's own similar/recommendations
// endpoints. Max 40 results.
//
// Trakt's public API identifies movies by Trakt slug/ID or IMDb ID in the
// `/movies/{id}/related` path — it has no endpoint that takes a TMDB ID
// directly there. Interim decision (see docs/interim-decisions.md): resolve
// the TMDB ID to a Trakt slug first via `/search/tmdb/{id}?type=movie`, then
// fetch `/movies/{slug}/related`. Both steps are wrapped in small, named,
// mockable functions so the orchestration/limiting logic can be unit-tested
// without the network.

const TRAKT_BASE_URL = "https://api.trakt.tv";

/** Max results per feature-inventory.md ("bis zu 40 Empfehlungen"). */
export const TRAKT_RELATED_LIMIT = 40;

export type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>;

// Read fresh on every call (not a module-level constant) so tests can set a
// dummy `Deno.env` value after this module has already been imported.
function requireApiKey(): string {
  const apiKey = Deno.env.get("TRAKT_API_KEY");
  if (!apiKey) {
    throw new Error(
      "TRAKT_API_KEY is not set (expected in Supabase Edge Function Secrets, see ADR 0009)",
    );
  }
  return apiKey;
}

function traktHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": requireApiKey(),
  };
}

async function defaultFetchJson(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(
      `Trakt request failed: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return res.json();
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

interface TraktTmdbSearchResult {
  type: string;
  movie?: {
    title: string;
    year?: number;
    ids: TraktMovieIds;
  };
}

/** Pure: picks the first movie result's slug from a Trakt TMDB-ID search response. */
export function extractTraktSlug(
  searchResults: TraktTmdbSearchResult[] | null | undefined,
): string | null {
  if (!searchResults) return null;
  const movieResult = searchResults.find((r) => r.type === "movie" && r.movie);
  return movieResult?.movie?.ids.slug ?? null;
}

/** Pure: caps a related-movies list at TRAKT_RELATED_LIMIT (40). */
export function limitRelatedMovies(
  movies: TraktRelatedMovie[] | null | undefined,
): TraktRelatedMovie[] {
  if (!movies) return [];
  return movies.slice(0, TRAKT_RELATED_LIMIT);
}

export async function resolveTraktSlugFromTmdbId(
  tmdbId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<string | null> {
  const url = `${TRAKT_BASE_URL}/search/tmdb/${tmdbId}?type=movie`;
  const data = (await fetchJson(url, {
    headers: traktHeaders(),
  })) as TraktTmdbSearchResult[];
  return extractTraktSlug(data);
}

export async function fetchTraktRelatedBySlug(
  slug: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TraktRelatedMovie[]> {
  const url =
    `${TRAKT_BASE_URL}/movies/${slug}/related?limit=${TRAKT_RELATED_LIMIT}&extended=full`;
  const data = (await fetchJson(url, {
    headers: traktHeaders(),
  })) as TraktRelatedMovie[];
  return limitRelatedMovies(data);
}

/**
 * Full orchestration: TMDB ID -> Trakt slug -> related movies (capped at 40).
 * Returns an empty array if the TMDB ID can't be resolved to a Trakt movie.
 */
export async function fetchTraktRelated(
  tmdbId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TraktRelatedMovie[]> {
  const slug = await resolveTraktSlugFromTmdbId(tmdbId, fetchJson);
  if (!slug) return [];
  return fetchTraktRelatedBySlug(slug, fetchJson);
}
