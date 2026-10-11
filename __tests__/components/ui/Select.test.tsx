import { fireEvent, render } from "@testing-library/react-native";

import { StyleSheet } from "react-native";

import { Select, filterSelectOptions, selectListPlacement } from "@/components/ui/Select";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

async function setup(props: Partial<React.ComponentProps<typeof Select>> = {}) {
  const onChange = jest.fn();
  const utils = await render(
    <Select testID="sel" options={OPTIONS} value={null} onChange={onChange} placeholder="Wählen" {...props} />,
  );
  return { onChange, ...utils };
}

describe("filterSelectOptions", () => {
  it("matches case-insensitive substrings and returns all for empty query", () => {
    expect(filterSelectOptions(OPTIONS, "AMM").map((o) => o.value)).toEqual(["c"]);
    expect(filterSelectOptions(OPTIONS, "  ")).toHaveLength(3);
  });
});

describe("selectListPlacement", () => {
  it("opens down with the full height when there is room", () => {
    expect(selectListPlacement(500, 100)).toEqual({ direction: "down", maxHeight: 240 });
  });
  it("limits the height when space below is tight but still larger than above", () => {
    expect(selectListPlacement(180, 100)).toEqual({ direction: "down", maxHeight: 180 });
  });
  it("opens up when below is tight and above is larger", () => {
    expect(selectListPlacement(90, 400)).toEqual({ direction: "up", maxHeight: 240 });
  });
  it("never goes below the minimum height", () => {
    expect(selectListPlacement(20, 10)).toEqual({ direction: "down", maxHeight: 96 });
  });
});

describe("Select", () => {
  it("renders the list as an absolute overlay above siblings, plus an outside-tap backdrop", async () => {
    const { getByTestId, queryByTestId } = await setup();
    expect(queryByTestId("sel-backdrop")).toBeNull();
    await fireEvent.press(getByTestId("sel"));
    const list = StyleSheet.flatten(getByTestId("sel-list").props.style);
    expect(list.position).toBe("absolute");
    expect(list.top).toBe("100%");
    expect(list.zIndex).toBeGreaterThan(0);
    expect(list.elevation).toBeGreaterThan(0);
    expect(getByTestId("sel-scroll").props.nestedScrollEnabled).toBe(true);
    await fireEvent.press(getByTestId("sel-backdrop"));
    expect(queryByTestId("sel-list")).toBeNull();
    expect(queryByTestId("sel-backdrop")).toBeNull();
  });

  it("shows the placeholder and a closed list initially", async () => {
    const { getByText, queryByTestId } = await setup();
    expect(getByText("Wählen")).toBeTruthy();
    expect(queryByTestId("sel-list")).toBeNull();
  });

  it("shows the selected label in the trigger", async () => {
    const { getByText } = await setup({ value: "b" });
    expect(getByText("Beta")).toBeTruthy();
  });

  it("opens on trigger press, marks selected option, and has a11y role/state", async () => {
    const { getByTestId } = await setup({ value: "b" });
    const trigger = getByTestId("sel");
    expect(trigger.props.accessibilityRole).toBe("combobox");
    expect(trigger.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(trigger);
    expect(getByTestId("sel").props.accessibilityState.expanded).toBe(true);
    expect(getByTestId("sel-list")).toBeTruthy();
    expect(getByTestId("sel-option-b").props.accessibilityState.selected).toBe(true);
    expect(getByTestId("sel-option-a").props.accessibilityState.selected).toBe(false);
    expect(getByTestId("sel-option-a").props.className).toContain("min-h-touch");
  });

  it("selecting calls onChange and closes the list", async () => {
    const { getByTestId, queryByTestId, onChange } = await setup();
    await fireEvent.press(getByTestId("sel"));
    await fireEvent.press(getByTestId("sel-option-c"));
    expect(onChange).toHaveBeenCalledWith("c");
    expect(queryByTestId("sel-list")).toBeNull();
  });

  it("pressing the trigger again closes the list", async () => {
    const { getByTestId, queryByTestId } = await setup();
    await fireEvent.press(getByTestId("sel"));
    await fireEvent.press(getByTestId("sel"));
    expect(queryByTestId("sel-list")).toBeNull();
  });

  it("disabled: does not open", async () => {
    const { getByTestId, queryByTestId } = await setup({ disabled: true });
    expect(getByTestId("sel").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(getByTestId("sel"));
    expect(queryByTestId("sel-list")).toBeNull();
  });

  it("searchable: filters live and shows empty state", async () => {
    const { getByTestId, queryByTestId } = await setup({ searchable: true, emptyText: "Keine Treffer" });
    await fireEvent.press(getByTestId("sel"));
    await fireEvent.changeText(getByTestId("sel-search"), "ALP");
    expect(getByTestId("sel-option-a")).toBeTruthy();
    expect(queryByTestId("sel-option-b")).toBeNull();
    await fireEvent.changeText(getByTestId("sel-search"), "zzz");
    expect(getByTestId("sel-empty")).toHaveTextContent("Keine Treffer");
  });

  it("searchable: query resets after selection", async () => {
    const { getByTestId } = await setup({ searchable: true });
    await fireEvent.press(getByTestId("sel"));
    await fireEvent.changeText(getByTestId("sel-search"), "bet");
    await fireEvent.press(getByTestId("sel-option-b"));
    await fireEvent.press(getByTestId("sel"));
    expect(getByTestId("sel-option-a")).toBeTruthy();
  });

  it("reports open state via onOpenChange (open, select-close, backdrop-close)", async () => {
    const onOpenChange = jest.fn();
    const { getByTestId } = await setup({ onOpenChange });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await fireEvent.press(getByTestId("sel"));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await fireEvent.press(getByTestId("sel-option-a"));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await fireEvent.press(getByTestId("sel"));
    await fireEvent.press(getByTestId("sel-backdrop"));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("searchable + autoFocusSearch=false: field shown unfocused, defaultOptions for empty query, typing filters ALL options", async () => {
    const { getByTestId, queryByTestId } = await setup({
      searchable: true,
      autoFocusSearch: false,
      defaultOptions: [OPTIONS[0]],
    });
    await fireEvent.press(getByTestId("sel"));
    expect(getByTestId("sel-search").props.autoFocus).toBe(false);
    expect(getByTestId("sel-option-a")).toBeTruthy();
    expect(queryByTestId("sel-option-b")).toBeNull();
    await fireEvent.changeText(getByTestId("sel-search"), "gam");
    expect(getByTestId("sel-option-c")).toBeTruthy();
    expect(queryByTestId("sel-option-a")).toBeNull();
    await fireEvent.press(getByTestId("sel-toggle"));
    expect(queryByTestId("sel-list")).toBeNull();
  });

  it("autoFocusSearch defaults to true; options may show a hint line", async () => {
    const { getByTestId } = await setup({
      searchable: true,
      options: [{ value: "a", label: "Alpha", hint: "noch nie" }],
    });
    await fireEvent.press(getByTestId("sel"));
    expect(getByTestId("sel-search").props.autoFocus).toBe(true);
    expect(getByTestId("sel-option-a-hint").props.children).toBe("noch nie");
  });

  it("non-searchable has no search input", async () => {
    const { getByTestId, queryByTestId } = await setup();
    await fireEvent.press(getByTestId("sel"));
    expect(queryByTestId("sel-search")).toBeNull();
  });
});
