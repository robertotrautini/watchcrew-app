const mockEq = jest.fn();
const mockIn = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockRpc = jest.fn();

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

describe("getUserGroups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries watch_group_members filtered by user_id and returns the { data, error } result unchanged", async () => {
    const fakeResult = {
      data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
      error: null,
    };
    mockEq.mockResolvedValue(fakeResult);

    const { getUserGroups } = require("../src/lib/groups");
    const result = await getUserGroups("u1");

    expect(mockFrom).toHaveBeenCalledWith("watch_group_members");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("user_id", "u1");
    expect(result).toBe(fakeResult);
  });

  it("returns an empty data array unchanged when the user has no group memberships", async () => {
    const fakeResult = { data: [], error: null };
    mockEq.mockResolvedValue(fakeResult);

    const { getUserGroups } = require("../src/lib/groups");
    const result = await getUserGroups("u-no-groups");

    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged when the query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    mockEq.mockResolvedValue(fakeResult);

    const { getUserGroups } = require("../src/lib/groups");
    const result = await getUserGroups("u1");

    expect(result).toBe(fakeResult);
  });
});

describe("getGroupMembers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries watch_group_members filtered by group_id, then joins each member's profile by user_id", async () => {
    mockEq.mockResolvedValue({
      data: [
        { group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" },
        { group_id: "g1", user_id: "u2", role: "member", joined_at: "2026-01-02" },
      ],
      error: null,
    });
    mockIn.mockResolvedValue({
      data: [
        { id: "u1", display_name: "robin" },
        { id: "u2", display_name: "alex" },
      ],
      error: null,
    });

    const { getGroupMembers } = require("../src/lib/groups");
    const result = await getGroupMembers("g1");

    expect(mockFrom).toHaveBeenCalledWith("watch_group_members");
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockSelect).toHaveBeenCalledWith("id, display_name");
    expect(mockEq).toHaveBeenCalledWith("group_id", "g1");
    expect(mockIn).toHaveBeenCalledWith("id", ["u1", "u2"]);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        group_id: "g1",
        user_id: "u1",
        role: "owner",
        joined_at: "2026-01-01",
        profiles: { display_name: "robin" },
      },
      {
        group_id: "g1",
        user_id: "u2",
        role: "member",
        joined_at: "2026-01-02",
        profiles: { display_name: "alex" },
      },
    ]);
  });

  it("defensively falls back to profiles: null for a member with no matching profile row", async () => {
    mockEq.mockResolvedValue({
      data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
      error: null,
    });
    mockIn.mockResolvedValue({ data: [], error: null });

    const { getGroupMembers } = require("../src/lib/groups");
    const result = await getGroupMembers("g1");

    expect(result.data).toEqual([
      { group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01", profiles: null },
    ]);
  });

  it("does not query profiles when the group has no members, and returns the empty result unchanged", async () => {
    const fakeResult = { data: [], error: null };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupMembers } = require("../src/lib/groups");
    const result = await getGroupMembers("g1");

    expect(mockIn).not.toHaveBeenCalled();
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged when the membership query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupMembers } = require("../src/lib/groups");
    const result = await getGroupMembers("g1");

    expect(result).toBe(fakeResult);
    expect(mockIn).not.toHaveBeenCalled();
  });

  it("returns the { data, error } shape unchanged when the profiles query fails, instead of throwing", async () => {
    mockEq.mockResolvedValue({
      data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
      error: null,
    });
    const fakeProfilesError = { data: null, error: { message: "profiles lookup failed" } };
    mockIn.mockResolvedValue(fakeProfilesError);

    const { getGroupMembers } = require("../src/lib/groups");
    const result = await getGroupMembers("g1");

    expect(result).toBe(fakeProfilesError);
  });
});

describe("createWatchGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the create_watch_group RPC with p_name/p_color_theme and reshapes the returned uuid into { groupId }", async () => {
    mockRpc.mockResolvedValue({ data: "new-group-id", error: null });

    const { createWatchGroup } = require("../src/lib/groups");
    const result = await createWatchGroup("Filmfreunde", "blue");

    expect(mockRpc).toHaveBeenCalledWith("create_watch_group", {
      p_name: "Filmfreunde",
      p_color_theme: "blue",
    });
    expect(result).toEqual({ data: { groupId: "new-group-id" }, error: null });
  });

  it("passes a group name containing an apostrophe straight through with no client-side escaping", async () => {
    mockRpc.mockResolvedValue({ data: "new-group-id", error: null });

    const { createWatchGroup } = require("../src/lib/groups");
    await createWatchGroup("Filmfreunde O'Brien", "gold");

    expect(mockRpc).toHaveBeenCalledWith("create_watch_group", {
      p_name: "Filmfreunde O'Brien",
      p_color_theme: "gold",
    });
  });

  it("returns { data: null, error } unchanged when the RPC fails, instead of throwing", async () => {
    const fakeError = { message: "invalid color theme: nope", code: "WC002", details: null, hint: null };
    mockRpc.mockResolvedValue({ data: null, error: fakeError });

    const { createWatchGroup } = require("../src/lib/groups");
    const result = await createWatchGroup("Filmfreunde", "nope");

    expect(result).toEqual({ data: null, error: fakeError });
  });
});

describe("joinWatchGroupByToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the join_watch_group_by_token RPC with p_token and reshapes the returned uuid into { groupId }", async () => {
    mockRpc.mockResolvedValue({ data: "joined-group-id", error: null });

    const { joinWatchGroupByToken } = require("../src/lib/groups");
    const result = await joinWatchGroupByToken("11111111-1111-1111-1111-111111111111");

    expect(mockRpc).toHaveBeenCalledWith("join_watch_group_by_token", {
      p_token: "11111111-1111-1111-1111-111111111111",
    });
    expect(result).toEqual({ data: { groupId: "joined-group-id" }, error: null });
  });

  it("returns { data: null, error } unchanged when the RPC fails generically", async () => {
    const fakeError = { message: "network error", code: null, details: null, hint: null };
    mockRpc.mockResolvedValue({ data: null, error: fakeError });

    const { joinWatchGroupByToken } = require("../src/lib/groups");
    const result = await joinWatchGroupByToken("some-token");

    expect(result).toEqual({ data: null, error: fakeError });
  });

  it("surfaces the invalid/disabled-token error unchanged so the caller can branch on its code", async () => {
    const fakeError = { message: "invalid or disabled invite token", code: "WC003", details: null, hint: null };
    mockRpc.mockResolvedValue({ data: null, error: fakeError });

    const { joinWatchGroupByToken } = require("../src/lib/groups");
    const result = await joinWatchGroupByToken("bad-token");

    expect(result).toEqual({ data: null, error: fakeError });
  });
});

describe("isInvalidInviteTokenError", () => {
  it("returns true for an error with the WC003 code", () => {
    const { isInvalidInviteTokenError } = require("../src/lib/groups");

    expect(isInvalidInviteTokenError({ code: "WC003" })).toBe(true);
  });

  it("returns false for a generic error, and for null/undefined", () => {
    const { isInvalidInviteTokenError } = require("../src/lib/groups");

    expect(isInvalidInviteTokenError({ code: "WC001" })).toBe(false);
    expect(isInvalidInviteTokenError(null)).toBe(false);
    expect(isInvalidInviteTokenError(undefined)).toBe(false);
  });
});
