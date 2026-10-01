import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DiaryPosterTile } from "@/components/movie/DiaryPosterTile";
import { MemberRatingRow } from "@/components/movie/MemberRatingRow";
import { Button } from "@/components/ui/Button";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { Sheet } from "@/components/ui/Sheet";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMyStreamingProviders } from "@/hooks/useMyStreamingProviders";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import {
  computeAverageRating,
  deriveGenreNamesById,
  deriveGroupMemberIds,
  formatSeenAtDate,
  genreDisplayLabel,
  memberDisplayLabel,
} from "@/lib/diaryDisplay";
import {
  DEFAULT_LIST_FILTERS,
  getNoResultsMessage,
  listFiltersKey,
  toggleProviderCategory,
} from "@/lib/listFilters";
import { navigateToMovieDetail } from "@/lib/movieDetailNavigation";
import { ALL_PROVIDER_CATEGORIES, type ProviderCategory } from "@/lib/movieProviderFilter";
import { resolveGroupTheme } from "@/lib/groupTheme";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import { searchEntries, sortDiary, splitWatchlistAndDiary } from "@/lib/watchlistLogic";
import type { DiarySortOption, WatchlistEntry, YearFilterValue } from "@/lib/watchlistTypes";
import { usePreferencesStore, type DiaryViewMode } from "@/stores/usePreferencesStore";

/**
 * The real Tagebuch (diary) screen content (M5 part 2). Full spec extracted
 * verbatim from docs/feature-inventory.md into the task brief — see that
 * brief (and the module-level comments in the files linked below) for the
 * exact business rules being implemented here. This file is screen-level
 * wiring only; the actual sort/filter/split rules live in
 * `src/lib/watchlistLogic.ts` and are consumed here, never reimplemented.
 *
 * --- Active-group resolution (M9 part 2) ---
 * The former "first group = active group" interim simplification (see
 * docs/interim-decisions.md "M5") is now resolved via `useActiveGroup`
 * (src/hooks/useActiveGroup.ts) -- a real, persisted active-group choice
 * (Group-Settings switcher), falling back to the first group only when
 * nothing has been explicitly picked yet or the stored choice has gone
 * stale. This screen's own color THEME handling is UNCHANGED by that: no
 * hook/lib function this screen calls fetches the group's `color_theme`
 * (that's `useGroupDetails`, added for the new Group-Settings screen, not
 * consumed here) — `useUserGroups`/`useActiveGroup` only expose the user's
 * OWN `watch_group_members` rows (group_id/user_id/role/joined_at), not the
 * group's own data. So this screen still falls back to
 * `resolveGroupTheme(undefined)` (-> Gold/default), the exact same
 * already-established fallback used elsewhere in this codebase for the
 * same reason (see src/app/(app)/(tabs)/_layout.tsx's tab bar and
 * src/app/(onboarding)/create-or-join-group.tsx) — not a new decision, and
 * out of scope for this task to change.
 *
 * --- M5 FAST-FOLLOW: member display names & genre names ---
 * The per-member rating rows and the genre filter pills previously showed
 * uuid-prefix placeholders (no `profiles` table and no genre-name join
 * existed yet). Both are now wired to real data:
 *  - `useGroupMembers` (src/hooks/useGroupMembers.ts, already added by the
 *    parallel Watchlist task for its "x/y bewertet" badge) now also returns
 *    each member's joined `profiles.display_name`
 *    (`supabase/migrations/20260920120000_profiles_table_and_display_name_trigger.sql`
 *    adds the table + an auto-provisioning trigger on `auth.users` insert).
 *    This screen looks up a member's name from that roster and passes it to
 *    `memberDisplayLabel`, which still falls back to the uuid-prefix
 *    placeholder if a profile row is somehow missing.
 *  - The member ROSTER itself (which ids get a row at all) intentionally
 *    still comes from `deriveGroupMemberIds` (the union-of-ratings
 *    approximation) rather than switching to `useGroupMembers`'s real
 *    membership list — that roster-completeness gap (a member who never
 *    rated anything won't get a "–" row) is a separate, not-yet-flagged
 *    concern, out of scope for this fast-follow, which only closes the two
 *    display-NAME gaps.
 *  - `deriveGenreNamesById` (src/lib/diaryDisplay.ts) resolves a genre_id to
 *    its real name from `movie.movie_genres[].genres.name`, now nested in
 *    `useGroupWatchlist`'s query.
 */

