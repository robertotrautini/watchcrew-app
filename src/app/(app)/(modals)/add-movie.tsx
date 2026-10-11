import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardInsetView } from "@/components/ui/KeyboardInsetView";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/ui/Text";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { SearchResultsArea } from "@/components/ui/SearchResultsArea";

import { MovieGrid, type MovieGridItem } from "@/components/movie/MovieGrid";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useActorFilmography } from "@/hooks/useActorFilmography";
import { useCompanySearch } from "@/hooks/useCompanySearch";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useDirectorFilmography } from "@/hooks/useDirectorFilmography";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useMoviesProviders } from "@/hooks/useMoviesProviders";
import { usePersonSearch } from "@/hooks/usePersonSearch";
import { useStudioFilmography } from "@/hooks/useStudioFilmography";
import {
  mapMovieLikeToGridItem,
  mapSearchResultToGridItem,
} from "@/lib/addMovieLogic";
import { getLibraryBadgeForTmdbId } from "@/lib/movieLibraryStatus";
import { filterByMyStreaming } from "@/lib/movieProviderFilter";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import type { TmdbMovieLike } from "@/lib/tmdbProxy";

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
 * group's library, per `getLibraryBadgeForTmdbId`). Adding to the watchlist
 * happens ONLY there (button in the detail), not in this screen.
 */

type AddMovieMode = "film" | "regisseur" | "besetzung" | "studio";

