import { fireEvent, render } from "@testing-library/react-native";

import {
  MOVIE_DETAIL_GROUP_ROW_CLASSNAME,
  MovieDetailRatingsSection,
} from "@/components/movie/MovieDetailRatingsSection";

const GOLD = "#FFD700";
const rows = [
  { memberId: "member-uuid-1", rating: 4 },
  { memberId: "member-uuid-2", rating: null },
];
const names = new Map([["member-uuid-1", "Anna"], ["member-uuid-2", "Ben"]]);

const renderSection = (r = rows) =>
  render(<MovieDetailRatingsSection rows={r} displayNameById={names} starColor={GOLD} />);

describe("MovieDetailRatingsSection", () => {
  it("starts collapsed", async () => {
    const { queryByTestId } = await renderSection();
    expect(queryByTestId("movie-detail-ratings-content")).toBeNull();
  });

  it("renders nothing without other members", async () => {
    const { queryByTestId } = await renderSection([]);
    expect(queryByTestId("movie-detail-ratings-section")).toBeNull();
  });

  it("expands to rated row (name, value) and an unrated row with muted 'nicht bewertet' instead of stars", async () => {
    const { getByTestId, getByText, getAllByTestId } = await renderSection();
    await fireEvent.press(getByTestId("movie-detail-ratings-toggle"));
    expect(getByText("Anna")).toBeTruthy();
    expect(getByText("Ben")).toBeTruthy();
    expect(getAllByTestId("member-rating-row")).toHaveLength(2);
    expect(getAllByTestId("member-rating-value")).toHaveLength(1);
    expect(getByText("4.0")).toBeTruthy();
    expect(getAllByTestId("member-rating-unrated")).toHaveLength(1);
    expect(getByText("nicht bewertet")).toBeTruthy();
  });

  it("keeps the given order (rated first) and uses one compact row height for both kinds", async () => {
    const { getByTestId, getAllByTestId } = await renderSection();
    await fireEvent.press(getByTestId("movie-detail-ratings-toggle"));
    const rowNodes = getAllByTestId("member-rating-row");
    expect(rowNodes[0].props.className).toBe(MOVIE_DETAIL_GROUP_ROW_CLASSNAME);
    expect(rowNodes[1].props.className).toBe(MOVIE_DETAIL_GROUP_ROW_CLASSNAME);
    expect(MOVIE_DETAIL_GROUP_ROW_CLASSNAME).toContain("h-10");
    expect(getAllByTestId("member-rating-name")[0].props.children).toBe("Anna");
  });

  it("collapses again on second tap; toggle has button role and no extra min-h", async () => {
    const { getByTestId, queryByTestId } = await renderSection();
    const toggle = getByTestId("movie-detail-ratings-toggle");
    expect(toggle.props.accessibilityRole).toBe("button");
    expect(toggle.props.className).not.toContain("min-h");
    await fireEvent.press(toggle);
    expect(queryByTestId("movie-detail-ratings-content")).toBeTruthy();
    await fireEvent.press(toggle);
    expect(queryByTestId("movie-detail-ratings-content")).toBeNull();
  });
});
