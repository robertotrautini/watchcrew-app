import { propsEqualIgnoringIndex } from "@/lib/memoCompare";

describe("propsEqualIgnoringIndex", () => {
  const entry = { id: "a" };
  it("ignores a changed index", () => {
    expect(propsEqualIgnoringIndex({ index: 1, entry }, { index: 9, entry })).toBe(true);
  });
  it("detects changed other props (by reference)", () => {
    expect(propsEqualIgnoringIndex({ index: 1, entry }, { index: 1, entry: { id: "a" } })).toBe(false);
  });
  it("detects a different prop count", () => {
    expect(propsEqualIgnoringIndex({ index: 1, a: 1 } as never, { index: 1 } as never)).toBe(false);
  });
});
