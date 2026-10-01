import { Stack } from 'expo-router';

import { useChangelogStartupToast } from '@/hooks/useChangelogStartupToast';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { usePushNotificationRouting } from '@/hooks/usePushNotificationRouting';
import { usePushRegistration } from '@/hooks/usePushRegistration';

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
  useChangelogStartupToast();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(modals)" options={{ presentation: "modal", headerShown: false }} />
    </Stack>
  );
}
