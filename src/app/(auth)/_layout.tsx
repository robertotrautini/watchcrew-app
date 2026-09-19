import { Stack } from 'expo-router';

/**
 * Unauthenticated route group (M3 navigation shell). Screen CONTENT (real
 * login/register form fields) is explicitly out of scope for this task —
 * see login.tsx / register.tsx placeholders — this layout only wires the
 * two screens into a headerless stack.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
