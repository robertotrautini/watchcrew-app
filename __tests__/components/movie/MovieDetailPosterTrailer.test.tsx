import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock("react-native-webview", () => {
  const { View } = require("react-native");
  return {
    WebView: (props: Record<string, unknown>) => <View testID="movie-detail-trailer-webview" {...props} />,
  };
});

const mockLockAsync = jest.fn();
jest.mock("expo-screen-orientation", () => ({
  lockAsync: (...args: unknown[]) => mockLockAsync(...args),
  OrientationLock: { LANDSCAPE: "LANDSCAPE", PORTRAIT_UP: "PORTRAIT_UP" },
}));

import { MovieDetailPosterTrailer } from "@/components/movie/MovieDetailPosterTrailer";

const TRAILER = { id: "t1", key: "abc123", site: "YouTube", type: "Trailer", name: "Official Trailer" };

describe("MovieDetailPosterTrailer", () => {
  beforeEach(() => {
    mockLockAsync.mockClear();
  });

  it("shows the poster placeholder (no crash) when posterUrl is null", async () => {
    const { getByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl={null}
        title="Alpha"
        isLoadingDetail={false}
        trailer={null}
      />,
    );

    expect(getByTestId("movie-detail-poster-placeholder")).toBeTruthy();
  });

  it("shows the spinner while isLoadingDetail is true, and no play button", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={true}
        trailer={TRAILER}
      />,
    );

    expect(getByTestId("movie-detail-poster-spinner")).toBeTruthy();
    expect(queryByTestId("movie-detail-trailer-play-button")).toBeNull();
  });

  it("shows the play button once trailer is non-null and loading is done", async () => {
    const { getByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={TRAILER}
      />,
    );

    expect(getByTestId("movie-detail-trailer-play-button")).toBeTruthy();
  });

  it("does not show the play button when trailer is null", async () => {
    const { queryByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={null}
      />,
    );

    expect(queryByTestId("movie-detail-trailer-play-button")).toBeNull();
  });

  it("swaps the poster/play-button for the WebView when the play button is tapped", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={TRAILER}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-trailer-play-button"));

    expect(getByTestId("movie-detail-trailer-webview")).toBeTruthy();
    expect(queryByTestId("movie-detail-poster-image")).toBeNull();
    expect(queryByTestId("movie-detail-trailer-play-button")).toBeNull();
  });

  it("opens the fullscreen modal and locks to LANDSCAPE when the fullscreen-toggle button is tapped", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={TRAILER}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-trailer-play-button"));
    expect(queryByTestId("movie-detail-trailer-fullscreen-modal")).toBeNull();

    await fireEvent.press(getByTestId("movie-detail-trailer-fullscreen-button"));

    expect(getByTestId("movie-detail-trailer-fullscreen-modal")).toBeTruthy();
    expect(mockLockAsync).toHaveBeenCalledWith("LANDSCAPE");
  });

  it("closes the fullscreen modal and locks back to PORTRAIT_UP when the close button is tapped", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={TRAILER}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-trailer-play-button"));
    await fireEvent.press(getByTestId("movie-detail-trailer-fullscreen-button"));
    mockLockAsync.mockClear();

    await fireEvent.press(getByTestId("movie-detail-trailer-fullscreen-close-button"));

    expect(queryByTestId("movie-detail-trailer-fullscreen-modal")).toBeNull();
    expect(mockLockAsync).toHaveBeenCalledWith("PORTRAIT_UP");
  });
});
