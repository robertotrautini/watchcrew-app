import { render } from "@testing-library/react-native";

import { MovieDetailGenreTags } from "@/components/movie/MovieDetailGenreTags";

describe("MovieDetailGenreTags", () => {
  it("renders no tags (empty container, no crash) when genres is an empty array", async () => {
    const { getByTestId, queryByTestId } = await render(<MovieDetailGenreTags genres={[]} />);

    expect(getByTestId("movie-detail-genre-tags")).toBeTruthy();
    expect(queryByTestId("movie-detail-genre-tag-0")).toBeNull();
  });

  it("renders one tag per genre, in order, with the correct text", async () => {
    const { getByTestId, getByText } = await render(
      <MovieDetailGenreTags genres={["Drama", "Sci-Fi", "Thriller"]} />,
    );

    expect(getByTestId("movie-detail-genre-tag-0")).toBeTruthy();
    expect(getByText("Drama")).toBeTruthy();
    expect(getByTestId("movie-detail-genre-tag-1")).toBeTruthy();
    expect(getByText("Sci-Fi")).toBeTruthy();
    expect(getByTestId("movie-detail-genre-tag-2")).toBeTruthy();
    expect(getByText("Thriller")).toBeTruthy();
  });
});

describe("MovieDetailGenreTags unified chip style", () => {
  it("uses the shared gold-tinted chip look (rounded box, not oval)", async () => {
    const { render } = require("@testing-library/react-native");
    const { MovieDetailGenreTags } = require("@/components/movie/MovieDetailGenreTags");
    const view = await render(<MovieDetailGenreTags genres={["Drama"]} />);
    const cls = view.getByTestId("movie-detail-genre-tag-0").props.className as string;
    expect(cls).toContain("bg-chip-base");
    expect(cls).toContain("border-accent-a55");
    expect(cls).toContain("rounded-lg");
  });
});
