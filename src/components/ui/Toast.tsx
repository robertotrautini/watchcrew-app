import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { DANGER_ICON_COLOR } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconRole } from "@/components/ui/Icon";
import {
  subscribeToToasts,
  type ToastOptions,
  type ToastVariant,
} from "@/lib/toast";

export const SUCCESS_ICON_COLOR = "#5fcf8a";
const CLOSE_ICON_COLOR = "#e8e8e8";

interface ToastVariantStyle {
  surface: string;
  tint: string | null;
  text: string;
  icon: IconRole | null;
  iconColor: string | null;
}

/**
 * Variant look (docs/style-guide.md "Toasts"): same flat glass surface + ONE 1px border for all;
 * success = green, error = red (tinted fill 15% + coloured border 40% + coloured text/icon,
 * analogous to the danger tokens), info = neutral accent border without tint/icon.
 */
export const TOAST_VARIANT_STYLES: Record<ToastVariant, ToastVariantStyle> = {
  info: {
    surface: "border-accent",
    tint: null,
    text: "text-text-primary",
    icon: null,
    iconColor: null,
  },
  success: {
    surface: "border-success/40",
    tint: "bg-success/15",
    text: "text-success-text",
    icon: "toastSuccess",
    iconColor: SUCCESS_ICON_COLOR,
  },
  error: {
    surface: "border-danger/40",
    tint: "bg-danger/15",
    text: "text-danger-text",
    icon: "toastError",
    iconColor: DANGER_ICON_COLOR,
  },
};

const TOAST_TINT_STYLE = { ...StyleSheet.absoluteFill, borderRadius: 11 };

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
  const [variant, setVariant] = useState<ToastVariant>("info");
  const [onPress, setOnPress] = useState<(() => void) | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(
    new Animated.Value(TOAST_ENTRANCE_TRANSLATE_Y),
  ).current;

  useEffect(() => {
    const unsubscribe = subscribeToToasts(
      (nextMessage: string, options?: ToastOptions) => {
        if (dismissTimer.current) {
          clearTimeout(dismissTimer.current);
        }
        setMessage(nextMessage);
        setVariant(options?.variant ?? "info");
        // Functional-updater form: a bare function value would be invoked by setState.
        setOnPress(
          options?.onPress ? () => options.onPress as () => void : null,
        );
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
      },
    );

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

  const look = TOAST_VARIANT_STYLES[variant];
  const text = (
    <View className="min-w-0 flex-1 flex-row items-center justify-center gap-2">
      {look.icon ? (
        <Icon
          testID="toast-icon"
          name={look.icon}
          size="M"
          color={look.iconColor ?? undefined}
        />
      ) : null}
      <Text
        testID="toast-message"
        className={`shrink text-center ${look.text}`}
      >
        {message}
      </Text>
    </View>
  );

  return (
    <Animated.View
      testID="toast-host"
      accessibilityLiveRegion={variant === "error" ? "assertive" : "polite"}
      className="absolute bottom-24 left-4 right-4"
      style={{ opacity, transform: [{ translateY }] }}
    >
      <Glass
        variant="panel"
        testID="toast-surface"
        className={`rounded-xl px-4 py-3 ${look.surface}`}
      >
        {look.tint ? (
          <View
            testID="toast-tint"
            pointerEvents="none"
            style={TOAST_TINT_STYLE}
            className={look.tint}
          />
        ) : null}
        <View className="flex-row items-center">
          {onPress ? (
            <Pressable
              testID="toast-press"
              accessibilityRole="button"
              className="min-w-0 flex-1"
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
          {/* 48dp touch box; negative margins cancel the surface padding so the toast keeps its height. */}
          <Pressable
            testID="toast-close"
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            className="-my-3 -mr-3 h-12 w-12 items-center justify-center"
            onPress={() => {
              if (dismissTimer.current) {
                clearTimeout(dismissTimer.current);
              }
              setMessage(null);
            }}
          >
            <Icon
              name="close"
              size="M"
              color={look.iconColor ?? CLOSE_ICON_COLOR}
            />
          </Pressable>
        </View>
      </Glass>
    </Animated.View>
  );
}
