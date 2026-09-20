import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { MovieGrid, type MovieGridItem } from "@/components/movie/MovieGrid";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useDirectorFilmography } from "@/hooks/useDirectorFilmography";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useUserGroups } from "@/hooks/useUserGroups";
import { computeFilmographyProgress } from "@/lib/filmographyProgress";
import { getLibraryBadgeForTmdbId, getWatchedTmdbIdSet } from "@/lib/movieLibraryStatus";
import type { TmdbMovieLike } from "@/lib/tmdbProxy";

/**
 * M6 part 2b: "Filmografie: Regisseur" sub-view screen. Shown when a user
 * taps a director credit from the movie-detail overlay. Structurally mirrors
 * `src/app/(app)/(modals)/filmography/actor/[personId].tsx` (same shape,
 * different hook/testID prefix/German label) and
 * `src/app/(app)/(modals)/collection/[collectionId].tsx`'s wiring pattern —
 * purely a data-loading/wiring layer on top of the shared `MovieGrid`
 * (src/components/movie/MovieGrid.tsx). No streaming filter here (spec only
 * calls for one on collection/similar-movies), but the "X von Y gesehen ·
 * Z%" progress header DOES apply to both director and actor filmography
 * (only NOT studio).
 */
export default function DirectorFilmographyScreen() {
  const params = useLocalSearchParams<{ personId: string }>();
  const router = useRouter();

  const personId = Number(params.personId);
  const hasValidParams = params.personId != null && !Number.isNaN(personId);

  const currentUserId = useCurrentUserId();
  const userGroupsQuery = useUserGroups(currentUserId);
  const activeGroupId = userGroupsQuery.data?.[0]?.group_id as string | undefined;
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const filmographyQuery = useDirectorFilmography(hasValidParams ? personId : undefined);

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
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="director-filmography-screen">
        <Text testID="director-filmography-screen-error" className="text-center text-danger">
          Die Filmografie konnte nicht geladen werden.
        </Text>
      </View>
    );
  }

  if (filmographyQuery.isLoading || userGroupsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="director-filmography-screen">
        <ActivityIndicator testID="director-filmography-screen-loading" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="director-filmography-screen">
      <Text className="mb-3 font-display text-xl text-text-primary">Filmografie: Regisseur</Text>
      <MovieGrid
        items={items}
        onPressItem={(item) =>
          router.push({
            // Movie-detail screen not yet landed (parallel M6 part 1 task);
            // cast is removed once its typed route exists — see
            // docs/interim-decisions.md "Angenommene movie-detail-Route".
            pathname: "/(app)/(modals)/movie-detail" as never,
            params: { tmdbId: String(item.tmdbId) },
          })
        }
        testID="director-filmography-screen-grid"
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
