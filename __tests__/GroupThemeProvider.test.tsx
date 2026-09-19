import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { GroupThemeProvider } from "../src/components/GroupThemeProvider";

describe("GroupThemeProvider", () => {
  it("applies the matching .theme-<name> class for a known theme name", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="blue" testID="theme-root">
        <Text>content</Text>
      </GroupThemeProvider>,
    );

    expect(getByTestId("theme-root").props.className).toContain("theme-blue");
  });

  it("falls back to the theme-gold class for an unknown theme name", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="not-a-real-theme" testID="theme-root">
        <Text>content</Text>
      </GroupThemeProvider>,
    );

    expect(getByTestId("theme-root").props.className).toContain("theme-gold");
  });

  it("merges a caller-provided className alongside the theme class", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="gold" className="flex-1" testID="theme-root">
        <Text>content</Text>
      </GroupThemeProvider>,
    );

    const { className } = getByTestId("theme-root").props;
    expect(className).toContain("theme-gold");
    expect(className).toContain("flex-1");
  });

  it("renders its children", async () => {
    const { getByText } = await render(
      <GroupThemeProvider themeName="gold">
        <Text>hello crew</Text>
      </GroupThemeProvider>,
    );

    expect(getByText("hello crew")).toBeTruthy();
  });
});
