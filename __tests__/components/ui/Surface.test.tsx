import { render } from "@testing-library/react-native";

import { Surface } from "@/components/ui/Surface";

describe("Surface", () => {
  it("default variant is a translucent card fill with a faint border and rounded corners", async () => {
    const { getByTestId } = await render(<Surface testID="g" />);
    const className = getByTestId("g").props.className as string;
    expect(className).toContain("bg-bg-card-flat");
    expect(className).toContain("border-surface-border");
    expect(className).toContain("rounded-xl");
  });

  it("strong variant uses the denser fill and merges extra classes", async () => {
    const { getByTestId } = await render(<Surface testID="g" variant="strong" className="px-4" />);
    const className = getByTestId("g").props.className as string;
    expect(className).toContain("bg-bg-card-flat");
    expect(className).toContain("px-4");
  });

  it("panel variant uses the same flat fill", async () => {
    const { getByTestId, queryByTestId } = await render(<Surface testID="g" variant="panel" />);
    expect(queryByTestId("surface-blur-view")).toBeNull();
    expect(getByTestId("g").props.className).toContain("bg-bg-card-flat");
    expect(getByTestId("g").props.className).toContain("border-surface-border");
  });
});

describe("Surface flat border (style guide)", () => {
  it("uses one uniform border without 3D edge or shadow classes", async () => {
    const { SURFACE_CLASSNAMES, SURFACE_EDGE } = require("@/components/ui/Surface");
    expect(SURFACE_EDGE).toBe("border border-surface-border");
    for (const cls of Object.values(SURFACE_CLASSNAMES) as string[]) {
      expect(cls).not.toMatch(/border-[tb]-|shadow/);
    }
  });
});

describe("Surface tint tokens (readable over the busy photo)", () => {
  it("flat fill is 95% dark and the legacy tokens at least 70%", () => {
    const colors = require("../../../tailwind.config.js").theme.extend.colors;
    const alpha = (v: string) => Number(/,\s*(\.?\d*\.?\d+)\)/.exec(v)![1]);
    expect(alpha(colors["bg-card-flat"])).toBe(0.95);
    for (const k of ["bg-card", "bg-surface", "bg-surface-strong"]) {
      expect(alpha(colors[k])).toBeGreaterThanOrEqual(0.7);
    }
    for (const k of ["bg-card-blur", "bg-surface-strong-blur", "bg-sheet-blur", "bg-tab-bar-blur"]) {
      expect(colors[k]).toBeUndefined();
    }
  });
});
