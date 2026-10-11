"use strict";
// Post-import verification: DB counts vs planned write set + spot checks.
// Output contains counts, tmdb ids and rating values only (no PII).

const { chunk } = require("./retry");
const { inList } = require("./filters");

async function countByIds(db, table, col, ids) {
  let n = 0;
  for (const part of chunk(ids, 80)) n += (await db.select(table, { columns: col, filters: [inList(col, part)] })).length;
  return n;
}

async function verifyImport({ db, writeSet, log = console.log }) {
  const T = writeSet.tables;
  const checks = [
    ["watch_groups", "id", T.watch_groups.map((r) => r.id)],
    ["movies", "tmdb_id", T.movies.map((r) => r.tmdb_id)],
    ["genres", "tmdb_genre_id", T.genres.map((r) => r.tmdb_genre_id)],
    ["watchlist_entries", "id", T.watchlist_entries.map((r) => r.id)],
    ["ratings", "id", T.ratings.map((r) => r.id)],
  ];
  const tables = [];
  for (const [table, col, ids] of checks) tables.push({ table, planned: ids.length, found: await countByIds(db, table, col, ids) });
  const gids = [...new Set(T.watch_group_members.map((m) => m.group_id))];
  tables.push({ table: "watch_group_members", planned: T.watch_group_members.length, found: await countByIds(db, "watch_group_members", "group_id", gids) });
  const mids = [...new Set(T.movie_genres.map((m) => m.movie_id))];
  tables.push({ table: "movie_genres", planned: T.movie_genres.length, found: await countByIds(db, "movie_genres", "movie_id", mids) });

  const spot = [];
  const rated = T.ratings.find((r) => r.rating !== null);
  if (rated) {
    const [row] = await db.select("ratings", { columns: "id,rating", filters: [inList("id", [rated.id])] });
    spot.push({ name: "rating", expected: rated.rating, actual: row ? Number(row.rating) : null, ok: !!row && Number(row.rating) === rated.rating });
  }
  const paid = T.watchlist_entries.find((e) => e.paid_at);
  if (paid) {
    const [row] = await db.select("watchlist_entries", { columns: "id,paid_by_member_id,paid_at", filters: [inList("id", [paid.id])] });
    const ok = !!row && row.paid_by_member_id === paid.paid_by_member_id && Date.parse(row.paid_at) === Date.parse(paid.paid_at);
    spot.push({ name: "payment", expected: paid.paid_at, actual: row ? row.paid_at : null, ok });
  }
  const movie = T.movies[0];
  if (movie) {
    const [row] = await db.select("movies", { columns: "tmdb_id,name", filters: [inList("tmdb_id", [movie.tmdb_id])] });
    spot.push({ name: "title", expected: `tmdb ${movie.tmdb_id} has a non-empty title`, actual: row && row.name ? "non-empty" : "empty/missing", ok: !!row && !!row.name });
  }

  log("VERIFY (DB vs plan)");
  log(`  ${"table".padEnd(24)}${"planned".padEnd(9)}${"in DB".padEnd(7)}`);
  for (const t of tables) log(`  ${t.table.padEnd(24)}${String(t.planned).padEnd(9)}${String(t.found).padEnd(7)}${t.found === t.planned ? "OK" : "MISMATCH"}`);
  for (const s of spot) log(`  spot check ${s.name}: ${s.ok ? "OK" : "MISMATCH"}${s.name === "title" ? "" : ` (expected ${s.expected}, got ${s.actual})`}`);
  const ok = tables.every((t) => t.found === t.planned) && spot.every((s) => s.ok);
  return { ok, tables, spot };
}

module.exports = { verifyImport };
