// M10 (part): data-layer tests for src/lib/pushTokens.ts.
//
// Same convention as __tests__/movieDetailMutations.test.ts: mock
// "../src/lib/supabase" with a jest.fn()-based thenable chain builder, and
// assert the underlying functions return Supabase's raw `{ data, error }`
// shape unchanged (never throw) while calling the query builder with the
// expected arguments.

const mockFrom = jest.fn();

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

function makeChain(finalResult: unknown) {
  const chain: Record<string, jest.Mock> & { then?: unknown } = {};
  ["select", "eq", "upsert", "insert", "delete", "maybeSingle"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

// Lazily required (not statically imported) — same Babel CJS-hoisting reason
// as __tests__/movieDetailMutations.test.ts: a top-level `import` would run
// before the `jest.mock` factory above is wired up.
function loadPushTokens() {
  return require("../src/lib/pushTokens");
}

describe("upsertPushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upserts push_tokens keyed on (user_id, expo_push_token), with an explicit updated_at", async () => {
    const { upsertPushToken } = loadPushTokens();
    const fakeResult = { data: { user_id: "u1" }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const now = new Date("2026-09-20T12:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);

    const result = await upsertPushToken({ userId: "u1", expoPushToken: "ExponentPushToken[abc]" });

    expect(mockFrom).toHaveBeenCalledWith("push_tokens");
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: "u1", expo_push_token: "ExponentPushToken[abc]", updated_at: now.toISOString() },
      { onConflict: "user_id,expo_push_token" },
    );
    expect(result).toEqual(fakeResult);

    jest.useRealTimers();
  });

  it("returns the raw error unchanged on failure (never throws)", async () => {
    const { upsertPushToken } = loadPushTokens();
    const fakeResult = { data: null, error: { message: "boom" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const result = await upsertPushToken({ userId: "u1", expoPushToken: "t1" });

    expect(result).toEqual(fakeResult);
  });
});

describe("subscribeToGroupPush / unsubscribeFromGroupPush / getGroupPushSubscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("subscribeToGroupPush inserts a (user_id, group_id) row", async () => {
    const { subscribeToGroupPush } = loadPushTokens();
    const fakeResult = { data: { user_id: "u1", group_id: "g1" }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const result = await subscribeToGroupPush({ userId: "u1", groupId: "g1" });

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(chain.insert).toHaveBeenCalledWith({ user_id: "u1", group_id: "g1" });
    expect(result).toEqual(fakeResult);
  });

  it("unsubscribeFromGroupPush deletes by (user_id, group_id)", async () => {
    const { unsubscribeFromGroupPush } = loadPushTokens();
    const fakeResult = { data: null, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const result = await unsubscribeFromGroupPush({ userId: "u1", groupId: "g1" });

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(chain.eq).toHaveBeenCalledWith("group_id", "g1");
    expect(result).toEqual(fakeResult);
  });

  it("getGroupPushSubscription selects by (user_id, group_id) via maybeSingle", async () => {
    const { getGroupPushSubscription } = loadPushTokens();
    const fakeResult = { data: { user_id: "u1", group_id: "g1" }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const result = await getGroupPushSubscription({ userId: "u1", groupId: "g1" });

    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(chain.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(fakeResult);
  });

  it("getGroupPushSubscription resolves data: null when not subscribed, without throwing", async () => {
    const { getGroupPushSubscription } = loadPushTokens();
    const fakeResult = { data: null, error: null };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const result = await getGroupPushSubscription({ userId: "u1", groupId: "g1" });

    expect(result).toEqual({ data: null, error: null });
  });
});
