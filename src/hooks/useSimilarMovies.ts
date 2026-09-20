import { useQuery } from "@tanstack/react-query";

import { getSimilarMovies } from "@/lib/tmdbProxy";

export function useSimilarMovies(tmdbId: number | undefined) {
  return useQuery({
    queryKey: ["similarMovies", tmdbId],
    queryFn: async () => {
      const { data, error } = await getSimilarMovies(tmdbId as number);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!tmdbId,
  });
}
