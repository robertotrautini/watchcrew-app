const { createMemoryDb, createFakeAuth, createFakeProxy } = require("../../../scripts/legacy-import/memoryBackend");
const { createRestDb, createRestAuth, createHttpProxy, safeMessage } = require("../../../scripts/legacy-import/restClient");
const { eq, inList, notIn, notNull } = require("../../../scripts/legacy-import/filters");

const G1 = "11111111-1111-4111-8111-111111111111";
const G2 = "22222222-2222-4222-8222-222222222222";
const U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KEY = "svc-secret-key";

describe("memory db", () => {
  it("upserts (merge / ignore), counts, selects with filters", async () => {
    const db = createMemoryDb({ users: [U1] });
    await db.upsert("watch_groups", [{ id: G1, name: "A", color_theme: "gold" }], { onConflict: "id" });
    await db.upsert("watch_groups", [{ id: G1, name: "B", color_theme: "gold" }], { onConflict: "id", ignoreDuplicates: true });
    expect((await db.select("watch_groups", {}))[0].name).toBe("A");
    await db.upsert("watch_groups", [{ id: G1, name: "B", color_theme: "gold" }, { id: G2, name: "C", color_theme: "red" }], { onConflict: "id" });
    expect(await db.count("watch_groups")).toBe(2);
    expect((await db.select("watch_groups", { filters: [eq("name", "B")] })).map((r) => r.id)).toEqual([G1]);
    expect((await db.select("watch_groups", { filters: [inList("id", [G2])] })).length).toBe(1);
    expect((await db.select("watch_groups", { filters: [notIn("id", [G2])] })).length).toBe(1);
    expect((await db.select("watch_groups", { filters: [notNull("id")] })).length).toBe(2);
  });
  it("enforces foreign keys and cascades deletes", async () => {
    const db = createMemoryDb({ users: [U1] });
    await expect(db.upsert("watch_group_members", [{ group_id: G1, user_id: U1, role: "owner", joined_at: null }], { onConflict: "group_id,user_id" })).rejects.toMatchObject({ code: "23503" });
    await db.upsert("watch_groups", [{ id: G1, name: "A", color_theme: "gold" }], { onConflict: "id" });
    await db.upsert("watch_group_members", [{ group_id: G1, user_id: U1, role: "owner", joined_at: null }], { onConflict: "group_id,user_id" });
    await db.delete("watch_groups", [eq("id", G1)]);
    expect(await db.count("watch_group_members")).toBe(0);
  });
  it("can simulate a missing table privilege", async () => {
    const db = createMemoryDb({ denyTables: ["ratings"] });
    await expect(db.count("ratings")).rejects.toMatchObject({ code: "42501", table: "ratings" });
  });
});

