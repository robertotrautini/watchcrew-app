import { render } from "@testing-library/react-native";

import { MovieDetailDescription } from "@/components/movie/MovieDetailDescription";
import { MovieDetailCastRow } from "@/components/movie/MovieDetailCastRow";
import { MovieDetailGenreTags } from "@/components/movie/MovieDetailGenreTags";
import { MovieDetailMetaRow } from "@/components/movie/MovieDetailMetaRow";
import { MovieDetailProviders } from "@/components/movie/MovieDetailProviders";
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

  it("meta row: spinner area while loading, none afterwards", async () => {
    const loading = await render(<MovieDetailMetaRow runtimeLabel={null} releaseInfo={null} isLoading />);
    const area = loading.getByTestId("movie-detail-meta-loading");
    expect(area.props.className).toContain("min-h-");
    expect(loading.getByTestId("movie-detail-meta-loading-spinner")).toBeTruthy();
    await loading.unmount();
    const done = await render(<MovieDetailMetaRow runtimeLabel={null} releaseInfo={null} />);
    expect(done.queryByTestId("movie-detail-meta-loading")).toBeNull();
  });

  it("genres: spinner area while loading, none afterwards", async () => {
    const loading = await render(<MovieDetailGenreTags genres={[]} isLoading />);
    expect(loading.getByTestId("movie-detail-genres-loading").props.className).toContain("min-h-");
    expect(loading.getByTestId("movie-detail-genres-loading-spinner")).toBeTruthy();
    await loading.unmount();
    const done = await render(<MovieDetailGenreTags genres={[]} />);
    expect(done.queryByTestId("movie-detail-genres-loading")).toBeNull();
  });

  it("cast/director: spinner area while loading, none afterwards", async () => {
    const props = { director: null, cast: [], onDirectorPress: noop, onCastMemberPress: noop };
    const loading = await render(<MovieDetailCastRow {...props} isLoading />);
    expect(loading.getByTestId("movie-detail-cast-loading").props.className).toContain("min-h-");
    expect(loading.getByTestId("movie-detail-cast-loading-spinner")).toBeTruthy();
    await loading.unmount();
    const done = await render(<MovieDetailCastRow {...props} />);
    expect(done.queryByTestId("movie-detail-cast-loading")).toBeNull();
  });

  it("providers: spinner area while loading, none afterwards", async () => {
    const loading = await render(<MovieDetailProviders providers={null} isLoading />);
    expect(loading.getByTestId("movie-detail-providers-loading").props.className).toContain("min-h-");
    expect(loading.getByTestId("movie-detail-providers-loading-spinner")).toBeTruthy();
    await loading.unmount();
    const done = await render(<MovieDetailProviders providers={null} />);
    expect(done.queryByTestId("movie-detail-providers-loading")).toBeNull();
  });
});
