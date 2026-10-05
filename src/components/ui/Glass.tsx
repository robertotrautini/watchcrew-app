import { type GestureResponderEvent, type ViewProps } from "react-native";

import { GlassBlur } from "@/components/ui/GlassBlur";
import { cn } from "@/lib/utils";

/**
 * Legacy "glassmorphism" surface: translucent dark fill + single flat 1px faint white
 * border + rounded corners. Large panels (toast, bars, tab bar) get real blur
 * via GlassBlur (expo-blur) with the tinted fill as fallback; cards/rows stay
 * plain tinted fills (performance). See docs/interim-decisions.md "Echter Blur". Shared by Card, Toast and similar surfaces.
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
  /** Fill comes from GlassBlur (blurred tint, or bg-sheet fallback). */
  panel: GLASS_EDGE,
};

/** Flat (square-cornered) row on a glass list/table card. */
export const GLASS_ROW_CLASSNAME = "border-b border-glass-border bg-card";

/** Shared rounded-row look (settings rows, action buttons). */
export const GLASS_TILE_CLASSNAME = `rounded-xl ${GLASS_EDGE} bg-card`;

/** Detail screen bottom action bar surface (top edge only). */
export const GLASS_BAR_CLASSNAME = "border-t border-glass-border";

/** Fills for blurred (translucent tint over BlurView) vs. fallback (near-opaque) surfaces. */
export const GLASS_PANEL_FALLBACK_FILL = "bg-bg-sheet";
export const GLASS_PANEL_BLUR_FILL = "bg-bg-sheet-blur";

/** Sheet surface (rounded top corners). */
export const GLASS_SHEET_CLASSNAME =
  "rounded-t-xl border-t border-glass-border bg-bg-sheet";

/**
 * Tab bar needs raw style values (React Navigation `tabBarStyle`); keep them in
 * sync with the `bg-tab-bar` / `glass-border` tokens in tailwind.config.js.
 * When blur is available the bar background is transparent and a GlassBlur is
 * rendered via `tabBarBackground` (see GLASS_TAB_BAR_BLUR_STYLE).
 */
export const GLASS_TAB_BAR_STYLE = {
  backgroundColor: "rgba(12,12,14,0.96)",
  borderTopColor: "rgba(255,255,255,0.1)",
  borderTopWidth: 1,
} as const;

export const GLASS_TAB_BAR_BLUR_STYLE = {
  ...GLASS_TAB_BAR_STYLE,
  backgroundColor: "transparent",
} as const;

export interface GlassProps extends ViewProps {
  onPress?: (event: GestureResponderEvent) => void;
  variant?: GlassVariant;
}

const GLASS_VARIANT_FILLS: Record<
  GlassVariant,
  { fallback: string; blur: string }
> = {
  default: { fallback: "bg-bg-glass", blur: "bg-bg-card-blur" },
  strong: { fallback: "bg-bg-glass-strong", blur: "bg-bg-glass-strong-blur" },
  panel: { fallback: GLASS_PANEL_FALLBACK_FILL, blur: GLASS_PANEL_BLUR_FILL },
};

export function Glass({ variant = "default", className, ...rest }: GlassProps) {
  {
    return (
      <GlassBlur
        className={cn(GLASS_CLASSNAMES[variant], className)}
        fallbackClassName={GLASS_VARIANT_FILLS[variant].fallback}
        blurClassName={GLASS_VARIANT_FILLS[variant].blur}
        {...rest}
      />
    );
  }
}

/** Shared glass text-input look (auth, onboarding, settings forms). */
export const GLASS_INPUT_CLASSNAME = `rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-4 py-3 text-base text-text-primary`;

/** Recessed (darker) search input sitting inside a glass card. */
export const GLASS_SEARCH_INPUT_CLASSNAME = `flex-1 rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-3 py-2 text-text-primary`;
