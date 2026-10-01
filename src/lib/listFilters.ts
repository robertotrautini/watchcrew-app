import { ALL_PROVIDER_CATEGORIES, type ProviderCategory } from "./movieProviderFilter";

// Persisted per tab+group Watchlist/Tagebuch controls (see usePreferencesStore
// `listFilters`) plus the small pure helpers the two tab screens share.

export interface ListFilters {
  /** `null` = the tab's default sort option. */
  sortOption: string | null;
  genreIds: string[];
  year: number | "no_date" | null;
  /** Active Flatrate/Leihen/Kaufen pills for 'my_streaming' (min. 1). */
  providerCategories: ProviderCategory[];
}

export type ListFiltersTab = "watchlist" | "diary";

export const DEFAULT_LIST_FILTERS: ListFilters = {
  sortOption: null,
  genreIds: [],
  year: null,
  providerCategories: ["flatrate"],
};

export function listFiltersKey(tab: ListFiltersTab, groupId: string): string {
  return `${tab}:${groupId}`;
}

/** Inventory 2.2: the Flatrate/Leihen/Kaufen pills need at least one active. */
export function toggleProviderCategory(
  active: ProviderCategory[],
  category: ProviderCategory
): ProviderCategory[] {
  const next = active.includes(category)
    ? active.filter((c) => c !== category)
    : [...active, category];
  if (next.length === 0) {
    return active;
  }
  return ALL_PROVIDER_CATEGORIES.filter((c) => next.includes(c));
}

/** "No results" copy: names an active (2+ chars) search, else the filter wording. */
export function getNoResultsMessage(searchQuery: string): string {
  const trimmed = searchQuery.trim();
  return trimmed.length >= 2
    ? `Keine Treffer für „${trimmed}“.`
    : "Keine Einträge für diese Auswahl.";
}
