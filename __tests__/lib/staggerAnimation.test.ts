import {
  computeStaggerDelayMs,
  MAX_STAGGER_INDEX,
  STAGGER_STEP_MS,
} from "@/lib/staggerAnimation";

describe("computeStaggerDelayMs", () => {
  it("returns 0 for the first item (index 0)", () => {
    expect(computeStaggerDelayMs(0)).toBe(0);
  });

  it("returns one step for index 1", () => {
    expect(computeStaggerDelayMs(1)).toBe(STAGGER_STEP_MS);
  });

  it("scales linearly up to the cap", () => {
    expect(computeStaggerDelayMs(3)).toBe(3 * STAGGER_STEP_MS);
    expect(computeStaggerDelayMs(MAX_STAGGER_INDEX)).toBe(MAX_STAGGER_INDEX * STAGGER_STEP_MS);
  });

  it("clamps at the cap for any index beyond it", () => {
    const capped = MAX_STAGGER_INDEX * STAGGER_STEP_MS;
    expect(computeStaggerDelayMs(MAX_STAGGER_INDEX + 1)).toBe(capped);
    expect(computeStaggerDelayMs(1000)).toBe(capped);
  });

  it("clamps negative indices to 0 (defensive)", () => {
    expect(computeStaggerDelayMs(-5)).toBe(0);
  });
});
