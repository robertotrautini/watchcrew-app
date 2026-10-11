import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { EntryList, type EntryListProps } from "@/components/entries/EntryList";
import {
  PANEL_LIST_CONTENT_PT_CLASSNAME,
  PANEL_LIST_GRID_CONTENT_PT_CLASSNAME,
} from "@/components/ui/Surface";
import type { SortState } from "@/lib/entrySorting";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

const mockNumColumns: (number | undefined)[] = [];
const lastNumColumns = () => mockNumColumns[mockNumColumns.length - 1];
jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const mod = jest.requireActual("react-native/Libraries/Lists/FlatList");
  const Actual = mod.default ?? mod;
  const ReactLib = require("react");
  const Wrapped = ReactLib.forwardRef((props: { numColumns?: number }, ref: unknown) => {
    mockNumColumns.push(props.numColumns);
    return ReactLib.createElement(Actual, { ...props, ref });
  });
  return { __esModule: true, default: Wrapped };
});

function entry(id: string) {
  return { id, movie: { name: `Film ${id}` } } as never;
}

const ASC: SortState = { field: "title", direction: "asc" };
const DESC: SortState = { field: "title", direction: "desc" };

const renderPoster = jest.fn();
const renderTableRow = jest.fn();

function ui(overrides: Partial<EntryListProps> = {}) {
  return (
    <EntryList
      entries={[entry("a"), entry("b"), entry("c"), entry("d"), entry("e")]}
      mode="cards"
      sort={ASC}
      listTestID="x-list"
      postersTestID="x-posters"
      tableHeader={<Text testID="x-header">head</Text>}
      renderTableRow={(e, isLast) => {
        renderTableRow(e.id, isLast);
        return <Text key={e.id}>{`row-${e.id}`}</Text>;
      }}
      renderPoster={(e, info) => {
        renderPoster(e.id, info);
        return <Text>{`poster-${e.id}`}</Text>;
      }}
      {...overrides}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  usePreferencesStore.setState({ gridColumnsDiaryWatchlist: 3 });
});

describe("EntryList", () => {
  it("cards mode: single column, gap-3, poster testID", async () => {
    const r = await render(ui());
    const list = r.getByTestId("x-posters");
    expect(lastNumColumns()).toBe(1);
    expect(list.props.contentContainerClassName).toContain(
      PANEL_LIST_CONTENT_PT_CLASSNAME,
    );
    expect(list.props.contentContainerClassName).toContain("gap-3");
    expect(r.queryByTestId("x-list")).toBeNull();
    expect(renderPoster).toHaveBeenCalledWith("a", {
      index: 0,
      isGrid: false,
      skipFade: false,
    });
  });

  it.each([3, 4])("grid mode: %i columns, gap-2, grid padding", async (cols) => {
    usePreferencesStore.setState({ gridColumnsDiaryWatchlist: cols as 3 | 4 });
    const r = await render(ui({ mode: "grid" }));
    const list = r.getByTestId("x-posters");
    expect(lastNumColumns()).toBe(cols);
    expect(list.props.contentContainerClassName).toContain(
      PANEL_LIST_GRID_CONTENT_PT_CLASSNAME,
    );
    expect(list.props.contentContainerClassName).toContain("gap-2");
    // 5 entries padded to a full last row: placeholders are not rendered by the tab.
    expect(renderPoster).toHaveBeenCalledTimes(5);
  });

  it("list mode: table header, last-row flag, pb-3, list testID", async () => {
    const r = await render(ui({ mode: "list" }));
    const list = r.getByTestId("x-list");
    expect(r.getByTestId("x-header")).toBeTruthy();
    expect(list.props.contentContainerClassName).toContain("pb-3");
    expect(list.props.contentContainerClassName).toContain(
      PANEL_LIST_CONTENT_PT_CLASSNAME,
    );
    expect(renderTableRow).toHaveBeenCalledWith("a", false);
    expect(renderTableRow).toHaveBeenCalledWith("e", true);
  });

  it("posters testID defaults to the list testID", async () => {
    const r = await render(ui({ postersTestID: undefined }));
    expect(r.getByTestId("x-list")).toBeTruthy();
  });

  it("a sort change remounts the list (rows render again) and skips the fade", async () => {
    const r = await render(ui());
    renderPoster.mockClear();
    await r.rerender(ui({ sort: DESC }));
    expect(renderPoster).toHaveBeenCalledTimes(5);
    expect(renderPoster.mock.calls[0][1].skipFade).toBe(true);
  });

  it("a mode change resets skipFade", async () => {
    const r = await render(ui());
    await r.rerender(ui({ sort: DESC }));
    await r.rerender(ui({ sort: DESC, mode: "grid" }));
    const last = renderPoster.mock.calls.at(-1);
    expect(last?.[1]).toMatchObject({ isGrid: true, skipFade: false });
  });

  it("a column change remounts the grid", async () => {
    const r = await render(ui({ mode: "grid" }));
    renderPoster.mockClear();
    usePreferencesStore.setState({ gridColumnsDiaryWatchlist: 4 });
    await r.rerender(ui({ mode: "grid" }));
    expect(lastNumColumns()).toBe(4);
    expect(renderPoster).toHaveBeenCalledTimes(5);
  });
});
