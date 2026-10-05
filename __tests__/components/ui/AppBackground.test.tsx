import { render } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { BG_IMAGE_ASPECT, BG_IMAGE_OPACITY, backgroundLayout } from "@/lib/parallax";

// Release-build regression: the backdrop must not depend on NativeWind
// className resolution for its geometry (a zero-size image rendered as a flat
// background in the EAS preview build), so both layers carry explicit styles.
describe("AppBackground", () => {
  it("fits the photo to 100% of the screen height, no vertical overscan, left aligned for tab 0", async () => {
    const { getByTestId } = await render(<AppBackground />);
    const root = StyleSheet.flatten(getByTestId("app-background").props.style);
    expect(root).toMatchObject({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 });
    const box = StyleSheet.flatten(getByTestId("app-background-parallax").props.style);
    const { width, height } = Dimensions.get("window");
    const expected = backgroundLayout(width, height);
    expect(box.height).toBeCloseTo(height);
    expect(box.width).toBeCloseTo(expected.boxWidth);
    expect(box.width / box.height).toBeCloseTo(BG_IMAGE_ASPECT);
    expect(box.left).toBe(0);
    expect(box.top).toBe(0);
    // No vertical parallax: only a horizontal translate.
    const transforms = (box.transform ?? []) as Record<string, number>[];
    expect(transforms.some((t) => "translateY" in t)).toBe(false);
  });

  it("renders the full-resolution image sharp (no blur), luminosity-dimmed", async () => {
    const { getByTestId } = await render(<AppBackground />);
    const img = getByTestId("app-background-image");
    expect(img.props.contentFit ?? "cover").toBe("cover");
    expect(img.props.blurRadius).toBeUndefined();
    const style = StyleSheet.flatten(img.props.style);
    expect(style).toMatchObject({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 });
    const box = StyleSheet.flatten(getByTestId("app-background-parallax").props.style);
    expect(box.opacity).toBeCloseTo(BG_IMAGE_OPACITY);
    expect(box.mixBlendMode).toBe("luminosity");
  });
});
