import { getYearFromDate } from "@/lib/dateFormat";
import type { ProviderCategory } from "@/lib/movieProviderFilter";
import { getEffectiveReleaseDate } from "@/lib/watchlistLogic";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

// Genre/year/sort helpers shared by the Tagebuch and Watchlist screens.

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  flatrate: "Flatrate",
  rent: "Leihen",
  buy: "Kaufen",
};

export interface SortOptionItem<T extends string> {
  key: T;
  label: string;
}

export function sortOptionLabel<T extends string>(
  options: ReadonlyArray<SortOptionItem<T>>,
  option: T,
): string {
  return options.find((o) => o.key === option)?.label ?? option;
}

/** Distinct genre ids across the entries (first-seen order, or sorted). */
export function getDistinctGenreIds(
  entries: WatchlistEntry[],
  sorted = false,
): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    for (const link of entry.movie.movie_genres ?? []) {
      ids.add(link.genre_id);
    }
  }
  const result = Array.from(ids);
  return sorted ? result.sort() : result;
}

/** Distinct release years (ascending), for the Watchlist "Nach Jahr" pills. */
export function deriveReleaseYears(entries: WatchlistEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) {
    const releaseDate = getEffectiveReleaseDate(entry);
    if (releaseDate != null) {
      years.add(getYearFromDate(releaseDate));
    }
  }
  return Array.from(years).sort((a, b) => a - b);
}

/** The current user's own seen_at years (descending) plus whether any entry has none, for the Tagebuch "Nach Jahr" pills. */
export function deriveSeenYears(
  entries: WatchlistEntry[],
  currentUserId: string,
): { years: number[]; hasNoDate: boolean } {
  const years = new Set<number>();
  let hasNoDate = false;
  for (const entry of entries) {
    const ownSeenAt =
      entry.ratings.find((r) => r.member_id === currentUserId)?.seen_at ?? null;
    if (ownSeenAt == null) {
      hasNoDate = true;
    } else {
      years.add(getYearFromDate(ownSeenAt));
    }
  }
  return { years: Array.from(years).sort((a, b) => b - a), hasNoDate };
}

export function toggleGenreId(selected: string[], genreId: string): string[] {
  return selected.includes(genreId)
    ? selected.filter((id) => id !== genreId)
    : [...selected, genreId];
}
