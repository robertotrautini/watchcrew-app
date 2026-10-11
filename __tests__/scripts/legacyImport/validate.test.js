const { parseDump } = require("../../../scripts/legacy-import/sqlDump");
const { buildPlan } = require("../../../scripts/legacy-import/transform");
const { validatePlan } = require("../../../scripts/legacy-import/validate");
const { FIXTURE_DUMP } = require("../../helpers/legacyDumpFixture");

const MEMBER_MAP = { Robin: "r@example.test", Tobias: "t@example.test", Dad: "d@example.test" };
const fresh = () => buildPlan(parseDump(FIXTURE_DUMP), { memberMap: MEMBER_MAP }).rows;
const errs = (rows) => validatePlan(rows).filter((v) => v.severity === "error").map((v) => v.rule);

describe("validatePlan", () => {
  it("passes a clean plan", () => {
    expect(validatePlan(fresh())).toEqual([]);
  });

  it("flags NOT NULL violations", () => {
    const rows = fresh();
    rows.movies[0].name = "";
    rows.watchlist_entries[0].added_by_ref = null;
    expect(errs(rows)).toEqual(expect.arrayContaining(["not_null"]));
  });

  it("flags duplicate unique keys", () => {
    const rows = fresh();
    rows.movies.push({ ...rows.movies[0], id: "11111111-1111-5111-8111-111111111111" });
    rows.watchlist_entries.push({ ...rows.watchlist_entries[0], id: "22222222-2222-5222-8222-222222222222" });
    rows.ratings.push({ ...rows.ratings[0], id: "33333333-3333-5333-8333-333333333333" });
    const e = errs(rows);
    expect(e).toEqual(expect.arrayContaining(["unique_movies_tmdb_id", "unique_watchlist_group_movie", "unique_ratings_entry_member"]));
  });

  it("flags broken foreign keys", () => {
    const rows = fresh();
    rows.watchlist_entries[0].movie_id = "00000000-0000-5000-8000-000000000000";
    rows.ratings[0].user_ref = "Nobody";
    rows.movie_genres[0].genre_id = "00000000-0000-5000-8000-000000000001";
    expect(errs(rows)).toEqual(expect.arrayContaining(["fk"]));
  });

  it("flags check constraints and enums", () => {
    const rows = fresh();
    rows.watch_groups[0].color_theme = "pink";
    rows.watch_group_members[0].role = "boss";
    rows.ratings[0].rating = 5.5;
    expect(errs(rows)).toEqual(expect.arrayContaining(["enum_color_theme", "enum_role", "check_rating_range"]));
  });

  it("warns on rating step not 0.5 and requires one owner per group", () => {
    const rows = fresh();
    rows.ratings[0].rating = 3.3;
    rows.watch_group_members.forEach((m) => { if (m.group_id === rows.watch_groups[0].id) m.role = "member"; });
    const v = validatePlan(rows);
    expect(v.find((x) => x.rule === "rating_step").severity).toBe("warning");
    expect(v.find((x) => x.rule === "one_owner_per_group").severity).toBe("error");
  });

  it("flags bad types and formats", () => {
    const rows = fresh();
    rows.movies[0].runtime = 90.5;
    rows.movies[0].release_date = "2020-13-45";
    rows.movies[0].poster = "https://image.tmdb.org/x.jpg";
    rows.watchlist_entries[0].added_at = "yesterday";
    expect(errs(rows)).toEqual(expect.arrayContaining(["type"]));
  });
});
