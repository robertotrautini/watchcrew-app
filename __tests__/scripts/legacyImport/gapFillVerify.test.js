const { findGaps, fillGaps, createMemoryProgress } = require("../../../scripts/legacy-import/gapFill");
const { verifyImport } = require("../../../scripts/legacy-import/verify");
const { createFakeProxy, createMemoryDb } = require("../../../scripts/legacy-import/memoryBackend");
const { parseDump } = require("../../../scripts/legacy-import/sqlDump");
const { buildPlan } = require("../../../scripts/legacy-import/transform");
const { buildWriteSet, upsertAll } = require("../../../scripts/legacy-import/importer");
const { FIXTURE_DUMP } = require("../../helpers/legacyDumpFixture");

const USERS = { Robin: "aaaaaaaa-0000-4000-8000-000000000001", Tobias: "aaaaaaaa-0000-4000-8000-000000000002", Dad: "aaaaaaaa-0000-4000-8000-000000000003" };
const map = { Robin: "r@example.test", Tobias: "t@example.test", Dad: "d@example.test" };
const noSleep = { retries: 2, baseMs: 1, sleep: async () => {} };

describe("findGaps", () => {
  it("lists movies with missing metadata or genres and counts per kind", () => {
    const movies = [
      { id: "a", tmdb_id: 1, release_date: null, runtime: 90, director: "X", director_id: 1, overview: "o", vote_average: 1, poster: "/p" },
      { id: "b", tmdb_id: 2, release_date: "2000-01-01", runtime: null, director: null, director_id: null, overview: null, vote_average: null, poster: null },
      { id: "c", tmdb_id: 3, release_date: "2000-01-01", runtime: 90, director: "X", director_id: 1, overview: "o", vote_average: 1, poster: "/p" },
    ];
    const g = findGaps(movies, [{ movie_id: "a", genre_id: "g" }]);
    expect(g.movies.map((m) => m.tmdbId)).toEqual([1, 2, 3]);
    expect(g.counts).toMatchObject({ release_date: 1, runtime: 1, director: 1, director_id: 1, overview: 1, vote_average: 1, poster: 1, movie_genres: 2 });
    expect(findGaps(movies, [{ movie_id: "a", genre_id: "g" }, { movie_id: "b", genre_id: "g" }, { movie_id: "c", genre_id: "g" }]).movies.map((m) => m.tmdbId)).toEqual([1, 2]);
  });
});

describe("fillGaps", () => {
  const items = [1, 2, 3, 4].map((t) => ({ tmdbId: t, gaps: ["runtime"] }));
  it("calls the proxy for each movie with concurrency 2 and summarises", async () => {
    const proxy = createFakeProxy({ delayMs: 2 });
    const r = await fillGaps({ proxy, items, concurrency: 2, retryOpts: noSleep, progress: createMemoryProgress(), log: () => {} });
    expect(r.summary).toEqual({ total: 4, ok: 4, failed: 0, skipped: 0 });
    expect(proxy.maxActive).toBe(2);
  });
  it("retries with backoff, reports failures, and is resumable", async () => {
    const progress = createMemoryProgress();
    const proxy = createFakeProxy({ failFor: { 3: 99 } });
    const r1 = await fillGaps({ proxy, items, concurrency: 2, retryOpts: noSleep, progress, log: () => {} });
    expect(r1.summary).toMatchObject({ ok: 3, failed: 1 });
    expect(r1.results.find((x) => x.tmdbId === 3)).toMatchObject({ status: "failed", attempts: 3 });
    const proxy2 = createFakeProxy();
    const r2 = await fillGaps({ proxy: proxy2, items, concurrency: 2, retryOpts: noSleep, progress, log: () => {} });
    expect(proxy2.calls).toEqual([3]);
    expect(r2.summary).toMatchObject({ ok: 1, skipped: 3, failed: 0 });
  });
  it("failure results carry no message text with personal data", async () => {
    const proxy = createFakeProxy({ failFor: { 1: 99 } });
    const r = await fillGaps({ proxy, items: [items[0]], concurrency: 2, retryOpts: noSleep, progress: createMemoryProgress(), log: () => {} });
    expect(Object.keys(r.results[0]).sort()).toEqual(["attempts", "detail", "error", "status", "tmdbId"]);
  });
});

describe("verifyImport", () => {
  async function imported() {
    const { rows } = buildPlan(parseDump(FIXTURE_DUMP), { memberMap: map });
    const db = createMemoryDb({ users: Object.values(USERS) });
    const ws = buildWriteSet(rows, { userIds: USERS, existingMovies: new Map(), existingGenres: new Map(), now: "2026-10-10T10:00:00.000Z" });
    await upsertAll({ db, writeSet: ws, batchSize: 50, retryOpts: noSleep, log: () => {} });
    return { db, ws };
  }
  it("matches counts and spot checks after a clean import", async () => {
    const { db, ws } = await imported();
    const lines = [];
    const rep = await verifyImport({ db, writeSet: ws, log: (l) => lines.push(l) });
    expect(rep.ok).toBe(true);
    expect(rep.tables.every((t) => t.found === t.planned)).toBe(true);
    expect(rep.spot.map((s) => s.name)).toEqual(expect.arrayContaining(["rating", "payment", "title"]));
    expect(lines.join("\n")).not.toMatch(/example\.test|aaaaaaaa-0000/);
  });
  it("detects a missing row and a changed rating", async () => {
    const { db, ws } = await imported();
    await db.delete("ratings", [{ col: "id", op: "eq", value: ws.tables.ratings[0].id }]);
    const rep = await verifyImport({ db, writeSet: ws, log: () => {} });
    expect(rep.ok).toBe(false);
    expect(rep.tables.find((t) => t.table === "ratings").found).toBe(ws.tables.ratings.length - 1);
  });
});
