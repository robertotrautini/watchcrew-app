import { fireEvent, render } from "@testing-library/react-native";

import { MovieDetailDescription } from "@/components/movie/MovieDetailDescription";

const OVERVIEW = "A long movie overview that may or may not wrap across several lines.";

describe("MovieDetailDescription", () => {
  it("renders nothing when overview is null (no crash)", async () => {
    const { queryByTestId } = await render(<MovieDetailDescription overview={null} />);

    expect(queryByTestId("movie-detail-description-text")).toBeNull();
    expect(queryByTestId("movie-detail-description-measure")).toBeNull();
  });

  // Root cause (bug 5, re-diagnosed on device): Yoga positions an `absolute`
  // child without insets at the parent's start edge, so the invisible
  // full-width, multi-line measurement Text overlaid (and swallowed taps on)
  // the director/cast rows. `pointerEvents="none"` on a Text is NOT honoured
  // by the Android native Text view, so the measurement Text must instead sit
  // in a zero-height, overflow-hidden wrapper that has no hit area at all.
  it("clips the invisible measurement text inside a zero-height overflow-hidden wrapper so it has no hit area", async () => {
    const { getByTestId } = await render(<MovieDetailDescription overview={OVERVIEW} />);

    const wrapperClassName = getByTestId("movie-detail-description-measure-wrapper").props.className;
    expect(wrapperClassName).toContain("h-0");
    expect(wrapperClassName).toContain("overflow-hidden");
  });

  it("does not show the toggle before any textLayout event has fired", async () => {
    const { queryByTestId } = await render(<MovieDetailDescription overview={OVERVIEW} />);

    expect(queryByTestId("movie-detail-description-toggle")).toBeNull();
  });

  it("shows the toggle once the measured line count (4) exceeds the 3-line max", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailDescription overview={OVERVIEW} />,
    );

    await fireEvent(getByTestId("movie-detail-description-measure"), "textLayout", {
      nativeEvent: { lines: [{}, {}, {}, {}] },
    });

    expect(queryByTestId("movie-detail-description-toggle")).toBeTruthy();
  });

  it("keeps the toggle absent when the measured line count is exactly 3 (boundary: 3 > 3 is false)", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailDescription overview={OVERVIEW} />,
    );

    await fireEvent(getByTestId("movie-detail-description-measure"), "textLayout", {
      nativeEvent: { lines: [{}, {}, {}] },
    });

    expect(queryByTestId("movie-detail-description-toggle")).toBeNull();
  });

  it("tapping the toggle switches numberOfLines / label from 'Mehr anzeigen' to 'Weniger anzeigen'", async () => {
    const { getByTestId, getByText } = await render(
      <MovieDetailDescription overview={OVERVIEW} />,
    );

    await fireEvent(getByTestId("movie-detail-description-measure"), "textLayout", {
      nativeEvent: { lines: [{}, {}, {}, {}] },
    });

    expect(getByTestId("movie-detail-description-text").props.numberOfLines).toBe(3);
    expect(getByText("Mehr anzeigen")).toBeTruthy();

    await fireEvent.press(getByTestId("movie-detail-description-toggle"));

    expect(getByTestId("movie-detail-description-text").props.numberOfLines).toBeUndefined();
    expect(getByText("Weniger anzeigen")).toBeTruthy();
  });

  it("the Mehr/Weniger toggle has a 48dp tall touch area (min-h)", async () => {
    const { getByTestId } = await render(<MovieDetailDescription overview={OVERVIEW} />);
    await fireEvent(getByTestId("movie-detail-description-measure"), "textLayout", {
      nativeEvent: { lines: [{}, {}, {}, {}] },
    });
    expect(getByTestId("movie-detail-description-toggle").props.className).toContain("min-h-touch-comfortable");
  });
});
