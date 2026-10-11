import { buildOtherRatingRows } from "@/components/movie/RatingGroupRatingsSection";
import type { GroupMemberRow } from "@/lib/groups";
import type { Rating } from "@/lib/watchlistTypes";

const member = (user_id: string, display_name: string | null) =>
  ({ user_id, profiles: { display_name } }) as unknown as GroupMemberRow;
const rating = (member_id: string, value: number | null) =>
  ({ member_id, rating: value }) as unknown as Rating;

describe("buildOtherRatingRows", () => {
  it("lists every other member, with null for those who have not rated", () => {
    const rows = buildOtherRatingRows(
      [member("me", "Ich"), member("a", "Anna"), member("b", "Ben")],
      [rating("a", 4)],
      "me",
      new Map(),
    );
    expect(rows).toEqual([
      { key: "a", label: "Anna", rating: 4 },
      { key: "b", label: "Ben", rating: null },
    ]);
  });

  it("falls back to the raw rating rows when there are no other members", () => {
    const rows = buildOtherRatingRows(
      [member("me", "Ich")],
      [rating("x", 3)],
      "me",
      new Map([["x", "Xaver"]]),
    );
    expect(rows).toEqual([{ key: "x", label: "Xaver", rating: 3 }]);
  });

  it("uses displayNameById when the member row carries no profile name", () => {
    const rows = buildOtherRatingRows(
      [member("a", null)],
      [],
      "me",
      new Map([["a", "Aus Map"]]),
    );
    expect(rows[0].label).toBe("Aus Map");
  });
});
