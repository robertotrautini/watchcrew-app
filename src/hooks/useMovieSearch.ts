import { useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchMovies } from "@/lib/tmdbProxy";
import { queryKeys } from "@/lib/queryKeys";

/** Film mode debounce (M7 part 2, per the task spec): 350ms. */
export const MOVIE_SEARCH_DEBOUNCE_MS = 350;

/**
 * Add-Movie-Modal Film mode (M7 part 2): debounced fuzzy movie search (DE+EN
 * merge, already built M6) via the `search` tmdb-proxy action.
 */
export function useMovieSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, MOVIE_SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();

  return useQuery({
    queryKey: queryKeys.movieSearch(trimmedQuery),
    queryFn: async () => {
      const { data, error } = await searchMovies(trimmedQuery);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: trimmedQuery.length > 0,
  });
}
