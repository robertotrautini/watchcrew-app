"use strict";
// Checks planned rows against the new schema constraints (offline, RLS-independent).
// Returns [{ severity: "error"|"warning", rule, table, message }].

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const COLORS = ["gold", "red", "blue", "green", "purple", "orange"];

const validDate = (s) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const validTs = (s) => TS.test(s) && !Number.isNaN(Date.parse(s));
const blank = (v) => v === null || v === undefined || v === "";

function validatePlan(rows, { userRefs = ["Robin", "Tobias", "Dad"] } = {}) {
  const out = [];
  const add = (severity, rule, table, message) => out.push({ severity, rule, table, message });
  const err = (rule, table, message) => add("error", rule, table, message);

  const notNull = (table, row, fields) => {
    for (const f of fields) if (blank(row[f])) err("not_null", table, `${f} is null/empty`);
  };
  const type = (table, ok, msg) => {
    if (!ok) err("type", table, msg);
  };
  const unique = (table, rule, keyFn, list) => {
    const seen = new Set();
    for (const r of list) {
      const k = keyFn(r);
      if (seen.has(k)) err(rule, table, `duplicate key ${k}`);
      seen.add(k);
    }
  };
  const ids = (table) => new Set(rows[table].map((r) => r.id));

  for (const t of ["watch_groups", "movies", "genres", "watchlist_entries", "ratings"]) {
    unique(t, `unique_${t}_id`, (r) => r.id, rows[t]);
    for (const r of rows[t]) type(t, UUID.test(r.id || ""), `id is not a uuid: ${r.id}`);
  }

  for (const g of rows.watch_groups) {
    notNull("watch_groups", g, ["name", "color_theme"]);
    if (!blank(g.color_theme) && !COLORS.includes(g.color_theme)) err("enum_color_theme", "watch_groups", `invalid color ${g.color_theme}`);
  }

  for (const m of rows.watch_group_members) {
    notNull("watch_group_members", m, ["group_id", "user_ref", "role"]);
    if (!["owner", "member"].includes(m.role)) err("enum_role", "watch_group_members", `invalid role ${m.role}`);
    if (!ids("watch_groups").has(m.group_id)) err("fk", "watch_group_members", "group_id not in watch_groups");
    if (!userRefs.includes(m.user_ref)) err("fk", "watch_group_members", `user_ref ${m.user_ref} unknown`);
    if (m.joined_at !== null && !validTs(m.joined_at)) err("type", "watch_group_members", "joined_at not a timestamp");
  }
  unique("watch_group_members", "unique_members_pk", (m) => `${m.group_id}|${m.user_ref}`, rows.watch_group_members);
  for (const g of rows.watch_groups) {
    const owners = rows.watch_group_members.filter((m) => m.group_id === g.id && m.role === "owner").length;
    if (owners !== 1) err("one_owner_per_group", "watch_groups", `group ${g.name} has ${owners} owners (expected 1)`);
  }

  unique("movies", "unique_movies_tmdb_id", (m) => m.tmdb_id, rows.movies);
  for (const m of rows.movies) {
    notNull("movies", m, ["name"]);
    type("movies", Number.isInteger(m.tmdb_id), "tmdb_id not integer");
    if (m.release_date !== null) type("movies", validDate(m.release_date), `release_date invalid: ${m.release_date}`);
    if (m.runtime !== null) type("movies", Number.isInteger(m.runtime), "runtime not integer");
    if (m.director_id !== null) type("movies", Number.isInteger(m.director_id), "director_id not integer");
    if (m.vote_average !== null) type("movies", typeof m.vote_average === "number" && !Number.isNaN(m.vote_average), "vote_average not numeric");
    if (m.poster !== null) type("movies", String(m.poster).startsWith("/"), `poster not a path: ${m.poster}`);
  }

  unique("genres", "unique_genres_tmdb_genre_id", (g) => g.tmdb_genre_id, rows.genres);
  for (const g of rows.genres) {
    notNull("genres", g, ["name"]);
    type("genres", Number.isInteger(g.tmdb_genre_id), "tmdb_genre_id not integer");
  }
  unique("movie_genres", "unique_movie_genres_pk", (x) => `${x.movie_id}|${x.genre_id}`, rows.movie_genres);
  for (const x of rows.movie_genres) {
    if (!ids("movies").has(x.movie_id) || !ids("genres").has(x.genre_id)) err("fk", "movie_genres", "movie_id/genre_id not in planned rows");
  }

  unique("watchlist_entries", "unique_watchlist_group_movie", (e) => `${e.group_id}|${e.movie_id}`, rows.watchlist_entries);
  for (const e of rows.watchlist_entries) {
    notNull("watchlist_entries", e, ["group_id", "movie_id", "added_at", "added_by_ref"]);
    if (!ids("watch_groups").has(e.group_id) || !ids("movies").has(e.movie_id)) err("fk", "watchlist_entries", "group_id/movie_id not in planned rows");
    if (!blank(e.added_by_ref) && !userRefs.includes(e.added_by_ref)) err("fk", "watchlist_entries", "added_by_ref unknown");
    if (e.paid_by_ref !== null && !userRefs.includes(e.paid_by_ref)) err("fk", "watchlist_entries", "paid_by_ref unknown");
    if (!blank(e.added_at)) type("watchlist_entries", validTs(e.added_at), `added_at invalid: ${e.added_at}`);
    if (e.paid_at !== null) type("watchlist_entries", validTs(e.paid_at), "paid_at invalid");
    if ((e.paid_at === null) !== (e.paid_by_ref === null)) add("warning", "paid_pair", "watchlist_entries", "paid_by and paid_at not set together");
  }

  unique("ratings", "unique_ratings_entry_member", (r) => `${r.watchlist_entry_id}|${r.user_ref}`, rows.ratings);
  for (const r of rows.ratings) {
    notNull("ratings", r, ["watchlist_entry_id", "user_ref"]);
    if (typeof r.liked !== "boolean") err("not_null", "ratings", "liked must be boolean (NOT NULL)");
    if (!ids("watchlist_entries").has(r.watchlist_entry_id)) err("fk", "ratings", "watchlist_entry_id not in planned rows");
    if (!userRefs.includes(r.user_ref)) err("fk", "ratings", `user_ref ${r.user_ref} unknown`);
    if (r.rating !== null) {
      if (typeof r.rating !== "number" || r.rating < 0 || r.rating > 5) err("check_rating_range", "ratings", `rating out of range: ${r.rating}`);
      else if (Math.round(r.rating * 2) !== r.rating * 2) add("warning", "rating_step", "ratings", `rating ${r.rating} not a 0.5 step`);
    }
    if (r.seen_at !== null) type("ratings", validDate(r.seen_at), "seen_at invalid");
    if (r.rated_at !== null) type("ratings", validTs(r.rated_at), "rated_at invalid");
  }
  return out;
}

module.exports = { validatePlan };
