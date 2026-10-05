const mockEq = jest.fn();
const mockIn = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn }));
// Typed as plain `jest.Mock` (not inferred from the arrow function below) so
// the M9-part-2 tests further down can `mockReturnValue` a differently-
// shaped chainable mock (`makeChain`, mirroring
// __tests__/movieDetailMutations.test.ts) without fighting the narrower
// inferred return type from this file's original `getUserGroups`/
// `getGroupMembers` mock shape.
const mockFrom: jest.Mock = jest.fn(() => ({ select: mockSelect }));
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

// M9 part 2: a minimal thenable Supabase query-builder mock, same pattern as
// __tests__/movieDetailMutations.test.ts's `makeChain` -- every chain
// method returns the SAME object, which resolves to `finalResult` when
// awaited, mirroring the real supabase-js PostgrestFilterBuilder's own
// thenable behavior regardless of how many methods were chained onto it.
function makeChain(finalResult: unknown) {
  const chain: Record<string, jest.Mock> & { then?: unknown } = {};
  ["select", "eq", "update", "delete", "single"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

describe("getWatchGroupDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("selects a single watch_groups row by id", async () => {
    const fakeResult = {
      data: { id: "g1", name: "Filmfreunde", color_theme: "gold", invite_token: "tok-1", invite_enabled: true, created_at: "2026-01-01" },
      error: null,
    };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { getWatchGroupDetails } = require("../src/lib/groups");
    const result = await getWatchGroupDetails("g1");

    expect(mockFrom).toHaveBeenCalledWith("watch_groups");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("id", "g1");
    expect(chain.single).toHaveBeenCalled();
    expect(result).toBe(fakeResult);
  });

  it("returns { data: null, error } unchanged when the query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { getWatchGroupDetails } = require("../src/lib/groups");
    const result = await getWatchGroupDetails("g1");

    expect(result).toBe(fakeResult);
  });
});

describe("getWatchGroupsByIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("selects watch_groups rows filtered by an IN(id) list", async () => {
    const fakeResult = {
      data: [
        { id: "g1", name: "Filmfreunde", color_theme: "gold", invite_token: "tok-1", invite_enabled: true },
        { id: "g2", name: "Kinoclub", color_theme: "blue", invite_token: "tok-2", invite_enabled: false },
      ],
      error: null,
    };
    const chain = makeChain(fakeResult);
    chain.in = jest.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { getWatchGroupsByIds } = require("../src/lib/groups");
    const result = await getWatchGroupsByIds(["g1", "g2"]);

    expect(mockFrom).toHaveBeenCalledWith("watch_groups");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.in).toHaveBeenCalledWith("id", ["g1", "g2"]);
    expect(result).toBe(fakeResult);
  });

  it("short-circuits to an empty result without querying, for an empty id list", async () => {
    const { getWatchGroupsByIds } = require("../src/lib/groups");
    const result = await getWatchGroupsByIds([]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], error: null });
  });

  it("returns { data: null, error } unchanged when the query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    const chain = makeChain(fakeResult);
    chain.in = jest.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { getWatchGroupsByIds } = require("../src/lib/groups");
    const result = await getWatchGroupsByIds(["g1"]);

    expect(result).toBe(fakeResult);
  });
});

describe("setGroupColorTheme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates watch_groups.color_theme for the given group id (owner-only RLS policy)", async () => {
    const fakeResult = { data: null, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { setGroupColorTheme } = require("../src/lib/groups");
    const result = await setGroupColorTheme("g1", "blue");

    expect(mockFrom).toHaveBeenCalledWith("watch_groups");
    expect(chain.update).toHaveBeenCalledWith({ color_theme: "blue" });
    expect(chain.eq).toHaveBeenCalledWith("id", "g1");
    expect(result).toBe(fakeResult);
  });
});

describe("renameWatchGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates watch_groups.name for the given group id", async () => {
    const fakeResult = { data: null, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { renameWatchGroup } = require("../src/lib/groups");
    const result = await renameWatchGroup("g1", "Neuer Name");

    expect(mockFrom).toHaveBeenCalledWith("watch_groups");
    expect(chain.update).toHaveBeenCalledWith({ name: "Neuer Name" });
    expect(chain.eq).toHaveBeenCalledWith("id", "g1");
    expect(result).toBe(fakeResult);
  });

  it("passes a name containing an apostrophe straight through with no client-side escaping", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const { renameWatchGroup } = require("../src/lib/groups");
    await renameWatchGroup("g1", "O'Brien's Crew");

    expect(chain.update).toHaveBeenCalledWith({ name: "O'Brien's Crew" });
  });

  it("returns { data: null, error } unchanged when the update fails (e.g. non-owner blocked by RLS)", async () => {
    const fakeResult = { data: null, error: { message: "new row violates row-level security policy" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { renameWatchGroup } = require("../src/lib/groups");
    const result = await renameWatchGroup("g1", "Neuer Name");

    expect(result).toBe(fakeResult);
  });
});

describe("setInviteEnabled", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates watch_groups.invite_enabled for the given group id", async () => {
    const fakeResult = { data: null, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { setInviteEnabled } = require("../src/lib/groups");
    const result = await setInviteEnabled("g1", false);

    expect(mockFrom).toHaveBeenCalledWith("watch_groups");
    expect(chain.update).toHaveBeenCalledWith({ invite_enabled: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "g1");
    expect(result).toBe(fakeResult);
  });
});

describe("regenerateInviteToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the regenerate_invite_token RPC and reshapes the returned uuid into { inviteToken }", async () => {
    mockRpc.mockResolvedValue({ data: "new-token-uuid", error: null });

    const { regenerateInviteToken } = require("../src/lib/groups");
    const result = await regenerateInviteToken("g1");

    expect(mockRpc).toHaveBeenCalledWith("regenerate_invite_token", { p_group_id: "g1" });
    expect(result).toEqual({ data: { inviteToken: "new-token-uuid" }, error: null });
  });

  it("returns { data: null, error } unchanged when the RPC fails (e.g. non-owner, WC004)", async () => {
    const fakeError = { message: "regenerate_invite_token requires group ownership", code: "WC004", details: null, hint: null };
    mockRpc.mockResolvedValue({ data: null, error: fakeError });

    const { regenerateInviteToken } = require("../src/lib/groups");
    const result = await regenerateInviteToken("g1");

    expect(result).toEqual({ data: null, error: fakeError });
  });
});

describe("removeMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes the watch_group_members row for the given group_id + user_id", async () => {
    const fakeResult = { data: null, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { removeMember } = require("../src/lib/groups");
    const result = await removeMember("g1", "u2");

    expect(mockFrom).toHaveBeenCalledWith("watch_group_members");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("group_id", "g1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u2");
    expect(result).toBe(fakeResult);
  });

  it("returns { data: null, error } unchanged when the delete fails (e.g. non-owner kicking someone else, blocked by RLS)", async () => {
    const fakeResult = { data: null, error: { message: "new row violates row-level security policy" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { removeMember } = require("../src/lib/groups");
    const result = await removeMember("g1", "u2");

    expect(result).toBe(fakeResult);
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
