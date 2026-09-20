import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";

import { WatchlistPosterCard } from "@/components/movie/WatchlistPosterCard";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import { deriveGenreNamesById, genreDisplayLabel } from "@/lib/diaryDisplay";
import {
  filterByGenre,
  filterByYear,
  searchEntries,
  sortWatchlist,
  splitWatchlistAndDiary,
} from "@/lib/watchlistLogic";
import type { WatchlistEntry, WatchlistSortOption, YearFilterValue } from "@/lib/watchlistTypes";
import { usePreferencesStore, type WatchlistViewMode } from "@/stores/usePreferencesStore";

/**
 * Real Watchlist screen content (M5 part 2), replacing the earlier
 * placeholder. See docs/feature-inventory.md's Watchlist card/grid/list spec
 * (extracted verbatim into this task's brief) for the exact rendering and
 * sort/filter rules implemented below.
 */

const SORT_OPTIONS: Array<{ key: WatchlistSortOption; label: string; hint?: string }> = [
  { key: "added", label: "Hinzugefügt" },
  { key: "upcoming", label: "Kommt noch" },
  { key: "unrated", label: "Keine Bewertung" },
  { key: "has_ratings", label: "Mit Bewertung(en)" },
  { key: "tmdb_score", label: "TMDB Score" },
  { key: "my_streaming", label: "Meine Streaming-Dienste", hint: "(bald verfügbar)" },
  { key: "genre", label: "Nach Genre" },
  { key: "year", label: "Nach Jahr" },
];

const VIEW_MODES: Array<{ key: WatchlistViewMode; label: string }> = [
  { key: "cards", label: "Karten" },
  { key: "grid", label: "Grid" },
  { key: "list", label: "Liste" },
];

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
    if (entry.movie.release_date != null) {
      years.add(Number(entry.movie.release_date.slice(0, 4)));
    }
  }
  return Array.from(years).sort((a, b) => a - b);
}

function ratedCountFor(entry: WatchlistEntry): number {
  return entry.ratings.filter((r) => r.rating != null && r.rating > 0).length;
}

