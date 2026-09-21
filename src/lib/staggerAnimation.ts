/**
 * M11 (animation polish, see docs/interim-decisions.md "M11 — Animation"):
 * the "how long to delay this list item's fade-in, based on its position"
 * arithmetic, extracted into a small pure function so it's directly
 * unit-testable (per this task's own rules: platform/index-based branches
 * are real, testable logic; the animation's visual timing/easing itself is
 * not). Used by `src/components/ui/FadeInItem.tsx`, the shared wrapper for
 * MovieGrid/WatchlistPosterCard/DiaryPosterTile list entrances.
 */

/** Per-item stagger step. */
export const STAGGER_STEP_MS = 40;

/**
 * Caps the stagger after this many items so a long list's tail doesn't
 * take an increasingly, noticeably long time to finish appearing (e.g. a
 * 60-item grid wouldn't stagger for 2.4s straight) -- diminishing returns
 * on a "staggered" feel past the first screenful anyway.
 */
export const MAX_STAGGER_INDEX = 8;

export function computeStaggerDelayMs(index: number): number {
  const clampedIndex = Math.max(0, Math.min(index, MAX_STAGGER_INDEX));
  return clampedIndex * STAGGER_STEP_MS;
}
