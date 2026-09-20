import { Stack } from 'expo-router';

/**
 * Authenticated, in-a-group route group (M3 navigation shell). Wraps the
 * (tabs) group as a plain headerless stack so later M3/M4+ work can add
 * modal/detail screens here (e.g. a movie detail overlay) that sit above
 * the tab bar without needing to touch the tab layout itself.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(modals)" options={{ presentation: "modal", headerShown: false }} />
    </Stack>
  );
}
