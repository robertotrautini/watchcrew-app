"use strict";
// Plan rows (symbolic *_ref members) -> DB rows, then ordered idempotent upserts.

const { withRetry, chunk } = require("./retry");

const ORDER = [
  { table: "watch_groups", onConflict: "id", ignoreDuplicates: false },
  { table: "watch_group_members", onConflict: "group_id,user_id", ignoreDuplicates: false },
  // movies/genres: insert-only, so a rerun never overwrites metadata the proxy already filled
  { table: "movies", onConflict: "id", ignoreDuplicates: true },
  { table: "genres", onConflict: "id", ignoreDuplicates: true },
  { table: "movie_genres", onConflict: "movie_id,genre_id", ignoreDuplicates: true },
  { table: "watchlist_entries", onConflict: "id", ignoreDuplicates: false },
  { table: "ratings", onConflict: "id", ignoreDuplicates: false },
];

const MOVIE_COLS = ["id", "tmdb_id", "name", "release_date", "poster", "overview", "runtime", "director", "director_id", "vote_average"];
const pick = (row, cols) => Object.fromEntries(cols.map((c) => [c, row[c] === undefined ? null : row[c]]));

function buildWriteSet(rows, { userIds, existingMovies, existingGenres, now }) {
  const uid = (ref) => {
    if (ref === null || ref === undefined) return null;
    if (!userIds[ref]) throw new Error(`no user id resolved for member "${ref}"`);
    return userIds[ref];
  };
  const movieIdByTmdb = new Map(rows.movies.map((m) => [m.tmdb_id, existingMovies.get(m.tmdb_id) || m.id]));
  const movieIdRemap = new Map(rows.movies.map((m) => [m.id, movieIdByTmdb.get(m.tmdb_id)]));
  const genreIdRemap = new Map(rows.genres.map((g) => [g.id, existingGenres.get(g.tmdb_genre_id) || g.id]));
  const preexistingMovieIds = new Set(rows.movies.filter((m) => existingMovies.has(m.tmdb_id)).map((m) => m.id));

  const tables = {
    watch_groups: rows.watch_groups.map((g) => pick(g, ["id", "name", "color_theme"])),
    watch_group_members: rows.watch_group_members.map((m) => ({
      group_id: m.group_id, user_id: uid(m.user_ref), role: m.role, joined_at: m.joined_at || now,
    })),
    movies: rows.movies.filter((m) => !preexistingMovieIds.has(m.id)).map((m) => pick(m, MOVIE_COLS)),
    genres: rows.genres.filter((g) => !existingGenres.has(g.tmdb_genre_id)).map((g) => pick(g, ["id", "tmdb_genre_id", "name"])),
    movie_genres: rows.movie_genres.filter((x) => !preexistingMovieIds.has(x.movie_id)).map((x) => ({ movie_id: x.movie_id, genre_id: genreIdRemap.get(x.genre_id) })),
    watchlist_entries: rows.watchlist_entries.map((e) => ({
      id: e.id, group_id: e.group_id, movie_id: movieIdRemap.get(e.movie_id), added_at: e.added_at,
      added_by: uid(e.added_by_ref), paid_by_member_id: uid(e.paid_by_ref), paid_at: e.paid_at,
    })),
    ratings: rows.ratings.map((r) => ({
      id: r.id, watchlist_entry_id: r.watchlist_entry_id, member_id: uid(r.user_ref), rating: r.rating, liked: r.liked, seen_at: r.seen_at, rated_at: r.rated_at,
    })),
  };
  return {
    tables,
    movieIdByTmdb,
    preexistingMovieTmdbIds: rows.movies.filter((m) => existingMovies.has(m.tmdb_id)).map((m) => m.tmdb_id),
    preexistingGenreTmdbIds: rows.genres.filter((g) => existingGenres.has(g.tmdb_genre_id)).map((g) => g.tmdb_genre_id),
  };
}

async function upsertAll({ db, writeSet, batchSize = 100, retryOpts = {}, log = () => {} }) {
  const counts = {};
  for (const { table, onConflict, ignoreDuplicates } of ORDER) {
    const rows = writeSet.tables[table];
    const batches = chunk(rows, batchSize);
    for (let i = 0; i < batches.length; i += 1) {
      try {
        await withRetry(() => db.upsert(table, batches[i], { onConflict, ignoreDuplicates }), retryOpts);
      } catch (e) {
        throw new Error(`${table}: batch ${i + 1}/${batches.length} failed after ${e.attempts || 1} attempt(s): ${e.message}`);
      }
    }
    counts[table] = rows.length;
    log(`  ${table.padEnd(24)}${String(rows.length).padStart(5)} upserted (${batches.length} batch${batches.length === 1 ? "" : "es"})`);
  }
  return counts;
}

module.exports = { buildWriteSet, upsertAll, ORDER };
