/**
 * Parallax math for the app background (pure; used from Reanimated worklets
 * too, hence the 'worklet' directives).
 *
 * Framing: the ORIGINAL legacy photo (1920x1280 landscape) is fitted to 100%
 * of the screen height (no zoom, no vertical overscan, no vertical parallax).
 * Horizontal parallax only: the photo's real horizontal slack is spread
 * evenly over the N swipeable tabs, minus an inset at both extremes
 * (BG_PARALLAX_EDGE_INSET_DP; docs/interim-decisions.md "Hintergrund v2").
 */
/** Pixel size of assets/images/cinema-bg.jpg (original Unsplash w=1920 file of the legacy app). */
export const BG_IMAGE_WIDTH = 1920;
export const BG_IMAGE_HEIGHT = 1280;
export const BG_IMAGE_ASPECT = BG_IMAGE_WIDTH / BG_IMAGE_HEIGHT;
/** Legacy look: colour photo, luminosity blend (= greyscale) over the dark app background at this opacity. */
export const BG_IMAGE_OPACITY = 0.6;
export const TAB_PAN_DURATION_MS = 600;
/**
 * Both extreme tabs stay this many dp away from the photo edge (first tab:
 * translateX = -inset, last: -(slack - inset)) so the projector start / lens stay
 * visible and the motion is less extreme. ~140 physical px on a 3.5x phone.
 */
export const BG_PARALLAX_EDGE_INSET_DP = 40;

export interface BackgroundLayout {
  boxWidth: number;
  boxHeight: number;
  /** Scale factor image px -> dp. */
  scale: number;
  left: number;
  top: number;
  /** Horizontal overhang of the photo beyond the screen (total, both sides). */
  slackX: number;
}

/** Height-fit; falls back to cover (centred vertically) if the screen is wider than the fitted photo. */
export function backgroundLayout(screenWidth: number, screenHeight: number): BackgroundLayout {
  const scale = Math.max(screenHeight / BG_IMAGE_HEIGHT, screenWidth / BG_IMAGE_WIDTH);
  const boxWidth = BG_IMAGE_WIDTH * scale;
  const boxHeight = BG_IMAGE_HEIGHT * scale;
  return {
    boxWidth,
    boxHeight,
    scale,
    left: 0,
    top: (screenHeight - boxHeight) / 2,
    slackX: boxWidth - screenWidth,
  };
}

/** Index of a tab route name within the visible tabs, null for non-tab segments. */
export function tabIndexOf(tab: string, visibleTabs: readonly string[]): number | null {
  const i = visibleTabs.indexOf(tab);
  return i === -1 ? null : i;
}

/** Pan fraction 0..1 for a (fractional) tab index among `count` tabs; 0.5 (centred) for a single tab. */
export function tabPanFraction(index: number, count: number): number {
  "worklet";
  if (count <= 1) return 0.5;
  return Math.min(Math.max(index / (count - 1), 0), 1);
}

/** Horizontal translate: fraction 0 = -inset, fraction 1 = -(slackX - inset), inset clamped to slackX/2. */
export function parallaxTranslateX(fraction: number, slackX: number): number {
  "worklet";
  const inset = Math.min(BG_PARALLAX_EDGE_INSET_DP, Math.max(slackX, 0) / 2);
  return -(inset + fraction * (slackX - 2 * inset));
}

/** Fractional tab index while dragging: one screen width of drag = one tab, clamped to the tab range. */
export function swipeTabProgress(startIndex: number, translationX: number, screenWidth: number, count: number): number {
  "worklet";
  const raw = startIndex - translationX / Math.max(screenWidth, 1);
  return Math.min(Math.max(raw, 0), Math.max(count - 1, 0));
}
