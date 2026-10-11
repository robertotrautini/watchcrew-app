import { BackHandler, Text, View } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

// Host View passthrough so the `edges` prop is observable on the rendered tree.
jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: (props: Record<string, unknown>) => <View {...props} /> };
});

import { SHEET_BACKDROP_OPACITY, Sheet, SheetHost } from "../../../src/components/ui/Sheet";

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

  it("uses a near-opaque dark surface (not the translucent bg-surface) so content behind the sheet cannot bleed through", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    expect(getByTestId("sheet-surface").props.className).toContain("bg-black");
    expect(getByTestId("sheet-surface").props.className).not.toContain("bg-bg-card-flat");
    expect(getByTestId("sheet-surface").props.className).not.toContain("bg-surface");
  });

  it("has a straight top edge (no corner radius) with a full-width top border", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>c</Text>
      </Sheet>,
    );
    const cls = getByTestId("sheet-surface").props.className as string;
    expect(cls).not.toMatch(/rounded/);
    expect(cls).toContain("border-t");
    expect(cls).toContain("border-surface-border");
  });

  it("renders the close button as a ghost IconButton", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={jest.fn()} title="T">
        <Text>c</Text>
      </Sheet>,
    );
    expect(getByTestId("sheet-close-button-icon")).toBeTruthy();
  });

  it("closes on the Android hardware back button while visible", async () => {
    const { BackHandler } = require("react-native");
    const handlers: (() => boolean)[] = [];
    const spy = jest.spyOn(BackHandler, "addEventListener").mockImplementation(((_e: string, h: () => boolean) => {
      handlers.push(h);
      return { remove: jest.fn() };
    }) as never);
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose}>
        <Text>sheet content</Text>
      </Sheet>,
    );
    expect(handlers).toHaveLength(1);
    expect(handlers[0]()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("registers no back handler while hidden", async () => {
    const { BackHandler } = require("react-native");
    const spy = jest.spyOn(BackHandler, "addEventListener");
    await render(
      <Sheet visible={false} onClose={jest.fn()}>
        <Text>x</Text>
      </Sheet>,
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("pads the sheet content by the bottom safe-area inset", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>sheet content</Text>
      </Sheet>,
    );

    expect(getByTestId("sheet-safe-area").props.edges).toEqual(["bottom"]);
  });

  it("dims the backdrop with SHEET_BACKDROP_OPACITY", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={() => {}}>
        <Text>x</Text>
      </Sheet>,
    );
    expect(SHEET_BACKDROP_OPACITY).toBe(0.75);
    expect(getByTestId("sheet-backdrop")).toHaveStyle({
      backgroundColor: `rgba(0,0,0,${SHEET_BACKDROP_OPACITY})`,
    });
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

  it("draws its overlay in the SheetHost instead of the nested parent view", async () => {
    const { getByTestId, getByText } = await render(
      <SheetHost>
        <View testID="nested-parent">
          <Sheet visible onClose={jest.fn()}>
            <Text>hosted content</Text>
          </Sheet>
        </View>
      </SheetHost>,
    );

    expect(getByText("hosted content")).toBeTruthy();
    expect(getByTestId("sheet-overlay")).toBeTruthy();
    expect(within(getByTestId("nested-parent")).queryByTestId("sheet-overlay")).toBeNull();
  });
});

describe("Sheet onClose identity", () => {
  it("does not restart the open animation / re-subscribe back handler when onClose changes identity", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    spy.mockClear();
    const { rerender } = await render(<Sheet visible onClose={() => {}} />);
    const calls = spy.mock.calls.length;
    await rerender(<Sheet visible onClose={() => {}} />);
    expect(spy.mock.calls.length).toBe(calls);
    spy.mockRestore();
  });
});
