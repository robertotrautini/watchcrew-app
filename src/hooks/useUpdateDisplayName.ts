import { useAppMutation } from "@/hooks/useAppMutation";

import { updateOwnDisplayName } from "@/lib/profile";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Settings hub: saves the caller's display name. Same throw-on-`error`
 * convention as src/hooks/useGroupSettings.ts. Names are rendered from the
 * joined `profiles` row in group-member queries, so those are invalidated too.
 */
export function useUpdateDisplayName() {
  return useAppMutation({
    mutationFn: async (displayName: string) => {
      const { data, error } = await updateOwnDisplayName(displayName);
      if (error) {
        throw error;
      }
      return data;
    },
    // Tracker payer column, Tagebuch, rating dialog and payment modal build
    // their name maps from useGroupMembers.
    invalidateKeys: [
      queryKeys.ownProfile.all,
      queryKeys.groupDetails.all,
      queryKeys.groupMembers.all,
      queryKeys.watchlist.all,
    ],
  });
}
