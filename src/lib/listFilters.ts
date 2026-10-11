import {
  DEFAULT_DIARY_SORT,
  DEFAULT_WATCHLIST_SORT,
  isSameSort,
  type SortState,
} from "./entrySorting";
import {
  ALL_PROVIDER_CATEGORIES,
  type ProviderCategory,
} from "./movieProviderFilter";
import type { YearFilterValue } from "./watchlistTypes";

// Persisted per-tab (global, NOT per group) Watchlist/Tagebuch controls (see usePreferencesStore
// `listFilters`) plus the small pure helpers the two tab screens share.
//
// The per-tab state is split in two INDEPENDENT parts: `sort` (field +
// direction) and `filters` (all combinable with AND). The Tagebuch `scope` is
// NOT part of it: it is one global setting (usePreferencesStore `diaryScope`).

export type ListFiltersTab = "watchlist" | "diary";

/** Tagebuch scope: own diary (rated by me) vs. group view (rated by anyone). */
export type DiaryScope = "my_diary" | "group";

/** Default Tagebuch scope: the active group's view. */
export const DEFAULT_DIARY_SCOPE: DiaryScope = "group";

export interface EntryFilters {
  genreIds: string[];
  year: YearFilterValue | null;
  /** "Meine Streaming-Dienste" filter; `providerCategories` only matter while on. */
  myStreaming: boolean;
  /** Active Flatrate/Leihen/Kaufen categories for the streaming filter (min. 1). */
  providerCategories: ProviderCategory[];
  liked: boolean;
  /** Watchlist: "Kommt noch". */
  upcoming: boolean;
  /** Watchlist: "Keine Bewertung". */
  unrated: boolean;
  /** Watchlist: "Mit Bewertungen". */
  hasRatings: boolean;
  /** Tagebuch: "Alle bewertet". */
  allRated: boolean;
  /** Tagebuch: "Fehlt noch". */
  missing: boolean;
}

export interface ListFilters {
  /** `null` = the tab's default sort. */
  sort: SortState | null;
  filters: EntryFilters;
}

export const DEFAULT_ENTRY_FILTERS: EntryFilters = {
  genreIds: [],
  year: null,
  myStreaming: false,
  providerCategories: ["flatrate"],
  liked: false,
  upcoming: false,
  unrated: false,
  hasRatings: false,
  allRated: false,
  missing: false,
};

export const DEFAULT_LIST_FILTERS: ListFilters = {
  sort: null,
  filters: DEFAULT_ENTRY_FILTERS,
};

export function defaultSortFor(tab: ListFiltersTab): SortState {
  return tab === "diary" ? DEFAULT_DIARY_SORT : DEFAULT_WATCHLIST_SORT;
}

/** The effective sort of a stored choice (stored sort, else the tab default). */
export function resolveSort(
  stored: ListFilters | undefined,
  tab: ListFiltersTab,
): SortState {
  return stored?.sort ?? defaultSortFor(tab);
}

/** Storage key of a tab's list settings: one global entry per tab. */
export function listFiltersKey(tab: ListFiltersTab): string {
  return tab;
}

