import { useRouter } from "expo-router";
import { useState } from "react";

import type { MovieGridItem } from "@/components/movie/MovieGrid";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useActorFilmography } from "@/hooks/useActorFilmography";
import { useCompanySearch } from "@/hooks/useCompanySearch";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useDirectorFilmography } from "@/hooks/useDirectorFilmography";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useMoviesProviders } from "@/hooks/useMoviesProviders";
import { usePersonSearch } from "@/hooks/usePersonSearch";
import { useStudioFilmography } from "@/hooks/useStudioFilmography";
import { mapMovieLikeToGridItem, mapSearchResultToGridItem } from "@/lib/addMovieLogic";
import { navigateToMovieDetailWithContext } from "@/lib/movieDetailNavigation";
import { getLibraryBadgeForTmdbId } from "@/lib/movieLibraryStatus";
import { filterByMyStreaming } from "@/lib/movieProviderFilter";
import type { TmdbMovieLike } from "@/lib/tmdbProxy";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

export type AddMovieMode = "film" | "regisseur" | "besetzung" | "studio";

export const MODES: { key: AddMovieMode; label: string }[] = [
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

/**
 * Controller for the Add-Movie modal (src/app/(app)/(modals)/add-movie.tsx):
 * mode/query/selection state, the per-mode search and filmography queries
 * (only the active mode's query gets a non-empty input), and the result-tap
 * navigation to the detail overlay.
 */
export function useAddMovieScreen() {
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
      navigateToMovieDetailWithContext(router, {
        tmdbId: item.tmdbId,
        groupId: activeGroupId,
        source: badge === "watched" ? "diary" : "watchlist",
        watchlistEntryId: matchingEntry?.id,
      });
    } else {
      navigateToMovieDetailWithContext(router, { tmdbId: item.tmdbId });
    }
  }

  return {
    mode,
    handleSelectMode,
    query,
    setQuery,
    noQuery: query.trim().length === 0,
    streamingFilterActive,
    setStreamingFilterActive,
    movieSearchQuery,
    filmItems,
    personSearchQuery,
    personResults: personSearchQuery.data ?? [],
    personFilmographyQuery,
    personItems,
    selectedPersonId,
    setSelectedPersonId,
    companySearchQuery,
    companyResults: companySearchQuery.data ?? [],
    studioFilmographyQuery,
    studioItems,
    selectedCompanyId,
    setSelectedCompanyId,
    getBadge,
    handlePressItem,
  };
}
