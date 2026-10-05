import {
  BACK_SWIPE_ZONE_FRACTION,
  backSwipeZoneWidth,
  shouldCommitBackSwipe,
} from "@/lib/backSwipe";

describe("backSwipeZoneWidth", () => {
  it("is a fraction of the window width", () => {
    expect(backSwipeZoneWidth(400)).toBe(400 * BACK_SWIPE_ZONE_FRACTION);
  });
});

describe("shouldCommitBackSwipe", () => {
  it("commits on a long left-to-right drag", () => {
    expect(shouldCommitBackSwipe(150, 5, 100, 400)).toBe(true);
  });
  it("commits on a fast fling with minimal distance", () => {
    expect(shouldCommitBackSwipe(40, 2, 900, 400)).toBe(true);
  });
  it("does not commit on a short slow drag", () => {
    expect(shouldCommitBackSwipe(40, 2, 100, 400)).toBe(false);
  });
  it("never commits a right-to-left swipe", () => {
    expect(shouldCommitBackSwipe(-300, 0, -1200, 400)).toBe(false);
  });
  it("does not commit a mostly vertical drag", () => {
    expect(shouldCommitBackSwipe(120, 300, 900, 400)).toBe(false);
  });
});
