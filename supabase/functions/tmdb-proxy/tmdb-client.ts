// TMDB fetch calls used by the cache-aside Edge Function handler.
//
// M1 left `fetchMetadataFromTmdb`/`fetchStreamingFromTmdb` (kind: "metadata" |
// "streaming") stubbed — those two are left UNCHANGED here (still stubbed,
// still TODO) per the M6-part-1 task scope: M6 part 1 only adds the NEW
// actions needed by the Movie-Detail-Overlay (search/details/videos/credits/
// release_dates/collection/providers/providers_list/search_person/
// person_movies/director_movies/search_company/studio_movies), per
// docs/feature-inventory.md Section 3 (old `tmdb.php` behavior).
//
// Every actual network call is wrapped by a small, named function that takes
// an injectable `fetchJson` (defaulting to a real `fetch()`-based
// implementation) so the surrounding LOGIC (merging, priority selection,
// mapping, scoring) can be unit-tested with fixture data without hitting the
// real TMDB API — see tmdb-client.test.ts.

// ---------------------------------------------------------------------------
// Existing M1 stubs (kind: "metadata" | "streaming") — UNCHANGED.
// ---------------------------------------------------------------------------

export interface TmdbMetadata {
  runtime: number | null;
  director: string | null;
  genres: string[] | null;
  poster: string | null;
  [key: string]: unknown;
}

export interface TmdbStreamingAvailability {
  providers: string[];
  [key: string]: unknown;
}

const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");

/**
 * TODO: implement full DE+EN merge + field mapping per feature-inventory.md
 * Section 3 (old tmdb.php behavior). This placeholder does not call the
 * real TMDB API yet — it only validates that the key is configured and
 * returns an all-null shape, matching movie_metadata_cache's "data" jsonb
 * shape closely enough for the cache-aside plumbing to be exercised.
 *
 * Left untouched by the M6-part-1 task on purpose (kind: "metadata" keeps
 * working unchanged) — the new, real `details`/`videos`/`credits`/
 * `release_dates`/`collection` actions below are intentionally namespaced
 * under their OWN keys in the same cache row's `data` blob so they never
 * collide with this stub's `runtime`/`director`/`genres`/`poster` keys.
 */
export function fetchMetadataFromTmdb(
  _tmdbId: number,
): Promise<TmdbMetadata> {
  if (!TMDB_API_KEY) {
    throw new Error(
      "TMDB_API_KEY is not set (expected in Supabase Edge Function Secrets, see ADR 0009)",
    );
  }

  return Promise.resolve({
    runtime: null,
    director: null,
    genres: null,
    poster: null,
  });
}

/**
 * TODO: implement full DE+EN merge + field mapping per feature-inventory.md
 * Section 3 (old tmdb.php behavior). This placeholder does not call the
 * real TMDB API yet. Left untouched by the M6-part-1 task on purpose.
 */
export function fetchStreamingFromTmdb(
  _tmdbId: number,
  _region: string,
): Promise<TmdbStreamingAvailability> {
  if (!TMDB_API_KEY) {
    throw new Error(
      "TMDB_API_KEY is not set (expected in Supabase Edge Function Secrets, see ADR 0009)",
    );
  }

  return Promise.resolve({
    providers: [],
  });
}

// ---------------------------------------------------------------------------
// M6 part 1 — shared HTTP plumbing
// ---------------------------------------------------------------------------

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/** Injectable JSON fetcher — tests supply a fake, production uses the default. */
export type FetchJson = (url: string) => Promise<unknown>;

