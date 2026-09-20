import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastHost } from '@/components/ui/Toast';
import { initSentry } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';

initSentry();

SplashScreen.preventAutoHideAsync();

/**
 * Root layout (M3 navigation shell). This only sets up cross-cutting
 * providers (theme, splash, fonts — unchanged from M0/M1/M2) and declares
 * the three top-level route groups as plain Stack screens. The actual
 * auth-state/group-membership redirect DECISION lives in `src/app/index.tsx`
 * via `useAuthGate()` (src/hooks/useAuthGate.ts) — this file does not
 * duplicate that logic, it just gives the groups somewhere to mount.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Headings/brand font per docs/adr/0007-client-tech-stack.md — weights
  // 400/700 + italic, matching the `font-display*` Tailwind tokens in
  // tailwind.config.js. The splash screen (prevented above) keeps covering
  // the app until these are ready, same as the existing AnimatedSplashOverlay
  // gate.
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold_Italic,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // M4 data layer: QueryClientProvider is the outermost element so the
    // TanStack Query cache (src/lib/queryClient.ts) is available to any
    // screen, including auth-dependent ones inside (auth)/(onboarding)/(app)
    // that need to read/mutate Supabase server-state via query hooks.
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(app)" />
        </Stack>
        {/* M10 (Realtime foreground sync, ADR 0006): mounted once here so
            src/lib/toast.ts's `showToast(...)` (called from
            src/hooks/useGroupRealtimeSync.ts) has somewhere to render,
            app-wide, regardless of which route group is active. Purely
            additive -- doesn't touch the Sentry/font/QueryClientProvider/
            auth-gate logic above. */}
        <ToastHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
