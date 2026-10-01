import type { ReactNode } from "react";

import { GroupThemeProvider } from "@/components/GroupThemeProvider";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupDetails } from "@/hooks/useGroupDetails";

/**
 * Themes everything inside (tabs, modals) with the ACTIVE group's
 * `color_theme`. `useSetGroupTheme` invalidates `groupDetails`, so a theme
 * change in Group settings recolors the app live. While the details are not
 * available (loading/offline without cache) the Gold default applies.
 */
export function ActiveGroupThemeProvider({ children }: { children: ReactNode }) {
  const userId = useCurrentUserId();
  const { activeGroupId } = useActiveGroup(userId);
  const details = useGroupDetails(activeGroupId);

  return (
    <GroupThemeProvider themeName={details.data?.color_theme} className="flex-1">
      {children}
    </GroupThemeProvider>
  );
}
