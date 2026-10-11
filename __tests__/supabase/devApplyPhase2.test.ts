/** Struktur-Test fuer docs/dev-apply-phase2.sql (Push-Trigger-Umzug, ADR 0014). */
const fs = require("fs");
const path = require("path");

const sql: string = fs
  .readFileSync(path.join(process.cwd(), "docs", "dev-apply-phase2.sql"), "utf8")
  .split("\n")
  .map((l: string) => l.replace(/--.*$/, ""))
  .join("\n")
  .toLowerCase();

describe("docs/dev-apply-phase2.sql", () => {
  it("creates the first-rating trigger on user_movie_ratings (insert or update)", () => {
    expect(sql).toMatch(/create trigger trg_user_movie_ratings_notify_first_rating\s+after insert or update on public\.user_movie_ratings/);
  });

  it("drops the legacy trigger on public.ratings but not the table", () => {
    expect(sql).toContain("drop trigger if exists trg_ratings_notify_first_rating on public.ratings");
    expect(sql).not.toMatch(/drop table/);
  });

  it("enqueues one event per group of the rater and carries a dedupeKey", () => {
    expect(sql).toContain("enqueue_push_notification");
    expect(sql).toContain("'dedupekey'");
    expect(sql).toContain("watch_group_members");
  });

  it("is idempotent (create or replace / drop if exists)", () => {
    expect(sql).toContain("create or replace function public.notify_first_user_movie_rating");
    expect(sql).toContain("drop trigger if exists trg_user_movie_ratings_notify_first_rating");
  });
});