async function defaultFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `TMDB request failed: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return res.json();
}

// Deliberately read fresh on every call (not the module-level `TMDB_API_KEY`
// constant above, which is only used by the M1 stub functions) — this keeps
// the key lookup lazy so tests can set a dummy `Deno.env` value AFTER this
// module has already been imported, without needing to touch the stubs.
function requireApiKey(): string {
  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey) {
    throw new Error(
      "TMDB_API_KEY is not set (expected in Supabase Edge Function Secrets, see ADR 0009)",
    );
  }
  return apiKey;
}

function buildUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", requireApiKey());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Genre mapping — static TMDB-ID -> German-name table (NOT a live DE/EN
// merge; per feature-inventory.md, genres come from a static local lookup).
// ---------------------------------------------------------------------------

export const TMDB_GENRE_MAP: Readonly<Record<number, string>> = {
  28: "Action",
  12: "Abenteuer",
  16: "Animation",
  35: "Komödie",
  80: "Krimi",
  99: "Dokumentarfilm",
  18: "Drama",
  10751: "Familie",
  14: "Fantasy",
  36: "Historie",
  27: "Horror",
  10402: "Musik",
  9648: "Mystery",
  10749: "Liebesfilm",
  878: "Science Fiction",
  10770: "TV-Film",
  53: "Thriller",
  10752: "Kriegsfilm",
  37: "Western",
};

/** Pure: maps TMDB genre IDs to their German names via the static table above. */
export function mapGenreIds(genreIds: number[] | null | undefined): string[] {
  if (!genreIds) return [];
  return genreIds
    .map((id) => TMDB_GENRE_MAP[id])
    .filter((name): name is string => Boolean(name));
}

// ---------------------------------------------------------------------------
// `videos` action — trailer/teaser priority selection.
// ---------------------------------------------------------------------------

export interface TmdbVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  name?: string;
}

export interface TmdbVideosResponse {
  id?: number;
  results: TmdbVideo[];
}

/**
 * Pure: Trailer type > Teaser type > first video in the list > null.
 * No language filtering — none is documented in feature-inventory.md.
 */
export function selectTrailer(
  videos: TmdbVideo[] | null | undefined,
): TmdbVideo | null {
  if (!videos || videos.length === 0) return null;
  return (
    videos.find((v) => v.type === "Trailer") ??
    videos.find((v) => v.type === "Teaser") ??
    videos[0]
  );
}

export async function fetchMovieVideos(
  tmdbId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbVideo | null> {
  const url = buildUrl(`/movie/${tmdbId}/videos`, {});
  const data = (await fetchJson(url)) as TmdbVideosResponse;
  return selectTrailer(data.results);
}

// ---------------------------------------------------------------------------
// `release_dates` action — German region, Kino > Digital > TV priority.
// ---------------------------------------------------------------------------

export interface TmdbReleaseDateEntry {
  certification?: string;
  iso_639_1?: string;
  release_date: string;
  type: number;
  note?: string;
}

export interface TmdbReleaseDatesRegion {
  iso_3166_1: string;
  release_dates: TmdbReleaseDateEntry[];
}

export interface TmdbReleaseDatesResponse {
  id?: number;
  results: TmdbReleaseDatesRegion[];
}

export type GermanReleaseCategory = "Kino" | "Digital" | "TV";

export interface GermanReleaseDate {
  category: GermanReleaseCategory;
  release_date: string;
  type: number;
}

// TMDB release_dates.results[].release_dates[].type codes (public, stable):
// 1=Premiere, 2=Theatrical (limited), 3=Theatrical, 4=Digital, 5=Physical, 6=TV.
//
// Interim decision (documented in docs/interim-decisions.md): type 3 is the
// primary "Kino" match; type 2 (limited theatrical) is treated as a
// Kino-equivalent FALLBACK when type 3 is absent — feature-inventory.md does
// not distinguish the two, this is our own reasonable interpretation.
const KINO_TYPE_PRIMARY = 3;
const KINO_TYPE_FALLBACK = 2;
const DIGITAL_TYPE = 4;
const TV_TYPE = 6;

/**
 * Pure: filters to the DE region, then picks Kino (type 3, else type 2) >
 * Digital (type 4) > TV (type 6) > null.
 */
export function selectGermanReleaseDate(
  response: TmdbReleaseDatesResponse | null | undefined,
): GermanReleaseDate | null {
  const deRegion = response?.results?.find((r) => r.iso_3166_1 === "DE");
  const entries = deRegion?.release_dates ?? [];
  if (entries.length === 0) return null;

  const kino = entries.find((e) => e.type === KINO_TYPE_PRIMARY) ??
    entries.find((e) => e.type === KINO_TYPE_FALLBACK);
  if (kino) {
    return { category: "Kino", release_date: kino.release_date, type: kino.type };
  }

  const digital = entries.find((e) => e.type === DIGITAL_TYPE);
  if (digital) {
    return {
      category: "Digital",
      release_date: digital.release_date,
      type: digital.type,
    };
  }

  const tv = entries.find((e) => e.type === TV_TYPE);
  if (tv) {
    return { category: "TV", release_date: tv.release_date, type: tv.type };
  }

  return null;
}

export async function fetchGermanReleaseDates(
  tmdbId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<GermanReleaseDate | null> {
  const url = buildUrl(`/movie/${tmdbId}/release_dates`, {});
  const data = (await fetchJson(url)) as TmdbReleaseDatesResponse;
  return selectGermanReleaseDate(data);
}

// ---------------------------------------------------------------------------
// `details` action — runtime, genres (via static map), belongs_to_collection,
// vote_average.
// ---------------------------------------------------------------------------

export interface TmdbCollectionRef {
  id: number;
  name: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
}

interface RawTmdbMovieDetails {
  id: number;
  // Added in M7 part 1 (see docs/interim-decisions.md) — title/overview/
  // poster_path/release_date were not needed by M6's "details" action
  // consumers (they already had these fields from elsewhere: the search
  // result, the DB row, or route params) but ARE needed by the new
  // `upsert_movie` action, which starts from nothing but a bare `tmdbId`
  // and must insert a full `movies` row. Reusing this same `/movie/{id}`
  // call/function (rather than a second, separate fetch) for those extra
  // fields is the whole point of the "reuse fetchMovieDetails" instruction.
  title?: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  runtime: number | null;
  genres?: { id: number; name: string }[];
  belongs_to_collection: TmdbCollectionRef | null;
  vote_average: number | null;
}

export interface NormalizedMovieDetails {
  id: number;
  runtime: number | null;
  genres: string[];
  belongs_to_collection: TmdbCollectionRef | null;
  vote_average: number | null;
  // M7 part 1 additions (additive only — existing fields/shape above are
  // UNCHANGED, so the already-shipped `kind: "details"` action's response
  // stays backward compatible for its existing consumers):
  title: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  /** Raw TMDB genre IDs, in the same order as `genres` — `mapGenreIds`
   *  already collapses IDs to (German) names for the `details` action's
   *  existing consumers, but `upsert_movie` needs the original numeric IDs
   *  back to upsert `genres.tmdb_genre_id` rows. */
  genreIds: number[];
}

export async function fetchMovieDetails(
  tmdbId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<NormalizedMovieDetails> {
  // M7 part 1 (see docs/interim-decisions.md): `language: "de-DE"` added so
  // the new title/overview fields come back German-first, consistent with
  // every other German-preferring action in this file (search, release
  // dates, genre names). This was NOT previously set (M6 left it unset,
  // i.e. whatever TMDB's default is) — the only observable effect on the
  // existing `details` action is that `belongs_to_collection.name` may now
  // read in German instead of the previous default language; runtime,
  // genre IDs (mapped via the static table regardless of language), and
  // vote_average are unaffected.
  const url = buildUrl(`/movie/${tmdbId}`, { language: "de-DE" });
  const raw = (await fetchJson(url)) as RawTmdbMovieDetails;
  return {
    id: raw.id,
    runtime: raw.runtime ?? null,
    genres: mapGenreIds((raw.genres ?? []).map((g) => g.id)),
    belongs_to_collection: raw.belongs_to_collection ?? null,
    vote_average: raw.vote_average ?? null,
    title: raw.title ?? null,
    overview: raw.overview ?? null,
    posterPath: raw.poster_path ?? null,
    releaseDate: raw.release_date ?? null,
    genreIds: (raw.genres ?? []).map((g) => g.id),
  };
}

// ---------------------------------------------------------------------------
// `credits` action — cast + crew, director extraction.
// ---------------------------------------------------------------------------

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  order?: number;
  profile_path?: string | null;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department?: string;
}

export interface TmdbCreditsResponse {
  id?: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

/**
 * Interim decision: the display-only "top 10 cast" cap is applied HERE, in
 * the Edge Function response, rather than left to the client — see
 * docs/interim-decisions.md. `crew` is passed through uncapped.
 */
export const CAST_DISPLAY_LIMIT = 10;

/** Pure: first crew member with job === "Director", else null. */
export function extractDirector(
  crew: TmdbCrewMember[] | null | undefined,
): TmdbCrewMember | null {
  if (!crew) return null;
  return crew.find((c) => c.job === "Director") ?? null;
}

/** Pure: crew entries filtered to job === "Director" (used for director_movies too). */
export function filterDirectorCredits(
  crew: TmdbCrewMember[] | null | undefined,
): TmdbCrewMember[] {
  if (!crew) return [];
  return crew.filter((c) => c.job === "Director");
}

export interface NormalizedCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
  director: TmdbCrewMember | null;
}

export async function fetchMovieCredits(
  tmdbId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<NormalizedCredits> {
  const url = buildUrl(`/movie/${tmdbId}/credits`, {});
  const data = (await fetchJson(url)) as TmdbCreditsResponse;
  const crew = data.crew ?? [];
  return {
    cast: (data.cast ?? []).slice(0, CAST_DISPLAY_LIMIT),
    crew,
    director: extractDirector(crew),
  };
}

// ---------------------------------------------------------------------------
// `collection` action — Filmreihe parts, chronological order.
// ---------------------------------------------------------------------------

export interface TmdbCollectionPart {
  id: number;
  title: string;
  release_date?: string;
  [key: string]: unknown;
}

export interface TmdbCollectionResponse {
  id: number;
  name: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  parts: TmdbCollectionPart[];
}

/** Pure: sorts collection parts by release_date ascending; undated parts last. */
export function sortCollectionParts(
  parts: TmdbCollectionPart[] | null | undefined,
): TmdbCollectionPart[] {
  if (!parts) return [];
  return [...parts].sort((a, b) => {
    const ad = a.release_date || "";
    const bd = b.release_date || "";
    if (!ad && !bd) return 0;
    if (!ad) return 1;
    if (!bd) return -1;
    return ad.localeCompare(bd);
  });
}

export async function fetchCollection(
  collectionId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbCollectionResponse> {
  const url = buildUrl(`/collection/${collectionId}`, {});
  const data = (await fetchJson(url)) as TmdbCollectionResponse;
  return { ...data, parts: sortCollectionParts(data.parts) };
}

// ---------------------------------------------------------------------------
// `providers` / `providers_list` actions — DE region only.
// ---------------------------------------------------------------------------

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

interface RawTmdbWatchProvidersResponse {
  results?: Record<
    string,
    {
      flatrate?: TmdbProviderRef[];
      rent?: TmdbProviderRef[];
      buy?: TmdbProviderRef[];
    }
  >;
}

export async function fetchMovieProviders(
  tmdbId: number,
  fetchJson: FetchJson = defaultFetchJson,
  region: string = "DE",
): Promise<TmdbMovieProviders> {
  const url = buildUrl(`/movie/${tmdbId}/watch/providers`, {});
  const data = (await fetchJson(url)) as RawTmdbWatchProvidersResponse;
  const regional = data.results?.[region];
  return {
    flatrate: regional?.flatrate ?? [],
    rent: regional?.rent ?? [],
    buy: regional?.buy ?? [],
  };
}

export async function fetchProvidersList(
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbProviderRef[]> {
  const url = buildUrl("/watch/providers/movie", { watch_region: "DE" });
  const data = (await fetchJson(url)) as { results?: TmdbProviderRef[] };
  return data.results ?? [];
}

// ---------------------------------------------------------------------------
// `search` action — DE+EN merged movie search.
// ---------------------------------------------------------------------------

export interface TmdbSearchResult {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date?: string;
  poster_path?: string | null;
  [key: string]: unknown;
}

export interface TmdbSearchResponse {
  results: TmdbSearchResult[];
  page?: number;
  total_pages?: number;
  total_results?: number;
}

/**
 * Pure: DE+EN merge, EN-title fallback when there is no German translation.
 *
 * Detection heuristic (interim decision, see docs/interim-decisions.md): a
 * DE-language search result has "no German translation" when TMDB's own
 * `title` field equals `original_title` AND the movie's `original_language`
 * is not already German — TMDB itself falls back to `original_title` when it
 * has no translation for the requested language, so this equality is the
 * observable signal, not an invented heuristic.
 */
export function mergeSearchResults(
  deResults: TmdbSearchResult[] | null | undefined,
  enResults: TmdbSearchResult[] | null | undefined,
): TmdbSearchResult[] {
  const de = deResults ?? [];
  const enById = new Map((enResults ?? []).map((r) => [r.id, r]));

  return de.map((result) => {
    const hasNoGermanTranslation =
      result.original_language !== "de" &&
      result.title === result.original_title;

    if (hasNoGermanTranslation) {
      const en = enById.get(result.id);
      if (en && en.title) {
        return { ...result, title: en.title };
      }
    }

    return result;
  });
}

export async function searchMovies(
  query: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbSearchResult[]> {
  const deUrl = buildUrl("/search/movie", { query, language: "de-DE" });
  const enUrl = buildUrl("/search/movie", { query, language: "en-US" });
  const [deRes, enRes] = await Promise.all([
    fetchJson(deUrl) as Promise<TmdbSearchResponse>,
    fetchJson(enUrl) as Promise<TmdbSearchResponse>,
  ]);
  return mergeSearchResults(deRes.results, enRes.results);
}

// ---------------------------------------------------------------------------
// `search_person` / `person_movies` / `director_movies` actions.
// ---------------------------------------------------------------------------

export interface TmdbPerson {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string;
}

export async function searchPerson(
  query: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbPerson[]> {
  const url = buildUrl("/search/person", { query, language: "de-DE" });
  const data = (await fetchJson(url)) as { results?: TmdbPerson[] };
  return data.results ?? [];
}

export interface TmdbPersonCastCredit extends TmdbCollectionPart {
  character?: string;
}

export interface TmdbPersonCrewCredit extends TmdbCrewMember {
  title?: string;
  release_date?: string;
}

export interface TmdbPersonMovieCredits {
  cast: TmdbPersonCastCredit[];
  crew: TmdbPersonCrewCredit[];
}

export async function fetchPersonMovieCredits(
  personId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbPersonMovieCredits> {
  const url = buildUrl(`/person/${personId}/movie_credits`, {
    language: "de-DE",
  });
  const data = (await fetchJson(url)) as TmdbPersonMovieCredits;
  return { cast: data.cast ?? [], crew: data.crew ?? [] };
}

/** An actor's filmography — the cast side of person movie credits. */
export async function fetchPersonMovies(
  personId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbPersonCastCredit[]> {
  const credits = await fetchPersonMovieCredits(personId, fetchJson);
  return credits.cast;
}

/** A director's filmography — the crew side, filtered to job === "Director". */
export async function fetchDirectorMovies(
  personId: number,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbPersonCrewCredit[]> {
  const credits = await fetchPersonMovieCredits(personId, fetchJson);
  return filterDirectorCredits(credits.crew) as TmdbPersonCrewCredit[];
}

// ---------------------------------------------------------------------------
// `search_company` / `studio_movies` actions.
// ---------------------------------------------------------------------------

export interface TmdbCompany {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/** Pure: normalized Levenshtein similarity in [0, 1], 1 = identical. */
function fuzzyScore(query: string, name: string): number {
  const q = query.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (!q || !n) return 0;
  if (q === n) return 1;
  if (n.includes(q)) return 0.8;
  const distance = levenshteinDistance(q, n);
  const maxLen = Math.max(q.length, n.length);
  return Math.max(0, 1 - distance / maxLen);
}

// Interim decision (see docs/interim-decisions.md): bonus weights are our own
// reasonable choice — feature-inventory.md names the three scoring factors
// ("Fuzzy-Score + Prefix-Bonus + Logo-Bonus") but gives no concrete weights.
const PREFIX_MATCH_BONUS = 0.5;
const HAS_LOGO_BONUS = 0.2;

/**
 * Pure: composite score = fuzzy-match score + prefix-match bonus + has-logo
 * bonus, per feature-inventory.md's documented `search_company` ranking.
 */
export function scoreCompanyMatch(query: string, company: TmdbCompany): number {
  const q = query.trim().toLowerCase();
  let score = fuzzyScore(query, company.name);

  if (q.length > 0 && company.name.trim().toLowerCase().startsWith(q)) {
    score += PREFIX_MATCH_BONUS;
  }

  if (company.logo_path) {
    score += HAS_LOGO_BONUS;
  }

  return score;
}

export async function searchCompany(
  query: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbCompany[]> {
  const url = buildUrl("/search/company", { query });
  const data = (await fetchJson(url)) as { results?: TmdbCompany[] };
  const results = data.results ?? [];
  return [...results].sort(
    (a, b) => scoreCompanyMatch(query, b) - scoreCompanyMatch(query, a),
  );
}

export interface TmdbStudioMoviesResponse {
  page: number;
  results: TmdbCollectionPart[];
  total_pages: number;
  total_results: number;
}

export async function fetchStudioMovies(
  companyId: number,
  page: number = 1,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<TmdbStudioMoviesResponse> {
  const url = buildUrl("/discover/movie", {
    with_companies: companyId,
    page,
    language: "de-DE",
  });
  return (await fetchJson(url)) as TmdbStudioMoviesResponse;
}
