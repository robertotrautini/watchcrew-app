import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

// Host View passthrough so the `edges` prop is observable on the rendered tree.
jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: (props: Record<string, unknown>) => <View {...props} /> };
});

import { Sheet } from "../src/components/ui/Sheet";

describe("Sheet", () => {
  it("renders children when visible", async () => {
    const { getByText } = await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    expect(getByText("sheet content")).toBeTruthy();
  });

  it("does not render children when not visible", async () => {
    const { queryByText } = await render(
      <Sheet visible={false} onClose={jest.fn()}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    expect(queryByText("sheet content")).toBeNull();
  });

  it("uses a near-opaque dark surface (not the translucent bg-glass) so content behind the sheet cannot bleed through", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    const className = getByTestId("sheet-surface").props.className as string;
    expect(className).toContain("bg-sheet");
    expect(className).not.toContain("bg-glass");
  });

  it("pads the sheet content by the bottom safe-area inset", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    expect(getByTestId("sheet-safe-area").props.edges).toEqual(["bottom"]);
  });

  it("calls onClose when the backdrop is tapped", async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <Sheet visible onClose={onClose}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    fireEvent.press(getByTestId("sheet-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when tapping inside the sheet content", async () => {
    const onClose = jest.fn();
    const { getByText } = await render(
      <Sheet visible onClose={onClose}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    fireEvent.press(getByText("sheet content"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the title when provided", async () => {
    const { getByText } = await render(
      <Sheet visible onClose={jest.fn()} title="Rate this movie">
        <Text>sheet content</Text>
      </Sheet>,
    );

    expect(getByText("Rate this movie")).toBeTruthy();
  });

  it("does not render a title when none is provided", async () => {
    const { queryByTestId } = await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    expect(queryByTestId("sheet-close-button")).toBeNull();
  });

  // M11 keyboard-avoiding review: Sheet now wraps its content in a
  // `KeyboardAvoidingView` (testID "sheet-keyboard-avoiding-view"), whose
  // `behavior` is computed by `modalKeyboardAvoidingBehavior` -- see the
  // identical note in __tests__/screens/Login.test.tsx for why that's
  // unit-tested directly (__tests__/lib/platformKeyboardAvoiding.test.ts)
  // rather than via a rendered-tree prop assertion here.

  it("calls onClose when the close button is tapped", async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <Sheet visible onClose={onClose} title="Rate this movie">
        <Text>sheet content</Text>
      </Sheet>,
    );

    fireEvent.press(getByTestId("sheet-close-button"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
