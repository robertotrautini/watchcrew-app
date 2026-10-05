// Asserts the real icon glyph colour (style), so it opts out of the global @expo/vector-icons mock.
jest.unmock("@expo/vector-icons");

import { fireEvent, render } from "@testing-library/react-native";

import { GroupThemeProvider } from "../../../src/components/GroupThemeProvider";
import { resolveGroupTheme } from "../../../src/lib/groupTheme";
import { SwitchIndicator } from "../../../src/components/ui/Switch";
import { SettingsToggleRow } from "../../../src/components/settings/SettingsToggleRow";

describe("SwitchIndicator (Material 3)", () => {
  it("on: accent track 52x32, light 24dp thumb (never the dark bg colour)", async () => {
    const { getByTestId } = await render(<SwitchIndicator checked testID="sw" />);
    const track = getByTestId("sw").props.className;
    expect(track).toContain("w-[52px]");
    expect(track).toContain("h-8");
    expect(track).toContain("bg-accent");
    const thumb = getByTestId("sw-thumb").props.className;
    expect(thumb).toContain("h-6 w-6");
    expect(thumb).toContain("bg-text-primary");
    expect(thumb).not.toContain("bg-bg-primary");
  });

  it("on: check icon in the handle; pressed grows handle to 28dp with a state layer", async () => {
    const { getByTestId } = await render(<SwitchIndicator checked pressed testID="sw" />);
    expect(getByTestId("sw-check")).toBeTruthy();
    expect(getByTestId("sw-thumb").props.className).toContain("h-7 w-7");
    expect(getByTestId("sw-state-layer").props.className).toContain("bg-white/10");
  });

  it("disabled: 40% opacity", async () => {
    const { getByTestId } = await render(<SwitchIndicator checked disabled testID="sw" />);
    expect(getByTestId("sw").props.className).toContain("opacity-40");
  });

  it("check icon uses the group accent colour", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="blue">
        <SwitchIndicator checked testID="sw" />
      </GroupThemeProvider>,
    );
    expect(JSON.stringify(getByTestId("sw-check").props.style)).toContain(resolveGroupTheme("blue").colors.accent);
  });

  it("off: outlined grey track, small 16dp grey thumb", async () => {
    const { getByTestId } = await render(<SwitchIndicator checked={false} testID="sw" />);
    const track = getByTestId("sw").props.className;
    expect(track).toContain("border-text-secondary");
    expect(track).not.toContain("bg-accent");
    const thumb = getByTestId("sw-thumb").props.className;
    expect(thumb).toContain("h-4 w-4");
    expect(thumb).toContain("bg-text-secondary");
  });
});

describe("SettingsToggleRow", () => {
  it("is a 48dp switch with checked state and calls onPress", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <SettingsToggleRow testID="row" label="Tracker aktiv" checked onPress={onPress} />,
    );
    const row = getByTestId("row");
    expect(row.props.accessibilityRole).toBe("switch");
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    expect(row.props.className).toContain("min-h-touch-comfortable");
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });
});
