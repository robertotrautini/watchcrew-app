import * as SplashScreen from "expo-splash-screen";
import { fireEvent, render } from "@testing-library/react-native";

import { AnimatedSplashOverlay, SPLASH_GLYPH_SIZE } from "../../../src/components/animated-icon";

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(),
}));

jest.mock("react-native-worklets", () => ({ scheduleOnRN: jest.fn() }));

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  class Keyframe {
    duration() {
      return this;
    }
    withCallback() {
      return this;
    }
  }
  return { __esModule: true, default: { View }, Keyframe };
});

describe("AnimatedSplashOverlay", () => {
  it("shows the gradient background and the centered brand glyph on black", async () => {
    const { getByTestId } = await render(<AnimatedSplashOverlay />);

    const overlay = getByTestId("splash-overlay");
    expect(JSON.stringify(overlay.props.style)).toContain("#000000");
    expect(getByTestId("splash-gradient")).toBeTruthy();
    const glyph = getByTestId("splash-icon");
    expect(JSON.stringify(glyph.props.style)).toContain(String(SPLASH_GLYPH_SIZE));
  });

  it("hides the native splash once laid out", async () => {
    const { getByTestId } = await render(<AnimatedSplashOverlay />);

    await fireEvent(getByTestId("splash-overlay"), "layout");

    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});
