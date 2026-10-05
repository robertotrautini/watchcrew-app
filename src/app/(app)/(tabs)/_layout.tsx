import { Icon, type IconRole } from "@/components/ui/Icon";
import { Redirect, useSegments } from "expo-router";
import { Tabs } from "expo-router/js-tabs";

import { useParallaxRouteSync } from "@/components/ParallaxProvider";
import { useGroupTheme } from "@/components/GroupThemeProvider";
import { TabSwipeView } from "@/components/TabSwipeView";
import { TabSwitchContext } from "@/components/tabSwitchContext";
import { useTabSwitchState } from "@/hooks/useTabSwitchState";
import {
  GLASS_TAB_BAR_BLUR_STYLE,
  GLASS_TAB_BAR_STYLE,
} from "@/components/ui/Glass";
import { GlassBlur, isBlurAvailable } from "@/components/ui/GlassBlur";
import { TabBarButton } from "@/components/ui/TabBarButton";
import { tabIndexOf } from "@/lib/parallax";
import { WATCHLIST_ROUTE } from "@/lib/homeRoute";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * The exact, ordered set of main-shell tabs (M3 roadmap: "Tabs: Tracker/
 * Watchlist/Tagebuch, News ausgeblendet"). The old app's "News" tab is
 * intentionally NOT included here at all, per the roadmap — kept as a
 * plain exported constant (rather than only inline JSX below) so this
 * "exactly these 3, in this order, no News" requirement is covered by a
 * plain data-level unit test (__tests__/layouts/tabsLayout.test.ts) instead of only
 * being checkable via the interim web visual check.
 */
export const TAB_SCREENS = [
  {
    name: "tracker",
    title: "Tracker",
    icon: "tabTracker",
    iconInactive: "tabTracker",
  },
  {
    name: "watchlist",
    title: "Watchlist",
    icon: "tabWatchlist",
    iconInactive: "tabWatchlistInactive",
  },
  {
    name: "tagebuch",
    title: "Tagebuch",
    icon: "tabDiary",
    iconInactive: "tabDiary",
  },
] as const satisfies ReadonlyArray<{
  name: string;
  title: string;
  icon: IconRole;
  iconInactive: IconRole;
}>;

/**
 * Per-device "Tracker aktiv" flag (usePreferencesStore.trackerEnabled): the
 * tracker tab stays a registered route but is hidden (`href: null`) when off.
 */
export function getTabScreens(trackerEnabled: boolean) {
  return TAB_SCREENS.map((tab) => ({
    ...tab,
    hidden: tab.name === "tracker" && !trackerEnabled,
  }));
}

export function getInitialTabName(trackerEnabled: boolean) {
  return trackerEnabled ? "tracker" : "watchlist";
}

/**
 * The main app shell's tab bar. Colors: active tab uses the group-theme
 * accent color, inactive tabs use the legacy grey #888 (--text-secondary) — per the task's design-token instruction. This
 * layout sits inside ActiveGroupThemeProvider (src/app/(app)/_layout.tsx),
 * so the accent follows the ACTIVE group's color_theme (Gold fallback while
 * unknown). `expo-router`'s Tabs (React Navigation bottom-tabs under the hood)
 * is configured via `screenOptions`/tint-color props, not `className` —
 * there is no NativeWind styling surface for this native navigator chrome,
 * same as the (now superseded) native tab bar it replaces.
 */
export default function TabsLayout() {
  const { colors: groupColors } = useGroupTheme();
  const trackerEnabled = usePreferencesStore((s) => s.trackerEnabled);
  const segments = useSegments() as string[];

  const visibleTabs = getTabScreens(trackerEnabled)
    .filter((tab) => !tab.hidden)
    .map((tab) => tab.name);
  useParallaxRouteSync(
    tabIndexOf(segments[segments.length - 1] ?? "", visibleTabs),
    visibleTabs.length,
    segments.join("/"),
  );

  const tabSwitch = useTabSwitchState(
    (visibleTabs as string[]).includes(segments[segments.length - 1] ?? "")
      ? segments[segments.length - 1]
      : null,
  );

  // The flag can be switched off while the (now hidden) tracker tab is the
  // focused one (settings modal opened from it) -> leave it once it is visible again.
  if (!trackerEnabled && segments.includes("tracker")) {
    return <Redirect href={WATCHLIST_ROUTE} />;
  }

  return (
    <TabSwitchContext.Provider value={tabSwitch}>
      <TabSwipeView visibleTabs={visibleTabs}>
        <Tabs
          initialRouteName={getInitialTabName(trackerEnabled)}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: groupColors.accent,
            tabBarInactiveTintColor: "#888888",
            // Legacy look: dark glass bar (no blur available) with hairline top
            // border; the gold top line over the active tab is TabBarButton.
            tabBarStyle: isBlurAvailable()
              ? GLASS_TAB_BAR_BLUR_STYLE
              : GLASS_TAB_BAR_STYLE,
            tabBarBackground: () => (
              <GlassBlur
                className="flex-1"
                blurClassName="bg-bg-tab-bar-blur"
                fallbackClassName=""
                pointerEvents="none"
              />
            ),
            tabBarButton: TabBarButton as never,
          }}
        >
          {getTabScreens(trackerEnabled).map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                ...(tab.hidden ? { href: null } : {}),
                tabBarIcon: ({ focused, color }) => (
                  <Icon
                    name={focused ? tab.icon : tab.iconInactive}
                    size="M"
                    color={color}
                  />
                ),
              }}
            />
          ))}
        </Tabs>
      </TabSwipeView>
    </TabSwitchContext.Provider>
  );
}
