import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateOwnDisplayName } from "@/lib/profile";

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
      queryClient.invalidateQueries({ queryKey: ["ownProfile"] });
      queryClient.invalidateQueries({ queryKey: ["groupDetails"] });
      // Tracker payer column, Tagebuch, rating dialog and payment modal build
      // their name maps from useGroupMembers.
      queryClient.invalidateQueries({ queryKey: ["groupMembers"] });
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}
