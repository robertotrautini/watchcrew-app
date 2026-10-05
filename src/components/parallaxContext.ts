import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

// Deliberately free of runtime reanimated imports: screens import this file,
// and reanimated's native worklets runtime cannot load in most Jest suites.
export interface ParallaxValues {
  /** Fractional index of the focused tab (follows the swipe gesture live, eased on tab change). */
  tabProgress: SharedValue<number>;
  /** Number of visible swipeable tabs (N). */
  tabCount: SharedValue<number>;
}

export const ParallaxContext = createContext<ParallaxValues | null>(null);

export function useParallaxValues(): ParallaxValues | null {
  return useContext(ParallaxContext);
}

const NO_SCROLL_PROPS = {};

/**
 * Kept for the screens that spread it onto their scrollables. The background
 * has no vertical parallax any more (photo fitted to 100% screen height), so
 * this adds no scroll handler.
 */
export function useParallaxScroll() {
  return NO_SCROLL_PROPS;
}