/** The Flatrate/Leihen/Kaufen choice needs at least one active category. */
export function toggleProviderCategory(
  active: ProviderCategory[],
  category: ProviderCategory,
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

// ---------------------------------------------------------------------------
// Active filters <-> chips
// ---------------------------------------------------------------------------

/** One removable filter chip: `genre:<id>`, `year`, `streaming`, `liked`, ... */
export type FilterKey =
  | `genre:${string}`
  | "year"
  | "streaming"
  | "liked"
  | "upcoming"
  | "unrated"
  | "has_ratings"
  | "all_rated"
  | "missing";

/** Active filters of the tab as chip keys (tab-irrelevant filters are ignored). */
export function activeFilterKeys(
  filters: EntryFilters,
  tab: ListFiltersTab,
): FilterKey[] {
  const keys: FilterKey[] = filters.genreIds.map(
    (id): FilterKey => `genre:${id}`,
  );
  if (filters.year != null) keys.push("year");
  if (filters.myStreaming) keys.push("streaming");
  if (filters.liked) keys.push("liked");
  if (tab === "watchlist") {
    if (filters.upcoming) keys.push("upcoming");
    if (filters.unrated) keys.push("unrated");
    if (filters.hasRatings) keys.push("has_ratings");
  } else {
    if (filters.allRated) keys.push("all_rated");
    if (filters.missing) keys.push("missing");
  }
  return keys;
}

/** Filters without the given chip. */
export function removeFilterKey(
  filters: EntryFilters,
  key: FilterKey,
): EntryFilters {
  if (key.startsWith("genre:")) {
    const id = key.slice("genre:".length);
    return { ...filters, genreIds: filters.genreIds.filter((g) => g !== id) };
  }
  switch (key) {
    case "year":
      return { ...filters, year: null };
    case "streaming":
      return {
        ...filters,
        myStreaming: false,
        providerCategories: DEFAULT_ENTRY_FILTERS.providerCategories,
      };
    case "liked":
      return { ...filters, liked: false };
    case "upcoming":
      return { ...filters, upcoming: false };
    case "unrated":
      return { ...filters, unrated: false };
    case "has_ratings":
      return { ...filters, hasRatings: false };
    case "all_rated":
      return { ...filters, allRated: false };
    case "missing":
      return { ...filters, missing: false };
    default:
      return filters;
  }
}

/**
 * True when the collapsible filter panel hides any non-default choice (a
 * non-default sort or any active filter; NOT the view mode or the Tagebuch
 * scope, which are visible outside the panel) -> gold dot on the toggle.
 */
export function hasActiveListFilters(
  stored: ListFilters | undefined,
  tab: ListFiltersTab,
): boolean {
  const list = stored ?? DEFAULT_LIST_FILTERS;
  const sortActive =
    list.sort != null && !isSameSort(list.sort, defaultSortFor(tab));
  return sortActive || activeFilterKeys(list.filters, tab).length > 0;
}

// ---------------------------------------------------------------------------
// Migration of the old persisted shape ({ sortOption, genreIds, year,
// providerCategories }, where the sort option doubled as the filter mode).
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validCategories(value: unknown): ProviderCategory[] {
  if (!Array.isArray(value)) return DEFAULT_ENTRY_FILTERS.providerCategories;
  const valid = ALL_PROVIDER_CATEGORIES.filter((c) => value.includes(c));
  return valid.length > 0 ? valid : DEFAULT_ENTRY_FILTERS.providerCategories;
}

/**
 * Converts one stored entry (old or new shape) into the current `ListFilters`.
 *
 * Old `sortOption` -> new state: genre/year/my_streaming/liked/upcoming/
 * unrated/has_ratings/all_rated/missing become the matching filter (genre and
 * year keep their stored selection, the streaming filter keeps the stored
 * categories) with the default sort; `rating`/`added` -> default sort;
 * `tmdb_score` -> sort TMDB desc; `my_diary` -> sort "Gesehen am" desc.
 */
export function migrateListFilters(
  raw: unknown,
  tab: ListFiltersTab,
): ListFilters {
  if (!isObject(raw)) {
    return DEFAULT_LIST_FILTERS;
  }
  if (!("sortOption" in raw) && ("sort" in raw || "filters" in raw)) {
    const filters = isObject(raw.filters) ? raw.filters : {};
    return {
      sort: isObject(raw.sort) ? (raw.sort as unknown as SortState) : null,
      filters: {
        ...DEFAULT_ENTRY_FILTERS,
        ...(filters as Partial<EntryFilters>),
      },
    };
  }

  const option = typeof raw.sortOption === "string" ? raw.sortOption : null;
  const filters: EntryFilters = {
    ...DEFAULT_ENTRY_FILTERS,
    providerCategories: validCategories(raw.providerCategories),
  };
  let sort: SortState | null = null;
  switch (option) {
    case "genre":
      filters.genreIds = Array.isArray(raw.genreIds)
        ? raw.genreIds.filter((g): g is string => typeof g === "string")
        : [];
      break;
    case "year":
      filters.year =
        typeof raw.year === "number" || raw.year === "no_date"
          ? raw.year
          : null;
      break;
    case "my_streaming":
      filters.myStreaming = true;
      break;
    case "liked":
      filters.liked = true;
      break;
    case "upcoming":
      filters.upcoming = true;
      break;
    case "unrated":
      filters.unrated = true;
      break;
    case "has_ratings":
      filters.hasRatings = true;
      break;
    case "all_rated":
      filters.allRated = true;
      break;
    case "missing":
      filters.missing = true;
      break;
    case "tmdb_score":
      sort = { field: "tmdb", direction: "desc" };
      break;
    case "my_diary":
      sort = { field: "seen_at", direction: "desc" };
      break;
    default:
      // "rating", "added", null: default sort, no filter.
      break;
  }
  return { sort, filters };
}

/** `migrateListFilters` over the whole persisted record (key prefix = tab). */
export function migrateListFiltersRecord(
  raw: unknown,
): Record<string, ListFilters> {
  if (!isObject(raw)) {
    return {};
  }
  const result: Record<string, ListFilters> = {};
  for (const [key, value] of Object.entries(raw)) {
    const tab: ListFiltersTab = key.startsWith("diary:")
      ? "diary"
      : "watchlist";
    result[key] = migrateListFilters(value, tab);
  }
  return result;
}

/**
 * Collapses the old per-group record (`tab:groupId` keys) into one entry per
 * tab: the entry of `activeGroupId` if present, else the first stored one.
 */
export function collapseListFiltersPerTab(
  raw: unknown,
  activeGroupId: unknown,
): Record<string, ListFilters> {
  if (!isObject(raw)) {
    return {};
  }
  const result: Record<string, ListFilters> = {};
  for (const tab of ["watchlist", "diary"] as const) {
    if (tab in raw) {
      result[tab] = raw[tab] as ListFilters;
      continue;
    }
    const keys = Object.keys(raw).filter((k) => k.startsWith(`${tab}:`));
    const preferred =
      typeof activeGroupId === "string" && `${tab}:${activeGroupId}` in raw
        ? `${tab}:${activeGroupId}`
        : keys[0];
    if (preferred !== undefined) {
      result[tab] = raw[preferred] as ListFilters;
    }
  }
  return result;
}
