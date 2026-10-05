import { DarkTheme, Stack, ThemeProvider } from "expo-router";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { ActiveGroupThemeProvider } from "@/components/ActiveGroupThemeProvider";
import { navThemeColors } from "@/lib/navTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { usePushNotificationRouting } from "@/hooks/usePushNotificationRouting";
import { usePushRegistration } from "@/hooks/usePushRegistration";

/**
 * Authenticated, in-a-group route group (M3 navigation shell). Wraps the
 * (tabs) group as a plain headerless stack so later M3/M4+ work can add
 * modal/detail screens here (e.g. a movie detail overlay) that sit above
 * the tab bar without needing to touch the tab layout itself.
 *
 * M10 (part): also the mount point for the two cross-cutting push-
 * notification concerns that need to run for the whole authenticated app,
 * not any one screen -- device token registration
 * (src/hooks/usePushRegistration.ts) and notification-tap deep-link routing
 * (src/hooks/usePushNotificationRouting.ts, including its cold-start path).
 * Mounted HERE rather than the root layout specifically so the cold-start
 * deep-link case can never race `useAuthGate()`'s initial redirect -- see
 * that hook's own doc comment for the full reasoning.
 */
export default function AppLayout() {
  const userId = useCurrentUserId();
  usePushRegistration(userId);
  usePushNotificationRouting();

  return (
    <ActiveGroupThemeProvider>
      <ThemedStack />
    </ActiveGroupThemeProvider>
  );
}

/** Stack inside the group theme: the navigation theme's `primary` follows the group accent. */
function ThemedStack() {
  const { colors } = useGroupTheme();
  const navTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, ...navThemeColors(colors.accent) } };
  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* Card (push) presentation, NOT "modal": a modal's first screen cannot be
        swiped back on iOS and breaks the pop-one-level stack order. */}
        <Stack.Screen name="(modals)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
