import { Easing } from "react-native";

import {
  ITEM_FADE_DURATION_MS,
  ITEM_FADE_EASING,
  MAX_STAGGER_INDEX,
  STAGGER_STEP_MS,
  computeStaggerDelayMs,
  nextTabSwitchState,
} from "@/lib/motion";
import * as legacy from "@/lib/staggerAnimation";

describe("motion constants (shared by view-mode switch and tab switch)", () => {
  it("keeps the existing list fade values", () => {
    expect(ITEM_FADE_DURATION_MS).toBe(220);
    expect(STAGGER_STEP_MS).toBe(40);
    expect(MAX_STAGGER_INDEX).toBe(8);
    expect(typeof ITEM_FADE_EASING).toBe("function");
    expect(ITEM_FADE_EASING(0)).toBeCloseTo(Easing.inOut(Easing.ease)(0));
    expect(ITEM_FADE_EASING(0.5)).toBeCloseTo(Easing.inOut(Easing.ease)(0.5));
  });

  it("staggerAnimation re-exports the same stagger function", () => {
    expect(legacy.computeStaggerDelayMs).toBe(computeStaggerDelayMs);
    expect(computeStaggerDelayMs(100)).toBe(MAX_STAGGER_INDEX * STAGGER_STEP_MS);
  });
});

describe("nextTabSwitchState", () => {
  const start = { tab: null, epoch: 0 };
  it("first tab does not count as a switch", () => {
    expect(nextTabSwitchState(start, "tracker")).toEqual({ tab: "tracker", epoch: 0 });
  });
  it("changing tab bumps the epoch", () => {
    const s1 = nextTabSwitchState(start, "tracker");
    expect(nextTabSwitchState(s1, "watchlist")).toEqual({ tab: "watchlist", epoch: 1 });
  });
  it("same tab or non-tab route keeps the state (returning from a modal does not replay)", () => {
    const s = { tab: "watchlist", epoch: 2 };
    expect(nextTabSwitchState(s, "watchlist")).toBe(s);
    expect(nextTabSwitchState(s, null)).toBe(s);
  });
});
