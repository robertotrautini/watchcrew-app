const config = require("../../tailwind.config.js");

describe("surface-border token", () => {
  const value: string = config.theme.extend.colors["surface-border"];

  it("uses rgba with leading-zero alpha or a hex value", () => {
    expect(value).toMatch(/^(#[0-9a-fA-F]{6,8}|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0\.\d+|1)\s*\))$/);
  });

  it("is visible on black (>= 28 grey, alpha >= 0.11)", () => {
    const hex = value.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
    let grey: number;
    if (hex) {
      const a = hex[2] ? parseInt(hex[2], 16) / 255 : 1;
      grey = parseInt(hex[1].slice(0, 2), 16) * a;
    } else {
      const m = value.match(/rgba\(\s*(\d+)\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/)!;
      grey = Number(m[1]) * Number(m[2]);
    }
    expect(grey).toBeGreaterThanOrEqual(28);
    // alpha 0.10 and below rendered black on device
    if (!hex) expect(Number(value.match(/,\s*([\d.]+)\s*\)/)![1])).toBeGreaterThanOrEqual(0.11);
  });
});

describe("opaque control tokens", () => {
  const colors = config.theme.extend.colors;
  const { FIELD_FILL } = require("../../src/lib/colors");
  const HEX = /^#[0-9a-f]{6}$/;

  it("field and button tokens are 6-digit hex (no alpha)", () => {
    for (const k of ["field", "btn-neutral-pressed", "btn-danger", "btn-danger-pressed", "btn-danger-border"]) {
      expect(colors[k]).toMatch(HEX);
    }
  });

  it("FIELD_FILL mirrors the field token", () => {
    expect(FIELD_FILL).toBe(colors.field);
  });
});
