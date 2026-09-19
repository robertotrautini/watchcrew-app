import { Stack } from 'expo-router';

/**
 * Onboarding route group (M3 navigation shell): shown to an authenticated
 * user with zero Watch-Group memberships (ADR 0003 — "create or join a
 * group" is a required app state, not optional). Screen CONTENT is
 * explicitly out of scope for this task — see create-or-join-group.tsx.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-or-join-group" />
    </Stack>
  );
}
