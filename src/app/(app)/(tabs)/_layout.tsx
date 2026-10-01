import { Ionicons } from '@expo/vector-icons';
import { Redirect, useSegments } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { resolveGroupTheme } from '@/lib/groupTheme';
import { WATCHLIST_ROUTE } from '@/lib/homeRoute';
import { usePreferencesStore } from '@/stores/usePreferencesStore';

/**
 * The exact, ordered set of main-shell tabs (M3 roadmap: "Tabs: Tracker/
 * Watchlist/Tagebuch, News ausgeblendet"). The old app's "News" tab is
 * intentionally NOT included here at all, per the roadmap — kept as a
 * plain exported constant (rather than only inline JSX below) so this
 * "exactly these 3, in this order, no News" requirement is covered by a
 * plain data-level unit test (__tests__/tabsLayout.test.ts) instead of only
 * being checkable via the interim web visual check.
 */
export const TAB_SCREENS = [
  { name: 'tracker', title: 'Tracker', icon: 'film' },
  { name: 'watchlist', title: 'Watchlist', icon: 'bookmark' },
  { name: 'tagebuch', title: 'Tagebuch', icon: 'book' },
] as const;

/**
 * Per-device "Tracker aktiv" flag (usePreferencesStore.trackerEnabled): the
 * tracker tab stays a registered route but is hidden (`href: null`) when off.
 */
export function getTabScreens(trackerEnabled: boolean) {
  return TAB_SCREENS.map((tab) => ({
    ...tab,
    hidden: tab.name === 'tracker' && !trackerEnabled,
  }));
}

export function getInitialTabName(trackerEnabled: boolean) {
  return trackerEnabled ? 'tracker' : 'watchlist';
}

/**
 * The main app shell's tab bar. Colors: active tab uses the group-theme
 * accent color, inactive tabs use the neutral `textSecondary` token
 * (constants/theme.ts) — per the task's design-token instruction. This
 * layout renders above/outside any specific Watch-Group's
 * GroupThemeProvider (a user could belong to several groups with different
 * themes), so it falls back to the default group theme's accent (Gold —
 * see groupTheme.ts's DEFAULT_GROUP_THEME) rather than any one group's
 * color. `expo-router`'s Tabs (React Navigation bottom-tabs under the hood)
 * is configured via `screenOptions`/tint-color props, not `className` —
 * there is no NativeWind styling surface for this native navigator chrome,
 * same as the (now superseded) native tab bar it replaces.
 */
export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { colors: groupColors } = resolveGroupTheme(undefined);
  const trackerEnabled = usePreferencesStore((s) => s.trackerEnabled);
  const segments = useSegments() as string[];

  // The flag can be switched off while the (now hidden) tracker tab is the
  // focused one (settings modal opened from it) -> leave it once it is visible again.
  if (!trackerEnabled && segments.includes('tracker')) {
    return <Redirect href={WATCHLIST_ROUTE} />;
  }

  return (
    <Tabs
      initialRouteName={getInitialTabName(trackerEnabled)}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: groupColors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}>
      {getTabScreens(trackerEnabled).map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
            title: tab.title,
            ...(tab.hidden ? { href: null } : {}),
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.icon : (`${tab.icon}-outline` as `${typeof tab.icon}-outline`)}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
