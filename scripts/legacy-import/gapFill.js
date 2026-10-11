"use strict";
// Metadata-gap fill via the tmdb-proxy refresh action (injectable proxy).

const fs = require("fs");
const path = require("path");
const { withRetry, runPool } = require("./retry");

const GAP_FIELDS = ["release_date", "runtime", "director", "director_id", "overview", "vote_average", "poster"];

function findGaps(movies, movieGenres) {
  const withGenre = new Set(movieGenres.map((x) => x.movie_id));
  const counts = Object.fromEntries([...GAP_FIELDS, "movie_genres"].map((k) => [k, 0]));
  const out = [];
  for (const m of movies) {
    const gaps = GAP_FIELDS.filter((f) => m[f] === null || m[f] === undefined || m[f] === "");
    if (!withGenre.has(m.id)) gaps.push("movie_genres");
    for (const g of gaps) counts[g] += 1;
    if (gaps.length) out.push({ tmdbId: m.tmdb_id, gaps });
  }
  return { movies: out, counts };
}

function createMemoryProgress() {
  const done = new Set();
  return { async load() { return new Set(done); }, async markDone(id) { done.add(id); } };
}

/** File-backed progress (tmdb ids only, no personal data). Keep it outside the repo. */
function createFileProgress(file) {
  const read = () => {
    try { return new Set(JSON.parse(fs.readFileSync(file, "utf8")).done || []); } catch { return new Set(); }
  };
  return {
    async load() { return read(); },
    async markDone(id) {
      const s = read();
      s.add(id);
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      fs.writeFileSync(file, JSON.stringify({ done: [...s].sort((a, b) => a - b) }), { mode: 0o600 });
    },
  };
}

async function fillGaps({ proxy, items, concurrency = 2, retryOpts = {}, progress, log = () => {} }) {
  const done = await progress.load();
  const results = await runPool(items, concurrency, async ({ tmdbId }) => {
    if (done.has(tmdbId)) return { tmdbId, status: "skipped", attempts: 0, error: null, detail: null };
    try {
      const { value, attempts } = await withRetry(() => proxy.refreshMovie(tmdbId), retryOpts);
      await progress.markDone(tmdbId);
      const detail = { outcome: (value && value.status) || null, titleSource: (value && value.titleSource) || null, updatedFields: (value && value.updatedFields) || 0 };
      return { tmdbId, status: "ok", attempts, error: null, detail };
    } catch (e) {
      // only status/code, never the message text (could echo upstream data)
      return { tmdbId, status: "failed", attempts: e.attempts || 1, error: e.status ? `status ${e.status}` : e.code || "error", detail: null };
    }
  });
  const summary = { total: results.length, ok: 0, failed: 0, skipped: 0 };
  for (const r of results) summary[r.status] += 1;
  log(`  gap fill: ${summary.total} movies, ok ${summary.ok}, failed ${summary.failed}, skipped (already done) ${summary.skipped}`);
  const by = (f) => results.filter((x) => x.detail).reduce((m, x) => ({ ...m, [x.detail[f] || "n/a"]: (m[x.detail[f] || "n/a"] || 0) + 1 }), {});
  if (summary.ok) log(`    results: ${JSON.stringify(by("outcome"))}; title source: ${JSON.stringify(by("titleSource"))}`);
  for (const r of results.filter((x) => x.status === "failed")) log(`    failed tmdb ${r.tmdbId}: ${r.error} after ${r.attempts} attempt(s)`);
  return { results, summary };
}

module.exports = { findGaps, fillGaps, createMemoryProgress, createFileProgress, GAP_FIELDS };
