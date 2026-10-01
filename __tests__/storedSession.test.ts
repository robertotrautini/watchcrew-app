const mockGetItem = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { storageKey: "sb-x-auth-token" } },
  largeSecureStore: { getItem: (...a: unknown[]) => mockGetItem(...a) },
}));

import { readStoredSession } from "@/lib/storedSession";

describe("readStoredSession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the stored session read via auth-js's storage key", async () => {
    const session = { access_token: "a", refresh_token: "r", user: { id: "u1" } };
    mockGetItem.mockResolvedValue(JSON.stringify(session));
    expect(await readStoredSession()).toEqual(session);
    expect(mockGetItem).toHaveBeenCalledWith("sb-x-auth-token");
  });

  it("returns null for nothing stored, garbage, or a session without user/refresh token", async () => {
    mockGetItem.mockResolvedValueOnce(null);
    expect(await readStoredSession()).toBeNull();
    mockGetItem.mockResolvedValueOnce("{not json");
    expect(await readStoredSession()).toBeNull();
    mockGetItem.mockResolvedValueOnce(JSON.stringify({ access_token: "a" }));
    expect(await readStoredSession()).toBeNull();
  });

  it("returns null when the store throws", async () => {
    mockGetItem.mockRejectedValue(new Error("boom"));
    expect(await readStoredSession()).toBeNull();
  });
});
