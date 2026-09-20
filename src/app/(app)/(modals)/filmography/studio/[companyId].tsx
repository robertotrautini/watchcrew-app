import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { MovieGrid, type MovieGridItem } from "@/components/movie/MovieGrid";
import { Button } from "@/components/ui/Button";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useStudioFilmography } from "@/hooks/useStudioFilmography";
import { useUserGroups } from "@/hooks/useUserGroups";
import { getLibraryBadgeForTmdbId } from "@/lib/movieLibraryStatus";
import type { TmdbMovieLike } from "@/lib/tmdbProxy";

/**
 * M6 part 2b: "Studio-Filmografie" sub-view screen. Shown when a user taps
 * a production company from the movie-detail overlay. Purely a
 * data-loading/wiring layer on top of the shared `MovieGrid`
 * (src/components/movie/MovieGrid.tsx) — no grid/badge rendering logic of
 * its own.
 *
 * Unlike the director/actor filmography sub-views, the studio grid does NOT
 * get a `progressHeader` ("X von Y gesehen") or a `streamingFilter`, per the
 * task spec — a studio's catalog is generally far larger and not meaningfully
 * "completable" the way a person's filmography is.
 *
 * Paginated via `useStudioFilmography`'s `useInfiniteQuery` wrapper — pages
 * are flattened and de-duplicated by `tmdbId` (TMDB discover-style pagination
 * can in rare cases repeat an item across pages if underlying data shifts
 * between fetches) before being handed to `MovieGrid`.
 */
export default function StudioFilmographyScreen() {
  const params = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();

  const companyId = Number(params.companyId);
  const hasValidParams = params.companyId != null && !Number.isNaN(companyId);

  const currentUserId = useCurrentUserId();
  const userGroupsQuery = useUserGroups(currentUserId);
  const activeGroupId = userGroupsQuery.data?.[0]?.group_id as string | undefined;
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const studioFilmographyQuery = useStudioFilmography(hasValidParams ? companyId : undefined);
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    studioFilmographyQuery;

  const allResults: TmdbMovieLike[] = (data?.pages ?? []).flatMap((page) => page.results);

  // De-duplicate by tmdbId across pages, keeping the first occurrence.
  const seenTmdbIds = new Set<number>();
  const dedupedResults: TmdbMovieLike[] = [];
  for (const result of allResults) {
    if (!seenTmdbIds.has(result.id)) {
      seenTmdbIds.add(result.id);
      dedupedResults.push(result);
    }
  }

  const items: MovieGridItem[] = dedupedResults.map((part) => ({
    tmdbId: part.id,
    title: part.title ?? part.name ?? "Unbekannt",
    posterPath: part.poster_path ?? null,
    releaseDate: part.release_date ?? null,
    voteAverage: typeof part.vote_average === "number" ? part.vote_average : null,
  }));

  if (!hasValidParams) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="studio-filmography-screen">
        <Text testID="studio-filmography-screen-error" className="text-center text-danger">
          Ungültige Studio-Referenz.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="studio-filmography-screen">
        <ActivityIndicator testID="studio-filmography-screen-loading" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="studio-filmography-screen">
        <Text testID="studio-filmography-screen-error" className="text-center text-danger">
          Die Studio-Filmografie konnte nicht geladen werden.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="studio-filmography-screen">
      <Text className="mb-3 font-display text-xl text-text-primary">Filmografie: Studio</Text>
      <MovieGrid
        items={items}
        onPressItem={(item) =>
          router.push({
            pathname: "/(app)/(modals)/movie-detail",
            params: { tmdbId: String(item.tmdbId) },
          })
        }
        testID="studio-filmography-screen-grid"
        getBadge={(item) =>
          getLibraryBadgeForTmdbId(watchlistQuery.data?.entries ?? [], item.tmdbId, currentUserId ?? "")
        }
        footer={
          hasNextPage ? (
            <View className="items-center py-4">
              <Button
                testID="studio-filmography-screen-load-more-button"
                label="Mehr laden"
                onPress={() => fetchNextPage()}
                loading={isFetchingNextPage}
                disabled={isFetchingNextPage}
                variant="secondary"
              />
            </View>
          ) : undefined
        }
        emptyMessage="Keine Filme gefunden."
      />
    </View>
  );
}
