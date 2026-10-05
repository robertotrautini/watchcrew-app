import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { GroupThemeProvider, useGroupTheme } from "../../src/components/GroupThemeProvider";

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

describe("useGroupTheme", () => {
  function Probe() {
    const theme = useGroupTheme();
    return <Text testID="probe">{`${theme.name}:${theme.colors.accent}`}</Text>;
  }

  it("returns the resolved theme of the nearest provider", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="blue">
        <Probe />
      </GroupThemeProvider>,
    );
    expect(getByTestId("probe").props.children).toBe("blue:#4e8ac8");
  });

  it("falls back to gold without a provider", async () => {
    const { getByTestId } = await render(<Probe />);
    expect(getByTestId("probe").props.children).toBe("gold:#c8a44e");
  });
});
