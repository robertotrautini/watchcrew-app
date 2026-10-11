import { fireEvent, render } from "@testing-library/react-native";

import { IconButton } from "../../../src/components/ui/IconButton";

describe("IconButton", () => {
  it("renders a 48dp round button with a11y label and icon", async () => {
    const { getByTestId, getByLabelText } = await render(
      <IconButton testID="ib" icon="save" accessibilityLabel="Speichern" onPress={() => {}} />,
    );
    const { className } = getByTestId("ib").props;
    expect(className).toContain("h-12");
    expect(className).toContain("w-12");
    expect(className).toContain("rounded-full");
    expect(getByLabelText("Speichern")).toBeTruthy();
    expect(getByTestId("ib-icon")).toBeTruthy();
  });

  it("supports the 44dp size", async () => {
    const { getByTestId } = await render(
      <IconButton testID="ib" icon="close" size={44} accessibilityLabel="x" onPress={() => {}} />,
    );
    expect(getByTestId("ib").props.className).toContain("h-11");
  });

  it("maps variants to the shared fill/border scheme", async () => {
    const make = async (variant: "neutral" | "accent" | "danger") => {
      const { getByTestId } = await render(
        <IconButton testID="ib" icon="delete" variant={variant} accessibilityLabel="x" onPress={() => {}} />,
      );
      return getByTestId("ib").props.className as string;
    };
    expect(await make("neutral")).toContain("bg-white/10");
    expect(await make("accent")).toContain("bg-accent");
    const danger = await make("danger");
    expect(danger).toContain("bg-danger/15");
    expect(danger).toContain("border-danger/30");
  });

  it("calls onPress, but not when disabled", async () => {
    const onPress = jest.fn();
    const { getByTestId, rerender } = await render(
      <IconButton testID="ib" icon="add" accessibilityLabel="x" onPress={onPress} />,
    );
    await fireEvent.press(getByTestId("ib"));
    expect(onPress).toHaveBeenCalledTimes(1);
    await rerender(<IconButton testID="ib" icon="add" accessibilityLabel="x" disabled onPress={onPress} />);
    await fireEvent.press(getByTestId("ib"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows a spinner while loading", async () => {
    const { getByTestId } = await render(
      <IconButton testID="ib" icon="save" accessibilityLabel="x" loading onPress={() => {}} />,
    );
    expect(getByTestId("ib-loading-indicator")).toBeTruthy();
  });
});

// Lint-style guard (docs/style-guide.md "Icon-Buttons"): icon-only actions use IconButton only.
declare const __dirname: string;
declare const require: (id: string) => any;

describe("IconButton rule", () => {
  it("Button iconOnly is not used outside IconButton", () => {
    const fs = require("fs");
    const path = require("path");
    const SRC = path.join(__dirname, "..", "..", "..", "src");
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: any) => {
        const full = path.join(dir, e.name);
        return e.isDirectory() ? walk(full) : full.endsWith(".tsx") ? [full] : [];
      });
    const allowed = ["IconButton.tsx", "Button.tsx"];
    const offenders = walk(SRC).filter(
      (f: string) => !allowed.includes(path.basename(f)) && /\biconOnly\b/.test(fs.readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
