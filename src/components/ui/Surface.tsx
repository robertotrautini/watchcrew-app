import { Pressable, View, type GestureResponderEvent, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Flat dark surface: near-opaque dark fill (`SURFACE_FILL`, 95 %) +
 * single flat 1px faint white border + rounded corners. No blur anywhere
 * (docs/style-guide.md). Shared by Card, Toast, settings groups and similar surfaces.
 */
export type SurfaceVariant = "default" | "strong" | "panel" | "solid";

/**
 * Flat Material border (docs/style-guide.md): ONE uniform 1px hairline in
 * `surface-border` (white 10%). No highlight, bottom edge, inner shadow or
 * drop shadow ("3D bevel" removed). Tokens in tailwind.config.js.
 */
export const SURFACE_EDGE = "border border-surface-border";

export const SURFACE_CLASSNAMES: Record<SurfaceVariant, string> = {
  default: `rounded-xl ${SURFACE_EDGE}`,
  strong: `rounded-xl ${SURFACE_EDGE}`,
  /** Fully opaque black (#000) card, like tab bar / sheet intent: filter panels. */
  solid: `rounded-xl ${SURFACE_EDGE}`,
  /** Large panels: toast, bottom action bar (sheet/tab bar reuse the same tokens). */
  panel: SURFACE_EDGE,
};

/** Shared rounded-row look (settings rows, action buttons). */
export const SURFACE_TILE_CLASSNAME = `rounded-xl ${SURFACE_EDGE} bg-card`;

/** Detail screen bottom action bar surface (top edge only). */
export const SURFACE_BAR_CLASSNAME = "border-t border-surface-border";

/** The one fill of every surface; token in tailwind.config.js. */
export const SURFACE_FILL = "bg-bg-card-flat";

/**
 * Tab bar needs raw style values (React Navigation `tabBarStyle`); keep them in
 * sync with the `bg-tab-bar` / `surface-border` tokens in tailwind.config.js.
 */
export const TAB_BAR_STYLE = {
  backgroundColor: "rgba(10,10,12,0.95)",
  borderTopColor: "rgba(255,255,255,0.16)",
  borderTopWidth: 1,
} as const;

/**
 * Panel shadow = stacked, equally rounded black layers directly BEHIND the
 * opaque panel (see PanelShadow), each shifted 1dp further down with falling
 * opacity. They only show below / around the lower corners of the panel. No
 * elevation / shadow* (Android elevation paints a square shadow).
 */
export const PANEL_SHADOW_LAYERS = 12;
/** Resulting (compounded) darkness right below the panel edge; fades to 0. */
export const PANEL_SHADOW_PEAK_OPACITY = 0.52;
/** Panel wrapper must sit above the list so it covers the list's top edge. */
export const PANEL_Z_INDEX = 10;
/** Panel corner radius in dp (= Tailwind `rounded-xl`). */
export const PANEL_RADIUS = 12;
/** Radius class, must match PANEL_RADIUS. */
export const PANEL_RADIUS_CLASSNAME = "rounded-xl";
/**
 * The list container starts this many dp higher (under the panel) so rows are
 * only hidden by the rounded panel, not cut by a straight list edge. Must equal
 * (at least) PANEL_RADIUS; `-mt-3` is the matching class (12dp).
 */
export const PANEL_LIST_OVERLAP = 12;
export const PANEL_LIST_OVERLAP_CLASSNAME = "-mt-3";
/**
 * Visible air between panel bottom and first row at scroll position 0 (dp) is
 * EXACTLY the vertical gap between two rows of the same view: cards/list 12
 * (`h-3`/`gap-3`, = panel top margin `mt-3`), poster grid 8 (`h-2`/`gap-2`).
 * Keep these in sync with the row gaps in entries/EntryList.
 */
export const PANEL_LIST_START_GAP = 12;
export const PANEL_LIST_GRID_START_GAP = 8;
/**
 * contentContainer top padding = PANEL_LIST_OVERLAP + start gap. Literals so
 * NativeWind sees them; lists must use these for `pt`.
 * Cards + list/table: 12 + 12 = 24 dp. Grid: 12 + 8 = 20 dp.
 */
export const PANEL_LIST_CONTENT_PT_CLASSNAME = "pt-[24px]";
export const PANEL_LIST_GRID_CONTENT_PT_CLASSNAME = "pt-[20px]";

/**
 * Per-layer opacity for PANEL_SHADOW_LAYERS stacked layers (layer i is offset
 * i+1 dp and therefore covers depths 1..i+1). Values are chosen so the
 * COMPOUNDED darkness at depth d is peak * (1 - (d-1)/n)^2, i.e. a quadratic
 * ease from the peak down to ~0, and every layer value is below the previous.
 */
export function panelShadowOpacities(
  layers: number = PANEL_SHADOW_LAYERS,
  peak: number = PANEL_SHADOW_PEAK_OPACITY,
): number[] {
  const target = (d: number) => peak * Math.max(0, 1 - (d - 1) / layers) ** 2;
  return Array.from({ length: layers }, (_, k) => {
    const survive = (1 - target(k + 1)) / (1 - target(k + 2));
    return 1 - survive;
  });
}

export interface SurfaceProps extends ViewProps {
  onPress?: (event: GestureResponderEvent) => void;
  variant?: SurfaceVariant;
}

export function Surface({ variant = "default", className, onPress, ...rest }: SurfaceProps) {
  const Root = (onPress ? Pressable : View) as typeof View;
  const rootProps = onPress ? { onPress, ...rest } : rest;
  return (
    <Root
      className={cn("overflow-hidden", SURFACE_CLASSNAMES[variant], className, variant === "solid" ? "bg-black" : SURFACE_FILL)}
      {...rootProps}
    />
  );
}

/** Shared surface text-input look (auth, onboarding, settings forms). */
export const SURFACE_INPUT_CLASSNAME = `rounded-lg ${SURFACE_EDGE} bg-black/35 px-4 py-3 text-base text-text-primary`;

/** Recessed (darker) search input sitting inside a surface card. */
export const SURFACE_SEARCH_INPUT_CLASSNAME = `flex-1 rounded-lg ${SURFACE_EDGE} bg-black/35 px-3 py-2 text-text-primary`;
