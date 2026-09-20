/**
 * Pure parsing helper for the M9 "join a Watch-Group" input field
 * (src/app/(onboarding)/create-or-join-group.tsx). ADR 0003's invite
 * mechanism is a single non-guessable UUID (see
 * docs/interim-decisions.md's "M9 part 1" entry for the exact reasoning on
 * which UUID that is -- `watch_groups.invite_token`, not the primary key),
 * shared by both the shareable invite LINK and the manual "Group-ID"
 * fallback entry. The join input field must accept either shape pasted in
 * directly:
 *   - a bare invite-token UUID (the manual "Group-ID" fallback), e.g.
 *     "11111111-1111-1111-1111-111111111111"
 *   - a full deep-link-shaped string that merely CONTAINS that UUID
 *     somewhere in it, e.g. "https://watchcrew.app/join/1111...1111" or
 *     "watchcrew://join?token=1111...1111"
 *
 * Exact parsing rule: trim the input, then find the first RFC-4122-shaped
 * UUID substring anywhere in it (8-4-4-4-12 hex groups, case-insensitive)
 * and return it lowercased. Returns `null` if no such substring exists,
 * rather than falling back to sending the raw trimmed string to the RPC --
 * an input with no UUID-shaped substring at all can never be a valid token,
 * so there is no need to spend a network round-trip finding that out.
 */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function extractInviteToken(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  const match = trimmed.match(UUID_PATTERN);
  return match ? match[0].toLowerCase() : null;
}