const MODES: { key: AddMovieMode; label: string }[] = [
  { key: "film", label: "Film" },
  { key: "regisseur", label: "Regisseur" },
  { key: "besetzung", label: "Besetzung" },
  { key: "studio", label: "Studio" },
];

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
  const { activeGroupId } = useActiveGroup(currentUserId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const [mode, setMode] = useState<AddMovieMode>("film");
  const [query, setQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null,
  );
  const [streamingFilterActive, setStreamingFilterActive] = useState(false);

  function handleSelectMode(nextMode: AddMovieMode) {
    setMode(nextMode);
    setQuery("");
    setSelectedPersonId(null);
    setSelectedCompanyId(null);
  }

  // --- Film mode ----------------------------------------------------------
  const movieSearchQuery = useMovieSearch(mode === "film" ? query : "");
  const filmItemsRaw: MovieGridItem[] = (movieSearchQuery.data ?? []).map(
    mapSearchResultToGridItem,
  );
  // Inventory 2.5: the TV toggle filters the results to the user's own
  // streaming services (any category). Providers are only fetched while the
  // toggle is on.
  const myProviderIds = usePreferencesStore(
    (s) => s.selectedStreamingProviderIds,
  );
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
    mode === "regisseur" ? (selectedPersonId ?? undefined) : undefined,
  );
  const actorFilmographyQuery = useActorFilmography(
    mode === "besetzung" ? (selectedPersonId ?? undefined) : undefined,
  );
  const personFilmographyQuery =
    mode === "regisseur" ? directorFilmographyQuery : actorFilmographyQuery;
  const personItems: MovieGridItem[] = (personFilmographyQuery.data ?? []).map(
    mapMovieLikeToGridItem,
  );

  // --- Studio mode ----------------------------------------------------------
  const companySearchQuery = useCompanySearch(mode === "studio" ? query : "");
  const studioFilmographyQuery = useStudioFilmography(
    mode === "studio" ? (selectedCompanyId ?? undefined) : undefined,
  );
  const studioResultsRaw: TmdbMovieLike[] = (
    studioFilmographyQuery.data?.pages ?? []
  ).flatMap((page) => page.results);
  const studioItems: MovieGridItem[] = dedupeByTmdbId(studioResultsRaw).map(
    mapMovieLikeToGridItem,
  );

  // --- Shared: navigation ----------------------------------------------------
  function getBadge(item: MovieGridItem) {
    return getLibraryBadgeForTmdbId(
      watchlistQuery.data?.entries ?? [],
      item.tmdbId,
      currentUserId ?? "",
    );
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

  const personResults = personSearchQuery.data ?? [];
  const companyResults = companySearchQuery.data ?? [];
  const noQuery = query.trim().length === 0;

  return (
    <KeyboardInsetView testID="add-movie-screen" className="px-4 pt-4">
      <View className="flex-row gap-2" testID="add-movie-mode-pills">
        {MODES.map((option) => (
          <Chip
            key={option.key}
            testID={`add-movie-mode-${option.key}`}
            active={mode === option.key}
            className="flex-1"
            onPress={() => handleSelectMode(option.key)}
            label={option.label}
          />
        ))}
      </View>

      {mode === "film" ? (
        <>
          <View className="flex-row items-center gap-2 pt-3">
            <TextInput
              testID="add-movie-film-search-input"
              className="flex-1 rounded-lg border border-accent bg-card px-3 py-3 text-text-primary"
              placeholder="Filmtitel suchen…"
              placeholderTextColor={PLACEHOLDER_COLOR}
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <Chip
            testID="add-movie-streaming-filter-toggle"
            active={streamingFilterActive}
            className="mt-3 self-start"
            onPress={() => setStreamingFilterActive((current) => !current)}
            label="Meine Streaming-Dienste (bald verfügbar)"
            textClassName="text-xs"
          />

          <SearchResultsArea
            testID="add-movie-film-results"
            isLoading={movieSearchQuery.isLoading}
            loadingTestID="add-movie-film-loading"
            isError={movieSearchQuery.isError}
            errorTestID="add-movie-film-error"
            errorMessage="Filmsuche fehlgeschlagen."
            isEmpty={filmItems.length === 0}
            emptyTestID="add-movie-film-grid-empty"
            emptyIcon="film"
            emptyTitle={noQuery ? "Suche nach einem Filmtitel" : "Keine Filme gefunden"}
          >
            <MovieGrid
              items={filmItems}
              onPressItem={handlePressItem}
              getBadge={getBadge}
              testID="add-movie-film-grid"
            />
          </SearchResultsArea>
        </>
      ) : null}

      {mode === "regisseur" || mode === "besetzung" ? (
        <View className="flex-1 pt-3">
          {selectedPersonId == null ? (
            <>
              <TextInput
                testID="add-movie-person-search-input"
                className="rounded-lg border border-accent bg-card px-3 py-3 text-text-primary"
                placeholder={
                  mode === "regisseur"
                    ? "Regisseur suchen…"
                    : "Schauspieler suchen…"
                }
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={query}
                onChangeText={setQuery}
              />
              <SearchResultsArea
                testID="add-movie-person-results-area"
                scroll
                isLoading={personSearchQuery.isLoading}
                loadingTestID="add-movie-person-loading"
                isError={personSearchQuery.isError}
                errorTestID="add-movie-person-error"
                errorMessage="Personensuche fehlgeschlagen."
                isEmpty={personResults.length === 0}
                emptyTestID="add-movie-person-empty"
                emptyIcon="person"
                emptyTitle={noQuery ? "Suche nach einem Namen" : "Keine Personen gefunden"}
              >
                <View testID="add-movie-person-results">
                  {personResults.map((person, index) => (
                    <Pressable
                      key={person.id}
                      testID={`add-movie-person-result-${person.id}`}
                      accessibilityRole="button"
                      onPress={() => setSelectedPersonId(person.id)}
                      className={`py-3 ${index < personResults.length - 1 ? "border-b border-border-subtle" : ""}`}
                    >
                      <Text className="text-text-primary">{person.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </SearchResultsArea>
            </>
          ) : (
            <>
              <Button
                testID="add-movie-person-change-button"
                variant="secondary"
                label="Andere Person wählen"
                icon="change"
                onPress={() => setSelectedPersonId(null)}
              />
              <View className="mt-3 flex-1">
                {personFilmographyQuery.isLoading ? (
                  <LoadingArea className="min-h-32 w-full" testID="add-movie-person-filmography-loading" />
                ) : personFilmographyQuery.isError ? (
                  <Text
                    testID="add-movie-person-filmography-error"
                    className="text-danger"
                  >
                    Filmografie konnte nicht geladen werden.
                  </Text>
                ) : (
                  <MovieGrid
                    items={personItems}
                    onPressItem={handlePressItem}
                        getBadge={getBadge}
                    testID="add-movie-person-grid"
                    emptyMessage="Keine Filme gefunden"
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
                className="rounded-lg border border-accent bg-card px-3 py-3 text-text-primary"
                placeholder="Studio suchen…"
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={query}
                onChangeText={setQuery}
              />
              <SearchResultsArea
                testID="add-movie-company-results-area"
                scroll
                isLoading={companySearchQuery.isLoading}
                loadingTestID="add-movie-company-loading"
                isError={companySearchQuery.isError}
                errorTestID="add-movie-company-error"
                errorMessage="Studiosuche fehlgeschlagen."
                isEmpty={companyResults.length === 0}
                emptyTestID="add-movie-company-empty"
                emptyIcon="studio"
                emptyTitle={noQuery ? "Suche nach einem Studio" : "Keine Studios gefunden"}
              >
                <View testID="add-movie-company-results">
                  {companyResults.map((company, index) => (
                    <Pressable
                      key={company.id}
                      testID={`add-movie-company-result-${company.id}`}
                      accessibilityRole="button"
                      onPress={() => setSelectedCompanyId(company.id)}
                      className={`py-3 ${index < companyResults.length - 1 ? "border-b border-border-subtle" : ""}`}
                    >
                      <Text className="text-text-primary">{company.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </SearchResultsArea>
            </>
          ) : (
            <>
              <Button
                testID="add-movie-company-change-button"
                variant="secondary"
                label="Anderes Studio wählen"
                icon="change"
                onPress={() => setSelectedCompanyId(null)}
              />
              <View className="mt-3 flex-1">
                {studioFilmographyQuery.isLoading ? (
                  <LoadingArea className="min-h-32 w-full" testID="add-movie-studio-loading" />
                ) : studioFilmographyQuery.isError ? (
                  <Text testID="add-movie-studio-error" className="text-danger">
                    Studio-Filmografie konnte nicht geladen werden.
                  </Text>
                ) : (
                  <MovieGrid
                    items={studioItems}
                    onPressItem={handlePressItem}
                        getBadge={getBadge}
                    testID="add-movie-studio-grid"
                    emptyMessage="Keine Filme gefunden"
                    footer={
                      studioFilmographyQuery.hasNextPage ? (
                        <View className="items-center py-4">
                          <Button
                            testID="add-movie-studio-load-more-button"
                            label="Mehr laden"
                            icon="chevronDown"
                            variant="secondary"
                            loading={studioFilmographyQuery.isFetchingNextPage}
                            disabled={studioFilmographyQuery.isFetchingNextPage}
                            onPress={() =>
                              studioFilmographyQuery.fetchNextPage()
                            }
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
    </KeyboardInsetView>
  );
}
