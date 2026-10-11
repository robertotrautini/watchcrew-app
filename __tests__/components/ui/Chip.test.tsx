import { render, screen, fireEvent } from "@testing-library/react-native";

import { Chip, ChipTag } from "@/components/ui/Chip";

describe("Chip", () => {
  it("inactive: opaque accent-soft fill, strong accent border, medium accent-light text", async () => {
    await render(<Chip testID="c" label="Drama" onPress={() => {}} />);
    const cls = screen.getByTestId("c").props.className as string;
    expect(cls).toContain("bg-accent-soft");
    expect(cls).toContain("border-accent-a55");
    expect(cls).toContain("rounded-lg");
    expect(cls).not.toContain("rounded-full");
    expect(screen.getByText("Drama").props.className).toContain("text-accent-light");
    expect(screen.getByText("Drama").props.className).toContain("font-sans-medium");
    expect(screen.getByTestId("c").props.accessibilityState).toMatchObject({ selected: false });
  });

  it("active: solid accent fill with dark text and selected a11y state", async () => {
    await render(<Chip testID="c" label="Drama" active onPress={() => {}} />);
    expect(screen.getByTestId("c").props.className).toMatch(/bg-accent$/);
    expect(screen.getByText("Drama").props.className).toContain("text-bg-primary");
    expect(screen.getByTestId("c").props.accessibilityState).toMatchObject({ selected: true });
  });


  it("fires onPress", async () => {
    const onPress = jest.fn();
    await render(<Chip testID="c" label="x" onPress={onPress} />);
    await fireEvent.press(screen.getByTestId("c"));
    expect(onPress).toHaveBeenCalled();
  });

  it("ChipTag uses the inactive look", async () => {
    await render(<ChipTag testID="t" label="Krimi" />);
    expect(screen.getByTestId("t").props.className).toContain("bg-accent-soft");
    expect(screen.getByText("Krimi")).toBeTruthy();
  });
});
