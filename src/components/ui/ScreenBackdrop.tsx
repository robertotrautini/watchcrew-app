import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { GlassBlur } from "@/components/ui/GlassBlur";

/**
 * Smoked-glass backdrop (docs/style-guide.md "Backdrop rule"). The busy
 * projector photo (root AppBackground) is blurred hard and tinted dark so
 * content reads cleanly. ONLY the three tabs (Tracker, Watchlist, Tagebuch)
 * show the undimmed photo; every other screen uses one of two levels:
 *  - "calm" (black 70%): detail-style routes (movie detail = reference look).
 *  - "dim"  (black 80%): settings, group settings, auth, onboarding, join.
 * Static layer behind the content (no per-row blur, so scrolling costs
 * nothing). Without expo-blur the opaque fallback tint is used.
 */
export type ScreenBackdropLevel = "calm" | "dim";

export const SCREEN_BACKDROP_BLUR_INTENSITY = 90;
export const SCREEN_BACKDROP_LEVELS: Record<ScreenBackdropLevel, { tint: string; fallback: string }> = {
  calm: { tint: "bg-black/70", fallback: "bg-black/85" },
  dim: { tint: "bg-black/80", fallback: "bg-black/90" },
};
export const SCREEN_BACKDROP_TINT_CLASSNAME = SCREEN_BACKDROP_LEVELS.calm.tint;
export const SCREEN_BACKDROP_FALLBACK_CLASSNAME = SCREEN_BACKDROP_LEVELS.calm.fallback;

export function ScreenBackdrop({ level = "calm" }: { level?: ScreenBackdropLevel }) {
  return (
    <View testID="screen-backdrop" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <GlassBlur
        testID="screen-backdrop-glass"
        className="flex-1"
        intensity={SCREEN_BACKDROP_BLUR_INTENSITY}
        blurClassName={SCREEN_BACKDROP_LEVELS[level].tint}
        fallbackClassName={SCREEN_BACKDROP_LEVELS[level].fallback}
      />
    </View>
  );
}

/** Detail-style modal routes: calm level. */
export const CALM_BACKDROP_ROUTES: readonly string[] = [
  "movie/[tmdbId]",
  "add-movie",
  "similar/[tmdbId]",
  "collection/[collectionId]",
  "filmography/director/[personId]",
  "filmography/actor/[personId]",
  "filmography/studio/[companyId]",
];

/** Settings modal routes: dim level. */
export const DIM_BACKDROP_ROUTES: readonly string[] = [
  "settings",
  "settings/streaming-services",
  "settings/display",
  "settings/notifications",
  "settings/delete-account",
  "group-settings",
];

/** Root-stack routes outside the app shell (auth, onboarding, invite, reset callback): dim level. */
export const ROOT_DIM_BACKDROP_ROUTES: readonly string[] = [
  "(auth)",
  "(onboarding)",
  "auth/callback",
  "join/[token]",
];

function layoutWithBackdrop(level: ScreenBackdropLevel | null, children: ReactNode): ReactElement {
  if (level == null) {
    return <>{children}</>;
  }
  return (
    <View className="flex-1">
      <ScreenBackdrop level={level} />
      {children}
    </View>
  );
}

/** (modals) navigator `screenLayout`: every modal route gets a backdrop (calm, settings dim). */
export function screenBackdropLayout({
  route,
  children,
}: {
  route: { name: string };
  children: ReactNode;
}): ReactElement {
  return layoutWithBackdrop(DIM_BACKDROP_ROUTES.includes(route.name) ? "dim" : "calm", children);
}

/** Root navigator `screenLayout`: dim backdrop for auth/onboarding/join/callback; app shell untouched. */
export function rootBackdropLayout({
  route,
  children,
}: {
  route: { name: string };
  children: ReactNode;
}): ReactElement {
  return layoutWithBackdrop(ROOT_DIM_BACKDROP_ROUTES.includes(route.name) ? "dim" : null, children);
}
