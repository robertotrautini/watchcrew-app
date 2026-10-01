import { QueryClient, type Query } from "@tanstack/react-query";

import {
  PERSIST_BUSTER,
  PERSIST_MAX_AGE_MS,
  PERSIST_THROTTLE_MS,
  clearPersistedQueryCache,
  createMmkvPersister,
  persistDehydrateOptions,
  shouldPersistQuery,
  type KeyValueStorage,
} from "@/lib/queryPersistence";

function fakeStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getString: (k) => map.get(k),
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

const client = {
  timestamp: 123,
  buster: "b",
  clientState: { mutations: [], queries: [{ queryKey: ["watchlist", "g1"], queryHash: "h", state: { data: [1] } }] },
} as never;

describe("createMmkvPersister", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("writes serialized client after the throttle window and restores it", async () => {
    const storage = fakeStorage();
    const persister = createMmkvPersister(storage);
    await persister.persistClient(client);
    expect(storage.map.size).toBe(0);
    jest.advanceTimersByTime(PERSIST_THROTTLE_MS);
    expect(storage.map.size).toBe(1);
    expect(JSON.parse([...storage.map.values()][0])).toEqual(client);
    expect(await persister.restoreClient()).toEqual(client);
  });

  it("throttles: only the latest value is written", async () => {
    const storage = fakeStorage();
    const persister = createMmkvPersister(storage);
    await persister.persistClient({ ...(client as object), timestamp: 1 } as never);
    await persister.persistClient({ ...(client as object), timestamp: 2 } as never);
    jest.advanceTimersByTime(PERSIST_THROTTLE_MS);
    expect((await persister.restoreClient())?.timestamp).toBe(2);
  });

  it("restore returns undefined when empty or corrupt", async () => {
    const storage = fakeStorage();
    const persister = createMmkvPersister(storage);
    expect(await persister.restoreClient()).toBeUndefined();
    storage.set("watchcrew-query-cache", "{not json");
    expect(await persister.restoreClient()).toBeUndefined();
  });

  it("removeClient deletes the entry and cancels a pending write", async () => {
    const storage = fakeStorage();
    const persister = createMmkvPersister(storage);
    await persister.persistClient(client);
    await persister.removeClient();
    jest.advanceTimersByTime(PERSIST_THROTTLE_MS * 2);
    expect(storage.map.size).toBe(0);
  });
});

describe("persist config", () => {
  it("maxAge is 24h and buster is a non-empty string", () => {
    expect(PERSIST_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
    expect(PERSIST_BUSTER).toEqual(expect.any(String));
    expect(PERSIST_BUSTER.length).toBeGreaterThan(0);
  });

  it("dehydrate options use the filter", () => {
    expect(persistDehydrateOptions.shouldDehydrateQuery).toBe(shouldPersistQuery);
  });
});

describe("shouldPersistQuery", () => {
  const q = (status: string, key: unknown[]) =>
    ({ queryKey: key, state: { status } }) as unknown as Query;

  it("persists successful read queries", () => {
    expect(shouldPersistQuery(q("success", ["watchlist", "g"]))).toBe(true);
    expect(shouldPersistQuery(q("success", ["movieDetail", 1]))).toBe(true);
  });
  it("skips pending and errored queries", () => {
    expect(shouldPersistQuery(q("pending", ["watchlist"]))).toBe(false);
    expect(shouldPersistQuery(q("error", ["watchlist"]))).toBe(false);
  });
  it("skips transient search queries", () => {
    expect(shouldPersistQuery(q("success", ["movieSearch", "x"]))).toBe(false);
    expect(shouldPersistQuery(q("success", ["personSearch", "x"]))).toBe(false);
    expect(shouldPersistQuery(q("success", ["companySearch", "x"]))).toBe(false);
  });
});

describe("shouldPersistQuery JSON-safety guard", () => {
  const q = (data: unknown) =>
    ({ queryKey: ["x"], state: { status: "success", data } }) as unknown as Query;

  it("persists plain objects/arrays/primitives/null", () => {
    expect(shouldPersistQuery(q({ a: [1, "b", null, { c: true }] }))).toBe(true);
    expect(shouldPersistQuery(q(null))).toBe(true);
  });
  it("refuses Map/Set/Date/class instances anywhere in the data", () => {
    expect(shouldPersistQuery(q(new Map([[1, 2]])))).toBe(false);
    expect(shouldPersistQuery(q({ nested: [new Set([1])] }))).toBe(false);
    expect(shouldPersistQuery(q({ at: new Date() }))).toBe(false);
    class Foo {}
    expect(shouldPersistQuery(q({ foo: new Foo() }))).toBe(false);
  });
});

describe("cache schema version", () => {
  it("is bumped to 2 so previously persisted Map-as-{} shapes are dropped", () => {
    expect(PERSIST_BUSTER.endsWith("-2")).toBe(true);
  });
});

describe("clearPersistedQueryCache", () => {
  it("clears memory cache and persisted storage", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["watchlist"], [1]);
    const persister = { removeClient: jest.fn(async () => {}) } as never;
    await clearPersistedQueryCache(qc, persister);
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
    expect((persister as { removeClient: jest.Mock }).removeClient).toHaveBeenCalled();
  });
});
