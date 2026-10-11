import { render } from "@testing-library/react-native";

import { WatchlistEntryList } from "@/components/watchlist/WatchlistEntryList";

const mockCardRender = jest.fn();
jest.mock("@/components/movie/WatchlistPosterCard", () => {
  const { Text } = require("react-native");
  return {
    WatchlistPosterCard: (props: { movie: { name: string } }) => {
      mockCardRender(props.movie.name);
      return <Text>{props.movie.name}</Text>;
    },
  };
});

function entry(id: string) {
  return {
    id,
    movie: { id, tmdb_id: 1, name: `Film ${id}`, poster: null, release_date: null },
    ratings: [],
  } as never;
}

describe("WatchlistEntryList sort remount", () => {
  it("a sort change remounts the list and renders the rows in the new order", async () => {
    const [a, b, c] = [entry("a"), entry("b"), entry("c")];
    const lookup = new Map<number, boolean>();
    const onOpen = jest.fn();
    const ui = (entries: never[], dir: "asc" | "desc") => (
      <WatchlistEntryList
        entries={entries}
        viewMode="cards"
        streamingAvailability={lookup}
        totalMembers={2}
        showTitlesInGrid
        onOpenEntry={onOpen}
        sort={{ field: "title", direction: dir }}
        onSortField={jest.fn()}
      />
    );
    const r = await render(ui([a, b, c] as never[], "asc"));
    expect(mockCardRender).toHaveBeenCalledTimes(3);
    mockCardRender.mockClear();
    await r.rerender(ui([c, b, a] as never[], "desc"));
    // Fresh mount (key changed): all rows render once, first row is the new first.
    expect(mockCardRender).toHaveBeenCalledTimes(3);
    expect(mockCardRender.mock.calls.map((c) => c[0])).toEqual([
      "Film c",
      "Film b",
      "Film a",
    ]);
  });
});
