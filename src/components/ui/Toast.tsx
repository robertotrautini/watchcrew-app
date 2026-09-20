import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";

import { Card } from "@/components/ui/Card";
import { subscribeToToasts } from "@/lib/toast";

/**
 * How long a toast stays visible before auto-dismissing. 4 seconds --
 * enough to read a short one-line German sentence without lingering,
 * matching the task brief's own suggestion. See docs/interim-decisions.md
 * "M10 — Toast-Anzeigedauer".
 */
const TOAST_DURATION_MS = 4000;

/**
 * M10 (Realtime foreground sync, ADR 0006): the single toast host, mounted
 * once near the app root (src/app/_layout.tsx). Subscribes to
 * src/lib/toast.ts's `showToast(...)` pub/sub (called from
 * src/hooks/useGroupRealtimeSync.ts for the "foreground, on a different
 * screen" ADR-0006 branch) and renders the most recent message for
 * `TOAST_DURATION_MS`, then auto-dismisses.
 *
 * Deliberately NOT tap-to-navigate (documented choice, see
 * docs/interim-decisions.md "M10 — Toast: kein Tap-to-Navigate") -- the
 * toast text alone doesn't carry a specific movie/screen target (see
 * src/lib/realtimeSync.ts's generic, name-free copy), so a tap target would
 * only be able to navigate to "the affected tab" in general, which the user
 * can already reach via the normal tab bar; not worth the extra plumbing
 * for this task.
 */
export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((nextMessage) => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
      setMessage(nextMessage);
      dismissTimer.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
    });

    return () => {
      unsubscribe();
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, []);

  if (message == null) {
    return null;
  }

  return (
    <Card testID="toast-host" className="absolute bottom-24 left-4 right-4 px-4 py-3">
      <Text testID="toast-message" className="text-center text-text-primary">
        {message}
      </Text>
    </Card>
  );
}
