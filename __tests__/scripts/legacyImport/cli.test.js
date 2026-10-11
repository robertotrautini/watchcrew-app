const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseArgs, run } = require("../../../scripts/legacy-import/cli");
const { FIXTURE_DUMP } = require("../../helpers/legacyDumpFixture");

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-cli-"));
  const dump = path.join(dir, "dump.sql");
  const map = path.join(dir, "map.json");
  fs.writeFileSync(dump, FIXTURE_DUMP);
  fs.writeFileSync(map, JSON.stringify({ Robin: "r@example.test", Tobias: "t@example.test", Dad: "d@example.test" }));
  return { dir, dump, map, plan: path.join(dir, "out", "plan.json") };
}

describe("parseArgs", () => {
  it("parses apply-related flags, with = and space forms", () => {
    const o = parseArgs(["--apply", "--reset-dev-data", "--reset-confirm=abc", "--service-key-file", "/k", "--progress-file=/p"]);
    expect(o).toMatchObject({ apply: true, resetDevData: true, resetConfirm: "abc", serviceKeyFile: "/k", progressFile: "/p", dryRun: false });
    expect(parseArgs([]).dryRun).toBe(true);
  });
  it("validates --refresh-scope", () => {
    expect(parseArgs(["--refresh-scope", "gaps"]).refreshScope).toBe("gaps");
    expect(parseArgs([]).refreshScope).toBe("all");
    expect(() => parseArgs(["--refresh-scope=x"])).toThrow(/all or gaps/);
  });
  it("refuses --apply together with --dry-run", () => {
    expect(() => parseArgs(["--apply", "--dry-run"])).toThrow(/either/i);
  });
  it("never echoes a secret passed as a CLI value", () => {
    for (const a of ["--service-key=SECRETVALUE", "--service-role-key=SECRETVALUE", "--service-key"]) {
      try { parseArgs([a]); throw new Error("no throw"); } catch (e) { expect(e.message).not.toContain("SECRETVALUE"); expect(e.message).toMatch(/service-key-file|SUPABASE_SERVICE_ROLE_KEY/); }
    }
    try { parseArgs(["--bogus=SECRETVALUE"]); } catch (e) { expect(e.message).not.toContain("SECRETVALUE"); }
  });
  it("parses flags", () => {
    expect(parseArgs(["--dump", "a", "--members-map", "b", "--plan-out", "c"])).toMatchObject({ dump: "a", membersMap: "b", planOut: "c", apply: false });
    expect(parseArgs(["--apply"]).apply).toBe(true);
  });
  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/unknown/i);
  });
});

describe("run", () => {
  it("dry-runs, prints counts without PII and writes the plan with mode 600", async () => {
    const s = setup();
    const lines = [];
    const code = await run(["--dump", s.dump, "--members-map", s.map, "--plan-out", s.plan], (l) => lines.push(l));
    const out = lines.join("\n");
    expect(code).toBe(0);
    expect(out).toContain("watchlist_entries");
    expect(out).toContain("Film B");
    expect(out).not.toContain("example.test");
    expect((fs.statSync(s.plan).mode & 0o777).toString(8)).toBe("600");
    expect(fs.readFileSync(s.plan, "utf8")).not.toContain("example.test");
  });

  it("refuses a plan path inside the repo", async () => {
    const s = setup();
    await expect(run(["--dump", s.dump, "--members-map", s.map, "--plan-out", path.join(process.cwd(), "plan.json")], () => {})).rejects.toThrow(/outside the repo/i);
  });

  it("dry-run also simulates the apply path with fake writers (nothing is sent anywhere)", async () => {
    const s = setup();
    const lines = [];
    const code = await run(["--dump", s.dump, "--members-map", s.map, "--plan-out", s.plan], (l) => lines.push(l));
    const out = lines.join("\n");
    expect(code).toBe(0);
    expect(out).toMatch(/SIMULATED/);
    expect(out).toMatch(/VERIFY/);
    expect(out).not.toContain("example.test");
  });

  it("apply needs dump and members map", async () => {
    await expect(run(["--apply"], () => {})).rejects.toThrow(/usage/i);
  });

  it("apply refuses reset without the matching confirmation before reading any key", async () => {
    const s = setup();
    await expect(run(["--apply", "--reset-dev-data", "--dump", s.dump, "--members-map", s.map, "--plan-out", s.plan], () => {})).rejects.toThrow(/reset-confirm/);
  });

  it("apply refuses to run without a service key", async () => {
    const s = setup();
    const saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      await expect(run(["--apply", "--dump", s.dump, "--members-map", s.map, "--plan-out", s.plan], () => {})).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    } finally {
      if (saved !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
    }
  });

  it("apply refuses a non-dev --supabase-url", async () => {
    const s = setup();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy";
    try {
      await expect(run(["--apply", "--supabase-url", "https://abcdefghijklmnopqrst.supabase.co", "--dump", s.dump, "--members-map", s.map, "--plan-out", s.plan], () => {})).rejects.toThrow(/refus/i);
    } finally {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });
});
