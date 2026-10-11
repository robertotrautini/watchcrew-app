const { parseDump } = require("../../../scripts/legacy-import/sqlDump");
const { buildPlan } = require("../../../scripts/legacy-import/transform");
const { validatePlan } = require("../../../scripts/legacy-import/validate");
const { createMemoryDb, createFakeAuth, createFakeProxy } = require("../../../scripts/legacy-import/memoryBackend");
const { createMemoryProgress } = require("../../../scripts/legacy-import/gapFill");
const { runApply } = require("../../../scripts/legacy-import/apply");
const { DEV_PROJECT_REF } = require("../../../scripts/legacy-import/target");
const { MAESTRO_GROUP_NAME } = require("../../../scripts/legacy-import/reset");
const { FIXTURE_DUMP } = require("../../helpers/legacyDumpFixture");

const memberMap = { Robin: "r@example.test", Tobias: "t@example.test", Dad: "d@example.test" };
const U = { Robin: "aaaaaaaa-0000-4000-8000-000000000001", Tobias: "aaaaaaaa-0000-4000-8000-000000000002", Dad: "aaaaaaaa-0000-4000-8000-000000000003" };
const URL_OK = `https://${DEV_PROJECT_REF}.supabase.co`;

function makePlan() {
  const { rows, report } = buildPlan(parseDump(FIXTURE_DUMP), { memberMap });
  return { rows, report, violations: validatePlan(rows) };
}
async function makeDeps(over = {}) {
  const db = createMemoryDb({ users: Object.values(U) });
  for (const [ref, id] of Object.entries(U)) await db.upsert("profiles", [{ id, display_name: `old-${ref}` }], { onConflict: "id" });
  return {
    db,
    auth: createFakeAuth({ [memberMap.Robin]: U.Robin, [memberMap.Tobias]: U.Tobias, [memberMap.Dad]: U.Dad }),
    proxy: createFakeProxy(),
    progress: createMemoryProgress(),
    now: () => "2026-10-10T10:00:00.000Z",
    retryOpts: { retries: 1, baseMs: 1, sleep: async () => {} },
    ...over,
  };
}
const base = (o = {}) => ({ dryRun: false, supabaseUrl: URL_OK, memberMap, resetDevData: false, resetConfirm: null, ...o });
const run = (o, deps, plan = makePlan()) => {
  const lines = [];
  return runApply({ plan, opts: base(o), deps, log: (l) => lines.push(l) }).then((r) => ({ ...r, out: lines.join("\n") }));
};

