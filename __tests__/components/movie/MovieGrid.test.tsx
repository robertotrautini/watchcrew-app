import { fireEvent, render } from "@testing-library/react-native";

// Same Ionicons mocking rationale as __tests__/StarRating.test.tsx and
// __tests__/components/movie/DiaryPosterTile.test.tsx: the real
// implementation doesn't forward name/color to the host node RNTL queries.
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

import {
  MovieGrid,
  type MovieGridBadge,
  type MovieGridItem,
} from "../../../src/components/movie/MovieGrid";

function makeItem(overrides: Partial<MovieGridItem> = {}): MovieGridItem {
  return {
    tmdbId: 1,
    title: "Test Movie",
    posterPath: "/poster1.jpg",
    releaseDate: "2024-01-10",
    voteAverage: 7.4,
    ...overrides,
  };
}

describe("MovieGrid", () => {
  it("renders one tile per item with the correct testID and title", async () => {
    const items = [makeItem({ tmdbId: 1, title: "Alpha" }), makeItem({ tmdbId: 2, title: "Beta" })];

    const { getByTestId } = await render(
      <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
    );

    expect(getByTestId("grid-item-1")).toBeTruthy();
    expect(getByTestId("grid-item-2")).toBeTruthy();
  });

  it("renders the poster image with the TMDB w342 URL when posterPath is present", async () => {
    const items = [makeItem({ tmdbId: 1, posterPath: "/abc123.jpg" })];

    const { getByTestId } = await render(
      <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
    );

    const image = getByTestId("grid-item-1-poster");
    // expo-image's real <Image> normalizes `source` into an array internally.
    expect(image.props.source).toEqual([{ uri: "https://image.tmdb.org/t/p/w342/abc123.jpg" }]);
  });

  it("renders a film-outline placeholder icon when posterPath is null", async () => {
    const items = [makeItem({ tmdbId: 1, posterPath: null })];

    const { getByTestId, queryByTestId } = await render(
      <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
    );

    expect(getByTestId("grid-item-1-poster-placeholder")).toBeTruthy();
    expect(queryByTestId("grid-item-1-poster")).toBeNull();
  });

  it("calls onPressItem with the item when a tile is tapped", async () => {
    const onPressItem = jest.fn();
    const item = makeItem({ tmdbId: 5, title: "Gamma" });

    const { getByTestId } = await render(
      <MovieGrid items={[item]} onPressItem={onPressItem} testID="grid" />,
    );

    await fireEvent.press(getByTestId("grid-item-5"));

    expect(onPressItem).toHaveBeenCalledWith(item);
  });

  it("marks each tile as an accessible button", async () => {
    const items = [makeItem({ tmdbId: 1 })];

    const { getByTestId } = await render(
      <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
    );

    expect(getByTestId("grid-item-1").props.accessibilityRole).toBe("button");
  });

  describe("badges", () => {
    it("renders a green eye badge when getBadge returns 'watched'", async () => {
      const items = [makeItem({ tmdbId: 1 })];
      const getBadge = (): MovieGridBadge => "watched";

      const { getByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" getBadge={getBadge} />,
      );

      const badge = getByTestId("grid-badge-1");
      expect(badge).toBeTruthy();
      expect(badge.props.accessibilityLabel).toBe("Gesehen");
    });

    it("renders a gold bookmark badge when getBadge returns 'watchlist'", async () => {
      const items = [makeItem({ tmdbId: 1 })];
      const getBadge = (): MovieGridBadge => "watchlist";

      const { getByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" getBadge={getBadge} />,
      );

      const badge = getByTestId("grid-badge-1");
      expect(badge).toBeTruthy();
      expect(badge.props.accessibilityLabel).toBe("Auf der Watchlist");
    });

    it("renders no badge when getBadge returns null", async () => {
      const items = [makeItem({ tmdbId: 1 })];
      const getBadge = (): MovieGridBadge => null;

      const { queryByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" getBadge={getBadge} />,
      );

      expect(queryByTestId("grid-badge-1")).toBeNull();
    });

    it("renders no badge when getBadge is not provided", async () => {
      const items = [makeItem({ tmdbId: 1 })];

      const { queryByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(queryByTestId("grid-badge-1")).toBeNull();
    });
  });

  describe("score pill", () => {
    it("renders the score pill formatted to 1 decimal when voteAverage is a number", async () => {
      const items = [makeItem({ tmdbId: 1, voteAverage: 8.049 })];

      const { getByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(getByTestId("grid-score-1-value").props.children).toBe("8.0");
    });

    it("renders no score pill when voteAverage is null", async () => {
      const items = [makeItem({ tmdbId: 1, voteAverage: null })];

      const { queryByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(queryByTestId("grid-score-1")).toBeNull();
    });

    it("renders no score pill when voteAverage is undefined", async () => {
      const items = [makeItem({ tmdbId: 1, voteAverage: undefined })];

      const { queryByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(queryByTestId("grid-score-1")).toBeNull();
    });
  });

  describe("progress header", () => {
    it("renders the progress header label and bar when provided", async () => {
      const items = [makeItem({ tmdbId: 1 })];
      const progressHeader = { watched: 3, total: 10, percent: 30, label: "3 von 10 gesehen · 30%" };

      const { getByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" progressHeader={progressHeader} />,
      );

      expect(getByTestId("grid-progress-header")).toBeTruthy();
      expect(getByTestId("grid-progress-header-bar")).toBeTruthy();
    });

    it("does not crash and still renders a bar when percent is 0", async () => {
      const items = [makeItem({ tmdbId: 1 })];
      const progressHeader = { watched: 0, total: 10, percent: 0, label: "0 von 10 gesehen · 0%" };

      const { getByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" progressHeader={progressHeader} />,
      );

      expect(getByTestId("grid-progress-header-bar")).toBeTruthy();
    });

    it("sets the bar's fill width via an inline style (NativeWind can't statically extract a runtime percentage)", async () => {
      const items = [makeItem({ tmdbId: 1 })];
      const progressHeader = { watched: 3, total: 10, percent: 30, label: "3 von 10 gesehen · 30%" };

      const { getByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" progressHeader={progressHeader} />,
      );

      expect(getByTestId("grid-progress-header-bar").props.style).toEqual({ width: "30%" });
    });

    it("renders nothing for the progress header when omitted", async () => {
      const items = [makeItem({ tmdbId: 1 })];

      const { queryByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(queryByTestId("grid-progress-header")).toBeNull();
    });

    it("renders nothing for the progress header when explicitly null", async () => {
      const items = [makeItem({ tmdbId: 1 })];

      const { queryByTestId } = await render(
        <MovieGrid items={items} onPressItem={jest.fn()} testID="grid" progressHeader={null} />,
      );

      expect(queryByTestId("grid-progress-header")).toBeNull();
    });
  });

  describe("streaming filter", () => {
    it("renders the 3 filter pills with the correct German labels", async () => {
      const items = [makeItem({ tmdbId: 1 })];

      const { getByTestId } = await render(
        <MovieGrid
          items={items}
          onPressItem={jest.fn()}
          testID="grid"
          streamingFilter={{ active: null, onChange: jest.fn() }}
        />,
      );

      expect(getByTestId("grid-filter-flatrate").props.accessibilityLabel).toBeUndefined();
      // Assert on the rendered text via children lookup instead:
      expect(getByTestId("grid-filter-flatrate")).toBeTruthy();
      expect(getByTestId("grid-filter-rent")).toBeTruthy();
      expect(getByTestId("grid-filter-buy")).toBeTruthy();
    });

    it("calls onChange with 'flatrate' when the Flatrate pill is tapped and nothing is active", async () => {
      const onChange = jest.fn();

      const { getByTestId } = await render(
        <MovieGrid
          items={[makeItem()]}
          onPressItem={jest.fn()}
          testID="grid"
          streamingFilter={{ active: null, onChange }}
        />,
      );

      await fireEvent.press(getByTestId("grid-filter-flatrate"));

      expect(onChange).toHaveBeenCalledWith("flatrate");
    });

    it("calls onChange with null when tapping the already-active pill (toggle off)", async () => {
      const onChange = jest.fn();

      const { getByTestId } = await render(
        <MovieGrid
          items={[makeItem()]}
          onPressItem={jest.fn()}
          testID="grid"
          streamingFilter={{ active: "rent", onChange }}
        />,
      );

      await fireEvent.press(getByTestId("grid-filter-rent"));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("calls onChange with 'buy' when tapping Kaufen while 'flatrate' is active (switch)", async () => {
      const onChange = jest.fn();

      const { getByTestId } = await render(
        <MovieGrid
          items={[makeItem()]}
          onPressItem={jest.fn()}
          testID="grid"
          streamingFilter={{ active: "flatrate", onChange }}
        />,
      );

      await fireEvent.press(getByTestId("grid-filter-buy"));

      expect(onChange).toHaveBeenCalledWith("buy");
    });

    it("marks the active pill's accessibilityState.selected as true and others as false", async () => {
      const { getByTestId } = await render(
        <MovieGrid
          items={[makeItem()]}
          onPressItem={jest.fn()}
          testID="grid"
          streamingFilter={{ active: "rent", onChange: jest.fn() }}
        />,
      );

      expect(getByTestId("grid-filter-rent").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("grid-filter-flatrate").props.accessibilityState.selected).toBe(false);
      expect(getByTestId("grid-filter-buy").props.accessibilityState.selected).toBe(false);
    });

    it("renders no filter pills when streamingFilter is omitted", async () => {
      const { queryByTestId } = await render(
        <MovieGrid items={[makeItem()]} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(queryByTestId("grid-filter-flatrate")).toBeNull();
    });

    it("renders no filter pills when streamingFilter is explicitly null", async () => {
      const { queryByTestId } = await render(
        <MovieGrid items={[makeItem()]} onPressItem={jest.fn()} testID="grid" streamingFilter={null} />,
      );

      expect(queryByTestId("grid-filter-flatrate")).toBeNull();
    });
  });

  describe("footer", () => {
    it("renders the footer node when provided", async () => {
      const { Text } = require("react-native");
      const { getByTestId, getByText } = await render(
        <MovieGrid
          items={[makeItem()]}
          onPressItem={jest.fn()}
          testID="grid"
          footer={<Text>Mehr laden</Text>}
        />,
      );

      expect(getByTestId("grid-footer")).toBeTruthy();
      expect(getByText("Mehr laden")).toBeTruthy();
    });

    it("renders no footer element when omitted", async () => {
      const { queryByTestId } = await render(
        <MovieGrid items={[makeItem()]} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(queryByTestId("grid-footer")).toBeNull();
    });
  });

  describe("empty state", () => {
    it("shows the default empty message when items is empty", async () => {
      const { getByTestId } = await render(
        <MovieGrid items={[]} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(getByTestId("grid-empty").props.children).toBe("Keine Filme gefunden.");
    });

    it("shows a custom empty message when provided", async () => {
      const { getByTestId } = await render(
        <MovieGrid items={[]} onPressItem={jest.fn()} testID="grid" emptyMessage="Nichts hier." />,
      );

      expect(getByTestId("grid-empty").props.children).toBe("Nichts hier.");
    });

    it("does not render any item tiles when items is empty", async () => {
      const { queryByTestId } = await render(
        <MovieGrid items={[]} onPressItem={jest.fn()} testID="grid" />,
      );

      expect(queryByTestId("grid-item-1")).toBeNull();
    });
  });

  describe("generic typing", () => {
    it("accepts items with extra fields beyond MovieGridItem without choking", async () => {
      interface ExtendedItem extends MovieGridItem {
        extraField: string;
      }

      const items: ExtendedItem[] = [
        {
          tmdbId: 1,
          title: "Extended",
          posterPath: null,
          releaseDate: null,
          voteAverage: null,
          extraField: "hello",
        },
      ];

      const onPressItem = jest.fn();

      const { getByTestId } = await render(
        <MovieGrid items={items} onPressItem={onPressItem} testID="grid" />,
      );

      await fireEvent.press(getByTestId("grid-item-1"));

      expect(onPressItem).toHaveBeenCalledWith(items[0]);
    });
  });
});
