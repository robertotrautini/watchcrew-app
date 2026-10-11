import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { EntryFilterPanel } from "@/components/entries/EntryFilterPanel";
import { DIARY_SORT_FIELDS, WATCHLIST_SORT_FIELDS } from "@/lib/entrySorting";
import { DEFAULT_ENTRY_FILTERS } from "@/lib/listFilters";

function makeFilters(open: boolean) {
  return {
    filterPanelOpen: open,
    toggleFilterPanel: jest.fn(),
    searchQuery: "abc",
    setSearchQuery: jest.fn(),
    sort: { field: "title", direction: "asc" } as const,
    setSort: jest.fn(),
    removeFilter: jest.fn(),
    setFlyoutVisible: jest.fn(),
  };
}

function renderPanel(
  prefix: "tagebuch" | "watchlist",
  opts: { open?: boolean; filters?: typeof DEFAULT_ENTRY_FILTERS; actions?: boolean } = {},
) {
  const f = makeFilters(opts.open ?? true);
  const onViewModeChange = jest.fn();
  const ui = render(
    <EntryFilterPanel
      tab={prefix === "tagebuch" ? "diary" : "watchlist"}
      testIDPrefix={prefix}
      sortFields={prefix === "tagebuch" ? DIARY_SORT_FIELDS : WATCHLIST_SORT_FIELDS}
      filters={f}
      activeFilters={opts.filters ?? DEFAULT_ENTRY_FILTERS}
      genreNamesById={new Map()}
      viewMode="grid"
      onViewModeChange={onViewModeChange}
      viewModeButtonTestID={(m) => `${prefix}-view-mode-${m}`}
      actions={opts.actions ? <Text testID="extra-action">+</Text> : undefined}
    />,
  );
  return { ui, f, onViewModeChange };
}

describe.each(["tagebuch", "watchlist"] as const)("EntryFilterPanel (%s)", (prefix) => {
  it("derives the testIDs from the prefix and wires the search field", async () => {
    const { ui, f } = renderPanel(prefix);
    const r = await ui;
    expect(r.getByTestId(`${prefix}-filter-panel`)).toBeTruthy();
    expect(r.getByTestId(`${prefix}-sort-direction`)).toBeTruthy();
    expect(r.getByTestId(`${prefix}-view-mode-toggle`)).toBeTruthy();
    expect(r.getByTestId(`${prefix}-filter-add`)).toBeTruthy();
    const input = r.getByTestId(`${prefix}-search-input`);
    expect(input.props.value).toBe("abc");
    await fireEvent.changeText(input, "x");
    expect(f.setSearchQuery).toHaveBeenCalledWith("x");
  });

  it("opens the flyout via + Filter and toggles the panel", async () => {
    const { ui, f } = renderPanel(prefix);
    const r = await ui;
    await fireEvent.press(r.getByTestId(`${prefix}-filter-add`));
    expect(f.setFlyoutVisible).toHaveBeenCalledWith(true);
    await fireEvent.press(r.getByTestId(`${prefix}-filter-toggle`));
    expect(f.toggleFilterPanel).toHaveBeenCalled();
  });

  it("changes the view mode through the given button testIDs", async () => {
    const { ui, onViewModeChange } = renderPanel(prefix);
    const r = await ui;
    await fireEvent.press(r.getByTestId(`${prefix}-view-mode-list`));
    expect(onViewModeChange).toHaveBeenCalledWith("list");
  });

  it("shows the active dot only when a filter is active", async () => {
    const none = await renderPanel(prefix).ui;
    expect(none.queryByTestId(`${prefix}-filter-active-dot`)).toBeNull();
    const some = await renderPanel(prefix, {
      filters: { ...DEFAULT_ENTRY_FILTERS, liked: true },
    }).ui;
    expect(some.getByTestId(`${prefix}-filter-active-dot`)).toBeTruthy();
  });

  it("renders the optional actions slot only when given", async () => {
    expect((await renderPanel(prefix).ui).queryByTestId("extra-action")).toBeNull();
    expect((await renderPanel(prefix, { actions: true }).ui).getByTestId("extra-action")).toBeTruthy();
  });
});
