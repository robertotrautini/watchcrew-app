import { act, render } from "@testing-library/react-native";
import { Keyboard, Platform, StyleSheet, Text } from "react-native";

import { KeyboardInsetView } from "@/components/ui/KeyboardInsetView";

describe("KeyboardInsetView", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it("pads the bottom by the keyboard height on Android", async () => {
    Platform.OS = "android";
    const handlers: Record<string, (e?: unknown) => void> = {};
    jest.spyOn(Keyboard, "addListener").mockImplementation(((name: string, cb: (e?: unknown) => void) => {
      handlers[name] = cb;
      return { remove: jest.fn() };
    }) as never);
    const { getByTestId } = await render(
      <KeyboardInsetView testID="kiv">
        <Text>x</Text>
      </KeyboardInsetView>,
    );
    expect(StyleSheet.flatten(getByTestId("kiv").props.style).paddingBottom).toBe(0);
    await act(async () => {
      handlers.keyboardDidShow({ endCoordinates: { height: 280 } });
    });
    expect(StyleSheet.flatten(getByTestId("kiv").props.style).paddingBottom).toBe(280);
  });
});
