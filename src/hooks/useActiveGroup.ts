import { useUserGroups } from "@/hooks/useUserGroups";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Resolves "the" active Watch-Group for a user, replacing the M5-M8 interim
 * "first group = active group" simplification (see docs/interim-decisions.md
 * "M5 — Aktive Gruppe = erste Gruppe des Nutzers") now that M9 part 1 makes
 * belonging to more than one group realistic (create + join).
 *
 * Resolution rule:
 *   - if a group id has been explicitly picked before (persisted in
 *     `usePreferencesStore`'s `activeGroupId`) AND it still refers to a group
 *     the user is CURRENTLY a member of -> use it.
 *   - otherwise (nothing picked yet, OR the picked id has gone stale -- the
 *     user left that group, or it was hard-deleted by the 2-week retention
 *     job) -> fall back to the first group from `useUserGroups()`, exactly
 *     matching the old interim behavior.
 *
 * Deliberately does NOT auto-persist the fallback choice back into the
 * store -- a stale/absent stored id keeps resolving to "first group" each
 * time (cheap, always correct) until the user makes an explicit choice via
 * `setActiveGroup` (the Group-Settings switcher, M9 part 2).
 *
 * Returns the underlying `useUserGroups` query object as `groupsQuery` too,
 * so callers can keep branching on `isLoading`/`isError` exactly like they
 * did with their own `useUserGroups(...)` call before this hook existed --
 * no separate query is issued (TanStack Query dedupes by key regardless,
 * but exposing it here avoids every caller needing its own second import).
 */
export function useActiveGroup(userId: string | undefined) {
  const groupsQuery = useUserGroups(userId);
  const storedActiveGroupId = usePreferencesStore((s) => s.activeGroupId);
  const setActiveGroupId = usePreferencesStore((s) => s.setActiveGroupId);

  const groups = (groupsQuery.data ?? []) as Array<{ group_id: string }>;
  const isStoredIdStillValid =
    storedActiveGroupId != null && groups.some((g) => g.group_id === storedActiveGroupId);

  const activeGroupId = (isStoredIdStillValid ? storedActiveGroupId : groups[0]?.group_id) as
    | string
    | undefined;

  function setActiveGroup(groupId: string) {
    setActiveGroupId(groupId);
  }

  return { activeGroupId, setActiveGroup, groupsQuery };
}
