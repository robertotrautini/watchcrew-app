"use strict";
// Pure transform: parsed legacy dump -> planned rows for the new schema.
// No I/O, no secrets. Member references are symbolic (`*_ref` = legacy member
// name); real auth user ids are resolved by email lookup in the apply phase.

const { legacyId } = require("./ids");

const TMDB_GENRE_MAP = {
  28: "Action", 12: "Abenteuer", 16: "Animation", 35: "Komödie", 80: "Krimi", 99: "Dokumentarfilm",
  18: "Drama", 10751: "Familie", 14: "Fantasy", 36: "Historie", 27: "Horror", 10402: "Musik",
  9648: "Mystery", 10749: "Liebesfilm", 878: "Science Fiction", 10770: "TV-Film", 53: "Thriller",
  10752: "Kriegsfilm", 37: "Western",
};
const GENRE_BY_NAME = Object.fromEntries(Object.entries(TMDB_GENRE_MAP).map(([id, n]) => [n, Number(id)]));

const DEFAULT_CONFIG = {
  groups: [
    { name: "Alle Drei", color_theme: "gold" },
    { name: "Robin & Tobias", color_theme: "red" },
  ],
  members: ["Robin", "Tobias", "Dad"],
  owner: "Robin",
  placeholderDate: "2020-01-01",
};

const CJK = /[ᄀ-ᇿ぀-ヿ㐀-鿿가-힯]/;
const POSTER_PREFIX = /^https?:\/\/image\.tmdb\.org\/t\/p\/w\d+/;
const META_FIELDS = ["release_date", "poster", "overview", "runtime", "director", "director_id", "vote_average"];

const isEmpty = (v) => v === null || v === undefined || v === "";

function normalizePoster(p) {
  if (isEmpty(p)) return null;
  return String(p).replace(POSTER_PREFIX, "");
}

function completeness(row) {
  return META_FIELDS.filter((f) => !isEmpty(row[f])).length;
}

const toIso = (ts) => (isEmpty(ts) || String(ts).startsWith("0000") ? null : `${String(ts).replace(" ", "T")}Z`);
const noonUtc = (d) => (isEmpty(d) ? null : `${d}T12:00:00Z`);
const num = (v) => (isEmpty(v) ? null : Number(v));

