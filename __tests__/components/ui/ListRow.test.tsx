import { Text, View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { CONTROL_HEIGHT, CONTROL_HEIGHT_CLASSNAME, CONTROL_MIN_HEIGHT_CLASSNAME } from "@/components/ui/controlHeight";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { Select } from "@/components/ui/Select";
import { TEXT_FIELD_CLASSNAME } from "@/components/ui/TextField";

describe("ListRow", () => {
  it("has the fixed control height, opaque field fill and surface border", async () => {
    const { getByTestId } = await render(<ListRow testID="r" label="Titel" onPress={() => {}} />);
    const cls = getByTestId("r").props.className as string;
    expect(cls).toContain(CONTROL_HEIGHT_CLASSNAME);
    expect(cls).toContain("bg-field");
    expect(cls).toContain("border-surface-border");
    expect(cls).toContain("items-center");
  });

  it("grouped: no own border, fill or radius, only a bottom divider unless last", async () => {
    const a = await render(<ListRow testID="r" label="A" grouped />);
    const cls = a.getByTestId("r").props.className as string;
    expect(cls).toContain(CONTROL_HEIGHT_CLASSNAME);
    expect(cls).not.toContain("bg-field");
    expect(cls).not.toContain("rounded");
    expect(cls).toContain("border-b");
    expect(cls).toContain("border-surface-border");
    const b = await render(<ListRow testID="l" label="A" grouped isLast />);
    const last = b.getByTestId("l").props.className as string;
    expect(last).not.toContain("border-b");
    expect(last).not.toContain("border-surface-border");
  });

  it("trailingInset swaps the right padding for 8dp", async () => {
    const { getByTestId } = await render(<ListRow testID="r" label="A" trailingInset trailing={<Text>T</Text>} />);
    const cls = getByTestId("r").props.className as string;
    expect(cls).toContain("pr-2");
    expect(cls).not.toContain("pr-4");
  });

  it("keeps the label on one line (ellipsis)", async () => {
    const { getByText } = await render(<ListRow label="Sehr langer Titel" />);
    expect(getByText("Sehr langer Titel").props.numberOfLines).toBe(1);
  });

  it("renders value and trailing element and a chevron when asked", async () => {
    const { getByText, getByTestId } = await render(
      <ListRow testID="r" label="A" value="7 ausgewählt" chevron trailing={<Text>T</Text>} onPress={() => {}} />,
    );
    expect(getByText("7 ausgewählt")).toBeTruthy();
    expect(getByText("T")).toBeTruthy();
    expect(getByTestId("r-chevron")).toBeTruthy();
  });

  it("passes the pressed state to a trailing render function", async () => {
    const { getByTestId } = await render(
      <ListRow testID="r" label="A" onPress={() => {}} trailing={(pressed) => <View testID={pressed ? "p" : "n"} />} />,
    );
    expect(getByTestId("n")).toBeTruthy();
  });

  it("presses", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(<ListRow testID="r" label="A" onPress={onPress} />);
    await fireEvent.press(getByTestId("r"));
    expect(onPress).toHaveBeenCalled();
  });

  it("is not pressable without onPress", async () => {
    const { getByTestId } = await render(<ListRow testID="r" label="A" />);
    expect(getByTestId("r").props.accessibilityRole).toBeUndefined();
  });

  it("danger uses the shared danger look", async () => {
    const { getByTestId, getByText } = await render(<ListRow testID="r" label="Löschen" danger onPress={() => {}} />);
    expect(getByTestId("r").props.className).toContain("bg-btn-danger");
    expect(getByText("Löschen").props.className).toContain("text-danger-text");
  });
});

describe("CONTROL_HEIGHT", () => {
  it("is one value across TextField, Select, Button and ListRow", async () => {
    expect(CONTROL_HEIGHT).toBe(56);
    expect(CONTROL_HEIGHT_CLASSNAME).toBe("h-14");
    expect(TEXT_FIELD_CLASSNAME).toContain(CONTROL_MIN_HEIGHT_CLASSNAME);
    const s = await render(<Select testID="s" options={[]} value={null} onChange={() => {}} />);
    expect(s.getByTestId("s").props.className).toContain(CONTROL_MIN_HEIGHT_CLASSNAME);
    const b = await render(<Button testID="b" label="x" />);
    expect(b.getByTestId("b").props.className).toContain(CONTROL_MIN_HEIGHT_CLASSNAME);
  });
});