const SORT_OPTIONS: { value: DiarySortOption; label: string }[] = [
  { value: "my_diary", label: "Mein Tagebuch" },
  { value: "all_rated", label: "Von allen bewertet" },
  { value: "missing", label: "Fehlende Bewertungen" },
  { value: "rating", label: "Beste Bewertung" },
  { value: "tmdb_score", label: "TMDB Score" },
  { value: "my_streaming", label: "Meine Streaming-Dienste" },
  { value: "genre", label: "Nach Genre" },
  { value: "year", label: "Nach Jahr" },
  { value: "liked", label: "Mag ich ♥" },
];

const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  flatrate: "Flatrate",
  rent: "Leihen",
  buy: "Kaufen",
};

const VIEW_MODES: { value: DiaryViewMode; label: string }[] = [
  { value: "cards", label: "Karten" },
  { value: "grid", label: "Grid" },
  { value: "list", label: "Liste" },
];

function sortOptionLabel(option: DiarySortOption): string {
  return SORT_OPTIONS.find((o) => o.value === option)?.label ?? option;
}

function getYearFromDate(dateStr: string): number {
  return Number(dateStr.slice(0, 4));
}

/** Distinct genre ids present across the given (already-Diary) entries, for the "Nach Genre" pill row. */
function deriveAvailableGenreIds(entries: WatchlistEntry[]): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    for (const link of entry.movie.movie_genres ?? []) {
      ids.add(link.genre_id);
    }
  }
  return Array.from(ids).sort();
}

/** The CURRENT user's own seen_at years present across the given (already-Diary) entries, plus whether any has no date, for the "Nach Jahr" pill row. */
function deriveAvailableYears(
  entries: WatchlistEntry[],
  currentUserId: string,
): { years: number[]; hasNoDate: boolean } {
  const years = new Set<number>();
  let hasNoDate = false;
  for (const entry of entries) {
    const ownSeenAt = entry.ratings.find((r) => r.member_id === currentUserId)?.seen_at ?? null;
    if (ownSeenAt == null) {
      hasNoDate = true;
    } else {
      years.add(getYearFromDate(ownSeenAt));
    }
  }
  return { years: Array.from(years).sort((a, b) => b - a), hasNoDate };
}

