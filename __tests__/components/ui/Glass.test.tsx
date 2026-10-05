import { render } from "@testing-library/react-native";

import { Glass } from "@/components/ui/Glass";

describe("Glass", () => {
  it("default variant is a translucent card fill with a faint border and rounded corners", async () => {
    const { getByTestId } = await render(<Glass testID="g" />);
    const className = getByTestId("g").props.className as string;
    expect(getByTestId("glass-blur-view")).toBeTruthy();
    expect(getByTestId("glass-blur-tint").props.className).toContain("bg-bg-card-blur");
    expect(className).toContain("border-glass-border");
    expect(className).toContain("rounded-xl");
  });

  it("strong variant uses the denser fill and merges extra classes", async () => {
    const { getByTestId } = await render(<Glass testID="g" variant="strong" className="px-4" />);
    const className = getByTestId("g").props.className as string;
    expect(getByTestId("glass-blur-tint").props.className).toContain("bg-bg-glass-strong-blur");
    expect(className).toContain("px-4");
  });

  it("panel variant is blurred glass (BlurView + translucent tint)", async () => {
    const { getByTestId } = await render(<Glass testID="g" variant="panel" />);
    expect(getByTestId("glass-blur-view")).toBeTruthy();
    expect(getByTestId("glass-blur-tint").props.className).toContain("bg-bg-sheet-blur");
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
  it("blur tints are at least 60% dark and fallbacks at least 70%", () => {
    const colors = require("../../../tailwind.config.js").theme.extend.colors;
    const alpha = (v: string) => Number(/,\s*(\.?\d*\.?\d+)\)/.exec(v)![1]);
    for (const k of ["bg-card-blur", "bg-glass-strong-blur", "bg-sheet-blur", "bg-tab-bar-blur"]) {
      expect(alpha(colors[k])).toBeGreaterThanOrEqual(0.6);
    }
    for (const k of ["bg-card", "bg-glass", "bg-glass-strong"]) {
      expect(alpha(colors[k])).toBeGreaterThanOrEqual(0.7);
    }
  });
});
