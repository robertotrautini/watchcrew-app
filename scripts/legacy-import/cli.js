#!/usr/bin/env node
"use strict";
// Legacy -> WatchCrew import tool (DEV project only).
//   dry-run (default, offline, simulates apply with fake writers):
//     node scripts/legacy-import/cli.js --dump <dump.sql> --members-map <map.json> [--plan-out <plan.json>]
//   real run (service key via SUPABASE_SERVICE_ROLE_KEY or --service-key-file <path>, never as a CLI value):
//     node scripts/legacy-import/cli.js --apply --dump ... --members-map ... [--reset-dev-data --reset-confirm=<dev ref>]
// Never prints emails or keys; the plan JSON is written outside the repo (mode 600).

const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseDump } = require("./sqlDump");
const { buildPlan } = require("./transform");
const { validatePlan } = require("./validate");
const { DEV_PROJECT_REF, assertDevTarget } = require("./target");
const { legacyId } = require("./ids");
const { loadServiceKey } = require("./serviceKey");
const { createMemoryDb, createFakeAuth, createFakeProxy } = require("./memoryBackend");
const { createRestDb, createRestAuth, createHttpProxy } = require("./restClient");
const { createMemoryProgress, createFileProgress } = require("./gapFill");
const { runApply } = require("./apply");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const VALUE_FLAGS = {
  "--dump": "dump",
  "--members-map": "membersMap",
  "--plan-out": "planOut",
  "--reset-confirm": "resetConfirm",
  "--service-key-file": "serviceKeyFile",
  "--supabase-url": "supabaseUrl",
  "--progress-file": "progressFile",
  "--refresh-scope": "refreshScope",
};

function parseArgs(argv) {
  const o = {
    dump: null, membersMap: null, planOut: path.join(os.homedir(), "legacy-export", "plan.json"),
    apply: false, dryRun: true, resetDevData: false, resetConfirm: null, serviceKeyFile: null,
    supabaseUrl: `https://${DEV_PROJECT_REF}.supabase.co`,
    progressFile: path.join(os.homedir(), "legacy-export", "gapfill-progress.json"),
    refreshScope: "all",
  };
  let sawDryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const eqAt = raw.indexOf("=");
    const flag = eqAt === -1 ? raw : raw.slice(0, eqAt); // never echo a value
    if (/^--service-(role-)?key$/.test(flag)) {
      throw new Error("the service key is never accepted on the command line: use SUPABASE_SERVICE_ROLE_KEY or --service-key-file <path>");
    }
    if (flag === "--apply") { o.apply = true; o.dryRun = false; }
    else if (flag === "--dry-run") { sawDryRun = true; o.dryRun = true; }
    else if (flag === "--reset-dev-data") o.resetDevData = true;
    else if (VALUE_FLAGS[flag]) {
      if (eqAt !== -1) o[VALUE_FLAGS[flag]] = raw.slice(eqAt + 1);
      else {
        i += 1;
        if (i >= argv.length) throw new Error(`missing value for ${flag}`);
        o[VALUE_FLAGS[flag]] = argv[i];
      }
    } else throw new Error(`unknown argument: ${flag}`);
  }
  if (!["all", "gaps"].includes(o.refreshScope)) throw new Error("--refresh-scope must be all or gaps");
  if (o.apply && sawDryRun) throw new Error("use either --apply or --dry-run, not both");
  return o;
}

const pad = (s, n) => String(s).padEnd(n);

