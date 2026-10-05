import { useQuery } from "@tanstack/react-query";

import { getCollection } from "@/lib/tmdbProxy";
import { queryKeys } from "@/lib/queryKeys";

export function useCollection(tmdbId: number | undefined, collectionId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.collection(collectionId, tmdbId),
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
