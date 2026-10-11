import { useRouter } from "expo-router";
import type { ComponentType } from "react";
import { View } from "react-native";

import { MovieGrid, type MovieGridItem, type MovieGridProps } from "@/components/movie/MovieGrid";
import { Button } from "@/components/ui/Button";
import type { IconRole } from "@/components/ui/Icon";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { Text } from "@/components/ui/Text";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { computeFilmographyProgress } from "@/lib/filmographyProgress";
import { navigateToMovieDetailWithContext } from "@/lib/movieDetailNavigation";
import { getLibraryBadgeForTmdbId, getWatchedTmdbIdSet } from "@/lib/movieLibraryStatus";

/**
 * Base of the five movie-grid modal screens (Schauspieler, Regie, Studio,
 * Aehnliche Filme, Filmreihe). The route files are thin wrappers: they read
 * the params, call their query hook and pass state + mapped items + a few
 * props here. This component owns the group/watchlist badge wiring, the
 * invalid/error/loading states, the optional title line, progress header,
 * provider-category filter, "Mehr laden" footer and the navigation to the
 * movie detail (`push`, or `replace` with group context).
 */

export interface MovieGridScreenProps {
  /** e.g. "actor-filmography-screen": root, `-loading`, `-error`, `-grid`. */
  testIDPrefix: string;
  items: MovieGridItem[];
  isLoading: boolean;
  isError: boolean;
  /** Shown when the route params are invalid (testID `<prefix>-error`). */
  invalidParamsText?: string;
  hasValidParams: boolean;
  errorText: string;
  /** testID suffix of the query-error text (default "error"). */
  errorTestIDSuffix?: string;
  emptyMessage: string;
  emptyIcon?: IconRole;
  /** Line above the grid (Filmreihe). */
  title?: string;
  /** Show the "X von Y gesehen" header (Schauspieler/Regie). */
  showProgress?: boolean;
  /**
   * Grid component, default `MovieGrid`. Aehnliche Filme/Filmreihe pass
   * `ProviderFilteredMovieGrid` (Flatrate/Leihen/Kaufen chips). Separate
   * module so screens without the filter do not pull in the tmdb-proxy.
   */
  Grid?: ComponentType<MovieGridProps>;
  /** `push` (default) or `replace` with group context (Aehnliche Filme). */
  navigation?: "push" | "replace";
  /** Wait for the user's group list before showing the grid (default true). */
  waitForGroups?: boolean;
  /** "Mehr laden" footer (Studio). */
  loadMore?: { hasMore: boolean; isFetching: boolean; onPress: () => void };
}

export function MovieGridScreen({
  testIDPrefix,
  items,
  isLoading,
  isError,
  hasValidParams,
  invalidParamsText,
  errorText,
  errorTestIDSuffix = "error",
  emptyMessage,
  emptyIcon,
  title,
  showProgress = false,
  Grid = MovieGrid,
  navigation = "push",
  waitForGroups = true,
  loadMore,
}: MovieGridScreenProps) {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { activeGroupId, groupsQuery } = useActiveGroup(currentUserId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);
  const entries = watchlistQuery.data?.entries ?? [];

  const getBadge = (item: MovieGridItem) => getLibraryBadgeForTmdbId(entries, item.tmdbId, currentUserId ?? "");

  const openItem = (item: MovieGridItem) => {
    if (navigation === "push") {
      navigateToMovieDetailWithContext(router, { tmdbId: item.tmdbId });
      return;
    }
    // router.replace (not push): the grid is part of the opening detail view,
    // so back from the chosen film lands on the previous film's detail, then
    // the origin (docs/style-guide.md "Navigation"). With a library badge the
    // detail route gets the group context (`groupId` + `source`, plus the
    // `watchlistEntryId` to resolve the already-loaded row).
    const badge = getBadge(item);
    if (badge !== null && activeGroupId) {
      const matchingEntry = entries.find((entry) => entry.movie?.tmdb_id === item.tmdbId);
      navigateToMovieDetailWithContext(
        router,
        {
          tmdbId: item.tmdbId,
          groupId: activeGroupId,
          source: badge === "watched" ? "diary" : "watchlist",
          watchlistEntryId: matchingEntry?.id,
        },
        "replace",
      );
    } else {
      navigateToMovieDetailWithContext(router, { tmdbId: item.tmdbId }, "replace");
    }
  };

  if (!hasValidParams) {
    return (
      <View className="flex-1 items-center justify-center px-4" testID={testIDPrefix}>
        <Text testID={`${testIDPrefix}-error`} className="text-center text-danger">
          {invalidParamsText ?? errorText}
        </Text>
      </View>
    );
  }

  if (isLoading || (waitForGroups && groupsQuery?.isLoading)) {
    return (
      <View className="flex-1" testID={testIDPrefix}>
        <LoadingArea testID={`${testIDPrefix}-loading`} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-4" testID={testIDPrefix}>
        <Text testID={`${testIDPrefix}-${errorTestIDSuffix}`} className="text-center text-danger">
          {errorText}
        </Text>
      </View>
    );
  }

  const progress = showProgress
    ? computeFilmographyProgress(
        items.map((item) => item.tmdbId),
        getWatchedTmdbIdSet(entries, currentUserId ?? ""),
      )
    : null;

  return (
    <View className="flex-1 px-4 pt-4" testID={testIDPrefix}>
      {title ? <Text className="mb-3 font-title text-xl text-text-primary">{title}</Text> : null}
      <Grid
        items={items}
        onPressItem={openItem}
        testID={`${testIDPrefix}-grid`}
        getBadge={getBadge}
        progressHeader={progress}
        streamingFilter={null}
        emptyMessage={emptyMessage}
        emptyIcon={emptyIcon}
        footer={
          loadMore?.hasMore ? (
            <View className="items-center py-4">
              <Button
                testID={`${testIDPrefix}-load-more-button`}
                label="Mehr laden"
                icon="chevronDown"
                onPress={loadMore.onPress}
                loading={loadMore.isFetching}
                disabled={loadMore.isFetching}
                variant="secondary"
              />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}
