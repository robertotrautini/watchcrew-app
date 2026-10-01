import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { MovieGrid, type MovieGridItem } from "@/components/movie/MovieGrid";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { formatDateForInput } from "@/lib/ratingLogic";
import { Sheet } from "@/components/ui/Sheet";
import { useActorFilmography } from "@/hooks/useActorFilmography";
import { useCompanySearch } from "@/hooks/useCompanySearch";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useDirectorFilmography } from "@/hooks/useDirectorFilmography";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useAddToWatchlist } from "@/hooks/useMovieDetailMutations";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useMoviesProviders } from "@/hooks/useMoviesProviders";
import { usePersonSearch } from "@/hooks/usePersonSearch";
import { useStudioFilmography } from "@/hooks/useStudioFilmography";
import {
  findDuplicateRatedEntry,
  formatAverageRating,
  mapMovieLikeToGridItem,
  mapSearchResultToGridItem,
  needsManualReleaseDate,
  type DuplicateRatingInfo,
} from "@/lib/addMovieLogic";
import { getLibraryBadgeForTmdbId } from "@/lib/movieLibraryStatus";
import { filterByMyStreaming } from "@/lib/movieProviderFilter";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import type { TmdbCompany, TmdbMovieLike, TmdbPerson } from "@/lib/tmdbProxy";

/**
 * Add-Movie-Modal (M7 part 2). Accessible from the Watchlist screen's "+"
 * button (src/app/(app)/(tabs)/watchlist.tsx). Four search-mode pills (Film/
 * Regisseur/Besetzung/Studio), each with its own debounced input + result
 * grid (Film/Studio reuse the shared `MovieGrid`; Regisseur/Besetzung do too,
 * once a person is selected -- their own search step is a plain
 * name-autocomplete list, not a movie grid).
 *
 * Tapping a result tile navigates to that movie's Detail-Overlay (matching
 * the exact pattern established in similar/[tmdbId].tsx: pass `groupId`/
 * `source`/`watchlistEntryId` when the movie is already in the active
 * group's library, per `getLibraryBadgeForTmdbId`). The actual "add to
 * watchlist" action is a separate, explicit quick-add ("+") button per tile
 * (`MovieGrid`'s `onAddItem`, M7 part 2 addition) -- an interim decision,
 * since tapping the tile itself is reserved for "view details" everywhere
 * else `MovieGrid` is used; see docs/interim-decisions.md.
 */

type AddMovieMode = "film" | "regisseur" | "besetzung" | "studio";

const MODES: Array<{ key: AddMovieMode; label: string }> = [
  { key: "film", label: "Film" },
  { key: "regisseur", label: "Regisseur" },
  { key: "besetzung", label: "Besetzung" },
  { key: "studio", label: "Studio" },
];

/**
 * "Bereits gesehen" duplicate-warning dialog copy — resolved interim
 * decision (source doc didn't specify exact wording), see
 * docs/interim-decisions.md "M7 Teil 2 — Add-Movie-Modal".
 */
const DUPLICATE_SHEET_TITLE = "Film bereits gesehen";
function duplicateSheetBody(info: DuplicateRatingInfo): string {
  return `Dieser Film wurde bereits mit Ø ${formatAverageRating(info.averageRating)} Sternen bewertet. Trotzdem zur Watchlist hinzufügen?`;
}

