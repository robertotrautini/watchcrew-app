import { getOwnSeenAt } from "@/lib/entrySelectors";
import { genreDisplayLabel } from "@/lib/diaryDisplay";
import type { EntryFilters, FilterKey } from "@/lib/listFilters";
import { getYearFromDate } from "@/lib/dateFormat";
import type { ProviderCategory } from "@/lib/movieProviderFilter";
import { getEffectiveReleaseDate } from "@/lib/watchlistLogic";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

// Genre/year helpers shared by the Tagebuch and Watchlist screens.

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  flatrate: "Flatrate",
  rent: "Leihen",
  buy: "Kaufen",
};

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
    const ownSeenAt = getOwnSeenAt(entry, currentUserId);
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

const FLAG_LABELS: Record<string, string> = {
  liked: "Mag ich",
  upcoming: "Kommt noch",
  unrated: "Keine Bewertung",
  has_ratings: "Mit Bewertungen",
  all_rated: "Alle bewertet",
  missing: "Fehlt noch",
};

/** Visible text of a filter chip. */
export function filterChipLabel(
  key: FilterKey,
  filters: EntryFilters,
  genreNamesById: ReadonlyMap<string, string>,
): string {
  if (key.startsWith("genre:")) {
    const id = key.slice("genre:".length);
    return genreDisplayLabel(id, genreNamesById.get(id));
  }
  if (key === "year") {
    return filters.year === "no_date" ? "Kein Datum" : String(filters.year);
  }
  if (key === "streaming") {
    return `Streaming: ${filters.providerCategories
      .map((c) => PROVIDER_CATEGORY_LABELS[c])
      .join(", ")}`;
  }
  return FLAG_LABELS[key] ?? key;
}
