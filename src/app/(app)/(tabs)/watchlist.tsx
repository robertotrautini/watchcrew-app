import { GlassBlur } from "@/components/ui/GlassBlur";
import { useParallaxScroll } from "@/components/parallaxContext";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";

import { WatchlistPosterCard } from "@/components/movie/WatchlistPosterCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { Chip } from "@/components/ui/Chip";
import { Button, BUTTON_ICON_COLORS } from "@/components/ui/Button";
import { CollapsibleFilterPanel } from "@/components/ui/CollapsibleFilterPanel";
import { GLASS_SEARCH_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { isGridPlaceholder, padToFullRows } from "@/lib/gridPadding";
import { SortButton } from "@/components/ui/SortButton";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import { Sheet } from "@/components/ui/Sheet";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMyStreamingProviders } from "@/hooks/useMyStreamingProviders";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import {
  WATCHLIST_SORT_SHORT_LABELS,
  DEFAULT_LIST_FILTERS,
  getNoResultsMessage,
  hasActiveListFilters,
  listFiltersKey,
  toggleProviderCategory,
} from "@/lib/listFilters";
import { navigateToMovieDetail } from "@/lib/movieDetailNavigation";
import {
  ALL_PROVIDER_CATEGORIES,
  type ProviderCategory,
} from "@/lib/movieProviderFilter";
import { deriveGenreNamesById, genreDisplayLabel } from "@/lib/diaryDisplay";
import {
  filterByGenre,
  filterByYear,
  getEffectiveReleaseDate,
  searchEntries,
  sortWatchlist,
  splitWatchlistAndDiary,
  withEffectiveReleaseDate,
} from "@/lib/watchlistLogic";
import type {
  WatchlistEntry,
  WatchlistSortOption,
  YearFilterValue,
} from "@/lib/watchlistTypes";
import {
  usePreferencesStore,
  type WatchlistViewMode,
} from "@/stores/usePreferencesStore";

/**
 * Real Watchlist screen content (M5 part 2), replacing the earlier
 * placeholder. See docs/feature-inventory.md's Watchlist card/grid/list spec
 * (extracted verbatim into this task's brief) for the exact rendering and
 * sort/filter rules implemented below.
 */

const SORT_OPTIONS: Array<{ key: WatchlistSortOption; label: string }> = [
  { key: "added", label: "Hinzugefügt" },
  { key: "upcoming", label: "Kommt noch" },
  { key: "unrated", label: "Keine Bewertung" },
  { key: "has_ratings", label: "Mit Bewertung(en)" },
  { key: "tmdb_score", label: "TMDB Score" },
  { key: "my_streaming", label: "Meine Streaming-Dienste" },
  { key: "genre", label: "Nach Genre" },
  { key: "year", label: "Nach Jahr" },
];

function sortOptionLabel(option: WatchlistSortOption): string {
  return SORT_OPTIONS.find((o) => o.key === option)?.label ?? option;
}

const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  flatrate: "Flatrate",
  rent: "Leihen",
  buy: "Kaufen",
};

function formatPlainDate(dateStr: string | null): string {
  if (dateStr == null) {
    return "Kein Datum";
  }
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function getDistinctGenreIds(entries: WatchlistEntry[]): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    for (const link of entry.movie.movie_genres ?? []) {
      ids.add(link.genre_id);
    }
  }
  return Array.from(ids);
}

function getDistinctYears(entries: WatchlistEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) {
    const releaseDate = getEffectiveReleaseDate(entry);
    if (releaseDate != null) {
      years.add(Number(releaseDate.slice(0, 4)));
    }
  }
  return Array.from(years).sort((a, b) => a - b);
}

function ratedCountFor(entry: WatchlistEntry): number {
  return entry.ratings.filter((r) => r.rating != null && r.rating > 0).length;
}