export default function WatchlistScreen() {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  // M9 part 2: real, persisted active-group resolution (replaces the former
  // "first group = active group" interim simplification) -- see
  // src/hooks/useActiveGroup.ts.
  const { activeGroupId, groupsQuery: userGroupsQuery } = useActiveGroup(currentUserId);

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
  const setWatchlistViewMode = usePreferencesStore((s) => s.setWatchlistViewMode);

  const [sortOption, setSortOption] = useState<WatchlistSortOption>("added");
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<YearFilterValue | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = userGroupsQuery.isLoading || groupMembersQuery.isLoading || watchlistQuery.isLoading;
  const isError = userGroupsQuery.isError || groupMembersQuery.isError || watchlistQuery.isError;

  const totalMembers = groupMembersQuery.data?.length ?? 0;

  const baseWatchlistEntries = useMemo(() => {
    if (!watchlistQuery.data || !currentUserId) {
      return [];
    }
    return splitWatchlistAndDiary(watchlistQuery.data.entries, currentUserId).watchlist;
  }, [watchlistQuery.data, currentUserId]);

  const streamingAvailability = watchlistQuery.data?.streamingAvailability ?? new Map();

  // Genre/year pill option sets are computed from the current (pre-sort/
  // filter) watchlist entries, per the task brief.
  const genrePillIds = useMemo(() => getDistinctGenreIds(baseWatchlistEntries), [baseWatchlistEntries]);
  const genreNamesById = useMemo(
    () => deriveGenreNamesById(baseWatchlistEntries),
    [baseWatchlistEntries],
  );
  const yearPillValues = useMemo(() => getDistinctYears(baseWatchlistEntries), [baseWatchlistEntries]);

  const sortedEntries = useMemo(() => {
    return sortWatchlist(baseWatchlistEntries, sortOption, {
      streamingAvailability,
      genreIds: selectedGenreIds,
      year: selectedYear,
    });
  }, [baseWatchlistEntries, sortOption, streamingAvailability, selectedGenreIds, selectedYear]);

  const searchedEntries = useMemo(
    () => searchEntries(sortedEntries, searchQuery),
    [sortedEntries, searchQuery],
  );

  function handleSelectSortOption(option: WatchlistSortOption) {
    setSortOption(option);
    setSortSheetVisible(false);
  }

  function toggleGenre(genreId: string) {
    setSelectedGenreIds((current) =>
      current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId],
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="watchlist-screen">
        <ActivityIndicator testID="watchlist-loading" />
        <Text className="mt-2 text-text-secondary">Watchlist wird geladen…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="watchlist-screen">
        <Text testID="watchlist-error" className="text-center text-danger">
          Die Watchlist konnte nicht geladen werden.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary" testID="watchlist-screen">
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Text className="font-display text-xl text-text-primary">Watchlist</Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-row gap-2" testID="watchlist-view-mode-toggle">
            {VIEW_MODES.map((mode) => (
              <Button
                key={mode.key}
                size="sm"
                variant={watchlistViewMode === mode.key ? "primary" : "secondary"}
                label={mode.label}
                testID={`watchlist-view-mode-${mode.key}-button`}
                onPress={() => setWatchlistViewMode(mode.key)}
              />
            ))}
          </View>
          <Button
            size="sm"
            variant="primary"
            label="+"
            testID="watchlist-add-movie-button"
            accessibilityLabel="Film hinzufügen"
            onPress={() => router.push("/add-movie")}
          />
        </View>
      </View>

      <View className="flex-row items-center gap-2 px-4 pt-3">
        <TextInput
          testID="watchlist-search-input"
          className="flex-1 rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
          placeholder="Suchen…"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Button
          size="sm"
          variant="secondary"
          testID="watchlist-sort-button"
          label="Sortieren"
          onPress={() => setSortSheetVisible(true)}
        />
      </View>

      {sortOption === "genre" ? (
        <View className="flex-row flex-wrap gap-2 px-4 pt-3" testID="watchlist-genre-pills">
          {genrePillIds.map((genreId) => (
            <Pressable
              key={genreId}
              testID={`watchlist-genre-pill-${genreId}`}
              onPress={() => toggleGenre(genreId)}
              className={`rounded-full border border-border-subtle px-3 py-1 ${
                selectedGenreIds.includes(genreId) ? "bg-accent" : "bg-card"
              }`}
            >
              <Text className="text-xs text-text-primary">
                {genreDisplayLabel(genreId, genreNamesById.get(genreId))}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {sortOption === "year" ? (
        <View className="flex-row flex-wrap gap-2 px-4 pt-3" testID="watchlist-year-pills">
          {yearPillValues.map((year) => (
            <Pressable
              key={year}
              testID={`watchlist-year-pill-${year}`}
              onPress={() => setSelectedYear(year)}
              className={`rounded-full border border-border-subtle px-3 py-1 ${
                selectedYear === year ? "bg-accent" : "bg-card"
              }`}
            >
              <Text className="text-xs text-text-primary">{year}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {searchedEntries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8" testID="watchlist-empty">
          <Text className="text-center text-text-primary">Deine Watchlist ist leer.</Text>
          <Text className="mt-1 text-center text-text-secondary">
            Füge Filme hinzu, sobald ihr euch für welche entschieden habt.
          </Text>
        </View>
      ) : watchlistViewMode === "list" ? (
        <FlatList
          testID="watchlist-list"
          data={searchedEntries}
          keyExtractor={(entry) => entry.id}
          contentContainerClassName="px-4 pt-3"
          renderItem={({ item }) => (
            <View
              testID={`watchlist-list-row-${item.id}`}
              className="flex-row items-center justify-between border-b border-border-subtle py-3"
            >
              <Text className="flex-1 text-text-primary">{item.movie.name}</Text>
              <Text className="text-text-secondary">{formatPlainDate(item.movie.release_date)}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          testID="watchlist-grid-or-cards"
          key={watchlistViewMode}
          data={searchedEntries}
          keyExtractor={(entry) => entry.id}
          numColumns={watchlistViewMode === "grid" ? 3 : 1}
          contentContainerClassName="px-4 pt-3 gap-3"
          columnWrapperClassName={watchlistViewMode === "grid" ? "gap-3" : undefined}
          renderItem={({ item }) => (
            <View className={watchlistViewMode === "grid" ? "flex-1" : undefined}>
              <WatchlistPosterCard
                variant={watchlistViewMode === "grid" ? "grid" : "card"}
                movie={item.movie}
                streamingAvailability={streamingAvailability}
                ratedCount={ratedCountFor(item)}
                totalMembers={totalMembers}
                testID={`watchlist-entry-${item.id}`}
              />
            </View>
          )}
        />
      )}

      <Sheet visible={sortSheetVisible} onClose={() => setSortSheetVisible(false)} title="Sortieren nach">
        <View testID="watchlist-sort-options">
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              testID={`watchlist-sort-option-${option.key}`}
              onPress={() => handleSelectSortOption(option.key)}
              className="py-3"
            >
              <Text className={sortOption === option.key ? "font-semibold text-accent" : "text-text-primary"}>
                {option.label}
                {option.hint ? ` ${option.hint}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
