import { useQuery } from "@tanstack/react-query";

import { getDirectorMovies } from "@/lib/tmdbProxy";

export function useDirectorFilmography(personId: number | undefined) {
  return useQuery({
    queryKey: ["directorFilmography", personId],
    queryFn: async () => {
      const { data, error } = await getDirectorMovies(personId as number);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!personId,
  });
}
