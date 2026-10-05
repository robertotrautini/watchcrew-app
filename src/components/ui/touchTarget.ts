import type { Insets } from "react-native";

/**
 * Accessibility touch-target minimums (docs/style-guide.md "Touch-Targets"):
 * Android/Material 48dp, iOS HIG 44pt. Visual size may stay smaller as long as
 * the pressable (size + hitSlop) reaches the minimum.
 */
export const MIN_TOUCH_TARGET = 48;
export const MIN_TOUCH_TARGET_IOS = 44;

/**
 * Star rating row: each star (and the heart) has a touch box 44 wide x 48 high. 44 = iOS minimum;
 * with 48 the glyph gap could not be tightened and 5 x 48 + heart 48 + reset 36 = 324 would only
 * just fit the 328dp content width of a 360dp phone. With 44: 5 x 44 + 44 + 36 = 300 (28dp spare).
 * The 40dp glyph leaves a 4dp visual gap. Adjacent boxes touch but never overlap (no hitSlop on stars).
 */
export const STAR_TOUCH_WIDTH = 44;

/**
 * hitSlop that grows a `width` x `height` control to at least `min` per axis
 * (half of the missing size per side, rounded up). `undefined` if it already fits.
 */
export function hitSlopFor(width: number, height: number, min: number = MIN_TOUCH_TARGET): Insets | undefined {
  const x = Math.max(0, Math.ceil((min - width) / 2));
  const y = Math.max(0, Math.ceil((min - height) / 2));
  if (x === 0 && y === 0) {
    return undefined;
  }
  return { top: y, bottom: y, left: x, right: x };
}

/** True when size + hitSlop reaches `min` on both axes. */
export function meetsMinTouchTarget(
  width: number,
  height: number,
  hitSlop?: Insets,
  min: number = MIN_TOUCH_TARGET,
): boolean {
  const w = width + (hitSlop?.left ?? 0) + (hitSlop?.right ?? 0);
  const h = height + (hitSlop?.top ?? 0) + (hitSlop?.bottom ?? 0);
  return w >= min && h >= min;
}

/** Small (~24dp high) coloured pills such as payer buttons: vertical hitSlop up to 48dp. */
export const SMALL_PILL_HIT_SLOP = hitSlopFor(48, 24);
