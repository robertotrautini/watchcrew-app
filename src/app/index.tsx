import { Redirect } from 'expo-router';

import { useAuthGate } from '@/hooks/useAuthGate';

/**
 * The app's initial route. Renders no content of its own — it only decides
 * which top-level route group to redirect into, based on `useAuthGate()`
 * (src/hooks/useAuthGate.ts):
 *   - no session                    -> (auth) login
 *   - session, no group memberships -> (onboarding) create-or-join-group
 *   - session, >=1 group membership -> (app)/(tabs) tracker
 *
 * While the gate is still resolving ('loading'), this renders nothing —
 * the root layout's AnimatedSplashOverlay (src/app/_layout.tsx) is still
 * covering the screen at that point in the normal cold-start sequence.
 */
export default function Index() {
  const gate = useAuthGate();

  switch (gate) {
    case 'auth':
      return <Redirect href="/(auth)/login" />;
    case 'onboarding':
      return <Redirect href="/(onboarding)/create-or-join-group" />;
    case 'app':
      return <Redirect href="/(app)/(tabs)/tracker" />;
    case 'loading':
    default:
      return null;
  }
}
