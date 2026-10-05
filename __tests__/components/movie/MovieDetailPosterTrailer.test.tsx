import { fireEvent, render } from "@testing-library/react-native";

jest.mock("react-native-webview", () => {
  const { View } = require("react-native");
  return {
    WebView: (props: Record<string, unknown>) => <View testID="movie-detail-trailer-webview" {...props} />,
  };
});

jest.mock("expo-screen-orientation", () => ({
  OrientationLock: { PORTRAIT_UP: 3, LANDSCAPE: 6 },
  lockAsync: jest.fn(() => Promise.resolve()),
}));

import * as ScreenOrientation from "expo-screen-orientation";

import { MovieDetailPosterTrailer } from "@/components/movie/MovieDetailPosterTrailer";

const TRAILER = { id: "t1", key: "abc123", site: "YouTube", type: "Trailer", name: "Official Trailer" };

describe("MovieDetailPosterTrailer", () => {
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

  it("shows a close (X) button while the trailer plays; tapping it returns to the poster", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={TRAILER}
      />,
    );
    expect(queryByTestId("movie-detail-trailer-close-button")).toBeNull();
    await fireEvent.press(getByTestId("movie-detail-trailer-play-button"));
    const close = getByTestId("movie-detail-trailer-close-button");
    expect(close.props.accessibilityLabel).toBe("Schließen");
    expect(close.props.className).toContain("h-12 w-12");
    await fireEvent.press(close);
    expect(queryByTestId("movie-detail-trailer-webview")).toBeNull();
    expect(getByTestId("movie-detail-trailer-play-button")).toBeTruthy();
  });

  it("uses the standard YouTube player: allowsFullscreenVideo, no custom fullscreen button/modal", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={TRAILER}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-trailer-play-button"));

    expect(getByTestId("movie-detail-trailer-webview").props.allowsFullscreenVideo).toBe(true);
    expect(queryByTestId("movie-detail-trailer-fullscreen-button")).toBeNull();
    expect(queryByTestId("movie-detail-trailer-fullscreen-modal")).toBeNull();
  });

  it("forces landscape while the YouTube player is fullscreen and locks portrait on exit", async () => {
    const { getByTestId } = await render(
      <MovieDetailPosterTrailer
        posterUrl="https://example.com/poster.jpg"
        title="Alpha"
        isLoadingDetail={false}
        trailer={TRAILER}
      />,
    );
    await fireEvent.press(getByTestId("movie-detail-trailer-play-button"));
    const webview = getByTestId("movie-detail-trailer-webview");

    await fireEvent(webview, "message", { nativeEvent: { data: "trailer-fullscreen:1" } });
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(6);

    await fireEvent(webview, "message", { nativeEvent: { data: "trailer-fullscreen:0" } });
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(3);
  });
});
