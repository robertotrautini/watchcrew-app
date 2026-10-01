import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text } from "react-native";

import { Glass } from "@/components/ui/Glass";
import { subscribeToToasts, type ToastOptions } from "@/lib/toast";

/**
 * How long a toast stays visible before auto-dismissing. 4 seconds --
 * enough to read a short one-line German sentence without lingering,
 * matching the task brief's own suggestion. See docs/interim-decisions.md
 * "M10 — Toast-Anzeigedauer".
 */
const TOAST_DURATION_MS = 4000;

/**
 * M11 (animation polish, see docs/interim-decisions.md "M11 — Animation"):
 * a short fade+slide-up entrance, replacing the previous abrupt
 * show/hide. Deliberately entrance-only, not a mirrored fade-OUT on
 * dismiss -- animating the exit would mean deferring the actual unmount
 * until the animation finishes, which would push this component's exact,
 * already-tested `TOAST_DURATION_MS` dismiss timing (see Toast.test.tsx)
 * later by the animation's duration. Given this is a spare-time MVP
 * project (no deadline pressure, per CLAUDE.md), the fade-out was judged
 * not worth the added complexity/test fragility for a toast that's this
 * short-lived anyway -- documented trade-off, not an oversight. Timing/
 * easing values themselves are unverified visually (this environment
 * cannot render animations), per this task's own instructions.
 */
const TOAST_ENTRANCE_DURATION_MS = 200;
const TOAST_ENTRANCE_TRANSLATE_Y = 12;

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
  const [onPress, setOnPress] = useState<(() => void) | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(TOAST_ENTRANCE_TRANSLATE_Y)).current;

  useEffect(() => {
    const unsubscribe = subscribeToToasts((nextMessage: string, options?: ToastOptions) => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
      setMessage(nextMessage);
      // Functional-updater form: a bare function value would be invoked by setState.
      setOnPress(options?.onPress ? () => options.onPress as () => void : null);
      // Restart the entrance animation from its initial values every time a
      // toast is (re-)shown, including the "replaces an in-flight toast"
      // case -- each new message gets its own fresh fade+slide-in.
      opacity.setValue(0);
      translateY.setValue(TOAST_ENTRANCE_TRANSLATE_Y);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: TOAST_ENTRANCE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: TOAST_ENTRANCE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
      dismissTimer.current = setTimeout(
        () => setMessage(null),
        options?.durationMs ?? TOAST_DURATION_MS,
      );
    });

    return () => {
      unsubscribe();
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [opacity, translateY]);

  if (message == null) {
    return null;
  }

  const text = (
    <Text testID="toast-message" className="text-center text-text-primary">
      {message}
    </Text>
  );

  return (
    <Animated.View
      testID="toast-host"
      className="absolute bottom-24 left-4 right-4"
      style={{ opacity, transform: [{ translateY }] }}
    >
      <Glass variant="strong" testID="toast-surface" className="border-accent px-4 py-3">
        {onPress ? (
          <Pressable
            testID="toast-press"
            accessibilityRole="button"
            onPress={() => {
              if (dismissTimer.current) {
                clearTimeout(dismissTimer.current);
              }
              setMessage(null);
              onPress();
            }}
          >
            {text}
          </Pressable>
        ) : (
          text
        )}
      </Glass>
    </Animated.View>
  );
}
