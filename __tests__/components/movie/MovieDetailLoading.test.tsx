import { render } from "@testing-library/react-native";

import { MovieDetailDescription } from "@/components/movie/MovieDetailDescription";
import { MovieDetailTitleRow } from "@/components/movie/MovieDetailTitleRow";

const noop = () => {};

describe("Movie detail loading spinners", () => {
  it("description: spinner area while loading without overview, nothing afterwards", async () => {
    const loading = await render(<MovieDetailDescription overview={null} isLoading />);
    const area = loading.getByTestId("movie-detail-description-loading");
    expect(area.props.accessibilityLabel).toBe("Lädt");
    expect(area.props.className).toContain("min-h-");
    expect(loading.getByTestId("movie-detail-description-loading-spinner")).toBeTruthy();
    await loading.unmount();

    const done = await render(<MovieDetailDescription overview={null} />);
    expect(done.queryByTestId("movie-detail-description-loading")).toBeNull();
  });

  it("title row: spinner replaces the title while loading", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailTitleRow
        title="Film"
        voteAverage={null}
        showHeart={false}
        liked={false}
        onToggleLike={noop}
        isLoading
      />,
    );
    expect(getByTestId("movie-detail-title-loading")).toBeTruthy();
    expect(queryByTestId("movie-detail-title")).toBeNull();
  });
});
