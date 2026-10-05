// Shared fake for `@/hooks/useCurrentUserId`. Usage in a test file:
//
//   import { mockCurrentUserId } from "<rel>/helpers/mockCurrentUser";
//   jest.mock("@/hooks/useCurrentUserId", () => require("<rel>/helpers/mockCurrentUser").currentUserIdModule());
//   ... beforeEach(() => mockCurrentUserId.mockReturnValue("user-1"));
//
// `mockCurrentUserId` is a plain jest.fn() (returns undefined until configured), same as the
// per-test `const mockUseCurrentUserId = jest.fn()` it replaces.

export const mockCurrentUserId = jest.fn();

export function currentUserIdModule(): { useCurrentUserId: (...args: unknown[]) => unknown } {
  return { useCurrentUserId: (...args: unknown[]) => mockCurrentUserId(...args) };
}
