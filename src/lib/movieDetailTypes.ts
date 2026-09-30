// M6 part 2a (Movie-Detail-Overlay): local mirrors of the TMDB-proxy Edge
// Function's response types (supabase/functions/tmdb-proxy/tmdb-client.ts).
//
// These are duplicated here rather than imported because `supabase/**` is
// excluded from the app's tsconfig project (see tsconfig.json `exclude`) and
// that code runs on Deno (`jsr:` specifiers, `Deno.serve`, etc.) which isn't
// resolvable from React Native anyway. Field names/shapes are kept
// deliberately identical to tmdb-client.ts's exported interfaces so the two
// stay easy to diff by eye; keep them in sync by hand if tmdb-client.ts's
// shapes change.

export interface TmdbCollectionRef {
  id: number;
  name: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
}

/** `details` action response shape (tmdb-client.ts `NormalizedMovieDetails`). */
export interface NormalizedMovieDetails {
  id: number;
  runtime: number | null;
  genres: string[];
  belongs_to_collection: TmdbCollectionRef | null;
  vote_average: number | null;
  /** Additive fields (tmdb-proxy `details` also returns these; see tmdb-client.ts `NormalizedMovieDetails`). */
  title?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  releaseDate?: string | null;
}

/** `videos` action response shape (tmdb-client.ts `TmdbVideo`) — already trailer-selected server-side. */
export interface TmdbVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  name?: string;
}

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

/** `credits` action response shape (tmdb-client.ts `NormalizedCredits`) — cast already capped to 10 server-side. */
export interface NormalizedCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
  director: TmdbCrewMember | null;
}

export type GermanReleaseCategory = "Kino" | "Digital" | "TV";

/** `release_dates` action response shape (tmdb-client.ts `GermanReleaseDate`) — null if no DE entries. */
export interface GermanReleaseDate {
  category: GermanReleaseCategory;
  release_date: string;
  type: number;
}

export interface TmdbProviderRef {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
  display_priority?: number;
}

/** `providers` action response shape (tmdb-client.ts `TmdbMovieProviders`) — DE region only, server-side. */
export interface TmdbMovieProviders {
  flatrate: TmdbProviderRef[];
  rent: TmdbProviderRef[];
  buy: TmdbProviderRef[];
}
