import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

import { MovieDetailRatingsSection } from "@/components/movie/MovieDetailRatingsSection";
import type { Rating } from "@/lib/watchlistTypes";

const GOLD_STAR_COLOR = "#FFD700";

function makeRating(overrides: Partial<Rating>): Rating {
  return {
    id: "r1",
    watchlist_entry_id: "e1",
    member_id: "member-uuid-1",
    rating: 4,
    liked: false,
    seen_at: null,
    rated_at: null,
    ...overrides,
  };
}

describe("MovieDetailRatingsSection", () => {
  it("starts collapsed: content is absent before any tap", async () => {
    const { queryByTestId } = await render(
      <MovieDetailRatingsSection
        ratings={[makeRating({})]}
        displayNameById={new Map()}
        starColor={GOLD_STAR_COLOR}
      />,
    );

    expect(queryByTestId("movie-detail-ratings-content")).toBeNull();
  });

  it("expands on tap: content appears with one row per rating, correct props reaching MemberRatingRow", async () => {
    const ratings = [
      makeRating({ id: "r1", member_id: "member-uuid-1", rating: 4 }),
      makeRating({ id: "r2", member_id: "member-uuid-2", rating: null }),
    ];
    const displayNameById = new Map([["member-uuid-1", "Anna"]]);

    const { getByTestId, queryByTestId, getByText, getAllByTestId } = await render(
      <MovieDetailRatingsSection
        ratings={ratings}
        displayNameById={displayNameById}
        starColor={GOLD_STAR_COLOR}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-ratings-toggle"));

    expect(queryByTestId("movie-detail-ratings-content")).toBeTruthy();
    // Anna has a real display name; member-uuid-2 has none -> uuid-prefix fallback.
    expect(getByText("Anna")).toBeTruthy();
    expect(getByText("Mitglied member-u")).toBeTruthy();
    // One MemberRatingRow rendered per rating (each renders its own "member-rating-row" host testID).
    expect(getAllByTestId("member-rating-row")).toHaveLength(2);
  });

  it("collapses again on second tap", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailRatingsSection
        ratings={[makeRating({})]}
        displayNameById={new Map()}
        starColor={GOLD_STAR_COLOR}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-ratings-toggle"));
    expect(queryByTestId("movie-detail-ratings-content")).toBeTruthy();

    await fireEvent.press(getByTestId("movie-detail-ratings-toggle"));
    expect(queryByTestId("movie-detail-ratings-content")).toBeNull();
  });
});
