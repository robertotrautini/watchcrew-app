import { fireEvent, render } from "@testing-library/react-native";

import { StarRating } from "../../../src/components/ui/StarRating";

// `@expo/vector-icons`'s real MaterialIcons implementation resolves `name`/`color`
// into a glyph + native style internally and does not forward those raw
// props down to the host node it renders, so RNTL's testID-based queries
// (which return the deepest matching host node) can't see them. Mocking it
// as a plain `View` that spreads its props through (as `View` itself does)
// keeps `name`/`color` inspectable via `.props` for behavior assertions,
// same pattern as this repo's existing native-module mocks (see
// __tests__/lib/sentry.test.ts, __tests__/lib/supabase.test.ts). jest hoists this
// call above the imports above at execution time regardless of its position.
// M11 (haptic polish): `expo-haptics` mocked so `Haptics.impactAsync` calls
// can be asserted without touching a real native module -- same pattern as
// this file's existing `@expo/vector-icons` mock.
const mockImpactAsync = jest.fn();
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

const GOLD_STAR_COLOR = "#FFD700";
const STAR_EMPTY_COLOR = "#575757";
const LIKE_HEART_COLOR = "#e05c6e";

function starIcons(icons: Array<{ props: { name: string; color: string } }>) {
  return icons.map((icon) => ({ name: icon.props.name, color: icon.props.color }));
}

describe("StarRating", () => {
  beforeEach(() => {
    mockImpactAsync.mockClear();
  });

  describe("rendering full/half/empty breakdown", () => {
    it("renders 5 empty stars for rating=0", async () => {
      const { getAllByTestId } = await render(<StarRating rating={0} starColor={GOLD_STAR_COLOR} />);
      const stars = starIcons(getAllByTestId("star-rating-icon") as never);
      expect(stars).toHaveLength(5);
      expect(stars.every((s) => s.name === "star-border" && s.color === STAR_EMPTY_COLOR)).toBe(true);
    });

    it("renders 5 empty stars for rating=null", async () => {
      const { getAllByTestId } = await render(<StarRating rating={null} starColor={GOLD_STAR_COLOR} />);
      const stars = starIcons(getAllByTestId("star-rating-icon") as never);
      expect(stars.every((s) => s.name === "star-border" && s.color === STAR_EMPTY_COLOR)).toBe(true);
    });

    it("renders 3 full, 1 half, 1 empty for rating=3.5", async () => {
      const { getAllByTestId } = await render(<StarRating rating={3.5} starColor={GOLD_STAR_COLOR} />);
      const stars = starIcons(getAllByTestId("star-rating-icon") as never);
      expect(stars[0]).toEqual({ name: "star", color: GOLD_STAR_COLOR });
      expect(stars[1]).toEqual({ name: "star", color: GOLD_STAR_COLOR });
      expect(stars[2]).toEqual({ name: "star", color: GOLD_STAR_COLOR });
      expect(stars[3]).toEqual({ name: "star-half", color: GOLD_STAR_COLOR });
      expect(stars[4]).toEqual({ name: "star-border", color: STAR_EMPTY_COLOR });
    });

    it("renders 5 full stars for rating=5", async () => {
      const { getAllByTestId } = await render(<StarRating rating={5} starColor={GOLD_STAR_COLOR} />);
      const stars = starIcons(getAllByTestId("star-rating-icon") as never);
      expect(stars.every((s) => s.name === "star" && s.color === GOLD_STAR_COLOR)).toBe(true);
    });

    it("uses the passed starColor for filled portions (theme-following)", async () => {
      const { getAllByTestId } = await render(<StarRating rating={5} starColor="#4e8ac8" />);
      const stars = starIcons(getAllByTestId("star-rating-icon") as never);
      expect(stars.every((s) => s.color === "#4e8ac8")).toBe(true);
    });
  });

  describe("editable mode (onChange provided)", () => {
    it("sets the full-star value when tapping the right half of a star", async () => {
      const onChange = jest.fn();
      const { getByTestId } = await render(
        <StarRating rating={0} starColor={GOLD_STAR_COLOR} onChange={onChange} />,
      );

      // star index 2 (0-based) -> tapping its right half should yield 3
      await fireEvent(getByTestId("star-rating-touch-2"), "press", {
        nativeEvent: { locationX: 40 },
      });

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it("triggers a light haptic impact on tap", async () => {
      const onChange = jest.fn();
      const { getByTestId } = await render(
        <StarRating rating={0} starColor={GOLD_STAR_COLOR} onChange={onChange} />,
      );

      await fireEvent(getByTestId("star-rating-touch-2"), "press", {
        nativeEvent: { locationX: 40 },
      });

      expect(mockImpactAsync).toHaveBeenCalledWith("light");
    });

    it("sets the half-star value when tapping the left half of a star", async () => {
      const onChange = jest.fn();
      const { getByTestId } = await render(
        <StarRating rating={0} starColor={GOLD_STAR_COLOR} onChange={onChange} />,
      );

      // star index 2 (0-based) -> tapping its left half should yield 2.5
      await fireEvent(getByTestId("star-rating-touch-2"), "press", {
        nativeEvent: { locationX: 10 },
      });

      expect(onChange).toHaveBeenCalledWith(2.5);
    });
  });

  describe("read-only mode (no onChange)", () => {
    it("does not crash and does not call anything when a star is tapped", async () => {
      const { getByTestId } = await render(<StarRating rating={2} starColor={GOLD_STAR_COLOR} />);

      await expect(
        fireEvent(getByTestId("star-rating-touch-2"), "press", {
          nativeEvent: { locationX: 40 },
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("like-heart", () => {
    it("renders heart-outline when not liked and toggles to heart on tap", async () => {
      const onToggleLike = jest.fn();
      const { getByTestId, rerender } = await render(
        <StarRating
          rating={2}
          starColor={GOLD_STAR_COLOR}
          liked={false}
          onToggleLike={onToggleLike}
        />,
      );

      const heart = getByTestId("star-rating-heart-icon");
      expect(heart.props.name).toBe("favorite-border");

      await fireEvent.press(getByTestId("star-rating-heart-touch"));
      expect(onToggleLike).toHaveBeenCalledTimes(1);
      expect(mockImpactAsync).toHaveBeenCalledWith("light");

      await rerender(
        <StarRating
          rating={2}
          starColor={GOLD_STAR_COLOR}
          liked={true}
          onToggleLike={onToggleLike}
        />,
      );
      expect(getByTestId("star-rating-heart-icon").props.name).toBe("favorite");
    });

    it("always renders the heart in the fixed color, regardless of the theme's star color", async () => {
      const { getByTestId } = await render(
        <StarRating
          rating={2}
          starColor="#9050c7"
          liked={true}
          onToggleLike={() => {}}
        />,
      );

      expect(getByTestId("star-rating-heart-icon").props.color).toBe(LIKE_HEART_COLOR);
    });

    it("does not render the heart when onToggleLike is not provided", async () => {
      const { queryByTestId } = await render(<StarRating rating={2} starColor={GOLD_STAR_COLOR} />);
      expect(queryByTestId("star-rating-heart-icon")).toBeNull();
    });
  });
});
