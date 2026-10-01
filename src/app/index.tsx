import { Redirect } from 'expo-router';

import { useAuthGate } from '@/hooks/useAuthGate';
import { homeRouteFor } from '@/lib/homeRoute';
import { usePendingInviteStore } from '@/stores/usePendingInviteStore';
import { usePreferencesStore } from '@/stores/usePreferencesStore';

/**
 * The app's initial route. Renders no content of its own — it only decides
 * which top-level route group to redirect into, based on `useAuthGate()`
 * (src/hooks/useAuthGate.ts):
 *   - no session                    -> (auth) login
 *   - session, no group memberships -> (onboarding) create-or-join-group
 *   - session, >=1 group membership -> (app)/(tabs) tracker (watchlist if the
 *     per-device Tracker flag is off)
 * A pending invite token (usePendingInviteStore) takes precedence once signed in.
 *
 * While the gate is still resolving ('loading'), this renders nothing —
 * the root layout's AnimatedSplashOverlay (src/app/_layout.tsx) is still
 * covering the screen at that point in the normal cold-start sequence.
 */
export default function Index() {
  const gate = useAuthGate();
  const pendingInviteToken = usePendingInviteStore((s) => s.token);
  const trackerEnabled = usePreferencesStore((s) => s.trackerEnabled);

  // Invite deep link opened while logged out: resume the join once signed in.
  if (pendingInviteToken && (gate === 'app' || gate === 'onboarding')) {
    return <Redirect href={`/join/${pendingInviteToken}`} />;
  }

  switch (gate) {
    case 'auth':
      return <Redirect href="/(auth)/login" />;
    case 'onboarding':
      return <Redirect href="/(onboarding)/create-or-join-group" />;
    case 'app':
      return <Redirect href={homeRouteFor(trackerEnabled)} />;
    case 'loading':
    default:
      return null;
  }
}
