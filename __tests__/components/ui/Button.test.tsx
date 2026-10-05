import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { Button } from "../../../src/components/ui/Button";

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
    expect(className).toContain("bg-white/10");
    expect(className).toContain("border-glass-border");
    expect(className).not.toMatch(/border-[tb]-/);
    expect(className).toContain("active:bg-white/20");
  });

  it("ghost variant has no fill and transparent border", async () => {
    const { getByTestId } = await render(
      <Button label="Go" onPress={() => {}} variant="ghost" testID="b" />,
    );
    const { className } = getByTestId("b").props;
    expect(className).toContain("bg-transparent");
    expect(className).toContain("border-transparent");
  });

  it("iconOnly renders an exact circular square without min-h", async () => {
    const { getByTestId } = await render(
      <Button iconOnly size="sm" onPress={() => {}} testID="b" accessibilityLabel="x" />,
    );
    const { className } = getByTestId("b").props;
    expect(className).toContain("h-11");
    expect(className).toContain("w-11");
    expect(className).toContain("rounded-full");
    expect(className).not.toContain("min-h");
  });

  it("applies the danger variant's danger background className", async () => {
    const { getByTestId } = await render(
      <Button label="Delete" onPress={() => {}} variant="danger" testID="save-button" />,
    );

    const { className } = getByTestId("save-button").props;
    expect(className).toContain("bg-danger/15");
    expect(className).toContain("border-danger/30");
    expect(className).not.toMatch(/border-[tb]-/);
  });

  it("primary has a transparent flat border (no 3D bevel)", async () => {
    const { getByTestId } = await render(<Button label="Go" onPress={() => {}} testID="b" />);
    const { className } = getByTestId("b").props;
    expect(className).toContain("border-transparent");
    expect(className).not.toMatch(/border-[tb]-/);
  });

  it("danger label uses the readable red text token", async () => {
    const { getByText } = await render(
      <Button label="Delete" onPress={() => {}} variant="danger" testID="save-button" />,
    );
    expect(getByText("Delete").props.className).toContain("text-danger-text");
  });

  it("uses a muted fill (no opacity on the gold) when disabled", async () => {
    const { getByTestId, getByText } = await render(
      <Button label="Save" onPress={() => {}} disabled testID="save-button" />,
    );

    const { className } = getByTestId("save-button").props;
    expect(className).not.toContain("opacity-50");
    expect(className).not.toContain("bg-accent");
    expect(className).toContain("bg-white/10");
    expect(getByText("Save").props.className).toContain("text-white/35");
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

  it("renders a leading icon before the label, coloured by variant", async () => {
    const { getByTestId, getByText } = await render(
      <Button label="Speichern" icon="save" variant="primary" testID="b" onPress={() => {}} />,
    );

    expect(getByText("Speichern")).toBeTruthy();
    expect(getByTestId("b-icon").props.color).toBe("#0a0a0a");
  });

  it("mutes the icon colour when disabled and shows no icon without the prop", async () => {
    const { getByTestId, queryByTestId, rerender } = await render(
      <Button label="X" icon="close" disabled testID="b" onPress={() => {}} />,
    );
    expect(getByTestId("b-icon").props.color).toBe(
      "rgba(255,255,255,0.35)",
    );
    await rerender(<Button label="X" testID="b" onPress={() => {}} />);
    expect(queryByTestId("b-icon")).toBeNull();
  });
});
