/**
 * Shared date formatting. Plain calendar dates only ("YYYY-MM-DD", optionally
 * with a trailing time part, as Postgres `date`/`timestamp` come back) -- no
 * time-zone conversion.
 */

/** "YYYY-MM-DD" -> "DD.MM.YYYY"; `fallback` for null/empty input. */
export function formatPlainDate(dateStr: string | null, fallback = ""): string {
  if (!dateStr) {
    return fallback;
  }
  const [year, month, day] = dateStr.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

export function getYearFromDate(dateStr: string): number {
  return Number(dateStr.slice(0, 4));
}
