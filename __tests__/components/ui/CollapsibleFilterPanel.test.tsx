import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { CollapsibleFilterPanel } from "../../../src/components/ui/CollapsibleFilterPanel";

function setup(props: Partial<React.ComponentProps<typeof CollapsibleFilterPanel>> = {}) {
  const onToggle = jest.fn();
  const utils = render(
    <CollapsibleFilterPanel
      testID="fp"
      open={false}
      onToggle={onToggle}
      hasActiveFilters={false}
      search={<Text>search-slot</Text>}
      actions={<Text>actions-slot</Text>}
      {...props}
    >
      <Text>panel-content</Text>
    </CollapsibleFilterPanel>,
  );
  return { onToggle, utils };
}

describe("CollapsibleFilterPanel", () => {
  it("closed: shows search + actions + toggle, hides panel content", async () => {
    const { utils } = setup();
    const { getByText, getByTestId, queryByTestId, queryByText } = await utils;
    expect(getByText("search-slot")).toBeTruthy();
    expect(getByText("actions-slot")).toBeTruthy();
    expect(getByTestId("fp-toggle")).toBeTruthy();
    expect(queryByTestId("fp-panel")).toBeNull();
    expect(queryByText("panel-content")).toBeNull();
  });

  it("open: renders panel content and gold-filled toggle", async () => {
    const { getByText, getByTestId } = await render(
      <CollapsibleFilterPanel testID="fp" open onToggle={jest.fn()} hasActiveFilters={false} search={<Text>s</Text>}>
        <Text>panel-content</Text>
      </CollapsibleFilterPanel>,
    );
    expect(getByTestId("fp-panel")).toBeTruthy();
    expect(getByText("panel-content")).toBeTruthy();
    expect(getByTestId("fp-toggle").props.className).toContain("bg-accent");
    expect(getByTestId("fp-toggle").props.accessibilityState.expanded).toBe(true);
  });

  it("closed toggle is not gold-filled", async () => {
    const { utils } = setup();
    const { getByTestId } = await utils;
    expect(getByTestId("fp-toggle").props.className).not.toContain("bg-accent");
    expect(getByTestId("fp-toggle").props.accessibilityState.expanded).toBe(false);
  });

  it("pressing the toggle calls onToggle", async () => {
    const { utils, onToggle } = setup();
    const { getByTestId } = await utils;
    await fireEvent.press(getByTestId("fp-toggle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows the active dot only when filters are active", async () => {
    const off = await setup().utils;
    expect(off.queryByTestId("fp-active-dot")).toBeNull();
    const on = await setup({ hasActiveFilters: true }).utils;
    expect(on.getByTestId("fp-active-dot")).toBeTruthy();
  });
});
