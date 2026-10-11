"use strict";
// In-memory fakes with the same interface as the REST clients. Used by the
// unit tests AND by the dry-run (same code path, no network, no real writes).
// The memory DB mimics the real constraints (PK, unique, FKs, cascades) so
// ordering mistakes show up offline.

const { matches, isEmptyIn } = require("./filters");

const SCHEMA = {
  watch_groups: { pk: ["id"] },
  watch_group_members: { pk: ["group_id", "user_id"], fks: [{ col: "group_id", ref: "watch_groups", refCol: "id", cascade: true }, { col: "user_id", auth: true }] },
  movies: { pk: ["id"], unique: [["tmdb_id"]] },
  genres: { pk: ["id"], unique: [["tmdb_genre_id"]] },
  movie_genres: { pk: ["movie_id", "genre_id"], fks: [{ col: "movie_id", ref: "movies", refCol: "id", cascade: true }, { col: "genre_id", ref: "genres", refCol: "id", cascade: true }] },
  watchlist_entries: {
    pk: ["id"],
    unique: [["group_id", "movie_id"]],
    fks: [{ col: "group_id", ref: "watch_groups", refCol: "id", cascade: true }, { col: "movie_id", ref: "movies", refCol: "id", cascade: true }, { col: "added_by", auth: true }, { col: "paid_by_member_id", auth: true }],
  },
  ratings: { pk: ["id"], unique: [["watchlist_entry_id", "member_id"]], fks: [{ col: "watchlist_entry_id", ref: "watchlist_entries", refCol: "id", cascade: true }, { col: "member_id", auth: true }] },
  profiles: { pk: ["id"], fks: [{ col: "id", auth: true }] },
  push_tokens: { pk: ["user_id", "token"] },
  push_subscriptions: { pk: ["user_id", "group_id"], fks: [{ col: "group_id", ref: "watch_groups", refCol: "id", cascade: true }] },
  release_reminder_log: { pk: ["watchlist_entry_id", "type"], fks: [{ col: "watchlist_entry_id", ref: "watchlist_entries", refCol: "id", cascade: true }] },
};

function dbError(message, code, table, status = 409) {
  return Object.assign(new Error(message), { code, table, status });
}

function createMemoryDb({ users = [], denyTables = [] } = {}) {
  const store = new Map(Object.keys(SCHEMA).map((t) => [t, []]));
  const userSet = new Set(users);
  const rowsOf = (t) => {
    if (denyTables.includes(t)) throw dbError(`permission denied for table ${t} (service_role grant missing; see docs/migration-dump-analysis.md 9.5)`, "42501", t, 403);
    if (!store.has(t)) store.set(t, []);
    return store.get(t);
  };
  const spec = (t) => SCHEMA[t] || { pk: ["id"] };
  const same = (a, b, cols) => cols.every((c) => String(a[c]) === String(b[c]));

  function checkFks(t, row) {
    for (const fk of spec(t).fks || []) {
      const v = row[fk.col];
      if (v === null || v === undefined) continue;
      if (fk.auth) {
        if (!userSet.has(v)) throw dbError(`foreign key violation on ${t}.${fk.col}`, "23503", t);
      } else if (!rowsOf(fk.ref).some((r) => String(r[fk.refCol]) === String(v))) {
        throw dbError(`foreign key violation on ${t}.${fk.col}`, "23503", t);
      }
    }
  }

  function removeRows(t, doomed) {
    const list = rowsOf(t);
    const set = new Set(doomed);
    store.set(t, list.filter((r) => !set.has(r)));
    for (const [child, cs] of Object.entries(SCHEMA)) {
      for (const fk of cs.fks || []) {
        if (fk.ref !== t || !fk.cascade) continue;
        const keys = new Set(doomed.map((r) => String(r[fk.refCol])));
        const kids = store.get(child).filter((r) => keys.has(String(r[fk.col])));
        if (kids.length) removeRows(child, kids);
      }
    }
  }

  const filtered = (t, filters = []) => (isEmptyIn(filters) ? [] : rowsOf(t).filter((r) => filters.every((f) => matches(r, f))));

  return {
    async count(t) { return rowsOf(t).length; },
    async select(t, { columns, filters } = {}) {
      const cols = columns && columns !== "*" ? columns.split(",").map((c) => c.trim()) : null;
      return filtered(t, filters).map((r) => (cols ? Object.fromEntries(cols.map((c) => [c, r[c]])) : { ...r }));
    },
    async upsert(t, rows, { onConflict, ignoreDuplicates = false } = {}) {
      const list = rowsOf(t);
      const keyCols = onConflict ? onConflict.split(",") : spec(t).pk;
      for (const row of rows) {
        const existing = list.find((r) => same(r, row, keyCols));
        if (existing) {
          if (!ignoreDuplicates) Object.assign(existing, row);
          continue;
        }
        for (const u of spec(t).unique || []) {
          if (list.some((r) => same(r, row, u))) throw dbError(`unique violation on ${t}`, "23505", t);
        }
        checkFks(t, row);
        list.push({ ...row });
      }
    },
    async update(t, filters, patch) {
      for (const r of filtered(t, filters)) Object.assign(r, patch);
    },
    async delete(t, filters) {
      const doomed = filtered(t, filters);
      if (doomed.length) removeRows(t, doomed);
    },
  };
}

function createFakeAuth(emailToId = {}) {
  const map = new Map(Object.entries(emailToId).map(([e, id]) => [e.toLowerCase(), id]));
  return { async findUserIdByEmail(email) { return map.get(String(email).toLowerCase()) ?? null; } };
}

/** failFor: { [tmdbId]: number of failures before success }. */
function createFakeProxy({ failFor = {}, delayMs = 0 } = {}) {
  const remaining = { ...failFor };
  const p = {
    calls: [],
    active: 0,
    maxActive: 0,
    async refreshMovie(tmdbId) {
      p.calls.push(tmdbId);
      p.active += 1;
      p.maxActive = Math.max(p.maxActive, p.active);
      try {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        if (remaining[tmdbId] > 0) {
          remaining[tmdbId] -= 1;
          throw Object.assign(new Error("proxy unavailable (simulated)"), { status: 503 });
        }
        return { ok: true, status: "updated", titleSource: "de", updatedFields: 1 };
      } finally {
        p.active -= 1;
      }
    },
  };
  return p;
}

module.exports = { createMemoryDb, createFakeAuth, createFakeProxy, SCHEMA };
