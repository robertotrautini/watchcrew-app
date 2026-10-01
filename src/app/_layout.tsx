import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ToastHost } from '@/components/ui/Toast';
import { useQueryCacheLifecycle } from '@/hooks/useQueryCacheLifecycle';
import { initSentry } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';
import {
  PERSIST_BUSTER,
  PERSIST_MAX_AGE_MS,
  persistDehydrateOptions,
  queryPersister,
} from '@/lib/queryPersistence';

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
  useQueryCacheLifecycle();
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE_MS,
        buster: PERSIST_BUSTER,
        dehydrateOptions: persistDehydrateOptions,
      }}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
            StatusBar"): this app's own color palette (tailwind.config.js's
            `bg-primary`/`text-primary` etc.) is a single fixed dark theme --
            it does NOT follow `useColorScheme()` the way `ThemeProvider`
            above does (that only affects React Navigation's own native
            chrome, e.g. the header/tab-bar background React Navigation
            manages internally). Without an explicit `<StatusBar>` here, the
            OS default status-bar style would still follow the DEVICE's own
            light/dark setting, silently flipping to dark (on-light)
            icons/text on a light-mode device -- invisible against this
            app's near-black background. `style="light"` is therefore a
            fixed, deliberate choice, not a `colorScheme`-driven one. */}
        <StatusBar style="light" />
        <AnimatedSplashOverlay />
        <OfflineBanner />
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
    </PersistQueryClientProvider>
  );
}
