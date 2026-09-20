import { useQuery } from "@tanstack/react-query";

import { getProvidersList } from "@/lib/tmdbProxy";

/**
 * M10 Settings hub ("Meine Streaming-Dienste" picker,
 * src/app/(app)/(modals)/settings/streaming-services.tsx): the full DE-region
 * TMDB provider catalog, wrapped in TanStack Query. Mirrors the
 * "never throw from the lib fn, translate { error } into React Query's
 * native error channel here" convention already used by
 * `useGroupDetails`/`useGroupNames` (src/hooks/useGroupDetails.ts).
 */
export function useProvidersList() {
  return useQuery({
    queryKey: ["providersList"],
    queryFn: async () => {
      const { data, error } = await getProvidersList();
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}
