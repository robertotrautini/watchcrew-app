import { render } from "@testing-library/react-native";

import { GRID_COLUMN_GAP } from "@/lib/gridPadding";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { TagebuchEntryList } from "@/components/tagebuch/TagebuchEntryList";
import { WatchlistEntryList } from "@/components/watchlist/WatchlistEntryList";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

const mockNumColumns: (number | undefined)[] = [];
const mockWrapperStyles: unknown[] = [];
const lastNumColumns = () => mockNumColumns[mockNumColumns.length - 1];
jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const mod = jest.requireActual("react-native/Libraries/Lists/FlatList");
  const Actual = mod.default ?? mod;
  const ReactLib = require("react");
  const Wrapped = ReactLib.forwardRef((props: { numColumns?: number; columnWrapperStyle?: unknown }, ref: unknown) => {
    mockNumColumns.push(props.numColumns);
    mockWrapperStyles.push(props.columnWrapperStyle);
    return ReactLib.createElement(Actual, { ...props, ref });
  });
  return { __esModule: true, default: Wrapped };
});
jest.mock("@/components/movie/WatchlistPosterCard", () => {
  const { Text } = require("react-native");
  return { WatchlistPosterCard: () => <Text>card</Text> };
});
jest.mock("@/components/movie/DiaryPosterTile", () => {
  const { Text } = require("react-native");
  return { DiaryPosterTile: () => <Text>tile</Text> };
});

function entry(id: string) {
  return {
    id,
    movie: { id, tmdb_id: 1, name: `Film ${id}`, poster: null, release_date: null },
    ratings: [],
  } as never;
}
const entries = ["a", "b", "c", "d", "e"].map(entry);
const sort = { field: "title", direction: "asc" } as const;

function watchlist() {
  return (
    <WatchlistEntryList
      entries={entries}
      viewMode="grid"
      streamingAvailability={new Map()}
      totalMembers={2}
      showTitlesInGrid
      onOpenEntry={jest.fn()}
      sort={sort}
    />
  );
}
function tagebuch() {
  return (
    <TagebuchEntryList
      entries={entries}
      mode="grid"
      userId="u"
      starColor="#fff"
      showTitlesInGrid
      groupMemberIds={[]}
      displayNameById={new Map()}
      onOpenEntry={jest.fn()}
      sort={sort}
    />
  );
}
const movies = [1, 2, 3, 4, 5].map((tmdbId) => ({ tmdbId, title: `M${tmdbId}` }));

describe("configurable grid columns", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ gridColumnsDiaryWatchlist: 4, gridColumnsMovies: 3 });
  });

  it.each([3, 4] as const)("Watchlist grid uses %i columns and remounts on change", async (cols) => {
    const r = await render(watchlist());
    expect(lastNumColumns()).toBe(4);
    usePreferencesStore.setState({ gridColumnsDiaryWatchlist: cols });
    await r.rerender(watchlist());
    expect(lastNumColumns()).toBe(cols);
  });

  it.each([3, 4] as const)("Tagebuch grid uses %i columns", async (cols) => {
    usePreferencesStore.setState({ gridColumnsDiaryWatchlist: cols });
    await render(tagebuch());
    expect(lastNumColumns()).toBe(cols);
  });

  it.each([3, 4] as const)("MovieGrid uses %i columns from the store (placeholders pad the row)", async (cols) => {
    usePreferencesStore.setState({ gridColumnsMovies: cols });
    const r = await render(<MovieGrid items={movies} onPressItem={jest.fn()} testID="grid" />);
    expect(r.queryAllByTestId(/^grid-placeholder-/)).toHaveLength(cols === 3 ? 1 : 3);
  });

  it("MovieGrid columns prop overrides the store", async () => {
    const r = await render(<MovieGrid items={movies} onPressItem={jest.fn()} testID="grid" columns={4} />);
    expect(r.queryAllByTestId(/^grid-placeholder-/)).toHaveLength(3);
  });

  it("all grids use the shared 4dp column gap as explicit columnWrapperStyle", async () => {
    mockWrapperStyles.length = 0;
    await render(watchlist());
    await render(tagebuch());
    await render(<MovieGrid items={movies} onPressItem={jest.fn()} testID="grid" />);
    expect(GRID_COLUMN_GAP).toBe(4);
    expect(mockWrapperStyles.length).toBeGreaterThanOrEqual(3);
    for (const style of mockWrapperStyles) {
      expect(style).toEqual({ columnGap: 4 });
    }
  });
});
