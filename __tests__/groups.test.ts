const mockEq = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq }));
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

  it("queries watch_group_members filtered by group_id and returns the { data, error } result unchanged", async () => {
    const fakeResult = {
      data: [
        { group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" },
        { group_id: "g1", user_id: "u2", role: "member", joined_at: "2026-01-02" },
      ],
      error: null,
    };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupMembers } = require("../src/lib/groups");
    const result = await getGroupMembers("g1");

    expect(mockFrom).toHaveBeenCalledWith("watch_group_members");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("group_id", "g1");
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged when the query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupMembers } = require("../src/lib/groups");
    const result = await getGroupMembers("g1");

    expect(result).toBe(fakeResult);
  });
});
