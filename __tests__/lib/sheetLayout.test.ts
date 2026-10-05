import { sheetMaxHeight } from "@/lib/sheetLayout";

describe("sheetMaxHeight", () => {
  it("is most of the window with no keyboard", () => {
    expect(sheetMaxHeight(800, 0, 40)).toBe(760);
  });
  it("shrinks to the area above the keyboard", () => {
    expect(sheetMaxHeight(800, 300, 40)).toBe(460);
  });
  it("never goes below a usable minimum", () => {
    expect(sheetMaxHeight(300, 280, 40)).toBe(120);
  });
});
