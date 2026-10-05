import {
  MIN_TOUCH_TARGET,
  MIN_TOUCH_TARGET_IOS,
  STAR_TOUCH_WIDTH,
  SMALL_PILL_HIT_SLOP,
  hitSlopFor,
  meetsMinTouchTarget,
} from "@/components/ui/touchTarget";

describe("touchTarget", () => {
  it("exposes the platform minimums (Android 48dp, iOS 44pt)", () => {
    expect(MIN_TOUCH_TARGET).toBe(48);
    expect(MIN_TOUCH_TARGET_IOS).toBe(44);
  });

  it("star touch width keeps 5 stars + heart + reset button inside a 360dp sheet", () => {
    expect(STAR_TOUCH_WIDTH).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_IOS);
    expect(5 * STAR_TOUCH_WIDTH).toBe(220);
    // sheet content width on 360dp = 360 - 2*16 padding
    expect(5 * STAR_TOUCH_WIDTH + STAR_TOUCH_WIDTH + 36).toBeLessThanOrEqual(360 - 32);
  });

  describe("hitSlopFor", () => {
    it("returns undefined when the target already meets the minimum", () => {
      expect(hitSlopFor(48, 48)).toBeUndefined();
      expect(hitSlopFor(60, 52)).toBeUndefined();
    });

    it("adds half of the missing size on each side", () => {
      expect(hitSlopFor(44, 44)).toEqual({ top: 2, bottom: 2, left: 2, right: 2 });
      expect(hitSlopFor(36, 36)).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    });

    it("only expands the axis that is too small", () => {
      expect(hitSlopFor(80, 36)).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
      expect(hitSlopFor(24, 60)).toEqual({ top: 0, bottom: 0, left: 12, right: 12 });
    });

    it("rounds odd gaps up so the result always reaches the minimum", () => {
      expect(hitSlopFor(31, 31)).toEqual({ top: 9, bottom: 9, left: 9, right: 9 });
    });
  });

  describe("meetsMinTouchTarget", () => {
    it("counts hitSlop towards the target size", () => {
      expect(meetsMinTouchTarget(36, 36)).toBe(false);
      expect(meetsMinTouchTarget(36, 36, hitSlopFor(36, 36))).toBe(true);
      expect(meetsMinTouchTarget(44, 48, undefined, MIN_TOUCH_TARGET_IOS)).toBe(true);
    });
  });

  it("SMALL_PILL_HIT_SLOP tops a 24dp pill up to 48dp vertically", () => {
    expect(SMALL_PILL_HIT_SLOP).toEqual({ top: 12, bottom: 12, left: 0, right: 0 });
  });
});
