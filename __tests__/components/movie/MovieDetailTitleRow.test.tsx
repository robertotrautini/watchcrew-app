import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

import { MovieDetailTitleRow } from "@/components/movie/MovieDetailTitleRow";

describe("MovieDetailTitleRow", () => {
  it("renders the title text", async () => {
    const { getByTestId } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={false}
        liked={false}
        onToggleLike={jest.fn()}
      />,
    );

    expect(getByTestId("movie-detail-title").props.children).toBe("Alpha");
  });

  it("renders the score badge rounded to 1 decimal when voteAverage is a number", async () => {
    const { getByTestId, getByText } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={7.849}
        showHeart={false}
        liked={false}
        onToggleLike={jest.fn()}
      />,
    );

    expect(getByTestId("movie-detail-score-badge")).toBeTruthy();
    expect(getByText("7.8")).toBeTruthy();
  });

  it("hides the score badge entirely when voteAverage is null", async () => {
    const { queryByTestId } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={false}
        liked={false}
        onToggleLike={jest.fn()}
      />,
    );

    expect(queryByTestId("movie-detail-score-badge")).toBeNull();
  });

  it("renders no heart icon at all when showHeart is false, regardless of liked", async () => {
    const { queryByTestId, rerender } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={false}
        liked={true}
        onToggleLike={jest.fn()}
      />,
    );
    expect(queryByTestId("movie-detail-like-heart")).toBeNull();

    await rerender(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={false}
        liked={false}
        onToggleLike={jest.fn()}
      />,
    );
    expect(queryByTestId("movie-detail-like-heart")).toBeNull();
  });

  it("renders a filled heart when showHeart is true and liked is true", async () => {
    const { getByTestId } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={true}
        liked={true}
        onToggleLike={jest.fn()}
      />,
    );

    expect(getByTestId("movie-detail-like-heart-icon").props.name).toBe("heart");
  });

  it("renders an outline heart when showHeart is true and liked is false", async () => {
    const { getByTestId } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={true}
        liked={false}
        onToggleLike={jest.fn()}
      />,
    );

    expect(getByTestId("movie-detail-like-heart-icon").props.name).toBe("heart-outline");
  });

  it("calls onToggleLike exactly once per press and no other function", async () => {
    const onToggleLike = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={true}
        liked={false}
        onToggleLike={onToggleLike}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-like-heart"));

    expect(onToggleLike).toHaveBeenCalledTimes(1);
  });

  it("does not call onToggleLike when isTogglingLike disables the heart", async () => {
    const onToggleLike = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailTitleRow
        title="Alpha"
        voteAverage={null}
        showHeart={true}
        liked={false}
        onToggleLike={onToggleLike}
        isTogglingLike
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-like-heart"));

    expect(onToggleLike).not.toHaveBeenCalled();
  });
});