function buildPlan(tables, { memberMap, config = DEFAULT_CONFIG }) {
  for (const m of config.members) {
    if (!memberMap || typeof memberMap[m] !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(memberMap[m])) {
      throw new Error(`members map: missing or invalid entry for member "${m}"`);
    }
  }
  const T = (n) => tables[n] || [];
  const memberById = new Map(T("members").map((m) => [m.id, m.name]));
  const groupDefs = new Map(config.groups.map((g) => [g.name, g]));
  const legacyGroups = T("groups").filter((g) => groupDefs.has(g.name));
  const groupById = new Map(legacyGroups.map((g) => [g.id, g]));

  const report = { counts: [], collapses: [], conflicts: [], gaps: {}, titles: {}, unmappedGenres: [], notes: [] };
  const rows = {
    profiles: [], watch_groups: [], watch_group_members: [], movies: [], genres: [],
    movie_genres: [], watchlist_entries: [], ratings: [],
  };
  const count = (table, legacy, planned, skipped) => report.counts.push({ table, legacy, planned, skipped });

  // profiles
  rows.profiles = config.members.map((m) => ({ user_ref: m, display_name: m }));
  count("profiles (display_name update)", T("members").length, rows.profiles.length, {
    "member not migrated": T("members").length - rows.profiles.length,
  });

  // watchlist entries of included groups, ordered by legacy id
  const wl = T("watchlist").filter((w) => groupById.has(w.group_id)).sort((a, b) => a.id - b.id);
  const movieById = new Map(T("movies").map((m) => [m.id, m]));

  // groups
  for (const g of legacyGroups) {
    rows.watch_groups.push({ id: legacyId("group", g.id), name: g.name, color_theme: groupDefs.get(g.name).color_theme });
  }
  count("watch_groups", T("groups").length, rows.watch_groups.length, {
    "group not migrated": T("groups").length - rows.watch_groups.length,
  });

  // group members
  const firstAdded = new Map();
  for (const w of wl) {
    const t = toIso(w.added_at);
    if (t && (!firstAdded.has(w.group_id) || t < firstAdded.get(w.group_id))) firstAdded.set(w.group_id, t);
  }
  let gmSkipped = 0;
  const memberOfGroup = new Set();
  for (const gm of T("group_members")) {
    const name = memberById.get(gm.member_id);
    if (!groupById.has(gm.group_id) || !config.members.includes(name)) {
      gmSkipped += 1;
      continue;
    }
    memberOfGroup.add(`${gm.group_id}|${name}`);
    rows.watch_group_members.push({
      group_id: legacyId("group", gm.group_id),
      user_ref: name,
      role: name === config.owner ? "owner" : "member",
      joined_at: firstAdded.get(gm.group_id) || null,
    });
  }
  count("watch_group_members", T("group_members").length, rows.watch_group_members.length, {
    "group/member not migrated": gmSkipped,
  });

  // movies: canonical row per tmdb_id among movies referenced by included entries
  const referencedIds = new Set(wl.map((w) => w.movie_id));
  const allReferenced = new Set(T("watchlist").map((w) => w.movie_id));
  const byTmdb = new Map();
  for (const id of referencedIds) {
    const m = movieById.get(id);
    if (!m) continue;
    if (!byTmdb.has(m.tmdb_id)) byTmdb.set(m.tmdb_id, []);
    byTmdb.get(m.tmdb_id).push(m);
  }
  const canonical = new Map(); // tmdb_id -> planned movie row
  const movieNameByTmdb = new Map();
  const moviesSkipped = { "merged duplicate tmdb_id": 0, "not on any watchlist": 0, "only on excluded groups": 0 };
  for (const [tmdbId, group] of [...byTmdb.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...group].sort(
      (a, b) =>
        completeness(b) - completeness(a) ||
        String(b.created_at || "").localeCompare(String(a.created_at || "")) ||
        String(b.id).localeCompare(String(a.id)),
    );
    const w = sorted[0];
    moviesSkipped["merged duplicate tmdb_id"] += group.length - 1;
    const row = {
      id: legacyId("movie", tmdbId),
      tmdb_id: tmdbId,
      name: w.name,
      release_date: isEmpty(w.release_date) || w.release_date === config.placeholderDate ? null : w.release_date,
      poster: normalizePoster(w.poster),
      overview: isEmpty(w.overview) ? null : w.overview,
      runtime: num(w.runtime),
      director: isEmpty(w.director) ? null : w.director,
      director_id: num(w.director_id),
      vote_average: num(w.vote_average),
    };
    rows.movies.push(row);
    canonical.set(tmdbId, row);
    movieNameByTmdb.set(tmdbId, row.name);
  }
  for (const m of T("movies")) {
    if (referencedIds.has(m.id)) continue;
    if (allReferenced.has(m.id)) moviesSkipped["only on excluded groups"] += 1;
    else moviesSkipped["not on any watchlist"] += 1;
  }
  count("movies", T("movies").length, rows.movies.length, moviesSkipped);

  report.titles = {
    source: "legacy name (TMDB de/en resolved in apply)",
    cjk: rows.movies.filter((m) => CJK.test(m.name)).map((m) => m.name),
  };
  report.gaps = {
    release_date: rows.movies.filter((m) => m.release_date === null).length,
    runtime: rows.movies.filter((m) => m.runtime === null).length,
    director: rows.movies.filter((m) => m.director === null).length,
    director_id: rows.movies.filter((m) => m.director_id === null).length,
    overview: rows.movies.filter((m) => m.overview === null).length,
    poster: rows.movies.filter((m) => m.poster === null).length,
    vote_average: rows.movies.filter((m) => m.vote_average === null).length,
    movie_genres: 0,
  };

  // genres / movie_genres
  const genreNameById = new Map(T("genres").map((g) => [g.id, g.name]));
  const unmapped = new Set();
  const usedGenres = new Set();
  const mgKeys = new Set();
  const mgSkipped = { "movie not planned": 0, "duplicate after merge": 0, "genre not mappable": 0 };
  const movieIdToTmdb = new Map(T("movies").map((m) => [m.id, m.tmdb_id]));
  for (const mg of T("movie_genres")) {
    const tmdbId = movieIdToTmdb.get(mg.movie_id);
    if (!referencedIds.has(mg.movie_id) || !canonical.has(tmdbId)) {
      mgSkipped["movie not planned"] += 1;
      continue;
    }
    const name = genreNameById.get(mg.genre_id);
    const gid = GENRE_BY_NAME[name];
    if (!gid) {
      unmapped.add(name);
      mgSkipped["genre not mappable"] += 1;
      continue;
    }
    const key = `${tmdbId}|${gid}`;
    if (mgKeys.has(key)) {
      mgSkipped["duplicate after merge"] += 1;
      continue;
    }
    mgKeys.add(key);
    usedGenres.add(gid);
    rows.movie_genres.push({ movie_id: canonical.get(tmdbId).id, genre_id: legacyId("genre", gid) });
  }
  for (const gid of [...usedGenres].sort((a, b) => a - b)) {
    rows.genres.push({ id: legacyId("genre", gid), tmdb_genre_id: gid, name: TMDB_GENRE_MAP[gid] });
  }
  report.unmappedGenres = [...unmapped].sort();
  const moviesWithGenre = new Set(rows.movie_genres.map((x) => x.movie_id));
  report.gaps.movie_genres = rows.movies.filter((m) => !moviesWithGenre.has(m.id)).length;
  count("genres", T("genres").length, rows.genres.length, {
    "not used by planned movies / unmappable": T("genres").length - rows.genres.length,
  });
  count("movie_genres", T("movie_genres").length, rows.movie_genres.length, mgSkipped);

  // watchlist entries (collapse per group+tmdb)
  const sets = new Map(); // key -> legacy watchlist rows
  for (const w of wl) {
    const tmdbId = movieById.get(w.movie_id).tmdb_id;
    const key = `${w.group_id}|${tmdbId}`;
    if (!sets.has(key)) sets.set(key, []);
    sets.get(key).push(w);
  }
  const survivorOf = new Map(); // legacy wl id -> { survivor, set }
  const entryRowByLegacy = new Map();
  for (const [key, set] of sets) {
    const sorted = [...set].sort((a, b) => String(toIso(a.added_at)).localeCompare(String(toIso(b.added_at))) || a.id - b.id);
    const surv = sorted[0];
    const [gid, tmdbStr] = key.split("|");
    const tmdbId = Number(tmdbStr);
    const grp = groupById.get(gid);
    const paidCands = sorted.filter((w) => !isEmpty(w.paid_by_member_id) || !isEmpty(w.paid_at));
    const paid = paidCands[0];
    const distinctPaid = new Set(paidCands.map((w) => `${w.paid_by_member_id}|${w.paid_at}`));
    if (distinctPaid.size > 1) {
      report.conflicts.push({ kind: "paid differs", movie: movieNameByTmdb.get(tmdbId), group: grp.name, member: memberById.get(paid.paid_by_member_id) });
    }
    const row = {
      id: legacyId("entry", surv.id),
      group_id: legacyId("group", gid),
      movie_id: canonical.get(tmdbId).id,
      added_at: toIso(surv.added_at),
      added_by_ref: config.owner,
      paid_by_ref: paid && !isEmpty(paid.paid_by_member_id) ? memberById.get(paid.paid_by_member_id) : null,
      paid_at: paid ? noonUtc(paid.paid_at) : null,
    };
    rows.watchlist_entries.push(row);
    entryRowByLegacy.set(surv.id, row);
    for (const w of set) survivorOf.set(w.id, { survivor: surv.id, set });
    if (set.length > 1) {
      report.collapses.push({ movie: movieNameByTmdb.get(tmdbId), group: grp.name, entries: set.length });
    }
  }
  rows.watchlist_entries.sort((a, b) => a.added_at.localeCompare(b.added_at) || a.id.localeCompare(b.id));
  count("watchlist_entries", T("watchlist").length, rows.watchlist_entries.length, {
    "excluded group": T("watchlist").length - wl.length,
    "collapsed (same group + tmdb_id)": wl.length - rows.watchlist_entries.length,
  });

  // ratings
  const rSkipped = { "empty row": 0, "member/group excluded": 0, "merged into collapsed entry": 0 };
  const emptyWithRatedAt = { n: 0 };
  const cands = new Map(); // survivorId|memberName -> [rating rows]
  for (const r of T("watchlist_ratings")) {
    const w = T("watchlist").find((x) => x.id === r.watchlist_id);
    const name = memberById.get(r.member_id);
    if (!w || !groupById.has(w.group_id) || !config.members.includes(name) || !memberOfGroup.has(`${w.group_id}|${name}`)) {
      rSkipped["member/group excluded"] += 1;
      continue;
    }
    const empty = isEmpty(r.rating) && !r.liked && isEmpty(r.seen_at);
    if (empty) {
      rSkipped["empty row"] += 1;
      if (!isEmpty(r.rated_at)) emptyWithRatedAt.n += 1;
      continue;
    }
    const { survivor } = survivorOf.get(w.id);
    const key = `${survivor}|${name}`;
    if (!cands.has(key)) cands.set(key, []);
    cands.get(key).push({ ...r, _wl: w.id });
  }
  report.emptyRatingsWithRatedAt = emptyWithRatedAt.n;
  let ratedAtFromSeen = 0;
  let ratedAtNull = 0;
  for (const [key, list] of [...cands.entries()].sort()) {
    const [survStr, name] = key.split("|");
    const survId = Number(survStr);
    const entry = entryRowByLegacy.get(survId);
    const ordered = [...list].sort(
      (a, b) =>
        (isEmpty(b.rating) ? 0 : 1) - (isEmpty(a.rating) ? 0 : 1) ||
        String(b.seen_at || "").localeCompare(String(a.seen_at || "")) ||
        String(toIso(b.rated_at) || "").localeCompare(String(toIso(a.rated_at) || "")) ||
        a._wl - b._wl,
    );
    if (list.length > 1) {
      rSkipped["merged into collapsed entry"] += list.length - 1;
      const ratings = new Set(list.filter((x) => !isEmpty(x.rating)).map((x) => Number(x.rating)));
      const seen = new Set(list.filter((x) => !isEmpty(x.seen_at)).map((x) => x.seen_at));
      if (ratings.size > 1 || seen.size > 1) {
        const tmdb = [...canonical.values()].find((m) => m.id === entry.movie_id);
        report.conflicts.push({
          kind: ratings.size > 1 ? "rating differs" : "seen_at differs",
          movie: movieNameByTmdb.get(tmdb.tmdb_id),
          group: rows.watch_groups.find((g) => g.id === entry.group_id).name,
          member: name,
        });
      } else {
        report.conflicts.push({
          kind: "ratings merged (no value conflict)",
          movie: movieNameByTmdb.get([...canonical.values()].find((m) => m.id === entry.movie_id).tmdb_id),
          group: rows.watch_groups.find((g) => g.id === entry.group_id).name,
          member: name,
          info: true,
        });
      }
    }
    const best = ordered[0];
    const first = (f) => ordered.find((x) => !isEmpty(x[f]));
    const rating = best.rating === null ? null : Number(best.rating);
    const seenSrc = first("seen_at");
    const seen_at = seenSrc ? seenSrc.seen_at : null;
    let rated_at = null;
    if (rating !== null) {
      const ra = ordered.find((x) => !isEmpty(x.rating) && !isEmpty(x.rated_at));
      if (ra) rated_at = toIso(ra.rated_at);
      else if (seen_at) {
        rated_at = noonUtc(seen_at);
        ratedAtFromSeen += 1;
      } else ratedAtNull += 1;
    } else {
      const ra = first("rated_at");
      rated_at = ra ? toIso(ra.rated_at) : null;
    }
    rows.ratings.push({
      id: legacyId("rating", survId, name),
      watchlist_entry_id: entry.id,
      user_ref: name,
      rating,
      liked: ordered.some((x) => !!x.liked),
      seen_at,
      rated_at,
    });
  }
  report.ratedAt = { fromSeenAt: ratedAtFromSeen, nullBecauseNoSeenAt: ratedAtNull };
  count("ratings", T("watchlist_ratings").length, rows.ratings.length, rSkipped);

  return { rows, report };
}

module.exports = { buildPlan, normalizePoster, completeness, DEFAULT_CONFIG, TMDB_GENRE_MAP };
