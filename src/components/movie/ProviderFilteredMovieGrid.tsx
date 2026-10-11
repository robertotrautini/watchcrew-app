import { useState } from "react";

import { MovieGrid, type MovieGridProps } from "@/components/movie/MovieGrid";
import { useMoviesProviders } from "@/hooks/useMoviesProviders";
import { filterByProviderCategory, type ProviderCategory } from "@/lib/movieProviderFilter";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * `MovieGrid` with the Flatrate/Leihen/Kaufen category chips (Aehnliche
 * Filme, Filmreihe). Loads the providers of all items and filters them.
 */
export function ProviderFilteredMovieGrid({ items, ...rest }: MovieGridProps) {
  const [activeCategory, setActiveCategory] = useState<ProviderCategory | null>(null);
  const { providersByTmdbId } = useMoviesProviders(items.map((item) => item.tmdbId));
  // Inventory 2.10: the category pills respect the user's own streaming
  // services ("Meine Streaming-Dienste"); with none selected they only filter by category.
  const myProviderIds = usePreferencesStore((s) => s.selectedStreamingProviderIds);
  const filteredItems = filterByProviderCategory(items, providersByTmdbId, activeCategory, myProviderIds);
  return (
    <MovieGrid
      {...rest}
      items={filteredItems}
      streamingFilter={{ active: activeCategory, onChange: setActiveCategory }}
    />
  );
}
