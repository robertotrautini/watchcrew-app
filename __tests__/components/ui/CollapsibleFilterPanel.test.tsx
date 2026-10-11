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

describe("CollapsibleFilterPanel shadow", () => {
  it("renders stacked rounded layers behind an opaque black panel, no elevation", async () => {
    const G = require("@/components/ui/Surface");
    const { getByTestId } = await render(
      <CollapsibleFilterPanel testID="fp" open={false} onToggle={jest.fn()} hasActiveFilters={false} search={<Text>s</Text>}>
        <Text>c</Text>
      </CollapsibleFilterPanel>,
    );
    const shadow = getByTestId("fp-shadow");
    expect(shadow.props.pointerEvents).toBe("none");
    expect(shadow.props.children).toHaveLength(G.PANEL_SHADOW_LAYERS);
    G.panelShadowOpacities().forEach((_: number, i: number) => {
      const layer = getByTestId(`fp-shadow-layer-${i}`);
      expect(layer.props.className).toContain(G.PANEL_RADIUS_CLASSNAME);
      expect(layer.props.className).toContain("bg-black");
      expect(JSON.stringify(layer.props.style)).toContain(`"translateY":${i + 1}`);
    });
    // shadow is the first child of the wrapper -> behind the panel
    const wrapper = getByTestId("fp-wrapper");
    const kids = wrapper.props.children;
    expect(kids[0].props.testID).toBe("fp-shadow");
    expect(kids[1].props.variant).toBe("solid");
    expect(wrapper.props.className).toContain("z-10");
    expect(JSON.stringify(wrapper.props.style ?? {})).not.toContain("elevation");
    expect(G.PANEL_Z_INDEX).toBeGreaterThan(0);
  });

  it("constants stay consistent", () => {
    const G = require("@/components/ui/Surface");
    expect(G.PANEL_RADIUS).toBe(12);
    expect(G.PANEL_LIST_OVERLAP).toBeGreaterThanOrEqual(G.PANEL_RADIUS);
    expect(G.PANEL_LIST_START_GAP).toBe(12);
    expect(G.PANEL_LIST_GRID_START_GAP).toBe(8);
    expect(G.PANEL_LIST_GRID_CONTENT_PT_CLASSNAME).toBe(
      `pt-[${G.PANEL_LIST_OVERLAP + G.PANEL_LIST_GRID_START_GAP}px]`,
    );
    expect(G.PANEL_LIST_CONTENT_PT_CLASSNAME).toBe(
      `pt-[${G.PANEL_LIST_OVERLAP + G.PANEL_LIST_START_GAP}px]`,
    );
    expect(G.PANEL_SHADOW_LAYERS).toBe(12);
    expect(G.PANEL_LIST_OVERLAP_CLASSNAME).toBe(`-mt-${G.PANEL_LIST_OVERLAP / 4}`);
  });

  it("panelShadowOpacities: falling per layer, compounded peak at the panel edge, ~0 at the end", () => {
    const { panelShadowOpacities, PANEL_SHADOW_PEAK_OPACITY } = require("@/components/ui/Surface");
    const o: number[] = panelShadowOpacities();
    expect(o.every((v) => v >= 0 && v <= 1)).toBe(true);
    // compounded darkness at depth 1 = all layers cover it
    const depth1 = 1 - o.reduce((acc, v) => acc * (1 - v), 1);
    expect(depth1).toBeCloseTo(PANEL_SHADOW_PEAK_OPACITY);
    // only the lowest layer covers the last dp
    expect(o[o.length - 1]).toBeLessThan(0.05);
  });
});

describe("Surface solid variant", () => {
  it("is fully opaque black, not the 95% flat fill", async () => {
    const { Surface } = require("@/components/ui/Surface");
    const { getByTestId } = await render(<Surface variant="solid" testID="g" />);
    expect(getByTestId("g").props.className).toContain("bg-black");
    expect(getByTestId("g").props.className).not.toContain("bg-bg-card-flat");
  });
});
