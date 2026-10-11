import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { EntryFilterBar } from "@/components/entries/EntryFilterBar";
import { DEFAULT_ENTRY_FILTERS, type EntryFilters, type FilterKey } from "@/lib/listFilters";

function setup(keys: FilterKey[], filters: Partial<EntryFilters> = {}, trailing?: React.ReactNode) {
  const onRemove = jest.fn();
  const onAdd = jest.fn();
  const ui = (
    <EntryFilterBar
      testIDPrefix="t"
      keys={keys}
      filters={{ ...DEFAULT_ENTRY_FILTERS, ...filters }}
      genreNamesById={new Map([["18", "Drama"]])}
      onRemove={onRemove}
      onAdd={onAdd}
      trailing={trailing}
    />
  );
  return { ui, onRemove, onAdd };
}

describe("EntryFilterBar", () => {
  it("always shows '+ Filter' and calls onAdd", async () => {
    const { ui, onAdd } = setup([]);
    const r = await render(ui);
    expect(r.getByText("+ Filter")).toBeTruthy();
    await fireEvent.press(r.getByTestId("t-filter-add"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("renders no chips without active filters", async () => {
    const { ui } = setup([]);
    const r = await render(ui);
    expect(r.queryByLabelText(/entfernen/)).toBeNull();
  });

  it("renders a labelled chip per key; ':' in testID becomes '-'", async () => {
    const { ui } = setup(["genre:18", "year", "liked"], { year: 2023 });
    const r = await render(ui);
    expect(r.getByTestId("t-filter-chip-genre-18")).toBeTruthy();
    expect(r.getByText("Drama")).toBeTruthy();
    expect(r.getByText("2023")).toBeTruthy();
    expect(r.getByTestId("t-filter-chip-liked")).toBeTruthy();
    expect(r.getByLabelText("Drama entfernen")).toBeTruthy();
  });

  it("streaming chip lists the provider categories", async () => {
    const { ui } = setup(["streaming"], { myStreaming: true, providerCategories: ["flatrate", "rent"] });
    const r = await render(ui);
    expect(r.getByText(/^Streaming: /)).toBeTruthy();
  });

  it("'no_date' year chip reads 'Kein Datum'", async () => {
    const { ui } = setup(["year"], { year: "no_date" });
    const r = await render(ui);
    expect(r.getByText("Kein Datum")).toBeTruthy();
  });

  it("tapping a chip removes exactly that key", async () => {
    const { ui, onRemove } = setup(["genre:18", "liked"]);
    const r = await render(ui);
    await fireEvent.press(r.getByTestId("t-filter-chip-genre-18"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("genre:18");
  });

  it("renders the trailing slot", async () => {
    const { ui } = setup([], {}, <Text testID="trail">toggle</Text>);
    const r = await render(ui);
    expect(r.getByTestId("trail")).toBeTruthy();
  });
});
