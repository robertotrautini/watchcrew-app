import type { TmdbMovieProviders } from "./tmdbProxy";

// M6 part 2b: filters a list of tmdbId-bearing items (e.g. a filmography/
// collection/similar-movies grid) down to only those available in a given
// streaming provider category, using an already-fetched tmdbId -> providers
// map (see src/hooks/useMoviesProviders.ts).

export type ProviderCategory = "flatrate" | "rent" | "buy";

export const ALL_PROVIDER_CATEGORIES: ProviderCategory[] = ["flatrate", "rent", "buy"];

/**
 * True when the movie is offered (DE) in at least one of the active
 * `categories`. If the user picked own streaming services (`ownProviderIds`
 * non-empty) the offer must additionally come from one of THOSE services;
 * with none picked the service restriction is simply skipped (category-only).
 * No providers data (not loaded / lookup failed) never matches.
 */
export function matchesOwnProviders(
  providers: TmdbMovieProviders | undefined,
  categories: ProviderCategory[],
  ownProviderIds: number[]
): boolean {
  if (!providers) {
    return false;
  }
  return categories.some((category) => {
    const list = providers[category];
    if (!Array.isArray(list) || list.length === 0) {
      return false;
    }
    return ownProviderIds.length === 0 || list.some((p) => ownProviderIds.includes(p.provider_id));
  });
}

export function filterByProviderCategory<T extends { tmdbId: number }>(
  items: T[],
  providersByTmdbId: ReadonlyMap<number, TmdbMovieProviders>,
  category: ProviderCategory | null,
  ownProviderIds: number[] = []
): T[] {
  if (category === null) {
    return items;
  }

  return items.filter((item) =>
    matchesOwnProviders(providersByTmdbId.get(item.tmdbId), [category], ownProviderIds)
  );
}

/**
 * Add-Movie-Modal streaming toggle (inventory 2.5: "filtert nach eigenen
 * Streaming-Diensten"): keeps items offered by an own service in ANY category
 * (flatrate, rent or buy). The spec names no category pills for this toggle.
 */
export function filterByMyStreaming<T extends { tmdbId: number }>(
  items: T[],
  providersByTmdbId: ReadonlyMap<number, TmdbMovieProviders>,
  ownProviderIds: number[]
): T[] {
  return items.filter((item) =>
    matchesOwnProviders(providersByTmdbId.get(item.tmdbId), ALL_PROVIDER_CATEGORIES, ownProviderIds)
  );
}
