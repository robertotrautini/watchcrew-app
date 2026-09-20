import { render } from "@testing-library/react-native";

import { MovieDetailGenreTags } from "@/components/movie/MovieDetailGenreTags";

describe("MovieDetailGenreTags", () => {
  it("renders no tags (empty container, no crash) when genres is an empty array", async () => {
    const { getByTestId, queryByTestId } = await render(<MovieDetailGenreTags genres={[]} />);

    expect(getByTestId("movie-detail-genre-tags")).toBeTruthy();
    expect(queryByTestId("movie-detail-genre-tag-0")).toBeNull();
  });

  it("renders one tag per genre, in order, with the correct text", async () => {
    const { getByTestId } = await render(
      <MovieDetailGenreTags genres={["Drama", "Sci-Fi", "Thriller"]} />,
    );

    expect(getByTestId("movie-detail-genre-tag-0").props.children.props.children).toBe("Drama");
    expect(getByTestId("movie-detail-genre-tag-1").props.children.props.children).toBe("Sci-Fi");
    expect(getByTestId("movie-detail-genre-tag-2").props.children.props.children).toBe("Thriller");
  });
});
