import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

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