export default function WatchlistScreen() {
  const parallaxScroll = useParallaxScroll();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  // M9 part 2: real, persisted active-group resolution (replaces the former
  // "first group = active group" interim simplification) -- see
  // src/hooks/useActiveGroup.ts.
  const { activeGroupId, groupsQuery: userGroupsQuery } =
    useActiveGroup(currentUserId);

  // M10 (Realtime foreground sync, ADR 0006): subscribes to live
  // watchlist_entries/ratings changes for the active group (silent cache
  // refresh, or a toast when this tab isn't the one on screen -- see
  // src/hooks/useGroupRealtimeSync.ts), and announces "Watchlist is the
  // currently-focused screen for this group" while it's in view (see
  // src/hooks/useRegisterFocusedGroupScreen.ts) so that hook can tell silent
  // update apart from toast.
  useGroupRealtimeSync(activeGroupId);
  useRegisterFocusedGroupScreen(activeGroupId);

  const groupMembersQuery = useGroupMembers(activeGroupId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const watchlistViewMode = usePreferencesStore((s) => s.watchlistViewMode);
  const setWatchlistViewMode = usePreferencesStore(
    (s) => s.setWatchlistViewMode,
  );
  // M10 Settings hub ("Filmtitel in Grid anzeigen" toggle,
  // src/app/(app)/(modals)/settings/display.tsx) — see WatchlistPosterCard's
  // `showTitle` prop doc comment for why this only affects grid variant.
  const showTitlesInGrid = usePreferencesStore((s) => s.showTitlesInGrid);

  // Sort/genre/year/provider-category choices persist per group (MMKV, see
  // usePreferencesStore `listFilters`); the search text is session-local.
  const storedFilters = usePreferencesStore((s) =>
    activeGroupId
      ? s.listFilters[listFiltersKey("watchlist", activeGroupId)]
      : undefined,
  );
  const setListFilters = usePreferencesStore((s) => s.setListFilters);
  const filterPanelOpen = usePreferencesStore(
    (s) => s.filterPanelOpen.watchlist,
  );
  const setFilterPanelOpen = usePreferencesStore((s) => s.setFilterPanelOpen);
  const myProviderIds = usePreferencesStore(
    (s) => s.selectedStreamingProviderIds,
  );
  const filters = storedFilters ?? DEFAULT_LIST_FILTERS;
  const sortOption = (filters.sortOption ?? "added") as WatchlistSortOption;
  const selectedGenreIds = filters.genreIds;
  const selectedYear: YearFilterValue | undefined = filters.year ?? undefined;
  const providerCategories = filters.providerCategories;

  function updateFilters(patch: Partial<typeof DEFAULT_LIST_FILTERS>) {
    if (activeGroupId) {
      setListFilters("watchlist", activeGroupId, patch);
    }
  }

  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading =
    userGroupsQuery.isLoading ||
    groupMembersQuery.isLoading ||
    watchlistQuery.isLoading;
  const isError =
    userGroupsQuery.isError ||
    groupMembersQuery.isError ||
    watchlistQuery.isError;

  const totalMembers = groupMembersQuery.data?.length ?? 0;

  const baseWatchlistEntries = useMemo(() => {
    if (!watchlistQuery.data || !currentUserId) {
      return [];
    }
    return splitWatchlistAndDiary(watchlistQuery.data.entries, currentUserId)
      .watchlist;
  }, [watchlistQuery.data, currentUserId]);

  const streamingAvailability = useMemo(
    () => watchlistQuery.data?.streamingAvailability ?? new Map(),
    [watchlistQuery.data?.streamingAvailability],
  );

  // Genre/year pill option sets are computed from the current (pre-sort/
  // filter) watchlist entries, per the task brief.
  const genrePillIds = useMemo(
    () => getDistinctGenreIds(baseWatchlistEntries),
    [baseWatchlistEntries],
  );
  const genreNamesById = useMemo(
    () => deriveGenreNamesById(baseWatchlistEntries),
    [baseWatchlistEntries],
  );
  const yearPillValues = useMemo(
    () => getDistinctYears(baseWatchlistEntries),
    [baseWatchlistEntries],
  );

  // Providers are only loaded (cache-backed, one batch call) while the
  // "Meine Streaming-Dienste" sort is active.
  const providersQuery = useMyStreamingProviders(
    baseWatchlistEntries.map((entry) => entry.movie.tmdb_id),
    sortOption === "my_streaming",
  );
  const providersByTmdbId = providersQuery.data;

  const sortedEntries = useMemo(() => {
    return sortWatchlist(baseWatchlistEntries, sortOption, {
      streamingAvailability,
      genreIds: selectedGenreIds,
      year: selectedYear,
      providersByTmdbId,
      myProviderIds,
      providerCategories,
    });
  }, [
    baseWatchlistEntries,
    sortOption,
    streamingAvailability,
    selectedGenreIds,
    selectedYear,
    providersByTmdbId,
    myProviderIds,
    providerCategories,
  ]);

  const searchedEntries = useMemo(
    () => searchEntries(sortedEntries, searchQuery),
    [sortedEntries, searchQuery],
  );

  function handleSelectSortOption(option: WatchlistSortOption) {
    updateFilters({ sortOption: option });
    setSortSheetVisible(false);
  }

  function openEntry(entry: WatchlistEntry) {
    if (!activeGroupId) {
      return;
    }
    navigateToMovieDetail(router, {
      tmdbId: entry.movie.tmdb_id,
      groupId: activeGroupId,
      source: "watchlist",
      watchlistEntryId: entry.id,
    });
  }

  function toggleGenre(genreId: string) {
    updateFilters({
      genreIds: selectedGenreIds.includes(genreId)
        ? selectedGenreIds.filter((id) => id !== genreId)
        : [...selectedGenreIds, genreId],
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center"
        testID="watchlist-screen"
      >
        <ActivityIndicator testID="watchlist-loading" />
        <Text className="mt-2 text-text-secondary">
          Watchlist wird geladen…
        </Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center px-4"
        testID="watchlist-screen"
      >
        <Text testID="watchlist-error" className="text-center text-danger">
          Die Watchlist konnte nicht geladen werden.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Safe-Area"): same reasoning as tracker.tsx -- `headerShown: false`
    // tab screen, top inset only (bottom is the Tabs navigator's job).
    <SafeAreaView edges={["top"]} className="flex-1" testID="watchlist-screen">
      <AppHeader title="Watchlist" settingsTestID="watchlist-settings-button" />

      <CollapsibleFilterPanel
        testID="watchlist-filter"
        open={filterPanelOpen}
        onToggle={() => setFilterPanelOpen("watchlist", !filterPanelOpen)}
        hasActiveFilters={hasActiveListFilters(filters, "added")}
        search={
          <TextInput
            testID="watchlist-search-input"
            className={GLASS_SEARCH_INPUT_CLASSNAME}
            placeholder="Film suchen…"
            placeholderTextColor="#8b8b8b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        }
        actions={
          <Button
            testID="watchlist-add-movie-button"
            variant="primary"
            iconOnly
            accessibilityLabel="Film hinzufügen"
            onPress={() => router.push("/add-movie")}
          >
            <Icon name="add" size="M" color={BUTTON_ICON_COLORS.primary} />
          </Button>
        }
      >
        <View className="flex-row items-stretch gap-2">
          <SortButton
            testID="watchlist-sort-button"
            shortLabel={
              WATCHLIST_SORT_SHORT_LABELS[sortOption] ??
              sortOptionLabel(sortOption)
            }
            fullLabel={sortOptionLabel(sortOption)}
            onPress={() => setSortSheetVisible(true)}
          />
          <ViewModeToggle
            testID="watchlist-view-mode-toggle"
            value={watchlistViewMode}
            onChange={setWatchlistViewMode}
            buttonTestID={(mode) => `watchlist-view-mode-${mode}-button`}
          />
        </View>
        {sortOption === "genre" ? (
          <View
            className="flex-row flex-wrap gap-2"
            testID="watchlist-genre-pills"
          >
            {genrePillIds.map((genreId) => (
              <Chip
                key={genreId}
                testID={`watchlist-genre-pill-${genreId}`}
                active={selectedGenreIds.includes(genreId)}
                onPress={() => toggleGenre(genreId)}
                label={genreDisplayLabel(genreId, genreNamesById.get(genreId))}
              />
            ))}
          </View>
        ) : null}

        {sortOption === "year" ? (
          <View
            className="flex-row flex-wrap gap-2"
            testID="watchlist-year-pills"
          >
            {yearPillValues.map((year) => (
              <Chip
                key={year}
                testID={`watchlist-year-pill-${year}`}
                active={selectedYear === year}
                onPress={() => updateFilters({ year })}
                label={String(year)}
              />
            ))}
          </View>
        ) : null}

        {sortOption === "my_streaming" ? (
          <View
            className="flex-row flex-wrap gap-2"
            testID="watchlist-provider-categories"
          >
            {ALL_PROVIDER_CATEGORIES.map((category) => (
              <Chip
                key={category}
                testID={`watchlist-provider-category-${category}`}
                active={providerCategories.includes(category)}
                onPress={() =>
                  updateFilters({
                    providerCategories: toggleProviderCategory(
                      providerCategories,
                      category,
                    ),
                  })
                }
                label={PROVIDER_CATEGORY_LABELS[category]}
              />
            ))}
          </View>
        ) : null}
      </CollapsibleFilterPanel>

      {sortOption === "my_streaming" && providersQuery.isLoading ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="watchlist-providers-loading"
        >
          <ActivityIndicator />
          <Text className="mt-2 text-text-secondary">
            Streaming-Daten werden geladen…
          </Text>
        </View>
      ) : searchedEntries.length === 0 && baseWatchlistEntries.length > 0 ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="watchlist-no-results"
        >
          <Text className="text-center text-text-secondary">
            {getNoResultsMessage(searchQuery)}
          </Text>
        </View>
      ) : searchedEntries.length === 0 ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="watchlist-empty"
        >
          <Text className="text-center text-text-primary">
            Deine Watchlist ist leer.
          </Text>
          <Text className="mt-1 text-center text-text-secondary">
            Füge Filme hinzu, sobald ihr euch für welche entschieden habt.
          </Text>
        </View>
      ) : watchlistViewMode === "list" ? (
        <FlatList
          {...parallaxScroll}
          testID="watchlist-list"
          data={searchedEntries}
          keyExtractor={(entry) => entry.id}
          contentContainerClassName="px-4 pb-3 pt-3"
          renderItem={({ item, index }) => (
            <GlassBlur
              testID={`watchlist-list-row-${item.id}`}
              accessibilityRole="button"
              onPress={() => openEntry(item)}
              fallbackClassName="bg-glass"
              blurClassName="bg-bg-card-blur"
              className={`flex-row items-center gap-3 border-x border-b border-glass-border px-3 py-3 ${
                index === 0 ? "rounded-t-xl border-t" : ""
              } ${index === searchedEntries.length - 1 ? "rounded-b-xl" : ""}`}
            >
              <Text
                numberOfLines={1}
                className="flex-1 font-display-bold text-accent-light"
              >
                {item.movie.name}
              </Text>
              <Text className="text-sm text-text-secondary">
                {formatPlainDate(getEffectiveReleaseDate(item))}
              </Text>
              {item.movie.vote_average != null ? (
                <Text className="w-9 text-right text-sm font-semibold text-text-primary">
                  {item.movie.vote_average.toFixed(1)}
                </Text>
              ) : null}
            </GlassBlur>
          )}
        />
      ) : (
        <FlatList
          {...parallaxScroll}
          testID="watchlist-grid-or-cards"
          key={watchlistViewMode}
          data={padToFullRows(
            searchedEntries,
            watchlistViewMode === "grid" ? 3 : 1,
          )}
          keyExtractor={(entry) =>
            isGridPlaceholder(entry) ? entry.key : entry.id
          }
          numColumns={watchlistViewMode === "grid" ? 3 : 1}
          contentContainerClassName="px-4 pt-3 gap-3"
          columnWrapperClassName={
            watchlistViewMode === "grid" ? "gap-3" : undefined
          }
          renderItem={({ item, index }) =>
            isGridPlaceholder(item) ? (
              <View className="flex-1" />
            ) : (
              <FadeInItem
 replayTab="watchlist"
                index={index}
                className={watchlistViewMode === "grid" ? "flex-1" : undefined}
              >
                <WatchlistPosterCard
                  variant={watchlistViewMode === "grid" ? "grid" : "card"}
                  movie={withEffectiveReleaseDate(item)}
                  streamingAvailability={streamingAvailability}
                  ratedCount={ratedCountFor(item)}
                  totalMembers={totalMembers}
                  showTitle={showTitlesInGrid}
                  onPress={() => openEntry(item)}
                  testID={`watchlist-entry-${item.id}`}
                />
              </FadeInItem>
            )
          }
        />
      )}

      <Sheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        title="Sortieren nach"
      >
        <View testID="watchlist-sort-options">
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              testID={`watchlist-sort-option-${option.key}`}
              onPress={() => handleSelectSortOption(option.key)}
              className="py-3"
            >
              <Text
                className={
                  sortOption === option.key
                    ? "font-semibold text-accent"
                    : "text-text-primary"
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
