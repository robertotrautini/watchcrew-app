import { render } from "@testing-library/react-native";

import { WatchlistPosterCard } from "../../../src/components/movie/WatchlistPosterCard";
import type { Movie, StreamingAvailabilityLookup } from "../../../src/lib/watchlistTypes";

// Fixed "now" for deterministic future/past comparisons in the date-badge
// logic this component delegates to (src/lib/watchlistDateBadge.ts).
const NOW = new Date("2025-06-15T12:00:00Z");

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: "movie-1",
    tmdb_id: 42,
    name: "Test Movie",
    release_date: "2024-01-10", // already released, past
    poster: "https://example.com/poster.jpg",
    overview: "A gripping tale.",
    runtime: 120,
    director: "Some Director",
    director_id: 1,
    vote_average: 7.8,
    ...overrides,
  };
}

function lookup(entries: Array<[number, boolean]> = []): StreamingAvailabilityLookup {
  return new Map(entries);
}

describe("WatchlistPosterCard", () => {
  describe("card variant", () => {
    it("renders title, date badge, overview and TMDB score", async () => {
      const { getByTestId } = await render(
        <WatchlistPosterCard
          variant="card"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card-title").props.children).toBe("Test Movie");
      expect(getByTestId("watchlist-poster-card-date-badge").props.children).toBe("10.01.2024");
      expect(getByTestId("watchlist-poster-card-overview").props.children).toBe("A gripping tale.");
      expect(getByTestId("watchlist-poster-card-tmdb-badge")).toBeTruthy();
    });

    it('falls back to "Keine Beschreibung vorhanden" when overview is missing', async () => {
      const { getByTestId } = await render(
        <WatchlistPosterCard
          variant="card"
          movie={makeMovie({ overview: null })}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card-overview").props.children).toBe(
        "Keine Beschreibung vorhanden",
      );
    });

    it("omits the progress badge when no one has rated yet", async () => {
      const { queryByTestId } = await render(
        <WatchlistPosterCard
          variant="card"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(queryByTestId("watchlist-poster-card-progress-badge")).toBeNull();
    });

    it("omits the progress badge when everyone has rated", async () => {
      const { queryByTestId } = await render(
        <WatchlistPosterCard
          variant="card"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={3}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(queryByTestId("watchlist-poster-card-progress-badge")).toBeNull();
    });

    it("shows the progress badge when only some members have rated", async () => {
      const { getByTestId } = await render(
        <WatchlistPosterCard
          variant="card"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={2}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card-progress-badge")).toBeTruthy();
    });

    it("dims the card when the movie is neither released nor streaming-available", async () => {
      const { getByTestId } = await render(
        <WatchlistPosterCard
          variant="card"
          movie={makeMovie({ release_date: "2026-01-10", tmdb_id: 99 })}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      // Only the content dims; the glass surface (blur + tint) stays untouched.
      expect(getByTestId("watchlist-poster-card").props.className).not.toContain("opacity-50");
      expect(getByTestId("watchlist-poster-card-content").props.className).toContain("opacity-50");
    });

    it("does not dim an already-released movie", async () => {
      const { getByTestId } = await render(
        <WatchlistPosterCard
          variant="card"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card").props.className).not.toContain("opacity-50");
      expect(getByTestId("watchlist-poster-card-content").props.className).not.toContain("opacity-50");
    });
  });

  describe("grid variant", () => {
    it("renders the title but no overview text", async () => {
      const { getByTestId, queryByTestId } = await render(
        <WatchlistPosterCard
          variant="grid"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card-title").props.children).toBe("Test Movie");
      expect(queryByTestId("watchlist-poster-card-overview")).toBeNull();
    });

    it("hides the title text when showTitle is false (M10 'Filmtitel in Grid anzeigen' toggle off)", async () => {
      const { queryByTestId } = await render(
        <WatchlistPosterCard
          variant="grid"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
          showTitle={false}
        />,
      );

      expect(queryByTestId("watchlist-poster-card-title")).toBeNull();
    });

    it("shows the date badge overlay when no progress badge applies", async () => {
      const { getByTestId, queryByTestId } = await render(
        <WatchlistPosterCard
          variant="grid"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card-date-badge-overlay").props.children).toBe(
        "10.01.2024",
      );
      expect(queryByTestId("watchlist-poster-card-progress-badge")).toBeNull();
    });

    it("shows the progress badge instead of the date badge when partially rated", async () => {
      const { getByTestId, queryByTestId } = await render(
        <WatchlistPosterCard
          variant="grid"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={1}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card-progress-badge").props.children).toBe("1/3 bewertet");
      expect(queryByTestId("watchlist-poster-card-date-badge-overlay")).toBeNull();
    });

    it("still renders the TMDB badge", async () => {
      const { getByTestId } = await render(
        <WatchlistPosterCard
          variant="grid"
          movie={makeMovie()}
          streamingAvailability={lookup()}
          ratedCount={0}
          totalMembers={3}
          now={NOW}
        />,
      );

      expect(getByTestId("watchlist-poster-card-tmdb-badge")).toBeTruthy();
    });
  });
});

describe("WatchlistPosterCard TMDB badge corner", () => {
  it.each(["card", "grid"] as const)("%s variant: badge flush bottom-right with inner-corner radius", async (variant) => {
    const { getByTestId } = await render(
      <WatchlistPosterCard
        variant={variant}
        movie={makeMovie()}
        streamingAvailability={lookup()}
        ratedCount={0}
        totalMembers={3}
        now={NOW}
      />,
    );
    const cls = getByTestId("watchlist-poster-card-tmdb-badge").props.className as string;
    expect(cls).toContain("bottom-0");
    expect(cls).toContain("right-0");
    expect(cls).toMatch(/rounded-tl-/);
  });
});

describe("WatchlistPosterCard poster URL", () => {
  it("expands a bare stored TMDB poster path into a full image URL", async () => {
    const { getByTestId } = await render(
      <WatchlistPosterCard
        variant="card"
        movie={makeMovie({ poster: "/abc.jpg" })}
        streamingAvailability={new Map()}
        ratedCount={0}
        totalMembers={2}
        now={NOW}
      />,
    );
    expect(getByTestId("watchlist-poster-card-poster").props.source).toEqual([
      { uri: "https://image.tmdb.org/t/p/w342/abc.jpg" },
    ]);
  });
});

describe("WatchlistPosterCard grid edge-to-edge poster", () => {
  it("tile has no padding, clips overflow; poster is full width with no radius of its own", async () => {
    const { getByTestId } = await render(
      <WatchlistPosterCard
        variant="grid"
        movie={makeMovie()}
        streamingAvailability={lookup()}
        ratedCount={0}
        totalMembers={3}
        now={NOW}
      />,
    );
    const tile = getByTestId("watchlist-poster-card").props.className as string;
    expect(tile).toContain("overflow-hidden");
    expect(tile).not.toMatch(/(^|\s)p[xytblr]?-\d/);
    const wrapper = getByTestId("watchlist-poster-card-poster-wrapper").props.className as string;
    expect(wrapper).toContain("w-full");
    expect(wrapper).not.toMatch(/rounded/);
    const poster = getByTestId("watchlist-poster-card-poster").props;
    expect(poster.contentFit).toBe("cover");
    expect(getByTestId("watchlist-poster-card-info").props.className).toContain("px-2");
  });
});
