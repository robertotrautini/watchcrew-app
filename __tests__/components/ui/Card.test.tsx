import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { Card } from "../../../src/components/ui/Card";

describe("Card", () => {
  it("renders its children", async () => {
    const { getByText } = await render(
      <Card>
        <Text>movie night</Text>
      </Card>,
    );

    expect(getByText("movie night")).toBeTruthy();
  });

  it("applies the flat themed background, radius and border tokens (no shadow/bevel)", async () => {
    const { getByTestId } = await render(
      <Card testID="card-root">
        <Text>content</Text>
      </Card>,
    );

    const { className } = getByTestId("card-root").props;
    expect(getByTestId("glass-blur-tint").props.className).toContain("bg-bg-card-blur");
    expect(className).toContain("rounded-xl");
    expect(className).toContain("border-glass-border");
    expect(className).not.toContain("shadow-card");
    expect(className).not.toMatch(/border-[tb]-/);
  });

  it("merges a caller-provided className alongside the base tokens", async () => {
    const { getByTestId } = await render(
      <Card testID="card-root" className="mt-4">
        <Text>content</Text>
      </Card>,
    );

    const { className } = getByTestId("card-root").props;
    expect(getByTestId("glass-blur-tint").props.className).toContain("bg-bg-card-blur");
    expect(className).toContain("mt-4");
  });

  it("forwards testID to the rendered root", async () => {
    const { getByTestId } = await render(
      <Card testID="card-root">
        <Text>content</Text>
      </Card>,
    );

    expect(getByTestId("card-root")).toBeTruthy();
  });

  it("renders as a Pressable and calls onPress when tapped", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <Card testID="card-root" onPress={onPress}>
        <Text>content</Text>
      </Card>,
    );

    fireEvent.press(getByTestId("card-root"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders as a plain, non-interactive container when onPress is omitted", async () => {
    const { getByTestId } = await render(
      <Card testID="card-root">
        <Text>content</Text>
      </Card>,
    );

    // Pressing a non-pressable View is a no-op and must not throw.
    expect(() => fireEvent.press(getByTestId("card-root"))).not.toThrow();
  });
});
