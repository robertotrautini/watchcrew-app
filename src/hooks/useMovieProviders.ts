import { useQuery } from "@tanstack/react-query";

import { getMovieProviders } from "@/lib/tmdbProxy";

export function useMovieProviders(tmdbId: number | undefined) {
  return useQuery({
    queryKey: ["movieProviders", tmdbId],
    queryFn: async () => {
      const { data, error } = await getMovieProviders(tmdbId as number);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!tmdbId,
  });
}
