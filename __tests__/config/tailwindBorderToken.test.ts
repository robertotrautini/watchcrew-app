const config = require("../../tailwind.config.js");

describe("surface-border token", () => {
  const value: string = config.theme.extend.colors["surface-border"];

  it("uses rgba with leading-zero alpha or a hex value", () => {
    expect(value).toMatch(/^(#[0-9a-fA-F]{6,8}|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0\.\d+|1)\s*\))$/);
  });

  it("is visible on black (>= 30 grey)", () => {
    const hex = value.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
    let grey: number;
    if (hex) {
      const a = hex[2] ? parseInt(hex[2], 16) / 255 : 1;
      grey = parseInt(hex[1].slice(0, 2), 16) * a;
    } else {
      const m = value.match(/rgba\(\s*(\d+)\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/)!;
      grey = Number(m[1]) * Number(m[2]);
    }
    expect(grey).toBeGreaterThanOrEqual(30);
  });
});
