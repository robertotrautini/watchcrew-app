/**
 * Group quick-switch (header logo tap): next group id in the user's list, wrapping around.
 * Unknown/missing active id -> first group; empty list -> null; single group -> the same id.
 */
export function nextGroupId(groupIds: string[], activeId: string | undefined): string | null {
  if (groupIds.length === 0) return null;
  const index = activeId == null ? -1 : groupIds.indexOf(activeId);
  return groupIds[(index + 1) % groupIds.length];
}
