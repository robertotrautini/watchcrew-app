const { parseDump } = require("../../../scripts/legacy-import/sqlDump");
const { buildPlan } = require("../../../scripts/legacy-import/transform");
const { createMemoryDb } = require("../../../scripts/legacy-import/memoryBackend");
const { buildWriteSet, upsertAll } = require("../../../scripts/legacy-import/importer");
const { FIXTURE_DUMP } = require("../../helpers/legacyDumpFixture");

const USERS = { Robin: "aaaaaaaa-0000-4000-8000-000000000001", Tobias: "aaaaaaaa-0000-4000-8000-000000000002", Dad: "aaaaaaaa-0000-4000-8000-000000000003" };
const map = { Robin: "r@example.test", Tobias: "t@example.test", Dad: "d@example.test" };
const plan = () => buildPlan(parseDump(FIXTURE_DUMP), { memberMap: map });
const NOW = "2026-10-10T10:00:00.000Z";

describe("buildWriteSet", () => {
  it("maps member refs to real user ids and DB column names", () => {
    const { rows } = plan();
    const ws = buildWriteSet(rows, { userIds: USERS, existingMovies: new Map(), existingGenres: new Map(), now: NOW });
    expect(ws.tables.watch_group_members[0]).toEqual(expect.objectContaining({ user_id: expect.stringMatching(/^aaaaaaaa/), role: expect.any(String) }));
    expect(ws.tables.watch_group_members[0]).not.toHaveProperty("user_ref");
    expect(ws.tables.watchlist_entries.every((e) => e.added_by === USERS.Robin)).toBe(true);
    expect(ws.tables.watchlist_entries[0]).toHaveProperty("paid_by_member_id");
    expect(ws.tables.ratings.every((r) => r.member_id && !("user_ref" in r))).toBe(true);
    expect(ws.tables.watch_groups.map((g) => Object.keys(g).sort())).toEqual(ws.tables.watch_groups.map(() => ["color_theme", "id", "name"]));
  });
  it("uses the joined_at rule value from the plan and falls back to now only if null", () => {
    const { rows } = plan();
    rows.watch_group_members[0].joined_at = null;
    const ws = buildWriteSet(rows, { userIds: USERS, existingMovies: new Map(), existingGenres: new Map(), now: NOW });
    expect(ws.tables.watch_group_members[0].joined_at).toBe(NOW);
  });
  it("keeps every row of one table on the same key set (PostgREST bulk upsert)", () => {
    const { rows } = plan();
    const ws = buildWriteSet(rows, { userIds: USERS, existingMovies: new Map(), existingGenres: new Map(), now: NOW });
    for (const t of Object.values(ws.tables)) {
      const keys = new Set(t.map((r) => Object.keys(r).sort().join(",")));
      expect(keys.size).toBeLessThanOrEqual(1);
    }
  });
  it("remaps ids of movies/genres that already exist with a different id and leaves them untouched", () => {
    const { rows } = plan();
    const m = rows.movies[0];
    const g = rows.genres[0];
    const existingMovies = new Map([[m.tmdb_id, "99999999-9999-4999-8999-999999999999"]]);
    const existingGenres = new Map([[g.tmdb_genre_id, "88888888-8888-4888-8888-888888888888"]]);
    const ws = buildWriteSet(rows, { userIds: USERS, existingMovies, existingGenres, now: NOW });
    expect(ws.tables.movies.find((x) => x.tmdb_id === m.tmdb_id)).toBeUndefined();
    expect(ws.tables.genres.find((x) => x.tmdb_genre_id === g.tmdb_genre_id)).toBeUndefined();
    expect(ws.tables.movie_genres.some((x) => x.movie_id === m.id)).toBe(false);
    for (const e of rows.watchlist_entries.filter((e) => e.movie_id === m.id)) {
      expect(ws.tables.watchlist_entries.find((x) => x.id === e.id).movie_id).toBe("99999999-9999-4999-8999-999999999999");
    }
    for (const x of ws.tables.movie_genres) expect(x.genre_id).not.toBe(g.id);
    expect(ws.preexistingMovieTmdbIds).toEqual([m.tmdb_id]);
    expect(ws.movieIdByTmdb.get(m.tmdb_id)).toBe("99999999-9999-4999-8999-999999999999");
  });
  it("throws on an unknown member ref", () => {
    const { rows } = plan();
    expect(() => buildWriteSet(rows, { userIds: { Robin: USERS.Robin }, existingMovies: new Map(), existingGenres: new Map(), now: NOW })).toThrow(/user id/i);
  });
});

describe("upsertAll", () => {
  async function run(db) {
    const { rows } = plan();
    const ws = buildWriteSet(rows, { userIds: USERS, existingMovies: new Map(), existingGenres: new Map(), now: NOW });
    const res = await upsertAll({ db, writeSet: ws, batchSize: 3, retryOpts: { retries: 1, sleep: async () => {} }, log: () => {} });
    return { ws, res };
  }
  it("writes in FK-safe order, batched, returning per-table counts", async () => {
    const db = createMemoryDb({ users: Object.values(USERS) });
    const order = [];
    const orig = db.upsert.bind(db);
    db.upsert = async (t, r, o) => { if (!order.includes(t)) order.push(t); return orig(t, r, o); };
    const { ws, res } = await run(db);
    expect(order).toEqual(["watch_groups", "watch_group_members", "movies", "genres", "movie_genres", "watchlist_entries", "ratings"]);
    for (const [t, rows] of Object.entries(ws.tables)) {
      expect(await db.count(t)).toBe(rows.length);
      expect(res[t]).toBe(rows.length);
    }
  });
  it("is idempotent and does not overwrite existing movie metadata (e.g. proxy-filled titles)", async () => {
    const db = createMemoryDb({ users: Object.values(USERS) });
    const { ws } = await run(db);
    const m = ws.tables.movies[0];
    await db.update("movies", [{ col: "id", op: "eq", value: m.id }], { name: "From TMDB" });
    await run(db);
    expect(await db.count("ratings")).toBe(ws.tables.ratings.length);
    expect((await db.select("movies", { filters: [{ col: "id", op: "eq", value: m.id }] }))[0].name).toBe("From TMDB");
  });
  it("retries transient failures", async () => {
    const db = createMemoryDb({ users: Object.values(USERS) });
    const orig = db.upsert.bind(db);
    let failed = false;
    db.upsert = async (t, r, o) => {
      if (t === "ratings" && !failed) { failed = true; throw Object.assign(new Error("flaky"), { status: 503 }); }
      return orig(t, r, o);
    };
    const { ws } = await run(db);
    expect(await db.count("ratings")).toBe(ws.tables.ratings.length);
  });
  it("fails with a clear message naming table and batch, without row data", async () => {
    const db = createMemoryDb({ users: Object.values(USERS) });
    db.upsert = async () => { throw Object.assign(new Error("db said no"), { status: 400, code: "23514", table: "ratings" }); };
    const { rows } = plan();
    const ws = buildWriteSet(rows, { userIds: USERS, existingMovies: new Map(), existingGenres: new Map(), now: NOW });
    await expect(upsertAll({ db, writeSet: ws, batchSize: 3, retryOpts: { retries: 1, sleep: async () => {} }, log: () => {} })).rejects.toThrow(/watch_groups.*batch 1/);
  });
});
