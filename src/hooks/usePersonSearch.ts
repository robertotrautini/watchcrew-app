import { useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchPerson } from "@/lib/tmdbProxy";
import { queryKeys } from "@/lib/queryKeys";

/** Regisseur/Besetzung mode debounce (M7 part 2, per the task spec): 250ms. */
export const PERSON_SEARCH_DEBOUNCE_MS = 250;

/**
 * Add-Movie-Modal Regisseur/Besetzung modes (M7 part 2): debounced person
 * autocomplete via the `search_person` tmdb-proxy action. Same hook serves
 * both modes (director vs. actor is only decided once a person is SELECTED,
 * by which filmography action the screen then calls — `director_movies` vs.
 * `person_movies`, both already-existing M6 hooks: `useDirectorFilmography`/
 * `useActorFilmography`).
 */
export function usePersonSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, PERSON_SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();

  return useQuery({
    queryKey: queryKeys.personSearch(trimmedQuery),
    queryFn: async () => {
      const { data, error } = await searchPerson(trimmedQuery);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: trimmedQuery.length > 0,
  });
}
