/**
 * `React.memo` comparator: shallow-equal props, ignoring `index`. List rows get
 * their position only to stagger the first fade-in (FadeInItem freezes it at
 * mount); a changed position (sort direction flip) must not re-render the row.
 */
export function propsEqualIgnoringIndex<P extends { index?: number }>(
  prev: P,
  next: P,
): boolean {
  const prevKeys = Object.keys(prev) as (keyof P)[];
  if (prevKeys.length !== Object.keys(next).length) return false;
  for (const key of prevKeys) {
    if (key === "index") continue;
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
}
