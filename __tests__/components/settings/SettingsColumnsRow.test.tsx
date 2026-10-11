import { fireEvent, render } from "@testing-library/react-native";

import { SettingsColumnsRow } from "@/components/settings/SettingsColumnsRow";

describe("SettingsColumnsRow", () => {
  it("shows the label and a 3 | 4 switch with the current value selected", async () => {
    const r = await render(<SettingsColumnsRow testID="cols" label="Spalten" value={4} onChange={jest.fn()} />);
    expect(r.getByText("Spalten")).toBeTruthy();
    expect(r.getByTestId("cols-3").props.accessibilityState).toMatchObject({ selected: false });
    expect(r.getByTestId("cols-4").props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByLabelText("3 Spalten")).toBeTruthy();
    expect(r.getByLabelText("4 Spalten")).toBeTruthy();
  });

  it("reports the chosen column count as a number", async () => {
    const onChange = jest.fn();
    const r = await render(<SettingsColumnsRow testID="cols" label="Spalten" value={4} onChange={onChange} />);
    await fireEvent.press(r.getByTestId("cols-3"));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
