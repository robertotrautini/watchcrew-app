/**
 * Android back-swipe for stack screens (docs/style-guide.md "Navigation").
 * The Android system back gesture only starts at the very screen edge; this
 * in-app pan additionally accepts a left-to-right swipe that starts anywhere
 * in the left part of the screen. iOS uses the native-stack
 * `fullScreenGestureEnabled` instead.
 */

/** Share of the window width (from the left) in which the back swipe may start. */
export const BACK_SWIPE_ZONE_FRACTION = 0.25;
/** Horizontal movement (dp) before the pan activates / vertical movement (dp) that cancels it. */
export const BACK_SWIPE_ACTIVE_OFFSET_X = 12;
export const BACK_SWIPE_FAIL_OFFSET_Y = 20;
/** Commit when dragged further than this fraction of the width... */
export const BACK_SWIPE_COMMIT_FRACTION = 0.25;
/** ...or released faster than this (px/s) after a minimum drag (dp). */
export const BACK_SWIPE_COMMIT_VELOCITY = 550;
export const BACK_SWIPE_FLING_MIN_DISTANCE = 24;

export function backSwipeZoneWidth(windowWidth: number): number {
  return windowWidth * BACK_SWIPE_ZONE_FRACTION;
}

/** Release decision (worklet-safe): only a mostly horizontal, left-to-right gesture pops. */
export function shouldCommitBackSwipe(
  translationX: number,
  translationY: number,
  velocityX: number,
  width: number,
): boolean {
  "worklet";
  if (translationX <= 0 || Math.abs(translationY) > translationX) return false;
  if (translationX > Math.max(width, 1) * BACK_SWIPE_COMMIT_FRACTION) return true;
  return velocityX > BACK_SWIPE_COMMIT_VELOCITY && translationX >= BACK_SWIPE_FLING_MIN_DISTANCE;
}
