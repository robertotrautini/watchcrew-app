"use strict";
// reset-dev-data: deletes imported/legacy domain data in DEV so the import
// starts clean. Keeps users (auth.*), profiles and push tables untouched, and
// keeps the Maestro test group with everything tied to it (allowlist).
//
// PostgREST cannot run a multi-statement transaction, so this is a sequence of
// targeted DELETEs in FK-safe order. It is NOT atomic but re-runnable: it always
// recomputes "everything except the allowlist". Rows in release_reminder_log
// are removed by the FK cascade from watchlist_entries (no direct grant needed).

const { DEV_PROJECT_REF } = require("./target");
const { eq, inList, notIn } = require("./filters");

const MAESTRO_GROUP_NAME = "Maestro Test Gruppe";
const MAX_ALLOWLIST = 150; // keeps the PostgREST filter URLs short and the blast radius obvious
const COUNT_TABLES = ["watch_groups", "watch_group_members", "movies", "genres", "movie_genres", "watchlist_entries", "ratings"];

const uniq = (a) => [...new Set(a.filter((x) => x !== null && x !== undefined))];

async function countAll(db) {
  const out = {};
  for (const t of COUNT_TABLES) out[t] = await db.count(t);
  return out;
}

async function resolveAllowlist(db) {
  const groups = await db.select("watch_groups", { columns: "id", filters: [eq("name", MAESTRO_GROUP_NAME)] });
  const groupIds = groups.map((g) => g.id);
  const entries = await db.select("watchlist_entries", { columns: "id,movie_id", filters: [inList("group_id", groupIds)] });
  const entryIds = entries.map((e) => e.id);
  const movieIds = uniq(entries.map((e) => e.movie_id));
  const mg = await db.select("movie_genres", { columns: "movie_id,genre_id", filters: [inList("movie_id", movieIds)] });
  const genreIds = uniq(mg.map((x) => x.genre_id));
  for (const [name, list] of Object.entries({ groups: groupIds, entries: entryIds, movies: movieIds, genres: genreIds })) {
    if (list.length > MAX_ALLOWLIST) {
      throw new Error(`reset aborted: allowlist (${name}: ${list.length}) is larger than the safe limit ${MAX_ALLOWLIST}; nothing was deleted`);
    }
  }
  return { groupIds, entryIds, movieIds, genreIds };
}

async function resetDevData({ db, confirm, log = console.log }) {
  if (confirm !== DEV_PROJECT_REF) {
    throw new Error(`reset refused: pass --reset-confirm=${DEV_PROJECT_REF} to confirm the dev project`);
  }
  const before = await countAll(db);
  const keep = await resolveAllowlist(db);
  log(`RESET dev data (users, profiles and push tables are NOT touched)`);
  log(`  allowlist "${MAESTRO_GROUP_NAME}": ${keep.groupIds.length} group(s) kept with ${keep.entryIds.length} entries, ${keep.movieIds.length} movies, ${keep.genreIds.length} genres`);

  await db.delete("ratings", [notIn("watchlist_entry_id", keep.entryIds)]);
  await db.delete("watchlist_entries", [notIn("group_id", keep.groupIds)]);
  await db.delete("movie_genres", [notIn("movie_id", keep.movieIds)]);
  await db.delete("watch_group_members", [notIn("group_id", keep.groupIds)]);
  await db.delete("watch_groups", [notIn("id", keep.groupIds)]);
  await db.delete("movies", [notIn("id", keep.movieIds)]);
  await db.delete("genres", [notIn("id", keep.genreIds)]);

  const after = await countAll(db);
  const expectKept = { watch_groups: keep.groupIds.length, watchlist_entries: keep.entryIds.length, movies: keep.movieIds.length, genres: keep.genreIds.length };
  for (const [t, n] of Object.entries(expectKept)) {
    if (after[t] !== n) throw new Error(`reset verification failed for ${t}: ${after[t]} rows left, expected ${n}`);
  }
  log(`  ${"table".padEnd(24)}${"before".padEnd(8)}after`);
  for (const t of COUNT_TABLES) log(`  ${t.padEnd(24)}${String(before[t]).padEnd(8)}${after[t]}`);
  log(`  kept = Maestro allowlist only`);
  return { before, after, keptGroupIds: keep.groupIds };
}

module.exports = { resetDevData, MAESTRO_GROUP_NAME, COUNT_TABLES };
