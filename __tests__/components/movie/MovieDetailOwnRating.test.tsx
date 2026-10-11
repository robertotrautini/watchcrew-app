import { fireEvent, render } from "@testing-library/react-native";

import { MovieDetailOwnRating } from "@/components/movie/MovieDetailOwnRating";

const base = {
  rating: 4,
  starColor: "#FFD700",
  showHeart: true,
  liked: false,
  onToggleLike: jest.fn(),
};

describe("MovieDetailOwnRating", () => {
  it("renders stars and heart in one left aligned row", async () => {
    const { getByTestId } = await render(<MovieDetailOwnRating {...base} />);
    expect(getByTestId("movie-detail-own-stars")).toBeTruthy();
    expect(getByTestId("movie-detail-like-heart")).toBeTruthy();
    expect(getByTestId("movie-detail-own-rating").props.className).toContain("items-start");
  });

  it("renders no heart when showHeart is false", async () => {
    const { queryByTestId } = await render(<MovieDetailOwnRating {...base} showHeart={false} />);
    expect(queryByTestId("movie-detail-like-heart")).toBeNull();
  });

  it("renders a filled heart when liked and an outline heart otherwise", async () => {
    const { getByTestId, rerender } = await render(<MovieDetailOwnRating {...base} liked />);
    expect(getByTestId("movie-detail-like-heart-icon").props.name).toBe("favorite");
    await rerender(<MovieDetailOwnRating {...base} liked={false} />);
    expect(getByTestId("movie-detail-like-heart-icon").props.name).toBe("favorite-border");
  });

  it("calls onToggleLike once per press, not while toggling", async () => {
    const onToggleLike = jest.fn();
    const { getByTestId, rerender } = await render(
      <MovieDetailOwnRating {...base} onToggleLike={onToggleLike} />,
    );
    await fireEvent.press(getByTestId("movie-detail-like-heart"));
    expect(onToggleLike).toHaveBeenCalledTimes(1);
    await rerender(<MovieDetailOwnRating {...base} onToggleLike={onToggleLike} isTogglingLike />);
    await fireEvent.press(getByTestId("movie-detail-like-heart"));
    expect(onToggleLike).toHaveBeenCalledTimes(1);
  });

  it("heart is a 48x48 touch target with label and checked state", async () => {
    const { getByTestId } = await render(<MovieDetailOwnRating {...base} liked />);
    const heart = getByTestId("movie-detail-like-heart");
    expect(heart.props.className).toContain("h-touch-comfortable w-touch-comfortable");
    expect(heart.props.accessibilityLabel).toBe("Mag ich");
    expect(heart.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
  });

  it("shows 'x/y bewertet' only with a positive count and known members", async () => {
    const { getByTestId, queryByTestId, rerender } = await render(
      <MovieDetailOwnRating {...base} ratedCount={2} totalMembers={3} />,
    );
    expect(getByTestId("movie-detail-rated-count").props.children).toBe("2/3 bewertet");
    await rerender(<MovieDetailOwnRating {...base} ratedCount={0} totalMembers={3} />);
    expect(queryByTestId("movie-detail-rated-count")).toBeNull();
    await rerender(<MovieDetailOwnRating {...base} ratedCount={2} totalMembers={0} />);
    expect(queryByTestId("movie-detail-rated-count")).toBeNull();
  });
});
