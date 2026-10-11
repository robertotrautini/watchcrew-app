import { fireEvent, render } from "@testing-library/react-native";

import { EntrySortRow } from "@/components/entries/EntrySortRow";
import { DIARY_SORT_FIELDS } from "@/lib/entrySorting";

describe("EntrySortRow direction toggle", () => {
  it("flips the arrow immediately from local state and reports the change", async () => {
    const onChange = jest.fn();
    const r = await render(
      <EntrySortRow
        testIDPrefix="t"
        fields={DIARY_SORT_FIELDS}
        sort={{ field: "title", direction: "asc" }}
        onChange={onChange}
      />,
    );
    expect(r.getByTestId("t-sort-direction").props.accessibilityLabel).toMatch(/aufsteigend/);
    // parent does NOT update the prop (list still busy) -> arrow still flips
    await fireEvent.press(r.getByTestId("t-sort-direction"));
    expect(r.getByTestId("t-sort-direction").props.accessibilityLabel).toMatch(/absteigend, tippen/);
    expect(onChange).toHaveBeenCalledWith({ field: "title", direction: "desc" });
  });

  it("follows the prop when the stored direction changes from outside", async () => {
    const ui = (direction: "asc" | "desc") => (
      <EntrySortRow
        testIDPrefix="t"
        fields={DIARY_SORT_FIELDS}
        sort={{ field: "title", direction }}
        onChange={jest.fn()}
      />
    );
    const r = await render(ui("asc"));
    await r.rerender(ui("desc"));
    expect(r.getByTestId("t-sort-direction").props.accessibilityLabel).toMatch(/absteigend, tippen/);
  });
});
