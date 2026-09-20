import type { TmdbMovieProviders } from "./tmdbProxy";

// M6 part 2b: filters a list of tmdbId-bearing items (e.g. a filmography/
// collection/similar-movies grid) down to only those available in a given
// streaming provider category, using an already-fetched tmdbId -> providers
// map (see src/hooks/useMoviesProviders.ts).

export type ProviderCategory = "flatrate" | "rent" | "buy";

export function filterByProviderCategory<T extends { tmdbId: number }>(
  items: T[],
  providersByTmdbId: ReadonlyMap<number, TmdbMovieProviders>,
  category: ProviderCategory | null
): T[] {
  if (category === null) {
    return items;
  }

  return items.filter((item) => {
    const providers = providersByTmdbId.get(item.tmdbId);
    const list = providers?.[category];
    return Array.isArray(list) && list.length > 0;
  });
}
