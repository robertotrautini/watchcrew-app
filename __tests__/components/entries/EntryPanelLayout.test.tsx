import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { EntryFilterBar } from "../../../src/components/entries/EntryFilterBar";
import { EntrySortRow } from "../../../src/components/entries/EntrySortRow";
import { DIARY_SORT_FIELDS } from "../../../src/lib/entrySorting";

describe("EntrySortRow (Variante A)", () => {
  it("has no SORTIEREN label, keeps select + direction", async () => {
    const { queryByText, getByTestId } = await render(
      <EntrySortRow
        testIDPrefix="t"
        fields={DIARY_SORT_FIELDS}
        sort={{ field: "title", direction: "asc" }}
        onChange={jest.fn()}
      />,
    );
    expect(queryByText("Sortieren")).toBeNull();
    expect(getByTestId("t-sort-field").props.accessibilityLabel).toBe("Sortieren nach Titel");
    expect(getByTestId("t-sort-direction")).toBeTruthy();
  });
});

describe("EntryFilterBar (Variante A)", () => {
  it("renders '+ Filter', no FILTER label, trailing slot and chips", async () => {
    const onAdd = jest.fn();
    const { getByText, queryByText, getByTestId } = await render(
      <EntryFilterBar
        testIDPrefix="t"
        keys={["liked"]}
        filters={{} as never}
        genreNamesById={new Map()}
        onRemove={jest.fn()}
        onAdd={onAdd}
        trailing={<Text>toggle-slot</Text>}
      />,
    );
    expect(queryByText("Filter")).toBeNull();
    expect(getByText("+ Filter")).toBeTruthy();
    expect(getByText("toggle-slot")).toBeTruthy();
    expect(getByTestId("t-filter-row")).toBeTruthy();
    expect(getByTestId("t-filter-chips")).toBeTruthy();
    expect(getByTestId("t-filter-chip-liked")).toBeTruthy();
    await fireEvent.press(getByTestId("t-filter-add"));
    expect(onAdd).toHaveBeenCalled();
  });
});
