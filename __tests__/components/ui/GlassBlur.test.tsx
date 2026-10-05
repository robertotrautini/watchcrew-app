import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

describe("GlassBlur with expo-blur available", () => {
  it("renders a BlurView behind children with the blurred tint fill", async () => {
    const { GlassBlur } = require("@/components/ui/GlassBlur");
    await render(
      <GlassBlur testID="gb" fallbackClassName="bg-bg-sheet" blurClassName="bg-bg-sheet-blur">
        <Text>inhalt</Text>
      </GlassBlur>,
    );
    expect(screen.getByTestId("glass-blur-view")).toBeTruthy();
    expect(screen.getByTestId("glass-blur-tint").props.className).toContain("bg-bg-sheet-blur");
    expect(screen.getByText("inhalt")).toBeTruthy();
    expect(screen.getByTestId("gb").props.className).not.toContain("bg-bg-sheet ");
  });

  it("uses the maximum blur intensity by default", async () => {
    const { GlassBlur, GLASS_BLUR_INTENSITY } = require("@/components/ui/GlassBlur");
    expect(GLASS_BLUR_INTENSITY).toBe(100);
    await render(<GlassBlur testID="gb" blurClassName="bg-bg-card-blur" />);
    expect(screen.getByTestId("glass-blur-view").props.intensity).toBe(100);
  });

  it("can be disabled and then uses the fallback fill", async () => {
    const { GlassBlur } = require("@/components/ui/GlassBlur");
    await render(
      <GlassBlur testID="gb" enabled={false} fallbackClassName="bg-bg-sheet" blurClassName="bg-bg-sheet-blur" />,
    );
    expect(screen.queryByTestId("glass-blur-view")).toBeNull();
    expect(screen.getByTestId("gb").props.className).toContain("bg-bg-sheet");
  });
});

describe("GlassBlur with expo-blur native module missing", () => {
  it("falls back to the tinted translucent fill and keeps children", async () => {
    jest.resetModules();
    jest.doMock("expo-blur", () => {
      throw new Error("Cannot find native module 'ExpoBlur'");
    });
    const { GlassBlur, isBlurAvailable } = require("@/components/ui/GlassBlur");
    expect(isBlurAvailable()).toBe(false);
    await render(
      <GlassBlur testID="gb" fallbackClassName="bg-bg-sheet" blurClassName="bg-bg-sheet-blur">
        <Text>inhalt</Text>
      </GlassBlur>,
    );
    expect(screen.queryByTestId("glass-blur-view")).toBeNull();
    expect(screen.getByTestId("gb").props.className).toContain("bg-bg-sheet");
    expect(screen.getByText("inhalt")).toBeTruthy();
    jest.dontMock("expo-blur");
  });
});
