import { fireEvent, render } from "@testing-library/react-native";

import {
  GenrePills,
  ProviderCategoryPills,
  YearPills,
} from "@/components/entries/EntryFilterPills";

describe("GenrePills", () => {
  it("renders one pill per genre with names, falls back for unknown ids, marks selection", async () => {
    const r = await render(
      <GenrePills
        testIDPrefix="x"
        genreIds={["18", "999"]}
        selectedGenreIds={["18"]}
        genreNamesById={new Map([["18", "Drama"]])}
        onToggle={jest.fn()}
      />,
    );
    expect(r.getByText("Drama")).toBeTruthy();
    expect(r.getByTestId("x-genre-pill-999")).toBeTruthy();
    expect(r.getByTestId("x-genre-pill-18").props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByTestId("x-genre-pill-999").props.accessibilityState).toMatchObject({ selected: false });
  });

  it("reports the toggled genre id", async () => {
    const onToggle = jest.fn();
    const r = await render(
      <GenrePills
        testIDPrefix="x"
        genreIds={["18", "35"]}
        selectedGenreIds={[]}
        genreNamesById={new Map()}
        onToggle={onToggle}
      />,
    );
    await fireEvent.press(r.getByTestId("x-genre-pill-35"));
    expect(onToggle).toHaveBeenCalledWith("35");
  });

  it("renders an empty container for no genres", async () => {
    const r = await render(
      <GenrePills testIDPrefix="x" genreIds={[]} selectedGenreIds={[]} genreNamesById={new Map()} onToggle={jest.fn()} />,
    );
    expect(r.getByTestId("x-genre-pills").children).toHaveLength(0);
  });
});

describe("YearPills", () => {
  it("renders years, marks the selected one, reports presses", async () => {
    const onSelect = jest.fn();
    const r = await render(
      <YearPills testIDPrefix="x" years={[2024, 2020]} selectedYear={2020} onSelect={onSelect} />,
    );
    expect(r.getByTestId("x-year-pill-2020").props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByTestId("x-year-pill-2024").props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(r.getByTestId("x-year-pill-2024"));
    expect(onSelect).toHaveBeenCalledWith(2024);
  });

  it("'Kein Datum' pill only with showNoDate and reports 'no_date'", async () => {
    const onSelect = jest.fn();
    const hidden = await render(<YearPills testIDPrefix="x" years={[]} selectedYear={undefined} onSelect={onSelect} />);
    expect(hidden.queryByTestId("x-year-pill-no_date")).toBeNull();
    await hidden.unmount();
    const r = await render(
      <YearPills testIDPrefix="x" years={[]} selectedYear="no_date" showNoDate onSelect={onSelect} />,
    );
    expect(r.getByText("Kein Datum")).toBeTruthy();
    expect(r.getByTestId("x-year-pill-no_date").props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(r.getByTestId("x-year-pill-no_date"));
    expect(onSelect).toHaveBeenCalledWith("no_date");
  });
});

describe("ProviderCategoryPills", () => {
  it("renders all categories, marks active ones, reports toggles", async () => {
    const onToggle = jest.fn();
    const r = await render(
      <ProviderCategoryPills testIDPrefix="x" active={["rent"]} onToggle={onToggle} />,
    );
    expect(r.getByTestId("x-provider-category-flatrate")).toBeTruthy();
    expect(r.getByTestId("x-provider-category-rent").props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByTestId("x-provider-category-flatrate").props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(r.getByTestId("x-provider-category-flatrate"));
    expect(onToggle).toHaveBeenCalledWith("flatrate");
  });
});
