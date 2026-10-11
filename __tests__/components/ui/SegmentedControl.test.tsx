import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { SegmentedControl } from "@/components/ui/SegmentedControl";

const options = [3, 4].map((n) => ({
  key: n,
  testID: `seg-${n}`,
  accessibilityLabel: `${n} Spalten`,
  render: (active: boolean) => <Text>{active ? `[${n}]` : `${n}`}</Text>,
}));

describe("SegmentedControl", () => {
  it("renders every option and marks only the selected one", async () => {
    const r = await render(<SegmentedControl options={options} value={4} onChange={jest.fn()} testID="sc" />);
    expect(r.getByTestId("sc")).toBeTruthy();
    expect(r.getByTestId("seg-3").props.accessibilityState).toMatchObject({ selected: false });
    expect(r.getByTestId("seg-4").props.accessibilityState).toMatchObject({ selected: true });
  });

  it("passes the active flag to option.render", async () => {
    const r = await render(<SegmentedControl options={options} value={3} onChange={jest.fn()} />);
    expect(r.getByText("[3]")).toBeTruthy();
    expect(r.getByText("4")).toBeTruthy();
  });

  it("fills only the selected cell with the accent colour", async () => {
    const r = await render(<SegmentedControl options={options} value={3} onChange={jest.fn()} />);
    const flat = (id: string) => Object.assign({}, ...[r.getByTestId(id).props.style].flat(Infinity));
    expect(flat("seg-3-segment").backgroundColor).not.toBe("transparent");
    expect(flat("seg-4-segment").backgroundColor).toBe("transparent");
  });

  it("calls onChange with the pressed key (also for the already selected one)", async () => {
    const onChange = jest.fn();
    const r = await render(<SegmentedControl options={options} value={3} onChange={onChange} />);
    await fireEvent.press(r.getByTestId("seg-4"));
    expect(onChange).toHaveBeenLastCalledWith(4);
    await fireEvent.press(r.getByTestId("seg-3"));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("exposes the accessibility labels as buttons", async () => {
    const r = await render(<SegmentedControl options={options} value={3} onChange={jest.fn()} />);
    expect(r.getByLabelText("3 Spalten").props.accessibilityRole).toBe("button");
  });

  it("track uses the opaque field fill", async () => {
    const r = await render(<SegmentedControl options={options} value={3} onChange={jest.fn()} testID="sc" />);
    const cls = r.getByTestId("sc").props.className as string;
    expect(cls).toContain("bg-field");
    expect(cls).not.toMatch(/bg-[a-z]+\/\d+/);
  });
});
