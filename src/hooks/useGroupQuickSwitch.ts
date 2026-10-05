import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupNames } from "@/hooks/useGroupDetails";
import { groupDisplayLabel } from "@/lib/diaryDisplay";
import { nextGroupId } from "@/lib/groupCycle";
import { showToast } from "@/lib/toast";

/**
 * Header logo quick-switch: cycles the active group through the user's groups (wrap-around) via
 * the same persisted `activeGroupId` the group-settings switcher uses. The store write is
 * synchronous (optimistic); group-keyed queries and the group theme follow the new id.
 */
export function useGroupQuickSwitch() {
  const userId = useCurrentUserId();
  const { activeGroupId, setActiveGroup, groupsQuery } = useActiveGroup(userId);
  const groupIds = ((groupsQuery.data ?? []) as Array<{ group_id: string }>).map((g) => g.group_id);
  const namesQuery = useGroupNames(groupIds);
  const names = (namesQuery.data ?? []) as Array<{ id: string; name?: string | null }>;

  const nameOf = (id: string) => groupDisplayLabel(id, names.find((g) => g.id === id)?.name);
  const activeGroupName = activeGroupId ? nameOf(activeGroupId) : null;

  function switchToNext() {
    if (groupIds.length < 2) {
      showToast("Nur eine Gruppe", { variant: "info" });
      return;
    }
    const next = nextGroupId(groupIds, activeGroupId);
    if (next == null) return;
    setActiveGroup(next);
    showToast(nameOf(next), { variant: "info" });
  }

  return { activeGroupName, activeGroupId, groupCount: groupIds.length, switchToNext };
}
