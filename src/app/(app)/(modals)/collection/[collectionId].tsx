import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { MovieGrid, type MovieGridItem } from "@/components/movie/MovieGrid";
import { useCollection } from "@/hooks/useCollection";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMoviesProviders } from "@/hooks/useMoviesProviders";
import { useUserGroups } from "@/hooks/useUserGroups";
import { getLibraryBadgeForTmdbId } from "@/lib/movieLibraryStatus";
import { filterByProviderCategory, type ProviderCategory } from "@/lib/movieProviderFilter";
import type { TmdbMovieLike } from "@/lib/tmdbProxy";

/**
 * M6 part 2b: "Filmreihe" (collection) sub-view screen. Shown when a user
 * taps "Zur Filmreihe" from the movie-detail overlay for a movie that
 * belongs to a TMDB collection. Purely a data-loading/wiring layer on top
 * of the shared `MovieGrid` (src/components/movie/MovieGrid.tsx) — no
 * grid/badge/filter rendering logic of its own.
 *
 * Needs BOTH the collection id (this route's own dynamic segment) and the
 * ORIGINATING movie's tmdbId (an optional query search param) since the
 * `collection` tmdb-proxy action keys its cache on both
 * (see src/hooks/useCollection.ts / src/lib/tmdbProxy.ts).
 */
export default function CollectionScreen() {
  const params = useLocalSearchParams<{ collectionId: string; tmdbId?: string }>();
  const router = useRouter();

  const collectionId = Number(params.collectionId);
  const tmdbId = Number(params.tmdbId);
  const hasValidParams = !Number.isNaN(collectionId) && !Number.isNaN(tmdbId);

  const currentUserId = useCurrentUserId();
  const userGroupsQuery = useUserGroups(currentUserId);
  const activeGroupId = userGroupsQuery.data?.[0]?.group_id as string | undefined;
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const collectionQuery = useCollection(
    hasValidParams ? tmdbId : undefined,
    hasValidParams ? collectionId : undefined
  );

  const [activeCategory, setActiveCategory] = useState<ProviderCategory | null>(null);

  const items: MovieGridItem[] = (collectionQuery.data?.parts ?? []).map((part: TmdbMovieLike) => ({
    tmdbId: part.id,
    title: part.title ?? part.name ?? "Unbekannt",
    posterPath: part.poster_path ?? null,
    releaseDate: part.release_date ?? null,
    voteAverage: typeof part.vote_average === "number" ? part.vote_average : null,
  }));

  const { providersByTmdbId } = useMoviesProviders(items.map((item) => item.tmdbId));
  const filteredItems = filterByProviderCategory(items, providersByTmdbId, activeCategory);

  if (!hasValidParams) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="collection-screen">
        <Text testID="collection-screen-error" className="text-center text-danger">
          Ungültige Filmreihen-Referenz.
        </Text>
      </View>
    );
  }

  if (collectionQuery.isLoading || userGroupsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="collection-screen">
        <ActivityIndicator testID="collection-screen-loading" />
      </View>
    );
  }

  if (collectionQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="collection-screen">
        <Text testID="collection-screen-error-data" className="text-center text-danger">
          Die Filmreihe konnte nicht geladen werden.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="collection-screen">
      <Text className="mb-3 font-display text-xl text-text-primary">
        {collectionQuery.data?.name ?? "Filmreihe"}
      </Text>
      <MovieGrid
        items={filteredItems}
        onPressItem={(item) =>
          router.push({
            pathname: "/movie/[tmdbId]",
            params: { tmdbId: String(item.tmdbId) },
          })
        }
        testID="collection-screen-grid"
        getBadge={(item) =>
          activeGroupId
            ? getLibraryBadgeForTmdbId(watchlistQuery.data?.entries ?? [], item.tmdbId, currentUserId ?? "")
            : null
        }
        progressHeader={null}
        streamingFilter={{ active: activeCategory, onChange: setActiveCategory }}
        emptyMessage="Keine weiteren Teile gefunden."
      />
    </View>
  );
}
