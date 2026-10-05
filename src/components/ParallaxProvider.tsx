import { useContext, useEffect, useMemo, type ReactNode } from "react";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

import { ParallaxContext } from "@/components/parallaxContext";
import { TAB_PAN_DURATION_MS } from "@/lib/parallax";

/** Root-layout provider: shared values read by AppBackground on the UI thread. */
export function ParallaxProvider({ children }: { children: ReactNode }) {
  const tabProgress = useSharedValue(0);
  const tabCount = useSharedValue(1);
  const value = useMemo(() => ({ tabProgress, tabCount }), [tabProgress, tabCount]);
  return <ParallaxContext.Provider value={value}>{children}</ParallaxContext.Provider>;
}

/**
 * Called by the tabs layout whenever the focused route changes: publishes the
 * tab count and eases the progress to the focused tab's index (tab bar taps and
 * swipe releases). Non-tab routes (index null) keep the last position.
 */
export function useParallaxRouteSync(tabIndex: number | null, tabCount: number, routeKey: string) {
  const ctx = useContext(ParallaxContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.tabCount.value = tabCount;
    if (tabIndex != null) {
      ctx.tabProgress.value = withTiming(tabIndex, {
        duration: TAB_PAN_DURATION_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, tabCount]);
}
