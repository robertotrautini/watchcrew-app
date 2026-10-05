export type SwipeDirection = "left" | "right";

/**
 * Pure tab-swipe target: swipe LEFT moves to the next visible tab, swipe RIGHT
 * to the previous one. No wrap-around (null at the edges / unknown tab).
 * `visibleTabs` is the ordered list of non-hidden tab route names (the tracker
 * tab is absent when the per-device tracker flag is off).
 */
export function getAdjacentTab(
  visibleTabs: readonly string[],
  current: string,
  direction: SwipeDirection,
): string | null {
  const index = visibleTabs.indexOf(current);
  if (index === -1) return null;
  const target = direction === "left" ? index + 1 : index - 1;
  return visibleTabs[target] ?? null;
}

/** Commit when dragged further than this fraction of the screen width. */
export const SWIPE_COMMIT_FRACTION = 0.18;
/** ...or when released faster than this (px/s, in swipe direction). */
export const SWIPE_COMMIT_VELOCITY = 550;
/** Minimum drag (dp) for a velocity-based commit, filters accidental twitches. */
export const SWIPE_FLING_MIN_DISTANCE = 24;
/** Horizontal movement (dp) before the pan activates / vertical movement (dp) that cancels it. */
export const SWIPE_ACTIVE_OFFSET_X = 10;
export const SWIPE_FAIL_OFFSET_Y = 15;

/**
 * Release decision (worklet-safe): `direction` is the finger's direction
 * ("left" = translationX < 0). Commits on distance > 18% of width or a fling
 * above 550 px/s in that direction (with a small minimum drag).
 */
export function shouldCommitSwipe(
  translationX: number,
  velocityX: number,
  width: number,
  direction: SwipeDirection,
): boolean {
  "worklet";
  const sign = direction === "left" ? -1 : 1;
  const dist = translationX * sign;
  const vel = velocityX * sign;
  if (dist > Math.max(width, 1) * SWIPE_COMMIT_FRACTION) return true;
  return vel > SWIPE_COMMIT_VELOCITY && dist >= SWIPE_FLING_MIN_DISTANCE;
}
