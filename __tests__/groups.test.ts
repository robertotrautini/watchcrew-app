const mockEq = jest.fn();
const mockIn = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
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
