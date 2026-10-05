import { nextGroupId } from "@/lib/groupCycle";

describe("nextGroupId", () => {
  it("returns the next group id", () => {
    expect(nextGroupId(["a", "b", "c"], "a")).toBe("b");
    expect(nextGroupId(["a", "b", "c"], "b")).toBe("c");
  });
  it("wraps around after the last group", () => {
    expect(nextGroupId(["a", "b", "c"], "c")).toBe("a");
  });
  it("returns the first group when active id is unknown or missing", () => {
    expect(nextGroupId(["a", "b"], "zzz")).toBe("a");
    expect(nextGroupId(["a", "b"], undefined)).toBe("a");
  });
  it("returns null with zero groups and the same id with a single group", () => {
    expect(nextGroupId([], "a")).toBeNull();
    expect(nextGroupId(["a"], "a")).toBe("a");
  });
});
