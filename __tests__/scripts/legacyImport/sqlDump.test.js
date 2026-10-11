const { parseDump } = require("../../../scripts/legacy-import/sqlDump");
const { FIXTURE_DUMP } = require("../../helpers/legacyDumpFixture");

describe("parseDump", () => {
  it("parses table rows with column names", () => {
    const t = parseDump(FIXTURE_DUMP);
    expect(t.groups).toEqual([
      { id: "g1", name: "Alle Drei" },
      { id: "g2", name: "Robin & Tobias" },
      { id: "g3", name: "Bebbo & Bini" },
    ]);
    expect(t.members).toHaveLength(4);
  });

  it("merges multiple INSERT statements of one table", () => {
    expect(parseDump(FIXTURE_DUMP).movies).toHaveLength(6);
  });

  it("handles NULL, numbers, quoted decimals and escapes", () => {
    const m = parseDump(FIXTURE_DUMP).movies[0];
    expect(m.tmdb_id).toBe(100);
    expect(m.vote_average).toBe("7.5");
    expect(m.overview).toBe('It\'s a "quoted" one\nline2');
    expect(parseDump(FIXTURE_DUMP).movies[1].release_date).toBeNull();
  });

  it("handles doubled quotes, backslashes, commas/parens/semicolons inside strings", () => {
    const sql =
      "INSERT INTO `t` (`a`, `b`) VALUES\n('it''s (x), y; z', 'back\\\\slash'),\n(NULL, -2.5);\nINSERT INTO `t` (`a`, `b`) VALUES ('2', 3);";
    const t = parseDump(sql);
    expect(t.t).toEqual([
      { a: "it's (x), y; z", b: "back\\slash" },
      { a: null, b: -2.5 },
      { a: "2", b: 3 },
    ]);
  });

  it("ignores CREATE TABLE and comments", () => {
    expect(parseDump("CREATE TABLE `x` (\n `a` int\n);\n-- c\n")).toEqual({});
  });

  it("throws on a tuple with the wrong column count", () => {
    expect(() => parseDump("INSERT INTO `t` (`a`, `b`) VALUES (1);")).toThrow(/column/i);
  });
});