describe("rest db", () => {
  const mk = (responder) => {
    const calls = [];
    const fetch = async (url, init) => {
      calls.push({ url, init });
      return responder(url, init);
    };
    return { calls, db: createRestDb({ url: "https://x.supabase.co", key: KEY, fetch }) };
  };
  const json = (status, body, headers = {}) => ({ ok: status < 300, status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, text: async () => (body === undefined ? "" : JSON.stringify(body)) });

  it("builds upsert requests with on_conflict and Prefer headers", async () => {
    const { calls, db } = mk(() => json(201));
    await db.upsert("movies", [{ id: "a" }], { onConflict: "id", ignoreDuplicates: true });
    expect(calls[0].url).toBe("https://x.supabase.co/rest/v1/movies?on_conflict=id");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers.Prefer).toContain("resolution=ignore-duplicates");
    expect(calls[0].init.headers.apikey).toBe(KEY);
    await db.upsert("ratings", [{ id: "a" }], { onConflict: "id" });
    expect(calls[1].init.headers.Prefer).toContain("resolution=merge-duplicates");
  });
  it("builds filters for select/delete/update and skips empty in-lists", async () => {
    const { calls, db } = mk(() => json(200, []));
    await db.select("ratings", { columns: "id", filters: [inList("id", ["a", "b"])] });
    expect(calls[0].url).toContain("id=in.(a,b)");
    expect(calls[0].url).toContain("select=id");
    await db.select("ratings", { filters: [inList("id", [])] });
    expect(calls).toHaveLength(1);
    await db.delete("ratings", [notIn("watchlist_entry_id", ["x"])]);
    expect(calls[1].init.method).toBe("DELETE");
    expect(calls[1].url).toContain("watchlist_entry_id=not.in.(x)");
    await db.delete("ratings", [notIn("watchlist_entry_id", [])]);
    expect(calls[2].url).toContain("watchlist_entry_id=not.is.null");
    await db.update("profiles", [eq("id", "u")], { display_name: "Robin" });
    expect(calls[3].init.method).toBe("PATCH");
    expect(calls[3].url).toContain("id=eq.u");
  });
  it("reads exact counts from content-range", async () => {
    const { calls, db } = mk(() => json(200, undefined, { "content-range": "*/42" }));
    expect(await db.count("movies")).toBe(42);
    expect(calls[0].init.method).toBe("HEAD");
    expect(calls[0].init.headers.Prefer).toContain("count=exact");
  });
  it("turns errors into PII-free, key-free ImportErrors with code and status", async () => {
    const { db } = mk(() => json(409, { code: "23503", message: "violates fk for someone@example.test", details: "Key (x)=(someone@example.test)" }));
    let err;
    try { await db.upsert("ratings", [{ id: "a" }], { onConflict: "id" }); } catch (e) { err = e; }
    expect(err).toMatchObject({ status: 409, code: "23503", table: "ratings" });
    expect(err.message).not.toContain("someone@example.test");
    expect(err.message).not.toContain(KEY);
    expect(err.message).toContain("ratings");
  });
  it("marks network failures as transient and hides the key", async () => {
    const db = createRestDb({ url: "https://x.supabase.co", key: KEY, fetch: async () => { throw new Error(`boom ${KEY}`); } });
    let err;
    try { await db.count("movies"); } catch (e) { err = e; }
    expect(err.code).toBe("NETWORK");
    expect(err.message).not.toContain(KEY);
  });
  it("points at the grant proposal on 42501", async () => {
    const { db } = mk(() => json(403, { code: "42501", message: "permission denied for table ratings" }));
    await expect(db.count("ratings")).rejects.toThrow(/9\.5/);
  });
});

describe("safeMessage", () => {
  it("redacts emails and truncates", () => {
    expect(safeMessage("hi a.b@c.de there")).toBe("hi [email] there");
    expect(safeMessage("x".repeat(500)).length).toBeLessThanOrEqual(201);
  });
});

describe("auth", () => {
  it("fake auth finds users case-insensitively", async () => {
    const a = createFakeAuth({ "R@Example.test": U1 });
    expect(await a.findUserIdByEmail("r@example.test")).toBe(U1);
    expect(await a.findUserIdByEmail("none@example.test")).toBeNull();
  });
  it("rest auth pages through the admin users list", async () => {
    const pages = [
      { users: Array.from({ length: 200 }, (_, i) => ({ id: `id${i}`, email: `u${i}@example.test` })) },
      { users: [{ id: U1, email: "Target@Example.test" }] },
    ];
    const urls = [];
    const fetch = async (url, init) => {
      urls.push(url);
      expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(pages[urls.length - 1]) };
    };
    const a = createRestAuth({ url: "https://x.supabase.co", key: KEY, fetch });
    expect(await a.findUserIdByEmail("target@example.test")).toBe(U1);
    expect(urls[0]).toContain("/auth/v1/admin/users?page=1&per_page=200");
    expect(urls).toHaveLength(2);
  });
});

describe("proxy", () => {
  it("fake proxy records calls and can fail on demand", async () => {
    const p = createFakeProxy({ failFor: { 5: 2 } });
    await expect(p.refreshMovie(5)).rejects.toMatchObject({ status: 503 });
    await expect(p.refreshMovie(5)).rejects.toMatchObject({ status: 503 });
    await expect(p.refreshMovie(5)).resolves.toMatchObject({ ok: true });
    expect(p.calls).toEqual([5, 5, 5]);
  });
  it("http proxy posts refresh_movie per docs/tmdb-proxy-refresh-contract.md", async () => {
    const calls = [];
    const fetch = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ data: { status: "updated", titleSource: "de", updatedFields: ["name", "runtime"] } }) };
    };
    const p = createHttpProxy({ url: "https://x.supabase.co", key: KEY, fetch });
    const out = await p.refreshMovie(603);
    expect(out).toEqual({ ok: true, status: "updated", titleSource: "de", updatedFields: 2 });
    expect(calls[0].url).toBe("https://x.supabase.co/functions/v1/tmdb-proxy");
    expect(JSON.parse(calls[0].init.body)).toEqual({ kind: "refresh_movie", tmdbId: 603, fillGapsOnly: true });
  });
});
