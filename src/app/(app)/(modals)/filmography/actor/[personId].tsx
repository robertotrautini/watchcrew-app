import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { MovieGrid, type MovieGridItem } from "@/components/movie/MovieGrid";
import { useActorFilmography } from "@/hooks/useActorFilmography";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { computeFilmographyProgress } from "@/lib/filmographyProgress";
import { getLibraryBadgeForTmdbId, getWatchedTmdbIdSet } from "@/lib/movieLibraryStatus";
import type { TmdbMovieLike } from "@/lib/tmdbProxy";

/**
 * M6 part 2b: "Filmografie: Schauspieler:in" sub-view screen. Shown when a
 * user taps a cast credit from the movie-detail overlay. Structurally
 * mirrors `src/app/(app)/(modals)/filmography/director/[personId].tsx` (same
 * shape, different hook/testID prefix/German label) — see that file's header
 * comment for the shared rationale (no streaming filter, progress header
 * DOES apply here per spec).
 */
export default function ActorFilmographyScreen() {
  const params = useLocalSearchParams<{ personId: string }>();
  const router = useRouter();

  const personId = Number(params.personId);
  const hasValidParams = params.personId != null && !Number.isNaN(personId);

  const currentUserId = useCurrentUserId();
  const { activeGroupId, groupsQuery: userGroupsQuery } = useActiveGroup(currentUserId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const filmographyQuery = useActorFilmography(hasValidParams ? personId : undefined);

  const items: MovieGridItem[] = (filmographyQuery.data ?? []).map((part: TmdbMovieLike) => ({
    tmdbId: part.id,
    title: part.title ?? part.name ?? "Unbekannt",
    posterPath: part.poster_path ?? null,
    releaseDate: part.release_date ?? null,
    voteAverage: typeof part.vote_average === "number" ? part.vote_average : null,
  }));

  const watchedSet = getWatchedTmdbIdSet(watchlistQuery.data?.entries ?? [], currentUserId ?? "");
  const progress = computeFilmographyProgress(
    items.map((item) => item.tmdbId),
    watchedSet
  );

  if (!hasValidParams || filmographyQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="actor-filmography-screen">
        <Text testID="actor-filmography-screen-error" className="text-center text-danger">
          Die Filmografie konnte nicht geladen werden.
        </Text>
      </View>
    );
  }

  if (filmographyQuery.isLoading || userGroupsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="actor-filmography-screen">
        <ActivityIndicator testID="actor-filmography-screen-loading" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="actor-filmography-screen">
      <Text className="mb-3 font-display text-xl text-text-primary">Filmografie: Schauspieler:in</Text>
      <MovieGrid
        items={items}
        onPressItem={(item) =>
          router.push({
            pathname: "/movie/[tmdbId]",
            params: { tmdbId: String(item.tmdbId) },
          })
        }
        testID="actor-filmography-screen-grid"
        getBadge={(item) =>
          getLibraryBadgeForTmdbId(watchlistQuery.data?.entries ?? [], item.tmdbId, currentUserId ?? "")
        }
        progressHeader={progress}
        streamingFilter={null}
        emptyMessage="Keine Filme gefunden."
      />
    </View>
  );
}
