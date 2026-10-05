import { isGridPlaceholder, padToFullRows } from "../../src/lib/gridPadding";

describe("padToFullRows", () => {
  it("pads the last row up to the column count", () => {
    const out = padToFullRows([1, 2, 3, 4], 3);
    expect(out).toHaveLength(6);
    expect(isGridPlaceholder(out[4])).toBe(true);
    expect(isGridPlaceholder(out[5])).toBe(true);
    expect(isGridPlaceholder(out[3])).toBe(false);
  });
  it("adds nothing for full rows, single column or empty lists", () => {
    expect(padToFullRows([1, 2, 3], 3)).toHaveLength(3);
    expect(padToFullRows([1, 2], 1)).toHaveLength(2);
    expect(padToFullRows([], 3)).toHaveLength(0);
  });
});
