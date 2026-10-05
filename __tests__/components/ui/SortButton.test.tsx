import { fireEvent, render } from "@testing-library/react-native";

import { SortButton } from "../../../src/components/ui/SortButton";

describe("SortButton", () => {
  it("shows only the short label (no prefix), single line, with full a11y label", async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <SortButton testID="sb" shortLabel="Streaming-Dienste" fullLabel="Meine Streaming-Dienste" onPress={jest.fn()} />,
    );
    const text = getByText("Streaming-Dienste");
    expect(text.props.numberOfLines).toBe(1);
    expect(queryByText(/Sortieren:/)).toBeNull();
    expect(getByTestId("sb").props.accessibilityLabel).toBe("Sortieren, aktuell: Meine Streaming-Dienste");
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <SortButton testID="sb" shortLabel="A" fullLabel="A" onPress={onPress} />,
    );
    await fireEvent.press(getByTestId("sb"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
