import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { Button } from "../src/components/ui/Button";

describe("Button", () => {
  it("renders a label prop as text", async () => {
    const { getByText } = await render(<Button label="Save" onPress={() => {}} />);

    expect(getByText("Save")).toBeTruthy();
  });

  it("renders children instead of label when both would apply", async () => {
    const { getByText, queryByText } = await render(
      <Button label="Save" onPress={() => {}}>
        <Text>Custom content</Text>
      </Button>,
    );

    expect(getByText("Custom content")).toBeTruthy();
    expect(queryByText("Save")).toBeNull();
  });

  it("calls onPress when pressed", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <Button label="Save" onPress={onPress} testID="save-button" />,
    );

    fireEvent.press(getByTestId("save-button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <Button label="Save" onPress={onPress} disabled testID="save-button" />,
    );

    fireEvent.press(getByTestId("save-button"));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not call onPress when loading, and shows an ActivityIndicator", async () => {
    const onPress = jest.fn();
    const { getByTestId, queryByText } = await render(
      <Button label="Save" onPress={onPress} loading testID="save-button" />,
    );

    fireEvent.press(getByTestId("save-button"));

    expect(onPress).not.toHaveBeenCalled();
    expect(getByTestId("save-button-loading-indicator")).toBeTruthy();
    expect(queryByText("Save")).toBeNull();
  });

  it("applies the primary variant's accent background className by default", async () => {
    const { getByTestId } = await render(
      <Button label="Save" onPress={() => {}} testID="save-button" />,
    );

    expect(getByTestId("save-button").props.className).toContain("bg-accent");
  });

  it("applies the secondary variant's card/glass background and subtle border className", async () => {
    const { getByTestId } = await render(
      <Button label="Save" onPress={() => {}} variant="secondary" testID="save-button" />,
    );

    const { className } = getByTestId("save-button").props;
    expect(className).toContain("bg-card");
    expect(className).toContain("border-subtle");
  });

  it("applies the danger variant's danger background className", async () => {
    const { getByTestId } = await render(
      <Button label="Delete" onPress={() => {}} variant="danger" testID="save-button" />,
    );

    expect(getByTestId("save-button").props.className).toContain("bg-danger");
  });

  it("applies reduced opacity className when disabled", async () => {
    const { getByTestId } = await render(
      <Button label="Save" onPress={() => {}} disabled testID="save-button" />,
    );

    expect(getByTestId("save-button").props.className).toContain("opacity-50");
  });

  it("applies the default size's comfortable min-height className", async () => {
    const { getByTestId } = await render(
      <Button label="Save" onPress={() => {}} testID="save-button" />,
    );

    expect(getByTestId("save-button").props.className).toContain("min-h-touch-comfortable");
  });

  it("applies the sm size's min touch-target-height className", async () => {
    const { getByTestId } = await render(
      <Button label="Save" onPress={() => {}} size="sm" testID="save-button" />,
    );

    expect(getByTestId("save-button").props.className).toContain("min-h-touch-min");
  });

  it("sets accessibilityRole to button", async () => {
    const { getByTestId } = await render(
      <Button label="Save" onPress={() => {}} testID="save-button" />,
    );

    expect(getByTestId("save-button").props.accessibilityRole).toBe("button");
  });
});