function formatReport(report, violations) {
  const L = [];
  L.push("COUNTS  (legacy -> planned, skipped by reason)");
  L.push(`${pad("table", 34)}${pad("legacy", 8)}${pad("planned", 9)}skipped`);
  for (const c of report.counts) {
    const sk = Object.entries(c.skipped).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`).join("; ");
    L.push(`${pad(c.table, 34)}${pad(c.legacy, 8)}${pad(c.planned, 9)}${sk}`);
  }
  L.push("");
  L.push(`COLLAPSED ENTRIES (same group + tmdb_id): ${report.collapses.length}`);
  for (const c of report.collapses) L.push(`  - ${c.movie} [${c.group}] ${c.entries} entries -> 1`);
  const real = report.conflicts.filter((c) => !c.info);
  const info = report.conflicts.filter((c) => c.info);
  L.push(`CONFLICTS: ${real.length} (plus ${info.length} merges without value conflict)`);
  for (const c of real) L.push(`  - ${c.kind}: ${c.movie} [${c.group}] ${c.member}`);
  L.push("");
  L.push("METADATA GAPS in planned movies (to fill from TMDB in apply):");
  for (const [k, n] of Object.entries(report.gaps)) L.push(`  ${pad(k, 14)}${n}`);
  L.push(`TITLES: source = ${report.titles.source}; CJK/non-latin legacy names: ${report.titles.cjk.length}`);
  for (const t of report.titles.cjk) L.push(`  - ${t}`);
  if (report.unmappedGenres.length) L.push(`UNMAPPED GENRES: ${report.unmappedGenres.join(", ")}`);
  L.push(`RATING rated_at: from seen_at ${report.ratedAt.fromSeenAt}, left NULL (rating without seen_at) ${report.ratedAt.nullBecauseNoSeenAt}; empty rows with only rated_at set: ${report.emptyRatingsWithRatedAt}`);
  L.push("");
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");
  L.push(`SCHEMA VALIDATION: ${errors.length} errors, ${warnings.length} warnings`);
  for (const v of violations.slice(0, 50)) L.push(`  [${v.severity}] ${v.table}/${v.rule}: ${v.message}`);
  return L.join("\n");
}

function simulatedDeps(memberMap) {
  const ids = Object.fromEntries(Object.keys(memberMap).map((ref) => [ref, legacyId("simulated-user", ref)]));
  const db = createMemoryDb({ users: Object.values(ids) });
  return {
    ids,
    async build() {
      for (const [ref, id] of Object.entries(ids)) await db.upsert("profiles", [{ id, display_name: `old-${ref}` }], { onConflict: "id" });
      return {
        db,
        auth: createFakeAuth(Object.fromEntries(Object.entries(memberMap).map(([ref, email]) => [email, ids[ref]]))),
        proxy: createFakeProxy(),
        progress: createMemoryProgress(),
        retryOpts: { retries: 0, sleep: async () => {} },
      };
    },
  };
}

function realDeps(opts, key) {
  const progressPath = path.resolve(opts.progressFile);
  if (progressPath === REPO_ROOT || progressPath.startsWith(REPO_ROOT + path.sep)) throw new Error("--progress-file must be outside the repo");
  const cfg = { url: opts.supabaseUrl, key };
  return {
    db: createRestDb(cfg),
    auth: createRestAuth(cfg),
    proxy: createHttpProxy(cfg),
    progress: createFileProgress(progressPath),
    retryOpts: { retries: 3, baseMs: 1000 },
  };
}

async function run(argv, log = console.log) {
  const opts = parseArgs(argv);
  if (!opts.dump || !opts.membersMap) throw new Error("usage: --dump <path> --members-map <path> [--plan-out <path>] [--apply [--reset-dev-data --reset-confirm=<dev ref>] [--service-key-file <path>]]");
  if (opts.resetDevData && opts.resetConfirm !== DEV_PROJECT_REF) {
    throw new Error(`--reset-dev-data needs --reset-confirm=${DEV_PROJECT_REF}`);
  }
  const planPath = path.resolve(opts.planOut);
  if (planPath === REPO_ROOT || planPath.startsWith(REPO_ROOT + path.sep)) {
    throw new Error("--plan-out must be outside the repo (plan contains personal data)");
  }
  const memberMap = JSON.parse(fs.readFileSync(opts.membersMap, "utf8"));
  const tables = parseDump(fs.readFileSync(opts.dump, "utf8"));
  const { rows, report } = buildPlan(tables, { memberMap });
  const violations = validatePlan(rows);
  log(formatReport(report, violations));
  fs.mkdirSync(path.dirname(planPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(planPath, JSON.stringify({ rows, report, violations }, null, 2), { mode: 0o600 });
  fs.chmodSync(planPath, 0o600);
  if (violations.some((v) => v.severity === "error")) return 1;
  const plan = { rows, report, violations };
  const applyOpts = { dryRun: opts.dryRun, supabaseUrl: opts.supabaseUrl, memberMap, resetDevData: opts.resetDevData, resetConfirm: opts.resetConfirm, refreshScope: opts.refreshScope };

  if (opts.dryRun) {
    log("\nPlan written (mode 600) outside the repo. Nothing was sent anywhere; simulating the apply path with fake writers:\n");
    const sim = simulatedDeps(memberMap);
    const result = await runApply({ plan, opts: applyOpts, deps: await sim.build(), log });
    return result.exitCode;
  }

  assertDevTarget(opts.supabaseUrl);
  const key = loadServiceKey({ env: process.env, keyFile: opts.serviceKeyFile, repoRoot: REPO_ROOT });
  log("\nPlan written (mode 600) outside the repo. Starting the REAL apply against the dev project.\n");
  const result = await runApply({ plan, opts: applyOpts, deps: realDeps(opts, key), log });
  return result.exitCode;
}

if (require.main === module) {
  run(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (e) => {
      console.error(`error: ${e.message}`);
      process.exitCode = 1;
    },
  );
}

module.exports = { parseArgs, run, formatReport };
