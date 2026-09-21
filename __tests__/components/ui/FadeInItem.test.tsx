import { Animated, Text } from "react-native";
import { render } from "@testing-library/react-native";

import { FadeInItem } from "@/components/ui/FadeInItem";
import { computeStaggerDelayMs } from "@/lib/staggerAnimation";

describe("FadeInItem", () => {
  it("renders its children", async () => {
    const { getByText } = await render(
      <FadeInItem index={0}>
        <Text>tile content</Text>
      </FadeInItem>,
    );

    expect(getByText("tile content")).toBeTruthy();
  });

  it("starts a fade-to-1 animation, delayed per the item's index (M11 animation polish)", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");

    await render(
      <FadeInItem index={3}>
        <Text>tile content</Text>
      </FadeInItem>,
    );

    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1, delay: computeStaggerDelayMs(3) }),
    );

    timingSpy.mockRestore();
  });

  it("forwards testID and className to the animated wrapper", async () => {
    const { getByTestId } = await render(
      <FadeInItem index={0} testID="fade-item" className="flex-1">
        <Text>tile content</Text>
      </FadeInItem>,
    );

    expect(getByTestId("fade-item")).toBeTruthy();
  });
});
