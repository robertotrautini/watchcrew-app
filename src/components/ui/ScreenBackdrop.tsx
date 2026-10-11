import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { GLASS_FLAT_FILL } from "@/components/ui/Glass";

/**
 * Flat dark backdrop (docs/style-guide.md "Backdrop rule"): the projector photo
 * (root AppBackground) is covered by the shared flat fill (`GLASS_FLAT_FILL`,
 * 95 %), no blur. ONLY the three tabs (Tracker, Watchlist, Tagebuch) show the
 * undimmed photo. Static layer behind the content.
 */
export function ScreenBackdrop() {
  return (
    <View testID="screen-backdrop" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View testID="screen-backdrop-glass" className={`flex-1 ${GLASS_FLAT_FILL}`} />
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

/** Settings modal routes (flat backdrop). */
export const DIM_BACKDROP_ROUTES: readonly string[] = [
  "settings",
  "settings/streaming-services",
  "settings/display",
  "settings/notifications",
  "group-settings",
];

/** Root-stack routes outside the app shell (auth, onboarding, invite, reset callback) (flat backdrop). */
const ROOT_DIM_BACKDROP_ROUTES: readonly string[] = [
  "(auth)",
  "(onboarding)",
  "auth/callback",
  "join/[token]",
];

function layoutWithBackdrop(withBackdrop: boolean, children: ReactNode): ReactElement {
  if (!withBackdrop) {
    return <>{children}</>;
  }
  return (
    <View className="flex-1">
      <ScreenBackdrop />
      {children}
    </View>
  );
}

/** (modals) navigator `screenLayout`: every modal route gets the flat backdrop. */
export function screenBackdropLayout({
  route,
  children,
}: {
  route: { name: string };
  children: ReactNode;
}): ReactElement {
  return layoutWithBackdrop(true, children);
}

/** Root navigator `screenLayout`: flat backdrop for auth/onboarding/join/callback; app shell untouched. */
export function rootBackdropLayout({
  route,
  children,
}: {
  route: { name: string };
  children: ReactNode;
}): ReactElement {
  return layoutWithBackdrop(ROOT_DIM_BACKDROP_ROUTES.includes(route.name), children);
}
