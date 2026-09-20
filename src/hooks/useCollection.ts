import { useQuery } from "@tanstack/react-query";

import { getCollection } from "@/lib/tmdbProxy";

export function useCollection(tmdbId: number | undefined, collectionId: number | undefined) {
  return useQuery({
    queryKey: ["collection", collectionId, tmdbId],
    queryFn: async () => {
      const { data, error } = await getCollection(tmdbId as number, collectionId as number);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!tmdbId && !!collectionId,
  });
}
