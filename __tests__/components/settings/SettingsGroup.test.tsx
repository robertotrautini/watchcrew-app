import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { SettingsGroup } from "@/components/settings/SettingsGroup";

describe("SettingsGroup", () => {
  it("renders the heading and renders items as a plain stack (rows bring their own border)", async () => {
    const { getByText, getByTestId } = await render(
      <SettingsGroup testID="g" title="App">
        <Text>a</Text>
        <Text>b</Text>
        {null}
        <Text>c</Text>
      </SettingsGroup>,
    );
    expect(getByText("App")).toBeTruthy();
    expect(getByTestId("g-item-0")).toBeTruthy();
    expect(getByTestId("g-item-1")).toBeTruthy();
    expect(getByTestId("g-item-2")).toBeTruthy();
    expect(() => getByTestId("g-item-3")).toThrow();
  });
});
