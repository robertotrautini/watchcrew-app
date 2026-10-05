import { useQuery } from "@tanstack/react-query";

import { getSimilarMovies } from "@/lib/tmdbProxy";
import { queryKeys } from "@/lib/queryKeys";

export function useSimilarMovies(tmdbId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.similarMovies(tmdbId),
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
