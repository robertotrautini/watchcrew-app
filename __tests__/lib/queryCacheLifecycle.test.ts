import { QueryClient } from "@tanstack/react-query";

import { handleAuthEventForCache, type KeyValueStorage } from "@/lib/queryPersistence";

function storage(): KeyValueStorage {
  const m = new Map<string, string>();
  return { getString: (k) => m.get(k), set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}
const session = (id: string) => ({ user: { id } }) as never;

describe("handleAuthEventForCache", () => {
  const setup = () => {
    const qc = new QueryClient();
    qc.setQueryData(["watchlist"], [1]);
    const persister = { removeClient: jest.fn(async () => {}) } as never;
    return { qc, persister, st: storage() };
  };

  it("clears on SIGNED_OUT", async () => {
    const { qc, persister, st } = setup();
    await handleAuthEventForCache("SIGNED_OUT", null, qc, persister, st);
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
    expect((persister as { removeClient: jest.Mock }).removeClient).toHaveBeenCalled();
  });

  it("keeps cache when same user signs in again, records owner", async () => {
    const { qc, persister, st } = setup();
    await handleAuthEventForCache("SIGNED_IN", session("a"), qc, persister, st);
    await handleAuthEventForCache("TOKEN_REFRESHED", session("a"), qc, persister, st);
    expect(qc.getQueryCache().getAll()).toHaveLength(1);
  });

  it("clears when a different user appears", async () => {
    const { qc, persister, st } = setup();
    await handleAuthEventForCache("INITIAL_SESSION", session("a"), qc, persister, st);
    await handleAuthEventForCache("SIGNED_IN", session("b"), qc, persister, st);
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
  });

  it("ignores INITIAL_SESSION without session", async () => {
    const { qc, persister, st } = setup();
    await handleAuthEventForCache("INITIAL_SESSION", null, qc, persister, st);
    expect(qc.getQueryCache().getAll()).toHaveLength(1);
  });
});
