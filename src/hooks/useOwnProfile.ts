import { useQuery } from "@tanstack/react-query";

import { getOwnProfile } from "@/lib/profile";

/**
 * M10 Settings hub: wraps `getOwnProfile` (src/lib/profile.ts) in TanStack
 * Query, mirroring `useGroupDetails`'s conventions.
 */
export function useOwnProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["ownProfile", userId],
    queryFn: async () => {
      const { data, error } = await getOwnProfile(userId as string);
      if (error) {
        throw error;
      }
      return data as { display_name: string } | null;
    },
    enabled: !!userId,
  });
}
