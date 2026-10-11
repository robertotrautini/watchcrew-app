import { attachMemberRatings } from "@/lib/entrySelectors";
import { splitWatchlistAndDiary } from "@/lib/watchlistLogic";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

function entry(id: string, movie_id: string): WatchlistEntry {
  return { id, movie_id, ratings: [{ stale: true }] } as unknown as WatchlistEntry;
}

describe("attachMemberRatings", () => {
  it("maps user_id to member_id and groups rows by movie_id", () => {
    const result = attachMemberRatings(
      [entry("e1", "m1"), entry("e2", "m2")],
      [
        { user_id: "u1", movie_id: "m1", rating: 4, liked: true, seen_at: "2026-01-01", rated_at: "t" },
        { user_id: "u2", movie_id: "m1", rating: null, liked: false, seen_at: null, rated_at: null },
        { user_id: "u1", movie_id: "m2", rating: 2, liked: false, seen_at: null, rated_at: "t" },
      ],
    );
    expect(result[0].ratings).toEqual([
      { member_id: "u1", rating: 4, liked: true, seen_at: "2026-01-01", rated_at: "t" },
      { member_id: "u2", rating: null, liked: false, seen_at: null, rated_at: null },
    ]);
    expect(result[1].ratings.map((r) => r.member_id)).toEqual(["u1"]);
  });

  it("gives an entry without rows an empty ratings array and does not mutate the input", () => {
    const input = [entry("e1", "m1")];
    const result = attachMemberRatings(input, []);
    expect(result[0].ratings).toEqual([]);
    expect(input[0].ratings).toEqual([{ stale: true }]);
  });

  it("ignores rows of movies not in the entry list", () => {
    const result = attachMemberRatings(
      [entry("e1", "m1")],
      [{ user_id: "u1", movie_id: "other", rating: 5, liked: false, seen_at: null, rated_at: null }],
    );
    expect(result[0].ratings).toEqual([]);
  });
});

describe("same movie in two groups (ADR 0014 semantics)", () => {
  const rows = [
    { user_id: "me", movie_id: "m1", rating: 4, liked: false, seen_at: null, rated_at: "t" },
  ];

  it("a single own rating row makes the movie a diary item in BOTH groups; without the row it is back on the watchlist", () => {
    const groupA = attachMemberRatings([entry("a1", "m1")], rows);
    const groupB = attachMemberRatings([entry("b1", "m1")], rows);
    expect(splitWatchlistAndDiary(groupA, "me").diary).toHaveLength(1);
    expect(splitWatchlistAndDiary(groupB, "me").diary).toHaveLength(1);

    const afterDelete = attachMemberRatings([entry("a1", "m1"), entry("b1", "m1")], []);
    expect(splitWatchlistAndDiary(afterDelete, "me").watchlist).toHaveLength(2);
  });

  it("re-adding a removed movie shows the existing rating immediately (rating independent of the entry id)", () => {
    const readded = attachMemberRatings([entry("new-entry-id", "m1")], rows);
    expect(splitWatchlistAndDiary(readded, "me").diary.map((e) => e.id)).toEqual(["new-entry-id"]);
  });
});
