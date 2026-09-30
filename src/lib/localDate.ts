/**
 * Local-calendar-date helpers. `Date#toISOString()` is UTC, so
 * `toISOString().slice(0, 10)` yields the UTC date -- wrong (one day behind)
 * for users east of UTC shortly after local midnight. All "today" / picked-date
 * derivations for date-only (YYYY-MM-DD) values must go through here.
 */
export function toLocalIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` into a Date at local midnight (inverse of `toLocalIsoDate`). */
export function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
