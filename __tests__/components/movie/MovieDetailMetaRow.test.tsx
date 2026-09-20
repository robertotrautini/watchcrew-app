import { render } from "@testing-library/react-native";

import { MovieDetailMetaRow } from "@/components/movie/MovieDetailMetaRow";

describe("MovieDetailMetaRow", () => {
  it("renders both runtime and release date when both are present", async () => {
    const { getByTestId } = await render(
      <MovieDetailMetaRow
        runtimeLabel="2h 14min"
        releaseInfo={{ label: "Kinostart", date: "12.03.2024" }}
      />,
    );

    expect(getByTestId("movie-detail-runtime").props.children).toBe("2h 14min");
    expect(getByTestId("movie-detail-release-date").props.children).toBe("Kinostart 12.03.2024");
  });

  it("renders only the runtime when releaseInfo is null", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel="2h 14min" releaseInfo={null} />,
    );

    expect(getByTestId("movie-detail-runtime")).toBeTruthy();
    expect(queryByTestId("movie-detail-release-date")).toBeNull();
  });

  it("renders only the release date when runtimeLabel is null", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailMetaRow
        runtimeLabel={null}
        releaseInfo={{ label: "Kinostart", date: "12.03.2024" }}
      />,
    );

    expect(queryByTestId("movie-detail-runtime")).toBeNull();
    expect(getByTestId("movie-detail-release-date")).toBeTruthy();
  });

  it("renders neither (empty row, no crash) when both are null", async () => {
    const { queryByTestId, getByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel={null} releaseInfo={null} />,
    );

    expect(getByTestId("movie-detail-meta-row")).toBeTruthy();
    expect(queryByTestId("movie-detail-runtime")).toBeNull();
    expect(queryByTestId("movie-detail-release-date")).toBeNull();
  });
});
