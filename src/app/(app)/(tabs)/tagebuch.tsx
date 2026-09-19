import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { DiaryPosterTile } from "@/components/movie/DiaryPosterTile";
import { MemberRatingRow } from "@/components/movie/MemberRatingRow";
import { Sheet } from "@/components/ui/Sheet";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useUserGroups } from "@/hooks/useUserGroups";
import {
  computeAverageRating,
  deriveGroupMemberIds,
  formatSeenAtDate,
  genreDisplayLabel,
  memberDisplayLabel,
} from "@/lib/diaryDisplay";
import { resolveGroupTheme } from "@/lib/groupTheme";
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
 * --- Interim simplification (per task brief, same as the parallel
 * Watchlist task) ---
 * There is no "active group" selector anywhere in the app yet (that's
 * later scope). Until it exists, this screen just uses the FIRST group
 * returned by `useUserGroups()` as "the" active group. Same reasoning
 * applies to the group's color THEME: no hook/lib function anywhere in
 * this codebase fetches a `watch_groups` row (which is where a theme_name
 * would live) for a given group id — `useUserGroups` only returns the
 * user's OWN `watch_group_members` rows (group_id/user_id/role/joined_at),
 * not the groups' own data. So this screen falls back to
 * `resolveGroupTheme(undefined)` (-> Gold/default), the exact same
 * already-established fallback used elsewhere in this codebase for the
 * same reason (see src/app/(app)/(tabs)/_layout.tsx's tab bar and
 * src/app/(onboarding)/create-or-join-group.tsx) — not a new decision.
 *
 * --- FLAGGED GAP: group member roster, member display names & genre names ---
 * The per-member rating rows and the genre filter pills need (a) the
 * group's full member roster and (b) human-readable labels for a
 * `member_id` (uuid) and a `genre_id` (uuid). Neither is properly available
 * from this task's building blocks:
 *  - No hook/lib function in scope for this task returns a group's full
 *    membership (`useUserGroups` only returns the CURRENT user's OWN
 *    `watch_group_members` rows — i.e. which groups THEY belong to, not who
 *    ELSE is in a given group). So `deriveGroupMemberIds`
 *    (src/lib/diaryDisplay.ts) approximates the roster as the union of
 *    every `member_id` appearing in ANY rating row across the group's full
 *    entry set — a member who has never rated anything at all won't appear
 *    and so won't get a "–" row. NOTE: the parallel Watchlist task
 *    independently added `getGroupMembers`/`useGroupMembers`
 *    (src/lib/groups.ts / src/hooks/useGroupMembers.ts) for its own
 *    "x/y bewertet" progress badge, which — once both tasks' work is
 *    merged/committed together — would give a real roster and should
 *    replace this approximation as a fast-follow (not wired in here to
 *    keep this task's commit self-contained and not depend on a sibling
 *    task's still-in-flight files).
 *  - No `profiles`/`display_name` table exists — a member is only ever a
 *    bare `auth.users` id, and `auth.users` isn't a table an authenticated
 *    client can normally read directly, so there is no human name to show.
 *  - `public.genres` (name column) exists in the schema, but nothing
 *    fetches/joins it into the Watchlist/Diary data layer yet — only
 *    `movie_genres(genre_id)` is exposed via `useGroupWatchlist`.
 * Building any of these properly is a real architecture decision (new
 * table? new Edge Function? a join that needs different RLS?) that this
 * project's "zero autonomous decisions" rule requires surfacing to the
 * user first — not something to invent silently in this task. So, for now,
 * `memberDisplayLabel`/`genreDisplayLabel` (src/lib/diaryDisplay.ts) render
 * an obvious placeholder label instead of a real name. All the actual
 * filtering/sorting logic (which member rated what, which genre an entry
 * has) is fully correct — only the roster completeness and the on-screen
 * LABELs are approximations/placeholders, trivially swappable later.
 */

const SORT_OPTIONS: { value: DiarySortOption; label: string }[] = [
  { value: "my_diary", label: "Mein Tagebuch" },
  { value: "all_rated", label: "Von allen bewertet" },
  { value: "missing", label: "Fehlende Bewertungen" },
  { value: "rating", label: "Beste Bewertung" },
  { value: "tmdb_score", label: "TMDB Score" },
  { value: "my_streaming", label: "Meine Streaming-Dienste (bald verfügbar)" },
  { value: "genre", label: "Nach Genre" },
  { value: "year", label: "Nach Jahr" },
  { value: "liked", label: "Mag ich ♥" },
];

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
  const userId = useCurrentUserId();
  const groupsQuery = useUserGroups(userId);
  const activeGroupId = groupsQuery.data?.[0]?.group_id as string | undefined;
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const diaryViewMode = usePreferencesStore((s) => s.diaryViewMode);
  const setDiaryViewMode = usePreferencesStore((s) => s.setDiaryViewMode);

  const [sortOption, setSortOption] = useState<DiarySortOption>("my_diary");
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<YearFilterValue | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSortSheetVisible, setSortSheetVisible] = useState(false);

  const starColor = resolveGroupTheme(undefined).colors.starColor;

  const rawEntries = useMemo(() => watchlistQuery.data?.entries ?? [], [watchlistQuery.data]);

  // Best-effort roster of "everyone in this group" — see the flagged-gap
  // comment above for why this is a UNION-of-ratings approximation rather
  // than a real membership query.
  const groupMemberIds = useMemo(() => deriveGroupMemberIds(rawEntries), [rawEntries]);

  const diaryEntries = useMemo(() => {
    if (!userId) return [];
    return splitWatchlistAndDiary(rawEntries, userId).diary;
  }, [rawEntries, userId]);

  const sortedEntries = useMemo(() => {
    if (!userId) return [];
    return sortDiary(diaryEntries, sortOption, userId, {
      groupMemberIds,
      genreIds: selectedGenreIds,
      year: selectedYear,
    });
  }, [diaryEntries, sortOption, userId, groupMemberIds, selectedGenreIds, selectedYear]);

  const visibleEntries = useMemo(
    () => searchEntries(sortedEntries, searchQuery),
    [sortedEntries, searchQuery],
  );

  const availableGenreIds = useMemo(() => deriveAvailableGenreIds(diaryEntries), [diaryEntries]);
  const { years: availableYears, hasNoDate: hasNoDateYear } = useMemo(
    () => deriveAvailableYears(diaryEntries, userId ?? ""),
    [diaryEntries, userId],
  );

  const isLoading = !userId || groupsQuery.isLoading || (!!activeGroupId && watchlistQuery.isLoading);
  const isError = groupsQuery.isError || watchlistQuery.isError;
  const isDiaryEmpty = diaryEntries.length === 0;
  const hasNoResults = !isDiaryEmpty && visibleEntries.length === 0;

  function toggleGenre(genreId: string) {
    setSelectedGenreIds((current) =>
      current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId],
    );
  }

  function selectSortOption(option: DiarySortOption) {
    setSortOption(option);
    setSortSheetVisible(false);
  }

  function ownRating(entry: WatchlistEntry) {
    return entry.ratings.find((r) => r.member_id === userId);
  }

  function seenDateLabel(entry: WatchlistEntry): string {
    const ownSeenAt = ownRating(entry)?.seen_at ?? null;
    return ownSeenAt ? `Gesehen am ${formatSeenAtDate(ownSeenAt)}` : "Kein Datum";
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="tagebuch-screen">
        <ActivityIndicator testID="tagebuch-loading" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-6" testID="tagebuch-screen">
        <Text testID="tagebuch-error" className="text-center text-text-primary">
          Fehler beim Laden des Tagebuchs.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary" testID="tagebuch-screen">
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
              <Pressable
                key={mode.value}
                testID={`tagebuch-view-mode-${mode.value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: diaryViewMode === mode.value }}
                onPress={() => setDiaryViewMode(mode.value)}
                className="rounded-lg border border-border-subtle px-3 py-2"
              >
                <Text className="text-text-primary">{mode.label}</Text>
              </Pressable>
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
                <Text className="text-text-primary">{genreDisplayLabel(genreId)}</Text>
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
                onPress={() => setSelectedYear(year)}
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
                onPress={() => setSelectedYear("no_date")}
                className="rounded-full border border-border-subtle px-3 py-1"
              >
                <Text className="text-text-primary">Kein Datum</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {isDiaryEmpty ? (
        <View className="flex-1 items-center justify-center px-6" testID="tagebuch-empty">
          <Text className="text-center text-text-secondary">Noch keine bewerteten Filme.</Text>
        </View>
      ) : hasNoResults ? (
        <View className="flex-1 items-center justify-center px-6" testID="tagebuch-no-results">
          <Text className="text-center text-text-secondary">Keine Einträge für diese Auswahl.</Text>
        </View>
      ) : (
        <ScrollView testID="tagebuch-entry-list" contentContainerClassName="gap-4 px-4 pb-8">
          {diaryViewMode === "grid" ? (
            <View className="flex-row flex-wrap gap-3">
              {visibleEntries.map((entry) => (
                <View key={entry.id} testID={`tagebuch-entry-${entry.id}`} className="w-[30%]">
                  <DiaryPosterTile
                    posterUrl={entry.movie.poster}
                    title={entry.movie.name}
                    starColor={starColor}
                    averageRating={computeAverageRating(entry)}
                    liked={ownRating(entry)?.liked === true}
                    tmdbScore={entry.movie.vote_average}
                  />
                </View>
              ))}
            </View>
          ) : diaryViewMode === "list" ? (
            <View>
              {visibleEntries.map((entry) => {
                const ownSeenAt = ownRating(entry)?.seen_at ?? null;
                const average = computeAverageRating(entry);
                return (
                  <View
                    key={entry.id}
                    testID={`tagebuch-entry-${entry.id}`}
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
                  </View>
                );
              })}
            </View>
          ) : (
            // "cards" (default)
            visibleEntries.map((entry) => (
              <View key={entry.id} testID={`tagebuch-entry-${entry.id}`} className="gap-2">
                <DiaryPosterTile
                  posterUrl={entry.movie.poster}
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
                      memberLabel={memberDisplayLabel(memberId)}
                      rating={entry.ratings.find((r) => r.member_id === memberId)?.rating ?? null}
                      starColor={starColor}
                    />
                  ))}
                </View>
              </View>
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
    </View>
  );
}
