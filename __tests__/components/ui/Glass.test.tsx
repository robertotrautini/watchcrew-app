import { render } from "@testing-library/react-native";

import { Glass } from "@/components/ui/Glass";

describe("Glass", () => {
  it("default variant is a translucent card fill with a faint border and rounded corners", async () => {
    const { getByTestId } = await render(<Glass testID="g" />);
    const className = getByTestId("g").props.className as string;
    expect(className).toContain("bg-bg-card-flat");
    expect(className).toContain("border-glass-border");
    expect(className).toContain("rounded-xl");
  });

  it("strong variant uses the denser fill and merges extra classes", async () => {
    const { getByTestId } = await render(<Glass testID="g" variant="strong" className="px-4" />);
    const className = getByTestId("g").props.className as string;
    expect(className).toContain("bg-bg-card-flat");
    expect(className).toContain("px-4");
  });

  it("panel variant uses the same flat fill", async () => {
    const { getByTestId, queryByTestId } = await render(<Glass testID="g" variant="panel" />);
    expect(queryByTestId("glass-blur-view")).toBeNull();
    expect(getByTestId("g").props.className).toContain("bg-bg-card-flat");
    expect(getByTestId("g").props.className).toContain("border-glass-border");
  });
});

describe("Glass flat border (style guide)", () => {
  it("uses one uniform border without 3D edge or shadow classes", async () => {
    const { GLASS_CLASSNAMES, GLASS_EDGE, GLASS_INSET_EDGE } = require("@/components/ui/Glass");
    expect(GLASS_EDGE).toBe("border border-glass-border");
    expect(GLASS_INSET_EDGE).toBe(GLASS_EDGE);
    for (const cls of Object.values(GLASS_CLASSNAMES) as string[]) {
      expect(cls).not.toMatch(/border-[tb]-|shadow/);
    }
  });
});

describe("Glass tint tokens (readable over the busy photo)", () => {
  it("flat fill is 95% dark and the legacy tokens at least 70%", () => {
    const colors = require("../../../tailwind.config.js").theme.extend.colors;
    const alpha = (v: string) => Number(/,\s*(\.?\d*\.?\d+)\)/.exec(v)![1]);
    expect(alpha(colors["bg-card-flat"])).toBe(0.95);
    for (const k of ["bg-card", "bg-glass", "bg-glass-strong"]) {
      expect(alpha(colors[k])).toBeGreaterThanOrEqual(0.7);
    }
    for (const k of ["bg-card-blur", "bg-glass-strong-blur", "bg-sheet-blur", "bg-tab-bar-blur"]) {
      expect(colors[k]).toBeUndefined();
    }
  });
});
