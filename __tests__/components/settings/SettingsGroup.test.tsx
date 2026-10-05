import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { SettingsGroup } from "@/components/settings/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";

describe("SettingsGroup", () => {
  it("renders the heading and puts a hairline only BETWEEN items", async () => {
    const { getByText, getByTestId } = await render(
      <SettingsGroup testID="g" title="App">
        <Text>a</Text>
        <Text>b</Text>
        {null}
        <Text>c</Text>
      </SettingsGroup>,
    );
    expect(getByText("App")).toBeTruthy();
    expect(getByTestId("g-item-0").props.className ?? "").not.toContain("border-t");
    expect(getByTestId("g-item-1").props.className).toContain("border-t");
    expect(getByTestId("g-item-2").props.className).toContain("border-t");
    expect(() => getByTestId("g-item-3")).toThrow();
  });
});

describe("SettingsRow", () => {
  it("shows the value text, presses, and has no own bordered box", async () => {
    const onPress = jest.fn();
    const { getByTestId, getByText } = await render(
      <SettingsRow testID="r" icon="streaming" label="Dienste" value="7 ausgewählt" onPress={onPress} />,
    );
    expect(getByText("7 ausgewählt")).toBeTruthy();
    expect(getByTestId("r").props.className ?? "").not.toContain("border");
    await fireEvent.press(getByTestId("r"));
    expect(onPress).toHaveBeenCalled();
  });

  it("renders the danger variant with danger label colour", async () => {
    const { getByText } = await render(
      <SettingsRow icon="delete" label="Konto löschen" danger onPress={() => {}} />,
    );
    expect(getByText("Konto löschen").props.className).toContain("text-danger");
  });
});
