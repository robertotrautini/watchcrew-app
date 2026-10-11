const { parseDump } = require("../../../scripts/legacy-import/sqlDump");
const { buildPlan, normalizePoster, completeness } = require("../../../scripts/legacy-import/transform");
const { FIXTURE_DUMP } = require("../../helpers/legacyDumpFixture");

const MEMBER_MAP = { Robin: "r@example.test", Tobias: "t@example.test", Dad: "d@example.test" };
const plan = () => buildPlan(parseDump(FIXTURE_DUMP), { memberMap: MEMBER_MAP });

describe("normalizePoster", () => {
  it("strips tmdb prefixes", () => {
    expect(normalizePoster("https://image.tmdb.org/t/p/w154/a.jpg")).toBe("/a.jpg");
    expect(normalizePoster("https://image.tmdb.org/t/p/w342/b.jpg")).toBe("/b.jpg");
    expect(normalizePoster("/c.jpg")).toBe("/c.jpg");
    expect(normalizePoster(null)).toBeNull();
    expect(normalizePoster("")).toBeNull();
  });
});

describe("completeness", () => {
  it("counts non-empty metadata fields", () => {
    expect(completeness({ release_date: null, poster: "x", overview: "", runtime: 1 })).toBe(2);
  });
});

describe("buildPlan", () => {
  it("rejects a missing member in the members map", () => {
    expect(() => buildPlan(parseDump(FIXTURE_DUMP), { memberMap: { Robin: "r@example.test" } })).toThrow(/Tobias/);
  });

  it("imports only configured groups with colors, 1:1", () => {
    const { rows } = plan();
    expect(rows.watch_groups.map((g) => [g.name, g.color_theme])).toEqual([
      ["Alle Drei", "gold"],
      ["Robin & Tobias", "red"],
    ]);
  });

  it("makes Robin owner, others member, excludes other members", () => {
    const { rows } = plan();
    expect(rows.watch_group_members).toHaveLength(5);
    const owners = rows.watch_group_members.filter((m) => m.role === "owner");
    expect(owners.map((o) => o.user_ref)).toEqual(["Robin", "Robin"]);
    expect(rows.watch_group_members.every((m) => ["Robin", "Tobias", "Dad"].includes(m.user_ref))).toBe(true);
  });

  it("emits profile display_name updates and never emails", () => {
    const { rows } = plan();
    expect(rows.profiles).toEqual([
      { user_ref: "Robin", display_name: "Robin" },
      { user_ref: "Tobias", display_name: "Tobias" },
      { user_ref: "Dad", display_name: "Dad" },
    ]);
    expect(JSON.stringify(plan())).not.toContain("example.test");
  });

  it("merges duplicate tmdb ids (most complete wins) and skips unreferenced/excluded movies", () => {
    const { rows, report } = plan();
    expect(rows.movies.map((m) => m.tmdb_id).sort()).toEqual([100, 200, 500]);
    const b = rows.movies.find((m) => m.tmdb_id === 200);
    expect(b.runtime).toBe(90);
    expect(b.poster).toBe("/b2.jpg");
    const row = report.counts.find((c) => c.table === "movies");
    expect(row.legacy).toBe(6);
    expect(row.planned).toBe(3);
    expect(row.skipped).toEqual({
      "merged duplicate tmdb_id": 1,
      "not on any watchlist": 1,
      "only on excluded groups": 1,
    });
  });

  it("normalizes movie fields", () => {
    const a = plan().rows.movies.find((m) => m.tmdb_id === 100);
    expect(a.poster).toBe("/a.jpg");
    expect(a.vote_average).toBe(7.5);
    expect(a.director_id).toBe(11);
    const e = plan().rows.movies.find((m) => m.tmdb_id === 500);
    expect(e.release_date).toBeNull(); // 2020-01-01 placeholder
    expect(e.overview).toBe("e");
  });

  it("keeps the legacy name as title source and flags CJK", () => {
    const { report } = plan();
    expect(report.titles.cjk).toEqual(["희망"]);
    expect(report.titles.source).toBe("legacy name (TMDB de/en resolved in apply)");
  });

  it("maps genres via German name -> tmdb_genre_id, union over merged rows, skips unknown", () => {
    const { rows, report } = plan();
    expect(rows.genres.map((g) => [g.tmdb_genre_id, g.name]).sort((x, y) => x[0] - y[0])).toEqual([
      [18, "Drama"],
      [28, "Action"],
    ]);
    const b = rows.movies.find((m) => m.tmdb_id === 200);
    const gB = rows.movie_genres.filter((mg) => mg.movie_id === b.id);
    expect(gB).toHaveLength(2);
    expect(report.unmappedGenres).toEqual(["Unbekannt"]);
  });

  it("collapses same-group same-tmdb entries and merges ratings", () => {
    const { rows, report } = plan();
    const b = rows.movies.find((m) => m.tmdb_id === 200);
    const g1 = rows.watch_groups[0];
    const entries = rows.watchlist_entries.filter((e) => e.movie_id === b.id && e.group_id === g1.id);
    expect(entries).toHaveLength(1);
    expect(rows.watchlist_entries).toHaveLength(4);
    expect(report.collapses).toHaveLength(1);
    expect(report.collapses[0]).toMatchObject({ movie: "Film B", group: "Alle Drei", entries: 2 });
    const rRobin = rows.ratings.find((r) => r.watchlist_entry_id === entries[0].id && r.user_ref === "Robin");
    expect(rRobin.rating).toBe(3.5);
    expect(rRobin.liked).toBe(true);
    expect(report.conflicts.some((c) => c.member === "Robin" && c.movie === "Film B")).toBe(true);
  });

  it("sets added_by Robin, paid fields at 12:00Z, ISO added_at", () => {
    const { rows } = plan();
    const e = rows.watchlist_entries[0];
    expect(e.added_by_ref).toBe("Robin");
    expect(e.added_at).toBe("2026-03-10T20:00:00Z");
    expect(e.paid_by_ref).toBe("Tobias");
    expect(e.paid_at).toBe("2026-04-01T12:00:00Z");
    expect(rows.watchlist_entries[1].paid_at).toBeNull();
  });

  it("skips empty rating rows and excluded members; derives rated_at", () => {
    const { rows, report } = plan();
    const row = report.counts.find((c) => c.table === "ratings");
    expect(row.legacy).toBe(11);
    // planned: e1 Robin, e1 Tobias, entry-B Robin (merged), entry-B Tobias (seen only), e4 Robin(liked)
    expect(rows.ratings).toHaveLength(5);
    expect(row.skipped["empty row"]).toBe(4);
    expect(row.skipped["member/group excluded"]).toBe(1);
    expect(row.skipped["merged into collapsed entry"]).toBe(1);
    const t1 = rows.ratings.find((r) => r.user_ref === "Tobias" && r.rating === 4);
    expect(t1.rated_at).toBe("2026-04-03T12:00:00Z"); // from seen_at
    const r1 = rows.ratings.find((r) => r.user_ref === "Robin" && r.rating === 4.5);
    expect(r1.rated_at).toBe("2026-04-02T21:00:00Z");
    const like = rows.ratings.find((r) => r.rating === null && r.liked === true);
    expect(like.rated_at).toBeNull();
    expect(like.seen_at).toBeNull();
  });

  it("uses deterministic ids", () => {
    const a = plan().rows;
    const b = plan().rows;
    expect(a.watchlist_entries.map((e) => e.id)).toEqual(b.watchlist_entries.map((e) => e.id));
    expect(a.ratings.map((r) => r.id)).toEqual(b.ratings.map((r) => r.id));
  });

  it("reports metadata gaps for planned movies", () => {
    const { report } = plan();
    expect(report.gaps.runtime).toBe(0);
    expect(report.gaps.release_date).toBe(1); // movie 500 (placeholder -> null)
    expect(report.gaps.director).toBe(1);
    expect(report.gaps.movie_genres).toBe(1); // movie 500 only has an unmapped genre
    expect(report.gaps.vote_average).toBe(1);
  });
});
