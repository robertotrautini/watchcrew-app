"use strict";
// Thin PostgREST / GoTrue-admin / Edge-Function clients over fetch.
// Errors are PII-free and never contain the service key.

const { toQuery, isEmptyIn } = require("./filters");

const GRANT_HINT = "service_role privilege missing: see docs/migration-dump-analysis.md section 9.5 (grant proposal)";

function safeMessage(text) {
  const s = String(text ?? "").replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]");
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

function importError({ table, op, status, code, detail }) {
  let msg = `${op} ${table} failed (status ${status}${code ? `, code ${code}` : ""})`;
  if (code === "42501") msg += `; ${GRANT_HINT}`;
  else if (detail) msg += `: ${safeMessage(detail)}`;
  return Object.assign(new Error(msg), { table, op, status, code });
}

function makeRequester({ key, fetch: fetchImpl = globalThis.fetch }) {
  const scrub = (s) => String(s).split(key).join("[key]");
  return async function request(url, init = {}, ctx = {}) {
    let res;
    try {
      res = await fetchImpl(url, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers || {}) } });
    } catch (e) {
      throw Object.assign(new Error(`${ctx.op || "request"} ${ctx.table || ""} failed: network error (${scrub(e && e.code ? e.code : "unreachable")})`.replace(/ +/g, " ")), { code: "NETWORK", table: ctx.table, op: ctx.op });
    }
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : undefined; } catch { body = undefined; }
    if (!res.ok) {
      throw importError({ table: ctx.table || "?", op: ctx.op || "request", status: res.status, code: body && body.code, detail: body && body.message });
    }
    return { res, body };
  };
}

function createRestDb({ url, key, fetch }) {
  const request = makeRequester({ key, fetch });
  const base = (t) => `${url}/rest/v1/${t}`;
  const qs = (parts) => parts.filter(Boolean).join("&");
  const json = { "Content-Type": "application/json" };
  return {
    async count(t) {
      const { res } = await request(`${base(t)}?select=*`, { method: "HEAD", headers: { Prefer: "count=exact" } }, { table: t, op: "count" });
      const range = res.headers.get("content-range") || "";
      const n = Number(range.split("/")[1]);
      if (!Number.isFinite(n)) throw importError({ table: t, op: "count", status: res.status, detail: "no count returned" });
      return n;
    },
    async select(t, { columns, filters = [], limit } = {}) {
      if (isEmptyIn(filters)) return [];
      const query = qs([columns && `select=${columns}`, ...filters.map(toQuery), limit && `limit=${limit}`]);
      const { body } = await request(`${base(t)}?${query}`, { method: "GET" }, { table: t, op: "select" });
      return body || [];
    },
    async upsert(t, rows, { onConflict, ignoreDuplicates = false } = {}) {
      if (!rows.length) return;
      const resolution = ignoreDuplicates ? "ignore-duplicates" : "merge-duplicates";
      await request(`${base(t)}?${qs([onConflict && `on_conflict=${onConflict}`])}`, {
        method: "POST",
        headers: { ...json, Prefer: `resolution=${resolution},return=minimal` },
        body: JSON.stringify(rows),
      }, { table: t, op: "upsert" });
    },
    async update(t, filters, patch) {
      if (isEmptyIn(filters)) return;
      await request(`${base(t)}?${qs(filters.map(toQuery))}`, { method: "PATCH", headers: { ...json, Prefer: "return=minimal" }, body: JSON.stringify(patch) }, { table: t, op: "update" });
    },
    async delete(t, filters) {
      if (isEmptyIn(filters)) return;
      await request(`${base(t)}?${qs(filters.map(toQuery))}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }, { table: t, op: "delete" });
    },
  };
}

function createRestAuth({ url, key, fetch }) {
  const request = makeRequester({ key, fetch });
  const PER_PAGE = 200;
  return {
    async findUserIdByEmail(email) {
      const want = String(email).toLowerCase();
      for (let page = 1; page <= 50; page += 1) {
        const { body } = await request(`${url}/auth/v1/admin/users?page=${page}&per_page=${PER_PAGE}`, { method: "GET" }, { table: "auth.users", op: "list" });
        const users = (body && body.users) || [];
        const hit = users.find((u) => String(u.email || "").toLowerCase() === want);
        if (hit) return hit.id;
        if (users.length < PER_PAGE) return null;
      }
      return null;
    },
  };
}

// Contract: docs/tmdb-proxy-refresh-contract.md (action `refresh_movie`, service-role only).
// The movie row must already exist (the action never creates rows); fillGapsOnly
// fills empty fields only. Title rule (de -> en -> legacy name) runs server side.
const REFRESH_KIND = "refresh_movie";

function createHttpProxy({ url, key, fetch }) {
  const request = makeRequester({ key, fetch });
  return {
    async refreshMovie(tmdbId) {
      const { body } = await request(`${url}/functions/v1/tmdb-proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: REFRESH_KIND, tmdbId, fillGapsOnly: true }),
      }, { table: "tmdb-proxy", op: "refresh" });
      const d = (body && body.data) || {};
      return { ok: true, status: d.status || null, titleSource: d.titleSource || null, updatedFields: Array.isArray(d.updatedFields) ? d.updatedFields.length : 0 };
    },
  };
}

module.exports = { createRestDb, createRestAuth, createHttpProxy, safeMessage, REFRESH_KIND };
