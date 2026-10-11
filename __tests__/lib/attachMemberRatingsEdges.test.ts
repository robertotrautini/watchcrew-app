import { attachMemberRatings, type MemberRatingRow } from "@/lib/entrySelectors";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

const entry = (id: string, movie_id: string, extra: object = {}) =>
  ({ id, movie_id, ratings: [], ...extra }) as unknown as WatchlistEntry;

const row = (user_id: string, movie_id: string, extra: Partial<MemberRatingRow> = {}): MemberRatingRow => ({
  user_id,
  movie_id,
  rating: null,
  liked: false,
  seen_at: null,
  rated_at: null,
  ...extra,
});

describe("attachMemberRatings edge cases", () => {
  it("returns an empty list for no entries", () => {
    expect(attachMemberRatings([], [row("u1", "m1")])).toEqual([]);
  });

  it("keeps entry order and other entry fields", () => {
    const result = attachMemberRatings(
      [entry("e2", "m2", { added_at: "x" }), entry("e1", "m1")],
      [row("u1", "m1", { rating: 3 })],
    );
    expect(result.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect((result[0] as unknown as { added_at: string }).added_at).toBe("x");
  });

  it("gives every entry of the same movie its own ratings array with the same content", () => {
    const result = attachMemberRatings(
      [entry("a", "m1"), entry("b", "m1")],
      [row("u1", "m1", { rating: 5 })],
    );
    expect(result[0].ratings).toEqual(result[1].ratings);
    expect(result[0].ratings).toHaveLength(1);
  });

  it("preserves the row order within a movie and does not de-duplicate", () => {
    const result = attachMemberRatings(
      [entry("e", "m1")],
      [row("u2", "m1", { rating: 1 }), row("u1", "m1", { rating: 2 }), row("u2", "m1", { rating: 3 })],
    );
    expect(result[0].ratings.map((r) => [r.member_id, r.rating])).toEqual([
      ["u2", 1],
      ["u1", 2],
      ["u2", 3],
    ]);
  });

  it("keeps zero rating, liked-only rows and dates unchanged", () => {
    const result = attachMemberRatings(
      [entry("e", "m1")],
      [row("u1", "m1", { rating: 0, liked: true, seen_at: "2026-01-01", rated_at: "2026-01-02T00:00:00Z" })],
    );
    expect(result[0].ratings[0]).toEqual({
      member_id: "u1",
      rating: 0,
      liked: true,
      seen_at: "2026-01-01",
      rated_at: "2026-01-02T00:00:00Z",
    });
  });

  it("does not leak the row's user_id/movie_id keys into the rating", () => {
    const result = attachMemberRatings([entry("e", "m1")], [row("u1", "m1")]);
    expect(Object.keys(result[0].ratings[0]).sort()).toEqual(
      ["liked", "member_id", "rated_at", "rating", "seen_at"],
    );
  });
});
