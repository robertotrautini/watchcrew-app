import { fireEvent, render } from "@testing-library/react-native";

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

    expect(getByTestId("movie-detail-like-heart-icon").props.name).toBe("favorite");
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

    expect(getByTestId("movie-detail-like-heart-icon").props.name).toBe("favorite-border");
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

  it("the like heart is a 48x48 touch target with label and checked state", async () => {
    const { getByTestId } = await render(
      <MovieDetailTitleRow title="A" voteAverage={null} showHeart liked onToggleLike={jest.fn()} />,
    );
    const heart = getByTestId("movie-detail-like-heart");
    expect(heart.props.className).toContain("h-touch-comfortable w-touch-comfortable");
    expect(heart.props.accessibilityLabel).toBe("Mag ich");
    expect(heart.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
  });
});