export default function TagebuchScreen() {
  const router = useRouter();
  const userId = useCurrentUserId();
  // M9 part 2: real, persisted active-group resolution (replaces the former
  // "first group = active group" interim simplification) -- see
  // src/hooks/useActiveGroup.ts.
  const { activeGroupId, groupsQuery } = useActiveGroup(userId);

  // M10 (Realtime foreground sync, ADR 0006): see the identical comment in
  // src/app/(app)/(tabs)/watchlist.tsx -- same wiring, same reasoning.
  useGroupRealtimeSync(activeGroupId);
  useRegisterFocusedGroupScreen(activeGroupId);

  const watchlistQuery = useGroupWatchlist(activeGroupId);
  const groupMembersQuery = useGroupMembers(activeGroupId);

  const diaryViewMode = usePreferencesStore((s) => s.diaryViewMode);
  const setDiaryViewMode = usePreferencesStore((s) => s.setDiaryViewMode);
  // M10 Settings hub ("Filmtitel in Grid anzeigen" toggle,
  // src/app/(app)/(modals)/settings/display.tsx): Tagebuch's grid mode never
  // showed a title at all before M10 (unlike Watchlist's grid, which always
  // did) -- this preference now ADDS one below the poster tile when true,
  // per docs/interim-decisions.md's "M10 — Settings hub" entry.
  const showTitlesInGrid = usePreferencesStore((s) => s.showTitlesInGrid);

  // Sort/genre/year/provider-category choices persist per group (MMKV, see
  // usePreferencesStore `listFilters`); the search text is session-local.
  const storedFilters = usePreferencesStore((s) =>
    activeGroupId ? s.listFilters[listFiltersKey("diary", activeGroupId)] : undefined,
  );
  const setListFilters = usePreferencesStore((s) => s.setListFilters);
  const myProviderIds = usePreferencesStore((s) => s.selectedStreamingProviderIds);
  const filters = storedFilters ?? DEFAULT_LIST_FILTERS;
  const sortOption = (filters.sortOption ?? "my_diary") as DiarySortOption;
  const selectedGenreIds = filters.genreIds;
  const selectedYear: YearFilterValue | undefined = filters.year ?? undefined;
  const providerCategories = filters.providerCategories;

  function updateFilters(patch: Partial<typeof DEFAULT_LIST_FILTERS>) {
    if (activeGroupId) {
      setListFilters("diary", activeGroupId, patch);
    }
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [isSortSheetVisible, setSortSheetVisible] = useState(false);

  const starColor = resolveGroupTheme(undefined).colors.starColor;

  const rawEntries = useMemo(() => watchlistQuery.data?.entries ?? [], [watchlistQuery.data]);

  // Roster of "everyone in this group": real members (useGroupMembers) unioned
  // with rating authors (see deriveGroupMemberIds).
  const groupMemberIds = useMemo(
    () => deriveGroupMemberIds(rawEntries, (groupMembersQuery.data ?? []).map((m) => m.user_id)),
    [rawEntries, groupMembersQuery.data],
  );

  // Real display names, joined via `useGroupMembers` (see the M5 fast-follow
  // module comment above) — `memberDisplayLabel` falls back to the
  // uuid-prefix placeholder for any id missing from this map.
  const displayNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of groupMembersQuery.data ?? []) {
      if (member.profiles?.display_name) {
        names.set(member.user_id, member.profiles.display_name);
      }
    }
    return names;
  }, [groupMembersQuery.data]);

  const diaryEntries = useMemo(() => {
    if (!userId) return [];
    return splitWatchlistAndDiary(rawEntries, userId).diary;
  }, [rawEntries, userId]);

  // Providers are only loaded (cache-backed, one batch call) while the
  // "Meine Streaming-Dienste" sort is active.
  const providersQuery = useMyStreamingProviders(
    diaryEntries.map((entry) => entry.movie.tmdb_id),
    sortOption === "my_streaming",
  );
  const providersByTmdbId = providersQuery.data;

  const sortedEntries = useMemo(() => {
    if (!userId) return [];
    return sortDiary(diaryEntries, sortOption, userId, {
      groupMemberIds,
      genreIds: selectedGenreIds,
      year: selectedYear,
      providersByTmdbId,
      myProviderIds,
      providerCategories,
    });
  }, [
    diaryEntries,
    sortOption,
    userId,
    groupMemberIds,
    selectedGenreIds,
    selectedYear,
    providersByTmdbId,
    myProviderIds,
    providerCategories,
  ]);

  const visibleEntries = useMemo(
    () => searchEntries(sortedEntries, searchQuery),
    [sortedEntries, searchQuery],
  );

  const availableGenreIds = useMemo(() => deriveAvailableGenreIds(diaryEntries), [diaryEntries]);
  const genreNamesById = useMemo(() => deriveGenreNamesById(diaryEntries), [diaryEntries]);
  const { years: availableYears, hasNoDate: hasNoDateYear } = useMemo(
    () => deriveAvailableYears(diaryEntries, userId ?? ""),
    [diaryEntries, userId],
  );

  const isLoading =
    !userId ||
    groupsQuery.isLoading ||
    (!!activeGroupId && (watchlistQuery.isLoading || groupMembersQuery.isLoading));
  const isError = groupsQuery.isError || watchlistQuery.isError || groupMembersQuery.isError;
  const isDiaryEmpty = diaryEntries.length === 0;
  const hasNoResults = !isDiaryEmpty && visibleEntries.length === 0;

  function toggleGenre(genreId: string) {
    updateFilters({
      genreIds: selectedGenreIds.includes(genreId)
        ? selectedGenreIds.filter((id) => id !== genreId)
        : [...selectedGenreIds, genreId],
    });
  }

  function selectSortOption(option: DiarySortOption) {
    updateFilters({ sortOption: option });
    setSortSheetVisible(false);
  }

  function ownRating(entry: WatchlistEntry) {
    return entry.ratings.find((r) => r.member_id === userId);
  }

  function openEntry(entry: WatchlistEntry) {
    if (!activeGroupId) {
      return;
    }
    navigateToMovieDetail(router, {
      tmdbId: entry.movie.tmdb_id,
      groupId: activeGroupId,
      source: "diary",
      watchlistEntryId: entry.id,
    });
  }

  function seenDateLabel(entry: WatchlistEntry): string {
    const ownSeenAt = ownRating(entry)?.seen_at ?? null;
    return ownSeenAt ? `Gesehen am ${formatSeenAtDate(ownSeenAt)}` : "Kein Datum";
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-bg-primary" testID="tagebuch-screen">
        <ActivityIndicator testID="tagebuch-loading" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-bg-primary px-6" testID="tagebuch-screen">
        <Text testID="tagebuch-error" className="text-center text-text-primary">
          Fehler beim Laden des Tagebuchs.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Safe-Area"): same reasoning as tracker.tsx/watchlist.tsx.
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg-primary" testID="tagebuch-screen">
      <View className="gap-3 px-4 pb-2 pt-6">
        <TextInput
          testID="tagebuch-search-input"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Suche im Tagebuch"
          placeholderTextColor="#888888"
          className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-text-primary"
        />

        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-2" testID="tagebuch-view-mode-toggle">
            {VIEW_MODES.map((mode) => (
              <Button
                key={mode.value}
                size="sm"
                variant={diaryViewMode === mode.value ? "primary" : "secondary"}
                label={mode.label}
                testID={`tagebuch-view-mode-${mode.value}`}
                accessibilityState={{ selected: diaryViewMode === mode.value }}
                onPress={() => setDiaryViewMode(mode.value)}
              />
            ))}
          </View>

          <Pressable
            testID="tagebuch-sort-button"
            accessibilityRole="button"
            onPress={() => setSortSheetVisible(true)}
            className="rounded-lg border border-border-subtle px-3 py-2"
          >
            <Text testID="tagebuch-sort-button-label" className="text-text-primary">
              {sortOptionLabel(sortOption)}
            </Text>
          </Pressable>
        </View>

        {sortOption === "genre" ? (
          <View testID="tagebuch-genre-pills" className="flex-row flex-wrap gap-2">
            {availableGenreIds.map((genreId) => (
              <Pressable
                key={genreId}
                testID={`tagebuch-genre-pill-${genreId}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedGenreIds.includes(genreId) }}
                onPress={() => toggleGenre(genreId)}
                className="rounded-full border border-border-subtle px-3 py-1"
              >
                <Text className="text-text-primary">
                  {genreDisplayLabel(genreId, genreNamesById.get(genreId))}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {sortOption === "year" ? (
          <View testID="tagebuch-year-pills" className="flex-row flex-wrap gap-2">
            {availableYears.map((year) => (
              <Pressable
                key={year}
                testID={`tagebuch-year-pill-${year}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedYear === year }}
                onPress={() => updateFilters({ year })}
                className="rounded-full border border-border-subtle px-3 py-1"
              >
                <Text className="text-text-primary">{year}</Text>
              </Pressable>
            ))}
            {hasNoDateYear ? (
              <Pressable
                testID="tagebuch-year-pill-no_date"
                accessibilityRole="button"
                accessibilityState={{ selected: selectedYear === "no_date" }}
                onPress={() => updateFilters({ year: "no_date" })}
                className="rounded-full border border-border-subtle px-3 py-1"
              >
                <Text className="text-text-primary">Kein Datum</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {sortOption === "my_streaming" ? (
          <View testID="tagebuch-provider-categories" className="flex-row flex-wrap gap-2">
            {ALL_PROVIDER_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                testID={`tagebuch-provider-category-${category}`}
                accessibilityRole="button"
                accessibilityState={{ selected: providerCategories.includes(category) }}
                onPress={() =>
                  updateFilters({ providerCategories: toggleProviderCategory(providerCategories, category) })
                }
                className={`rounded-full border border-border-subtle px-3 py-1 ${
                  providerCategories.includes(category) ? "bg-accent" : "bg-card"
                }`}
              >
                <Text className="text-text-primary">{PROVIDER_CATEGORY_LABELS[category]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {isDiaryEmpty ? (
        <View className="flex-1 items-center justify-center px-6" testID="tagebuch-empty">
          <Text className="text-center text-text-secondary">Noch keine bewerteten Filme.</Text>
        </View>
      ) : hasNoResults ? (
        <View className="flex-1 items-center justify-center px-6" testID="tagebuch-no-results">
          <Text className="text-center text-text-secondary">{getNoResultsMessage(searchQuery)}</Text>
        </View>
      ) : (
        <ScrollView testID="tagebuch-entry-list" contentContainerClassName="gap-4 px-4 pb-8">
          {diaryViewMode === "grid" ? (
            <View className="flex-row flex-wrap gap-3">
              {visibleEntries.map((entry, index) => (
                <FadeInItem key={entry.id} index={index} testID={`tagebuch-entry-${entry.id}`} className="w-[30%]">
                  <Pressable
                    testID={`tagebuch-entry-press-${entry.id}`}
                    accessibilityRole="button"
                    onPress={() => openEntry(entry)}
                  >
                  <DiaryPosterTile
                    posterUrl={buildTmdbImageUrl(entry.movie.poster)}
                    title={entry.movie.name}
                    starColor={starColor}
                    averageRating={computeAverageRating(entry)}
                    liked={ownRating(entry)?.liked === true}
                    tmdbScore={entry.movie.vote_average}
                  />
                  {showTitlesInGrid ? (
                    <Text
                      testID={`tagebuch-grid-title-${entry.id}`}
                      className="mt-1 text-xs text-text-primary"
                      numberOfLines={1}
                    >
                      {entry.movie.name}
                    </Text>
                  ) : null}
                  </Pressable>
                </FadeInItem>
              ))}
            </View>
          ) : diaryViewMode === "list" ? (
            <View>
              {visibleEntries.map((entry) => {
                const ownSeenAt = ownRating(entry)?.seen_at ?? null;
                const average = computeAverageRating(entry);
                return (
                  <Pressable
                    key={entry.id}
                    testID={`tagebuch-entry-${entry.id}`}
                    accessibilityRole="button"
                    onPress={() => openEntry(entry)}
                    className="flex-row items-center justify-between border-b border-border-subtle py-2"
                  >
                    <Text
                      testID={`tagebuch-list-title-${entry.id}`}
                      className="flex-1 text-text-primary"
                      numberOfLines={1}
                    >
                      {entry.movie.name}
                    </Text>
                    <Text testID={`tagebuch-list-year-${entry.id}`} className="w-14 text-text-secondary">
                      {ownSeenAt ? getYearFromDate(ownSeenAt) : "–"}
                    </Text>
                    <Text testID={`tagebuch-list-average-${entry.id}`} className="w-10 text-text-primary">
                      {average != null ? average.toFixed(1) : "–"}
                    </Text>
                    <Text testID={`tagebuch-list-tmdb-${entry.id}`} className="w-10 text-text-secondary">
                      {entry.movie.vote_average != null ? entry.movie.vote_average.toFixed(1) : "–"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            // "cards" (default)
            visibleEntries.map((entry, index) => (
              <FadeInItem key={entry.id} index={index} testID={`tagebuch-entry-${entry.id}`}>
                <Pressable
                  testID={`tagebuch-entry-press-${entry.id}`}
                  accessibilityRole="button"
                  onPress={() => openEntry(entry)}
                  className="gap-2"
                >
                <DiaryPosterTile
                  posterUrl={buildTmdbImageUrl(entry.movie.poster)}
                  title={entry.movie.name}
                  starColor={starColor}
                  averageRating={computeAverageRating(entry)}
                  liked={ownRating(entry)?.liked === true}
                  tmdbScore={entry.movie.vote_average}
                />
                <Text className="text-lg font-semibold text-text-primary">{entry.movie.name}</Text>
                <Text testID={`tagebuch-entry-seen-date-${entry.id}`} className="text-text-secondary">
                  {seenDateLabel(entry)}
                </Text>
                <View>
                  {groupMemberIds.map((memberId) => (
                    <MemberRatingRow
                      key={memberId}
                      memberLabel={memberDisplayLabel(memberId, displayNameById.get(memberId))}
                      rating={entry.ratings.find((r) => r.member_id === memberId)?.rating ?? null}
                      starColor={starColor}
                    />
                  ))}
                </View>
                </Pressable>
              </FadeInItem>
            ))
          )}
        </ScrollView>
      )}

      <Sheet
        visible={isSortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        title="Sortieren nach"
      >
        <View testID="tagebuch-sort-sheet" className="gap-1">
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              testID={`tagebuch-sort-option-${option.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: sortOption === option.value }}
              onPress={() => selectSortOption(option.value)}
              className="py-3"
            >
              <Text className="text-text-primary">{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
