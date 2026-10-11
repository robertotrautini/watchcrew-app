import { Pressable, View, type GestureResponderEvent, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Flat dark glass surface: near-opaque dark fill (`GLASS_FLAT_FILL`, 95 %) +
 * single flat 1px faint white border + rounded corners. No blur anywhere
 * (docs/style-guide.md). Shared by Card, Toast, settings groups and similar surfaces.
 */
export type GlassVariant = "default" | "strong" | "panel";

/**
 * Flat Material border (docs/style-guide.md): ONE uniform 1px hairline in
 * `glass-border` (white 10%). No highlight, bottom edge, inner shadow or
 * drop shadow ("3D bevel" removed). Tokens in tailwind.config.js.
 */
export const GLASS_EDGE = "border border-glass-border";
/** Text inputs use the same single flat border (no recessed bevel). */
export const GLASS_INSET_EDGE = GLASS_EDGE;

export const GLASS_CLASSNAMES: Record<GlassVariant, string> = {
  default: `rounded-xl ${GLASS_EDGE}`,
  strong: `rounded-xl ${GLASS_EDGE}`,
  /** Large panels: toast, bottom action bar (sheet/tab bar reuse the same tokens). */
  panel: GLASS_EDGE,
};

/** Flat (square-cornered) row on a glass list/table card. */
export const GLASS_ROW_CLASSNAME = "border-b border-glass-border bg-card";

/** Shared rounded-row look (settings rows, action buttons). */
export const GLASS_TILE_CLASSNAME = `rounded-xl ${GLASS_EDGE} bg-card`;

/** Detail screen bottom action bar surface (top edge only). */
export const GLASS_BAR_CLASSNAME = "border-t border-glass-border";

/** The one fill of every glass surface; token in tailwind.config.js. */
export const GLASS_FLAT_FILL = "bg-bg-card-flat";

/** Sheet surface (straight top edge, top border only). */
export const GLASS_SHEET_CLASSNAME =
  "border-t border-glass-border bg-bg-card-flat";

/**
 * Tab bar needs raw style values (React Navigation `tabBarStyle`); keep them in
 * sync with the `bg-tab-bar` / `glass-border` tokens in tailwind.config.js.
 */
export const GLASS_TAB_BAR_STYLE = {
  backgroundColor: "rgba(10,10,12,0.95)",
  borderTopColor: "rgba(255,255,255,0.1)",
  borderTopWidth: 1,
} as const;

export interface GlassProps extends ViewProps {
  onPress?: (event: GestureResponderEvent) => void;
  variant?: GlassVariant;
}

export function Glass({ variant = "default", className, onPress, ...rest }: GlassProps) {
  const Root = (onPress ? Pressable : View) as typeof View;
  const rootProps = onPress ? { onPress, ...rest } : rest;
  return (
    <Root
      className={cn("overflow-hidden", GLASS_CLASSNAMES[variant], className, GLASS_FLAT_FILL)}
      {...rootProps}
    />
  );
}

/** Shared glass text-input look (auth, onboarding, settings forms). */
export const GLASS_INPUT_CLASSNAME = `rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-4 py-3 text-base text-text-primary`;

/** Recessed (darker) search input sitting inside a glass card. */
export const GLASS_SEARCH_INPUT_CLASSNAME = `flex-1 rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-3 py-2 text-text-primary`;
