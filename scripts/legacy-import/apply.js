"use strict";
// Phase 2 orchestrator. The same code path serves the real run and the
// dry-run: only the injected dependencies differ (REST clients vs fakes).
//
// Steps: preflight -> profile names -> [reset] -> resolve existing catalog rows
// -> ordered upserts -> metadata-gap fill -> verification report.
// Exit codes: 0 ok, 1 verification mismatch, 3 gap-fill failures (resumable).

const { assertDevTarget, DEV_PROJECT_REF } = require("./target");
const { eq, inList } = require("./filters");
const { chunk } = require("./retry");
const { COUNT_TABLES, resetDevData } = require("./reset");
const { buildWriteSet, upsertAll } = require("./importer");
const { findGaps, fillGaps } = require("./gapFill");
const { verifyImport } = require("./verify");

const PROBE_TABLES = [...COUNT_TABLES, "profiles", "push_tokens", "push_subscriptions"];
// push tables are only probed (informational), never written by the import
const PUSH_TABLES = ["push_tokens", "push_subscriptions"];

async function preflight({ plan, opts, deps, log }) {
  assertDevTarget(opts.supabaseUrl);
  if (opts.resetDevData && opts.resetConfirm !== DEV_PROJECT_REF) {
    throw new Error(`--reset-dev-data needs --reset-confirm=${DEV_PROJECT_REF}`);
  }
  const errors = (plan.violations || []).filter((v) => v.severity === "error");
  if (errors.length) throw new Error(`plan has ${errors.length} validation error(s); fix the dry-run first`);

  const counts = {};
  for (const t of PROBE_TABLES) counts[t] = await deps.db.count(t);
  for (const t of PUSH_TABLES) {
    if (counts[t] > 0) log(`NOTE: ${t} has ${counts[t]} row(s); the import never writes push tables (push_subscriptions rows of reset groups go via FK cascade)`);
  }

  const userIds = {};
  for (const { user_ref: ref } of plan.rows.profiles) {
    const email = opts.memberMap[ref];
    const id = email ? await deps.auth.findUserIdByEmail(email) : null;
    if (!id) throw new Error(`no Auth account found for member "${ref}" (check members-map)`);
    userIds[ref] = id;
  }
  const existing = await deps.db.select("profiles", { columns: "id", filters: [inList("id", Object.values(userIds))] });
  const have = new Set(existing.map((p) => p.id));
  for (const [ref, id] of Object.entries(userIds)) {
    if (!have.has(id)) throw new Error(`profile row missing for member "${ref}"`);
  }
  log(`PREFLIGHT ok: dev target, plan valid, ${Object.keys(userIds).length} accounts resolved, table access ok`);
  return userIds;
}

async function existingCatalogIds(db, rows) {
  const movies = new Map();
  const planned = new Map(rows.movies.map((m) => [m.tmdb_id, m.id]));
  for (const part of chunk([...planned.keys()], 80)) {
    for (const r of await db.select("movies", { columns: "id,tmdb_id", filters: [inList("tmdb_id", part)] })) {
      if (r.id !== planned.get(r.tmdb_id)) movies.set(r.tmdb_id, r.id); // different id = foreign row, keep and reuse it
    }
  }
  const genres = new Map();
  const plannedG = new Map(rows.genres.map((g) => [g.tmdb_genre_id, g.id]));
  for (const r of await db.select("genres", { columns: "id,tmdb_genre_id" })) {
    if (plannedG.has(r.tmdb_genre_id) && r.id !== plannedG.get(r.tmdb_genre_id)) genres.set(r.tmdb_genre_id, r.id);
  }
  return { movies, genres };
}

async function runApply({ plan, opts, deps, log = console.log }) {
  const now = deps.now || (() => new Date().toISOString());
  log(opts.dryRun ? "APPLY SIMULATED (dry-run: fake writers, nothing is sent anywhere)" : "APPLY (real writes to the dev project)");
  const userIds = await preflight({ plan, opts, deps, log });

  for (const { user_ref: ref, display_name: name } of plan.rows.profiles) {
    await deps.db.update("profiles", [eq("id", userIds[ref])], { display_name: name });
  }
  log(`PROFILES: display_name set for ${plan.rows.profiles.length} accounts (${plan.rows.profiles.map((p) => p.display_name).join("/")})`);

  if (opts.resetDevData) await resetDevData({ db: deps.db, confirm: opts.resetConfirm, log });
  else log("RESET: skipped (no --reset-dev-data)");

  const existing = await existingCatalogIds(deps.db, plan.rows);
  const writeSet = buildWriteSet(plan.rows, { userIds, existingMovies: existing.movies, existingGenres: existing.genres, now: now() });
  if (writeSet.preexistingMovieTmdbIds.length || writeSet.preexistingGenreTmdbIds.length) {
    log(`REUSED existing rows (kept untouched): ${writeSet.preexistingMovieTmdbIds.length} movies, ${writeSet.preexistingGenreTmdbIds.length} genres`);
  }
  log("UPSERTS");
  await upsertAll({ db: deps.db, writeSet, batchSize: opts.batchSize || 100, retryOpts: deps.retryOpts, log });

  const skip = new Set(writeSet.preexistingMovieTmdbIds);
  const importedMovies = plan.rows.movies.filter((m) => !skip.has(m.tmdb_id));
  const importedIds = new Set(importedMovies.map((m) => m.id));
  const gaps = findGaps(importedMovies, plan.rows.movie_genres.filter((x) => importedIds.has(x.movie_id)));
  // Title rule (de -> en -> legacy name) runs server side inside refresh_movie for every call,
  // so by default ALL imported movies are refreshed; --refresh-scope gaps limits it to movies with gaps.
  const gapByTmdb = new Map(gaps.movies.map((g) => [g.tmdbId, g]));
  const items = opts.refreshScope === "gaps" ? gaps.movies : importedMovies.map((m) => gapByTmdb.get(m.tmdb_id) || { tmdbId: m.tmdb_id, gaps: [] });
  log(`REFRESH via tmdb-proxy refresh_movie (concurrency 2, scope ${opts.refreshScope === "gaps" ? "gaps only" : "all imported movies"}): ${items.length} movies; ${gaps.movies.length} with gaps: ${Object.entries(gaps.counts).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ")}`);
  const fill = await fillGaps({ proxy: deps.proxy, items, concurrency: 2, retryOpts: deps.retryOpts, progress: deps.progress, log });

  const verification = await verifyImport({ db: deps.db, writeSet, log });
  let exitCode = 0;
  if (fill.summary.failed) exitCode = 3;
  if (!verification.ok) exitCode = 1;
  log(exitCode === 0 ? "DONE: ok" : exitCode === 3 ? "DONE with gap-fill failures: rerun the same command to resume (finished movies are skipped)" : "DONE: verification MISMATCH");
  return { exitCode, fill: fill.summary, verification };
}

module.exports = { runApply };
