import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { MovieGrid, type MovieGridItem } from "@/components/movie/MovieGrid";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMoviesProviders } from "@/hooks/useMoviesProviders";
import { useSimilarMovies } from "@/hooks/useSimilarMovies";
import { useUserGroups } from "@/hooks/useUserGroups";
import { getLibraryBadgeForTmdbId } from "@/lib/movieLibraryStatus";
import { filterByProviderCategory, type ProviderCategory } from "@/lib/movieProviderFilter";
import type { TraktRelatedMovie } from "@/lib/tmdbProxy";

/**
 * M6 part 2b: "Ähnliche Filme" (similar movies, sourced from Trakt's
 * related-movies endpoint via the tmdb-proxy) sub-view screen. Shown when a
 * user taps "Ähnliche Filme" from the movie-detail overlay. Purely a
 * data-loading/wiring layer on top of the shared `MovieGrid`
 * (src/components/movie/MovieGrid.tsx) — no grid/badge/filter rendering
 * logic of its own. Mirrors the sibling `collection`/`filmography` sub-view
 * screens' structure (see src/app/(app)/(modals)/collection/[collectionId].tsx).
 *
 * Interim-decision note (log centrally in docs/interim-decisions.md, not
 * done here): Trakt's related-movies payload only gives `title`/`year`/
 * `ids` — no poster/score — so items are mapped with `posterPath: null` /
 * `voteAverage: null` rather than firing N extra per-item TMDB calls just to
 * backfill those for up to 40 items; `MovieGrid` already renders a
 * placeholder icon and omits the score pill for null/undefined values, so
 * this is cheap to change later if a poster-enrichment call is added.
 * Items missing `ids.tmdb` are filtered out entirely — they can't be linked
 * to a badge, streaming lookup, or navigation target.
 */
export default function SimilarMoviesScreen() {
  const params = useLocalSearchParams<{ tmdbId: string }>();
  const router = useRouter();

  const tmdbId = Number(params.tmdbId);
  const hasValidParams = params.tmdbId != null && !Number.isNaN(tmdbId);

  const currentUserId = useCurrentUserId();
  const userGroupsQuery = useUserGroups(currentUserId);
  const activeGroupId = userGroupsQuery.data?.[0]?.group_id as string | undefined;
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const similarMoviesQuery = useSimilarMovies(hasValidParams ? tmdbId : undefined);

  const [activeCategory, setActiveCategory] = useState<ProviderCategory | null>(null);

  const items: MovieGridItem[] = (similarMoviesQuery.data ?? [])
    .filter((movie: TraktRelatedMovie) => typeof movie.ids.tmdb === "number")
    .map((movie: TraktRelatedMovie) => ({
      tmdbId: movie.ids.tmdb as number,
      title: movie.title,
      posterPath: null,
      releaseDate: movie.year ? `${movie.year}-01-01` : null,
      voteAverage: null,
    }));

  const { providersByTmdbId } = useMoviesProviders(items.map((item) => item.tmdbId));
  const filteredItems = filterByProviderCategory(items, providersByTmdbId, activeCategory);

  if (!hasValidParams) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="similar-movies-screen">
        <Text testID="similar-movies-screen-error" className="text-center text-danger">
          Ungültige Film-Referenz.
        </Text>
      </View>
    );
  }

  if (similarMoviesQuery.isLoading || userGroupsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="similar-movies-screen">
        <ActivityIndicator testID="similar-movies-screen-loading" />
      </View>
    );
  }

  if (similarMoviesQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="similar-movies-screen">
        <Text testID="similar-movies-screen-error-data" className="text-center text-danger">
          Ähnliche Filme konnten nicht geladen werden.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="similar-movies-screen">
      <Text className="mb-3 font-display text-xl text-text-primary">Ähnliche Filme</Text>
      <MovieGrid
        items={filteredItems}
        onPressItem={(item) => {
          const badge = getLibraryBadgeForTmdbId(
            watchlistQuery.data?.entries ?? [],
            item.tmdbId,
            currentUserId ?? "",
          );

          // Real movie-detail route's params contract (src/app/(app)/(modals)/
          // movie/[tmdbId].tsx): `groupId` + `source` ("watchlist"|"diary")
          // together define "group context" there, and `watchlistEntryId`
          // lets it resolve the already-loaded DB row instead of falling
          // back to placeholder copy. `badge` (getLibraryBadgeForTmdbId)
          // maps 1:1 onto that enum: "watched" -> the user already has a
          // diary/rating row for it ("diary"), "watchlist" -> it's an
          // unrated watchlist entry ("watchlist") — see
          // docs/interim-decisions.md "M6-Cleanup — movie-detail-Routen-
          // Korrektur" for why this replaces the earlier guessed
          // `source: "library"` value, which isn't part of the real enum.
          if (badge !== null && activeGroupId) {
            const matchingEntry = watchlistQuery.data?.entries.find(
              (entry) => entry.movie?.tmdb_id === item.tmdbId
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
        }}
        testID="similar-movies-screen-grid"
        getBadge={(item) =>
          getLibraryBadgeForTmdbId(watchlistQuery.data?.entries ?? [], item.tmdbId, currentUserId ?? "")
        }
        progressHeader={null}
        streamingFilter={{ active: activeCategory, onChange: setActiveCategory }}
        emptyMessage="Keine ähnlichen Filme gefunden."
      />
    </View>
  );
}
