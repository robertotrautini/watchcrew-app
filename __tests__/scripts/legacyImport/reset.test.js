const { createMemoryDb } = require("../../../scripts/legacy-import/memoryBackend");
const { resetDevData, MAESTRO_GROUP_NAME } = require("../../../scripts/legacy-import/reset");
const { DEV_PROJECT_REF } = require("../../../scripts/legacy-import/target");

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const U = id(900);

async function seed() {
  const db = createMemoryDb({ users: [U] });
  await db.upsert("watch_groups", [
    { id: id(1), name: MAESTRO_GROUP_NAME, color_theme: "gold" },
    { id: id(2), name: "Other", color_theme: "red" },
  ], { onConflict: "id" });
  await db.upsert("watch_group_members", [
    { group_id: id(1), user_id: U, role: "owner", joined_at: null },
    { group_id: id(2), user_id: U, role: "owner", joined_at: null },
  ], { onConflict: "group_id,user_id" });
  await db.upsert("movies", [
    { id: id(11), tmdb_id: 603, name: "Kept" },
    { id: id(12), tmdb_id: 604, name: "Gone" },
    { id: id(13), tmdb_id: 605, name: "Gone2" },
  ], { onConflict: "id" });
  await db.upsert("genres", [
    { id: id(21), tmdb_genre_id: 28, name: "Action" },
    { id: id(22), tmdb_genre_id: 18, name: "Drama" },
  ], { onConflict: "id" });
  await db.upsert("movie_genres", [
    { movie_id: id(11), genre_id: id(21) },
    { movie_id: id(12), genre_id: id(22) },
  ], { onConflict: "movie_id,genre_id" });
  await db.upsert("watchlist_entries", [
    { id: id(31), group_id: id(1), movie_id: id(11), added_at: "2026-01-01T00:00:00Z", added_by: U },
    { id: id(32), group_id: id(2), movie_id: id(12), added_at: "2026-01-01T00:00:00Z", added_by: U },
  ], { onConflict: "id" });
  await db.upsert("ratings", [
    { id: id(41), watchlist_entry_id: id(31), member_id: U, rating: 4, liked: true, seen_at: null, rated_at: null },
    { id: id(42), watchlist_entry_id: id(32), member_id: U, rating: 3, liked: false, seen_at: null, rated_at: null },
  ], { onConflict: "id" });
  return db;
}

describe("resetDevData", () => {
  it("requires the exact confirmation and deletes nothing otherwise", async () => {
    const db = await seed();
    await expect(resetDevData({ db, confirm: "nope", log: () => {} })).rejects.toThrow(/reset-confirm/);
    await expect(resetDevData({ db, confirm: undefined, log: () => {} })).rejects.toThrow(/reset-confirm/);
    expect(await db.count("watch_groups")).toBe(2);
  });

  it("keeps the Maestro group with members, entries, ratings, and referenced movies/genres/movie_genres", async () => {
    const db = await seed();
    const out = await resetDevData({ db, confirm: DEV_PROJECT_REF, log: () => {} });
    expect((await db.select("watch_groups", {})).map((g) => g.id)).toEqual([id(1)]);
    expect(await db.count("watch_group_members")).toBe(1);
    expect((await db.select("movies", {})).map((m) => m.id)).toEqual([id(11)]);
    expect((await db.select("genres", {})).map((g) => g.id)).toEqual([id(21)]);
    expect(await db.count("movie_genres")).toBe(1);
    expect((await db.select("watchlist_entries", {})).map((g) => g.id)).toEqual([id(31)]);
    expect((await db.select("ratings", {})).map((g) => g.id)).toEqual([id(41)]);
    expect(out.before.watch_groups).toBe(2);
    expect(out.after.watch_groups).toBe(1);
    expect(out.keptGroupIds).toEqual([id(1)]);
  });

  it("deletes everything when no Maestro group exists", async () => {
    const db = createMemoryDb({ users: [U] });
    await db.upsert("watch_groups", [{ id: id(2), name: "Other", color_theme: "red" }], { onConflict: "id" });
    await db.upsert("movies", [{ id: id(12), tmdb_id: 604, name: "Gone" }], { onConflict: "id" });
    const out = await resetDevData({ db, confirm: DEV_PROJECT_REF, log: () => {} });
    expect(out.after.watch_groups).toBe(0);
    expect(out.after.movies).toBe(0);
    expect(out.keptGroupIds).toEqual([]);
  });

  it("never touches users or profiles", async () => {
    const db = await seed();
    await db.upsert("profiles", [{ id: U, display_name: "x" }], { onConflict: "id" });
    await resetDevData({ db, confirm: DEV_PROJECT_REF, log: () => {} });
    expect(await db.count("profiles")).toBe(1);
  });

  it("refuses when the allowlist is too large for safe REST filters", async () => {
    const db = await seed();
    const rows = Array.from({ length: 200 }, (_, i) => ({ id: id(1000 + i), group_id: id(1), movie_id: id(11), added_at: "2026-01-01T00:00:00Z", added_by: U }));
    // distinct movies needed for the unique (group, movie); use many movies
    const movies = rows.map((r, i) => ({ id: id(2000 + i), tmdb_id: 10000 + i, name: "m" }));
    await db.upsert("movies", movies, { onConflict: "id" });
    await db.upsert("watchlist_entries", rows.map((r, i) => ({ ...r, movie_id: movies[i].id })), { onConflict: "id" });
    await expect(resetDevData({ db, confirm: DEV_PROJECT_REF, log: () => {} })).rejects.toThrow(/allowlist/i);
    expect(await db.count("watch_groups")).toBe(2);
  });

  it("logs counts before and after without personal data", async () => {
    const db = await seed();
    const lines = [];
    await resetDevData({ db, confirm: DEV_PROJECT_REF, log: (l) => lines.push(l) });
    const out = lines.join("\n");
    expect(out).toMatch(/watch_groups\s+2\s+1/);
    expect(out).toContain("kept");
  });
});
