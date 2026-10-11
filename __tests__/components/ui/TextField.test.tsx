import { fireEvent, render } from "@testing-library/react-native";

import { TextField } from "@/components/ui/TextField";
import { PLACEHOLDER_COLOR } from "@/lib/colors";

describe("TextField", () => {
  it("uses the opaque field fill, the shared border and CONTROL_HEIGHT (56dp)", async () => {
    const { getByTestId } = await render(<TextField testID="tf" value="" onChangeText={() => {}} />);
    const cls = getByTestId("tf").props.className as string;
    expect(cls).toContain("bg-field");
    expect(cls).toContain("border-surface-border");
    expect(cls).toContain("min-h-14");
    expect(cls).not.toMatch(/\/\d+/);
  });

  it("has no accent border by default", async () => {
    const { getByTestId } = await render(<TextField testID="tf" value="" onChangeText={() => {}} />);
    expect(getByTestId("tf").props.className).not.toMatch(/border-accent/);
  });

  it("applies the placeholder colour and keeps testID and handlers", async () => {
    const onChangeText = jest.fn();
    const { getByTestId } = await render(
      <TextField testID="tf" placeholder="x" value="" onChangeText={onChangeText} />,
    );
    expect(getByTestId("tf").props.placeholderTextColor).toBe(PLACEHOLDER_COLOR);
    await fireEvent.changeText(getByTestId("tf"), "abc");
    expect(onChangeText).toHaveBeenCalledWith("abc");
  });

  it("secure sets secureTextEntry", async () => {
    const { getByTestId } = await render(<TextField testID="tf" secure value="" onChangeText={() => {}} />);
    expect(getByTestId("tf").props.secureTextEntry).toBe(true);
  });

  it("search sets the search return key", async () => {
    const { getByTestId } = await render(<TextField testID="tf" search value="" onChangeText={() => {}} />);
    expect(getByTestId("tf").props.returnKeyType).toBe("search");
  });

  it("error switches the border to danger", async () => {
    const { getByTestId } = await render(<TextField testID="tf" error value="" onChangeText={() => {}} />);
    expect(getByTestId("tf").props.className).toContain("border-danger");
  });

  it("multiline is multiline with top aligned text", async () => {
    const { getByTestId } = await render(<TextField testID="tf" multiline value="" onChangeText={() => {}} />);
    expect(getByTestId("tf").props.multiline).toBe(true);
    expect(getByTestId("tf").props.textAlignVertical).toBe("top");
  });

  it("merges a placement className", async () => {
    const { getByTestId } = await render(<TextField testID="tf" className="flex-1" value="" onChangeText={() => {}} />);
    expect(getByTestId("tf").props.className).toContain("flex-1");
  });
});
