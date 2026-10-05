import { render } from "@testing-library/react-native";

// Same MaterialIcons mocking rationale as __tests__/components/ui/StarRating.test.tsx: the real
// implementation doesn't forward name/color to the host node RNTL queries.
// expo-image's real native <Image> needs no special mocking under jest-expo
// (see src/components/web-badge.tsx already using it directly in tests-free
// code) — no mock needed here.

import { DiaryPosterTile } from "@/components/movie/DiaryPosterTile";

const GOLD_STAR_COLOR = "#FFD700";
const LIKE_HEART_COLOR = "#e05c6e";

describe("DiaryPosterTile", () => {
  it("renders the average-rating badge with the star icon and formatted number", async () => {
    const { getByTestId } = await render(
      <DiaryPosterTile
        posterUrl={null}
        title="Alpha"
        starColor={GOLD_STAR_COLOR}
        averageRating={4.5}
        liked={false}
        tmdbScore={7.8}
      />,
    );

    expect(getByTestId("poster-card-average-value").props.children).toBe("4.5");
  });

  it("does NOT render the like-heart badge when liked=false", async () => {
    const { queryByTestId } = await render(
      <DiaryPosterTile
        posterUrl={null}
        title="Alpha"
        starColor={GOLD_STAR_COLOR}
        averageRating={4}
        liked={false}
        tmdbScore={null}
      />,
    );

    expect(queryByTestId("poster-card-like-badge")).toBeNull();
  });

  it("renders the like-heart badge in the FIXED heart color when liked=true, regardless of the passed starColor (a different theme color)", async () => {
    const { getByTestId } = await render(
      <DiaryPosterTile
        posterUrl={null}
        title="Alpha"
        starColor="#4e8ac8" // a non-gold theme color, deliberately different from the fixed heart color
        averageRating={4}
        liked
        tmdbScore={null}
      />,
    );

    const heartIcon = getByTestId("poster-card-like-icon");
    expect(heartIcon.props.name).toBe("favorite");
    expect(heartIcon.props.color).toBe(LIKE_HEART_COLOR);
  });

  it("renders the TMDB score badge with the score, or '–' when null", async () => {
    const { getByTestId, rerender } = await render(
      <DiaryPosterTile
        posterUrl={null}
        title="Alpha"
        starColor={GOLD_STAR_COLOR}
        averageRating={4}
        liked={false}
        tmdbScore={8.2}
      />,
    );
    expect(getByTestId("poster-card-tmdb-value").props.children).toBe("8.2");

    await rerender(
      <DiaryPosterTile
        posterUrl={null}
        title="Alpha"
        starColor={GOLD_STAR_COLOR}
        averageRating={4}
        liked={false}
        tmdbScore={null}
      />,
    );
    expect(getByTestId("poster-card-tmdb-value").props.children).toBe("–");
  });

  it("renders a placeholder box (no crash) when posterUrl is null", async () => {
    const { getByTestId } = await render(
      <DiaryPosterTile
        posterUrl={null}
        title="Alpha"
        starColor={GOLD_STAR_COLOR}
        averageRating={null}
        liked={false}
        tmdbScore={null}
      />,
    );

    expect(getByTestId("poster-card-placeholder")).toBeTruthy();
  });

  it("is an edge-to-edge poster tile: no padding, full-width poster without own radius, flush TMDB corner badge", async () => {
    const { getByTestId } = await render(
      <DiaryPosterTile
        posterUrl="https://x/p.jpg"
        title="T"
        starColor={GOLD_STAR_COLOR}
        averageRating={4}
        liked={false}
        tmdbScore={8.5}
      >
        <></>
      </DiaryPosterTile>,
    );
    const tile = getByTestId("diary-poster-tile").props.className as string;
    expect(tile).toContain("overflow-hidden");
    expect(tile).not.toMatch(/(^|\s)p[xytblr]?-\d/);
    expect(getByTestId("poster-card-poster-wrapper").props.className).not.toMatch(/rounded/);
    expect(getByTestId("poster-card-image").props.contentFit).toBe("cover");
    const badge = getByTestId("poster-card-tmdb-badge").props.className as string;
    expect(badge).toContain("bottom-0");
    expect(badge).toContain("right-0");
    expect(badge).toContain("rounded-tl-xl");
    expect(getByTestId("poster-card-info").props.className).toContain("px-2");
  });
});
