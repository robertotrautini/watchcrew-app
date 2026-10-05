import { Easing } from "react-native";

/**
 * Shared "animation language" for list content (docs/style-guide.md "Motion").
 * Used by the view-mode switch (Sheet / Tile / Liste: the FlatList remounts and
 * every item fades in) AND by the tab switch (the incoming tab's items replay
 * the same fade), so both stay identical.
 */
/** Per-item fade-in duration. */
export const ITEM_FADE_DURATION_MS = 220;
/** Explicit form of RN Animated.timing's default easing (kept identical to the original view-mode fade). */
export const ITEM_FADE_EASING = Easing.inOut(Easing.ease);
/** Per-item stagger step. */
export const STAGGER_STEP_MS = 40;
/** Stagger is capped after this many items so long lists finish quickly (max total delay 320 ms). */
export const MAX_STAGGER_INDEX = 8;

export function computeStaggerDelayMs(index: number): number {
  const clampedIndex = Math.max(0, Math.min(index, MAX_STAGGER_INDEX));
  return clampedIndex * STAGGER_STEP_MS;
}

export interface TabSwitchState {
  /** Last focused tab route name (null before any tab was seen). */
  tab: string | null;
  /** Incremented on every tab-to-tab switch; never on first mount or when returning from non-tab routes. */
  epoch: number;
}

/** Pure reducer: `tab` = currently focused tab name, or null for non-tab routes (modals). */
export function nextTabSwitchState(state: TabSwitchState, tab: string | null): TabSwitchState {
  if (tab == null || tab === state.tab) return state;
  if (state.tab == null) return { tab, epoch: state.epoch };
  return { tab, epoch: state.epoch + 1 };
}
