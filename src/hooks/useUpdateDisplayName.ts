import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateOwnDisplayName } from "@/lib/profile";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Settings hub: saves the caller's display name. Same throw-on-`error`
 * convention as src/hooks/useGroupSettings.ts. Names are rendered from the
 * joined `profiles` row in group-member queries, so those are invalidated too.
 */
export function useUpdateDisplayName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (displayName: string) => {
      const { data, error } = await updateOwnDisplayName(displayName);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetails.all });
      // Tracker payer column, Tagebuch, rating dialog and payment modal build
      // their name maps from useGroupMembers.
      queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}