function dedupeByTmdbId(items: TmdbMovieLike[]): TmdbMovieLike[] {
  const seen = new Set<number>();
  const result: TmdbMovieLike[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export default function AddMovieScreen() {
  const router = useRouter();

  const currentUserId = useCurrentUserId();
  const { activeGroupId, groupsQuery: userGroupsQuery } = useActiveGroup(currentUserId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const [mode, setMode] = useState<AddMovieMode>("film");
  const [query, setQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [streamingFilterActive, setStreamingFilterActive] = useState(false);

  const [pendingItem, setPendingItem] = useState<MovieGridItem | null>(null);
  const [manualDateInput, setManualDateInput] = useState("");
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateRatingInfo | null>(null);

  function handleSelectMode(nextMode: AddMovieMode) {
    setMode(nextMode);
    setQuery("");
    setSelectedPersonId(null);
    setSelectedCompanyId(null);
  }

  // --- Film mode ----------------------------------------------------------
  const movieSearchQuery = useMovieSearch(mode === "film" ? query : "");
  const filmItemsRaw: MovieGridItem[] = (movieSearchQuery.data ?? []).map(mapSearchResultToGridItem);
  // Inventory 2.5: the TV toggle filters the results to the user's own
  // streaming services (any category). Providers are only fetched while the
  // toggle is on.
  const myProviderIds = usePreferencesStore((s) => s.selectedStreamingProviderIds);
  const { providersByTmdbId: filmProviders } = useMoviesProviders(
    streamingFilterActive ? filmItemsRaw.map((item) => item.tmdbId) : [],
  );
  const filmItems = streamingFilterActive
    ? filterByMyStreaming(filmItemsRaw, filmProviders, myProviderIds)
    : filmItemsRaw;

  // --- Regisseur / Besetzung modes -----------------------------------------
  const personSearchQuery = usePersonSearch(
    mode === "regisseur" || mode === "besetzung" ? query : "",
  );
  const directorFilmographyQuery = useDirectorFilmography(
    mode === "regisseur" ? selectedPersonId ?? undefined : undefined,
  );
  const actorFilmographyQuery = useActorFilmography(
    mode === "besetzung" ? selectedPersonId ?? undefined : undefined,
  );
  const personFilmographyQuery = mode === "regisseur" ? directorFilmographyQuery : actorFilmographyQuery;
  const personItems: MovieGridItem[] = (personFilmographyQuery.data ?? []).map(mapMovieLikeToGridItem);

  // --- Studio mode ----------------------------------------------------------
  const companySearchQuery = useCompanySearch(mode === "studio" ? query : "");
  const studioFilmographyQuery = useStudioFilmography(
    mode === "studio" ? selectedCompanyId ?? undefined : undefined,
  );
  const studioResultsRaw: TmdbMovieLike[] = (studioFilmographyQuery.data?.pages ?? []).flatMap(
    (page) => page.results,
  );
  const studioItems: MovieGridItem[] = dedupeByTmdbId(studioResultsRaw).map(mapMovieLikeToGridItem);

  // --- Shared: navigation + add-to-watchlist -------------------------------
  const addToWatchlistMutation = useAddToWatchlist();

  function getBadge(item: MovieGridItem) {
    return getLibraryBadgeForTmdbId(watchlistQuery.data?.entries ?? [], item.tmdbId, currentUserId ?? "");
  }

  function handlePressItem(item: MovieGridItem) {
    const badge = getBadge(item);
    if (badge != null && activeGroupId) {
      const matchingEntry = watchlistQuery.data?.entries.find(
        (entry) => entry.movie?.tmdb_id === item.tmdbId,
      );
      router.push({
        pathname: "/movie/[tmdbId]",
        params: {
          tmdbId: String(item.tmdbId),
          groupId: activeGroupId,
          source: badge === "watched" ? "diary" : "watchlist",
          ...(matchingEntry ? { watchlistEntryId: matchingEntry.id } : {}),
        },
      });
    } else {
      router.push({
        pathname: "/movie/[tmdbId]",
        params: { tmdbId: String(item.tmdbId) },
      });
    }
  }

  function performAdd(item: MovieGridItem) {
    if (!activeGroupId || !currentUserId) {
      return;
    }
    // M7 consolidation (Item 1, see docs/interim-decisions.md): the
    // manually-entered release date is only ever meaningful -- and only
    // ever forwarded -- when THIS item actually needed the manual-date
    // fallback in the first place (`needsManualReleaseDate`). A quick-add
    // for a movie that already has a real TMDB release date never sends
    // `manualReleaseDate`, even if a stale value happens to still be
    // sitting in `manualDateInput` from a previous, unrelated add.
    const manualReleaseDate = needsManualReleaseDate(item.releaseDate)
      ? manualDateInput.trim()
      : undefined;
    addToWatchlistMutation.mutate({
      tmdbId: item.tmdbId,
      groupId: activeGroupId,
      addedBy: currentUserId,
      manualReleaseDate,
    });
    setPendingItem(null);
    setDuplicateInfo(null);
    setManualDateInput("");
  }

  function proceedPastManualDate(item: MovieGridItem) {
    const duplicate = findDuplicateRatedEntry(watchlistQuery.data?.entries ?? [], item.tmdbId);
    if (duplicate) {
      setPendingItem(item);
      setDuplicateInfo(duplicate);
      return;
    }
    performAdd(item);
  }

  function handleAddItem(item: MovieGridItem) {
    if (needsManualReleaseDate(item.releaseDate)) {
      setPendingItem(item);
      setManualDateInput("");
      return;
    }
    proceedPastManualDate(item);
  }

  function handleManualDateConfirm() {
    if (!pendingItem || manualDateInput.trim().length === 0) {
      return;
    }
    proceedPastManualDate(pendingItem);
  }

  function handleDuplicateCancel() {
    setPendingItem(null);
    setDuplicateInfo(null);
  }

  function handleDuplicateConfirm() {
    if (pendingItem) {
      performAdd(pendingItem);
    }
  }

  const manualDateSheetVisible = pendingItem != null && duplicateInfo == null && needsManualReleaseDate(pendingItem.releaseDate);
  const duplicateSheetVisible = pendingItem != null && duplicateInfo != null;

  function renderPersonResults(
    results: TmdbPerson[] | null | undefined,
    isLoading: boolean,
    isError: boolean,
  ) {
    if (isLoading) {
      return <ActivityIndicator testID="add-movie-person-loading" />;
    }
    if (isError) {
      return (
        <Text testID="add-movie-person-error" className="text-danger">
          Personensuche fehlgeschlagen.
        </Text>
      );
    }
    if (!results || results.length === 0) {
      return (
        <Text testID="add-movie-person-empty" className="text-text-secondary">
          Keine Personen gefunden.
        </Text>
      );
    }
    return (
      <View testID="add-movie-person-results">
        {results.map((person) => (
          <Pressable
            key={person.id}
            testID={`add-movie-person-result-${person.id}`}
            accessibilityRole="button"
            onPress={() => setSelectedPersonId(person.id)}
            className="border-b border-border-subtle py-3"
          >
            <Text className="text-text-primary">{person.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function renderCompanyResults(
    results: TmdbCompany[] | null | undefined,
    isLoading: boolean,
    isError: boolean,
  ) {
    if (isLoading) {
      return <ActivityIndicator testID="add-movie-company-loading" />;
    }
    if (isError) {
      return (
        <Text testID="add-movie-company-error" className="text-danger">
          Studiosuche fehlgeschlagen.
        </Text>
      );
    }
    if (!results || results.length === 0) {
      return (
        <Text testID="add-movie-company-empty" className="text-text-secondary">
          Keine Studios gefunden.
        </Text>
      );
    }
    return (
      <View testID="add-movie-company-results">
        {results.map((company) => (
          <Pressable
            key={company.id}
            testID={`add-movie-company-result-${company.id}`}
            accessibilityRole="button"
            onPress={() => setSelectedCompanyId(company.id)}
            className="border-b border-border-subtle py-3"
          >
            <Text className="text-text-primary">{company.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="add-movie-screen">
      <View className="flex-row gap-2" testID="add-movie-mode-pills">
        {MODES.map((option) => (
          <Pressable
            key={option.key}
            testID={`add-movie-mode-${option.key}`}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === option.key }}
            onPress={() => handleSelectMode(option.key)}
            className={`rounded-full border border-border-subtle px-3 py-2 ${
              mode === option.key ? "bg-accent" : "bg-card"
            }`}
          >
            <Text className="text-sm text-text-primary">{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === "film" ? (
        <>
          <View className="flex-row items-center gap-2 pt-3">
            <TextInput
              testID="add-movie-film-search-input"
              className="flex-1 rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
              placeholder="Filmtitel suchen…"
              placeholderTextColor="#8b8b8b"
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <Pressable
            testID="add-movie-streaming-filter-toggle"
            accessibilityRole="button"
            accessibilityState={{ selected: streamingFilterActive }}
            onPress={() => setStreamingFilterActive((current) => !current)}
            className={`mt-3 self-start rounded-full border border-border-subtle px-3 py-1 ${
              streamingFilterActive ? "bg-accent" : "bg-card"
            }`}
          >
            <Text className="text-xs text-text-primary">Meine Streaming-Dienste (bald verfügbar)</Text>
          </Pressable>

          <View className="mt-3 flex-1">
            {movieSearchQuery.isLoading ? (
              <ActivityIndicator testID="add-movie-film-loading" />
            ) : movieSearchQuery.isError ? (
              <Text testID="add-movie-film-error" className="text-danger">
                Filmsuche fehlgeschlagen.
              </Text>
            ) : (
              <MovieGrid
                items={filmItems}
                onPressItem={handlePressItem}
                onAddItem={handleAddItem}
                getBadge={getBadge}
                testID="add-movie-film-grid"
                emptyMessage={query.trim().length === 0 ? "Suche nach einem Filmtitel." : "Keine Filme gefunden."}
              />
            )}
          </View>
        </>
      ) : null}

      {mode === "regisseur" || mode === "besetzung" ? (
        <View className="flex-1 pt-3">
          {selectedPersonId == null ? (
            <>
              <TextInput
                testID="add-movie-person-search-input"
                className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
                placeholder={mode === "regisseur" ? "Regisseur suchen…" : "Schauspieler suchen…"}
                placeholderTextColor="#8b8b8b"
                value={query}
                onChangeText={setQuery}
              />
              <ScrollView className="mt-3">
                {renderPersonResults(
                  personSearchQuery.data,
                  personSearchQuery.isLoading,
                  personSearchQuery.isError,
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <Button
                testID="add-movie-person-change-button"
                variant="secondary"
                label="Andere Person wählen"
                onPress={() => setSelectedPersonId(null)}
              />
              <View className="mt-3 flex-1">
                {personFilmographyQuery.isLoading ? (
                  <ActivityIndicator testID="add-movie-person-filmography-loading" />
                ) : personFilmographyQuery.isError ? (
                  <Text testID="add-movie-person-filmography-error" className="text-danger">
                    Filmografie konnte nicht geladen werden.
                  </Text>
                ) : (
                  <MovieGrid
                    items={personItems}
                    onPressItem={handlePressItem}
                    onAddItem={handleAddItem}
                    getBadge={getBadge}
                    testID="add-movie-person-grid"
                    emptyMessage="Keine Filme gefunden."
                  />
                )}
              </View>
            </>
          )}
        </View>
      ) : null}

      {mode === "studio" ? (
        <View className="flex-1 pt-3">
          {selectedCompanyId == null ? (
            <>
              <TextInput
                testID="add-movie-company-search-input"
                className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
                placeholder="Studio suchen…"
                placeholderTextColor="#8b8b8b"
                value={query}
                onChangeText={setQuery}
              />
              <ScrollView className="mt-3">
                {renderCompanyResults(
                  companySearchQuery.data,
                  companySearchQuery.isLoading,
                  companySearchQuery.isError,
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <Button
                testID="add-movie-company-change-button"
                variant="secondary"
                label="Anderes Studio wählen"
                onPress={() => setSelectedCompanyId(null)}
              />
              <View className="mt-3 flex-1">
                {studioFilmographyQuery.isLoading ? (
                  <ActivityIndicator testID="add-movie-studio-loading" />
                ) : studioFilmographyQuery.isError ? (
                  <Text testID="add-movie-studio-error" className="text-danger">
                    Studio-Filmografie konnte nicht geladen werden.
                  </Text>
                ) : (
                  <MovieGrid
                    items={studioItems}
                    onPressItem={handlePressItem}
                    onAddItem={handleAddItem}
                    getBadge={getBadge}
                    testID="add-movie-studio-grid"
                    emptyMessage="Keine Filme gefunden."
                    footer={
                      studioFilmographyQuery.hasNextPage ? (
                        <View className="items-center py-4">
                          <Button
                            testID="add-movie-studio-load-more-button"
                            label="Mehr laden"
                            variant="secondary"
                            loading={studioFilmographyQuery.isFetchingNextPage}
                            disabled={studioFilmographyQuery.isFetchingNextPage}
                            onPress={() => studioFilmographyQuery.fetchNextPage()}
                          />
                        </View>
                      ) : undefined
                    }
                  />
                )}
              </View>
            </>
          )}
        </View>
      ) : null}

      {/*
        Manual-date fallback (per the task spec): a selected movie with no
        TMDB release_date needs a manual date entered before the add can
        proceed. M7 consolidation (Item 1, see docs/interim-decisions.md):
        the FORMERLY-flagged gap is now resolved -- the entered value is
        forwarded as `manualReleaseDate` to `addToWatchlist`/`upsertMovie`
        (see `performAdd` above), which only ever fills a genuine TMDB gap
        server-side and never overrides real TMDB data.
      */}
      <Sheet
        visible={manualDateSheetVisible}
        onClose={() => setPendingItem(null)}
        title="Erscheinungsdatum fehlt"
      >
        <Text className="mb-3 text-text-primary">
          Für "{pendingItem?.title}" ist kein Erscheinungsdatum bekannt. Bitte gib eins ein, um fortzufahren.
        </Text>
        <DateField
          testID="add-movie-manual-date-input"
          className="mb-3"
          valueIso={manualDateInput || null}
          displayText={formatDateForInput(manualDateInput)}
          placeholder="Datum wählen"
          onChangeIso={setManualDateInput}
        />
        <Button
          testID="add-movie-manual-date-confirm-button"
          label="Weiter"
          disabled={manualDateInput.trim().length === 0}
          onPress={handleManualDateConfirm}
        />
      </Sheet>

      <Sheet visible={duplicateSheetVisible} onClose={handleDuplicateCancel} title={DUPLICATE_SHEET_TITLE}>
        <Text className="mb-4 text-text-primary">
          {duplicateInfo ? duplicateSheetBody(duplicateInfo) : ""}
        </Text>
        <View className="flex-row gap-2">
          <Button
            testID="add-movie-duplicate-cancel-button"
            label="Abbrechen"
            variant="secondary"
            className="flex-1"
            onPress={handleDuplicateCancel}
          />
          <Button
            testID="add-movie-duplicate-confirm-button"
            label="Trotzdem hinzufügen"
            className="flex-1"
            loading={addToWatchlistMutation.isPending}
            onPress={handleDuplicateConfirm}
          />
        </View>
      </Sheet>
    </View>
  );
}