describe("runApply preflight", () => {
  it("refuses a non-dev target before touching any dependency", async () => {
    const deps = await makeDeps();
    const spy = jest.spyOn(deps.db, "count");
    await expect(run({ supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co" }, deps)).rejects.toThrow(/refus/i);
    expect(spy).not.toHaveBeenCalled();
  });
  it("refuses a plan with validation errors", async () => {
    const plan = makePlan();
    plan.violations.push({ severity: "error", rule: "x", table: "t", message: "m" });
    await expect(run({}, await makeDeps(), plan)).rejects.toThrow(/validation/i);
  });
  it("does not abort if push tables contain rows, and leaves them untouched", async () => {
    const deps = await makeDeps();
    await deps.db.upsert("push_tokens", [{ user_id: U.Robin, token: "t" }], { onConflict: "user_id,token" });
    const r = await run({}, deps);
    expect(r.out).toMatch(/NOTE: push_tokens has 1 row/);
    expect(await deps.db.count("push_tokens")).toBe(1);
    expect(await deps.db.count("watch_groups")).toBe(2);
  });
  it("aborts if an account is not found, naming the member but not the email", async () => {
    const deps = await makeDeps({ auth: createFakeAuth({ [memberMap.Robin]: U.Robin }) });
    let err;
    try { await run({}, deps); } catch (e) { err = e; }
    expect(err.message).toMatch(/Tobias/);
    expect(err.message).not.toContain("example.test");
    expect(await deps.db.count("watch_groups")).toBe(0);
  });
  it("aborts with a pointer to the grant proposal when service_role lacks table privileges", async () => {
    const deps = await makeDeps();
    deps.db = createMemoryDb({ users: Object.values(U), denyTables: ["watch_groups"] });
    await expect(run({}, deps)).rejects.toThrow(/9\.5/);
  });
  it("aborts if a profiles row is missing", async () => {
    const deps = await makeDeps();
    await deps.db.delete("profiles", [{ col: "id", op: "eq", value: U.Dad }]);
    await expect(run({}, deps)).rejects.toThrow(/profile.*Dad/i);
  });
  it("rejects --reset-dev-data without matching confirmation", async () => {
    await expect(run({ resetDevData: true, resetConfirm: "x" }, await makeDeps())).rejects.toThrow(/reset-confirm/);
  });
});

describe("runApply happy path", () => {
  it("sets display names, imports everything, fills gaps, verifies", async () => {
    const deps = await makeDeps();
    const r = await run({}, deps);
    expect(r.exitCode).toBe(0);
    const profiles = await deps.db.select("profiles", {});
    expect(profiles.find((p) => p.id === U.Robin).display_name).toBe("Robin");
    expect(profiles.find((p) => p.id === U.Tobias).display_name).toBe("Tobias");
    expect(profiles.find((p) => p.id === U.Dad).display_name).toBe("Dad");
    const plan = makePlan();
    expect(await deps.db.count("watchlist_entries")).toBe(plan.rows.watchlist_entries.length);
    expect(await deps.db.count("ratings")).toBe(plan.rows.ratings.length);
    expect(new Set(deps.proxy.calls).size).toBe(plan.rows.movies.length); // title rule: all movies refreshed
    expect(r.out).toMatch(/VERIFY/);
    expect(r.out).not.toMatch(/example\.test|aaaaaaaa-0000/);
  });
  it("--refresh-scope gaps only refreshes movies with metadata gaps", async () => {
    const deps = await makeDeps();
    const plan = makePlan();
    await run({ refreshScope: "gaps" }, deps, plan);
    expect(deps.proxy.calls.length).toBeLessThan(plan.rows.movies.length);
    expect(deps.proxy.calls.length).toBeGreaterThan(0);
  });
  it("is idempotent on a second run", async () => {
    const deps = await makeDeps();
    await run({}, deps);
    const before = await deps.db.count("ratings");
    const r = await run({}, deps);
    expect(r.exitCode).toBe(0);
    expect(await deps.db.count("ratings")).toBe(before);
  });
  it("reset keeps the Maestro group and its movie; import remaps a clashing tmdb_id to the existing movie", async () => {
    const deps = await makeDeps();
    const plan = makePlan();
    const clash = plan.rows.movies[0];
    const gid = "44444444-4444-4444-8444-444444444444";
    const mid = "55555555-5555-4555-8555-555555555555";
    await deps.db.upsert("watch_groups", [{ id: gid, name: MAESTRO_GROUP_NAME, color_theme: "gold" }, { id: "66666666-6666-4666-8666-666666666666", name: "Old", color_theme: "red" }], { onConflict: "id" });
    await deps.db.upsert("movies", [{ id: mid, tmdb_id: clash.tmdb_id, name: "Maestro Movie" }], { onConflict: "id" });
    await deps.db.upsert("watchlist_entries", [{ id: "77777777-7777-4777-8777-777777777777", group_id: gid, movie_id: mid, added_at: "2026-01-01T00:00:00Z", added_by: U.Robin }], { onConflict: "id" });
    const r = await run({ resetDevData: true, resetConfirm: DEV_PROJECT_REF }, deps, plan);
    expect(r.exitCode).toBe(0);
    const groups = (await deps.db.select("watch_groups", {})).map((g) => g.name);
    expect(groups).toContain(MAESTRO_GROUP_NAME);
    expect(groups).not.toContain("Old");
    const m = await deps.db.select("movies", { filters: [{ col: "tmdb_id", op: "eq", value: clash.tmdb_id }] });
    expect(m).toHaveLength(1);
    expect(m[0].id).toBe(mid);
    expect(m[0].name).toBe("Maestro Movie");
    expect(deps.proxy.calls).not.toContain(clash.tmdb_id);
    expect(r.out).toMatch(/RESET/);
  });
  it("returns exit code 3 when gap filling has failures, and still verifies", async () => {
    const plan = makePlan();
    const t = plan.rows.movies.find((m) => m.release_date === null || m.runtime === null || m.overview === null || m.director === null || m.vote_average === null).tmdb_id;
    const deps = await makeDeps({ proxy: createFakeProxy({ failFor: { [t]: 99 } }) });
    const r = await run({}, deps, plan);
    expect(r.exitCode).toBe(3);
    expect(r.out).toMatch(/failed/);
    expect(r.out).toMatch(/VERIFY/);
  });
});
