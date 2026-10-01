// Mirrors the chainable-mock pattern already used by
// __tests__/groups.test.ts's `getWatchGroupDetails` suite.

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("../../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

function makeChain(finalResult: unknown) {
  const chain: Record<string, jest.Mock> = {};
  ["select", "eq", "maybeSingle"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  (chain as unknown as { then: unknown }).then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

describe("getOwnProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("selects the caller's own profiles row by id via maybeSingle", async () => {
    const fakeResult = { data: { display_name: "robin" }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { getOwnProfile } = require("../../src/lib/profile");
    const result = await getOwnProfile("u1");

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(chain.select).toHaveBeenCalledWith("display_name");
    expect(chain.eq).toHaveBeenCalledWith("id", "u1");
    expect(chain.maybeSingle).toHaveBeenCalled();
    expect(result).toBe(fakeResult);
  });

  it("returns { data: null, error } unchanged when the query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { getOwnProfile } = require("../../src/lib/profile");
    const result = await getOwnProfile("u1");

    expect(result).toBe(fakeResult);
  });
});

describe("updateOwnDisplayName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the set_display_name RPC with the trimmed name and returns Supabase's result unchanged", async () => {
    const fakeResult = { data: null, error: null };
    mockRpc.mockResolvedValue(fakeResult);

    const { updateOwnDisplayName } = require("../../src/lib/profile");
    const result = await updateOwnDisplayName("  Robin ");

    expect(mockRpc).toHaveBeenCalledWith("set_display_name", { p_display_name: "Robin" });
    expect(result).toBe(fakeResult);
  });

  it("returns { error } unchanged instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "boom" } };
    mockRpc.mockResolvedValue(fakeResult);

    const { updateOwnDisplayName } = require("../../src/lib/profile");
    expect(await updateOwnDisplayName("Robin")).toBe(fakeResult);
  });
});
