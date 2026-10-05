import { useQuery } from "@tanstack/react-query";

import { getActorMovies } from "@/lib/tmdbProxy";
import { queryKeys } from "@/lib/queryKeys";

export function useActorFilmography(personId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.actorFilmography(personId),
    queryFn: async () => {
      const { data, error } = await getActorMovies(personId as number);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!personId,
  });
}
