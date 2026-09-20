import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { MovieDetailActionsBar } from "@/components/movie/MovieDetailActionsBar";
import { MovieDetailCastRow } from "@/components/movie/MovieDetailCastRow";
import { MovieDetailDescription } from "@/components/movie/MovieDetailDescription";
import { MovieDetailGenreTags } from "@/components/movie/MovieDetailGenreTags";
import { MovieDetailMetaRow } from "@/components/movie/MovieDetailMetaRow";
import { MovieDetailPosterTrailer } from "@/components/movie/MovieDetailPosterTrailer";
import { MovieDetailProviders } from "@/components/movie/MovieDetailProviders";
import { MovieDetailRatingsSection } from "@/components/movie/MovieDetailRatingsSection";
import { MovieDetailTitleRow } from "@/components/movie/MovieDetailTitleRow";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMovieDetail } from "@/hooks/useMovieDetail";
import { useToggleLike } from "@/hooks/useMovieDetailMutations";
import { useUserGroups } from "@/hooks/useUserGroups";
import { resolveGroupTheme } from "@/lib/groupTheme";
import {
  formatRuntime,
  getVisibleActions,
  pickGenres,
  pickPreferredReleaseDate,
  pickRuntime,
  type GetVisibleActionsContext,
} from "@/lib/movieDetailLogic";
import { navigateToActorFilmography, navigateToDirectorFilmography } from "@/lib/movieDetailNavigation";
import type { Movie } from "@/lib/watchlistTypes";

/**
 * Movie-Detail-Overlay route (M6 part 2a) — the final integration point that
 * wires together the already-built logic module, hooks and presentational
 * components for this screen. See this file's own report in the M6 part 2a
 * hand-off for the full documented route-params contract and every interim
 * decision made here (placeholder copy, precedence rules, the two flagged
 * NEW decision points for `isReleased`/`isOnStreaming`, etc.) — kept out of
 * this file as prose to avoid duplicating that write-up in two places.
 *
 * Route params contract (query string, all but `tmdbId` optional):
 *   - `tmdbId` (dynamic segment, required): TMDB movie id.
 *   - `groupId?: string` — the watch-group this overlay was opened from.
 *   - `source?: "watchlist" | "diary"` — which screen opened it; together
 *     with `groupId` this defines "group context" (see `hasGroupContext`
 *     below), and gates the "Bewertungen" section (diary only).
 *   - `watchlistEntryId?: string` — the group's `watchlist_entries.id` for
 *     this movie, when already known.
 *   - `movieJson?: string` — `encodeURIComponent(JSON.stringify(movie))` of
 *     a `Movie` (src/lib/watchlistTypes.ts) for instant-paint before the
 *     authoritative `useGroupWatchlist` data resolves. Parsed defensively:
 *     malformed/absent JSON, or a parsed value that isn't a non-null object,
 *     is treated as "no movieJson" and never crashes the screen.
 */
export default function MovieDetailScreen() {
  const params = useLocalSearchParams<{
    tmdbId: string;
    groupId?: string;
    source?: "watchlist" | "diary";
    watchlistEntryId?: string;
    movieJson?: string;
  }>();
  const router = useRouter();

  const rawTmdbId = params.tmdbId;
  const tmdbId = Number(rawTmdbId);
  // `Number("")` is 0 (finite), so an empty/missing segment must be rejected
  // explicitly rather than relying on `Number.isFinite` alone.
  const isValidTmdbId =
    typeof rawTmdbId === "string" && rawTmdbId.trim() !== "" && Number.isFinite(tmdbId);

  const groupId = params.groupId;
  const source = params.source;
  const watchlistEntryId = params.watchlistEntryId;
  const hasGroupContext = Boolean(groupId && source);

  const currentUserId = useCurrentUserId();
  const userGroupsQuery = useUserGroups(currentUserId);
  // Active-group pattern (same interim simplification as watchlist.tsx/
  // tagebuch.tsx): used ONLY for the no-group-context
  // "zur_watchlist"/"direkt_bewerten" branch below. When `groupId` IS
  // present via route params, that's the group context used everywhere
  // else, not `activeGroupId`.
  const activeGroupId = userGroupsQuery.data?.[0]?.group_id as string | undefined;

  const groupWatchlistQuery = useGroupWatchlist(hasGroupContext ? groupId : undefined);
  const groupMembersQuery = useGroupMembers(hasGroupContext ? groupId : undefined);

  const watchlistEntry = groupWatchlistQuery.data?.entries.find(
    (entry) => entry.id === watchlistEntryId,
  );

  const displayNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of groupMembersQuery.data ?? []) {
      if (member.profiles?.display_name) {
        names.set(member.user_id, member.profiles.display_name);
      }
    }
    return names;
  }, [groupMembersQuery.data]);

  const movieFromJson = useMemo<Movie | null>(() => {
    if (!params.movieJson) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(params.movieJson));
      if (parsed != null && typeof parsed === "object") {
        return parsed as Movie;
      }
      return null;
    } catch {
      return null;
    }
  }, [params.movieJson]);

  // Precedence: the real, DB-backed movie (once the group watchlist query
  // resolves) wins over the instantly-available parsed `movieJson`, which is
  // only ever an "instant paint before the group watchlist query resolves"
  // convenience, never the source of truth.
  const storedMovie = watchlistEntry?.movie ?? movieFromJson ?? undefined;
  // No rating rows exist for a movie that isn't (yet) in any group's
  // watchlist, so this is `[]` whenever there's no matching entry.
  const ratings = watchlistEntry?.ratings ?? [];

  const movieDetailQuery = useMovieDetail(isValidTmdbId ? tmdbId : undefined);
  const liveDetails = movieDetailQuery.data?.details ?? null;

  const toggleLikeMutation = useToggleLike();

  // Placeholder fallback copy — interim, undocumented-elsewhere choice, see
  // the hand-off report's decision log.
  const title = storedMovie?.name ?? "Film";
  const posterUrl = storedMovie?.poster ?? null;
  const overview = storedMovie?.overview ?? null;
  const runtimeLabel = formatRuntime(pickRuntime(storedMovie?.runtime ?? null, liveDetails?.runtime ?? null));
  const releaseInfo = pickPreferredReleaseDate(
    movieDetailQuery.data?.germanReleaseDate ?? null,
    storedMovie?.release_date ?? null,
  );
  const genres = pickGenres(liveDetails?.genres ?? null, storedMovie?.movie_genres ?? null);
  const voteAverage = liveDetails?.vote_average ?? storedMovie?.vote_average ?? null;

  const currentUserRating = ratings.find((rating) => rating.member_id === currentUserId);
  const showHeart = currentUserRating?.liked === true;
  const liked = currentUserRating?.liked === true;

  function handleToggleLike() {
    // `groupId` is required so the mutation can invalidate this group's
    // `["watchlist", groupId]` cache on success. It's always defined here in
    // practice -- `currentUserRating` only exists when `watchlistEntry`
    // resolved from `useGroupWatchlist(groupId)`'s data -- but the check is
    // explicit for type-safety rather than a non-null assertion.
    if (currentUserRating && watchlistEntryId && currentUserId && groupId) {
      toggleLikeMutation.mutate({
        watchlistEntryId,
        memberId: currentUserId,
        nextLiked: !currentUserRating.liked,
        existingRatingId: currentUserRating.id,
        groupId,
      });
    }
  }

  const starColor = resolveGroupTheme(undefined).colors.starColor;

  // Two NEW decision points not pre-specified anywhere upstream — flagged
  // explicitly in the hand-off report for user confirmation.
  const isReleased = releaseInfo != null && new Date(releaseInfo.date).getTime() <= Date.now();
  const isOnStreaming = (movieDetailQuery.data?.providers?.flatrate.length ?? 0) > 0;

  const hasCollection = liveDetails?.belongs_to_collection != null;
  const collectionId = liveDetails?.belongs_to_collection?.id;

  const visibleActionsContext: GetVisibleActionsContext = {
    hasGroupContext,
    source,
    isReleased,
    isOnStreaming,
    hasCollection,
  };
  const actions = getVisibleActions(visibleActionsContext);

  if (!isValidTmdbId) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="movie-detail-invalid">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-center text-text-primary">Ungültiger Film</Text>
        <Pressable
          testID="movie-detail-back-button"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="mt-4 h-touch-min items-center justify-center px-4"
        >
          <Ionicons name={router.canGoBack() ? "arrow-back" : "close"} size={22} color="#8b8b8b" />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary" testID="movie-detail-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerClassName="pb-24">
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            testID="movie-detail-back-button"
            accessibilityRole="button"
            onPress={() => router.back()}
            className="h-touch-min w-touch-min items-center justify-center"
          >
            <Ionicons
              name={router.canGoBack() ? "arrow-back" : "close"}
              size={24}
              color="#8b8b8b"
            />
          </Pressable>
        </View>

        <MovieDetailPosterTrailer
          posterUrl={posterUrl}
          title={title}
          isLoadingDetail={movieDetailQuery.isLoading}
          trailer={movieDetailQuery.data?.trailer ?? null}
        />

        <View className="gap-3 px-4 pt-4">
          <MovieDetailTitleRow
            title={title}
            voteAverage={voteAverage}
            showHeart={showHeart}
            liked={liked}
            onToggleLike={handleToggleLike}
            isTogglingLike={toggleLikeMutation.isPending}
          />

          <MovieDetailMetaRow runtimeLabel={runtimeLabel} releaseInfo={releaseInfo} />

          <MovieDetailGenreTags genres={genres} />

          {source === "diary" ? (
            <MovieDetailRatingsSection
              ratings={ratings}
              displayNameById={displayNameById}
              starColor={starColor}
            />
          ) : null}

          <MovieDetailCastRow
            director={movieDetailQuery.data?.credits?.director ?? null}
            cast={movieDetailQuery.data?.credits?.cast ?? []}
            onDirectorPress={(personId) => navigateToDirectorFilmography(router, personId)}
            onCastMemberPress={(personId) => navigateToActorFilmography(router, personId)}
          />

          <MovieDetailDescription overview={overview} />

          <MovieDetailProviders providers={movieDetailQuery.data?.providers ?? null} />
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border-subtle bg-bg-primary"
        testID="movie-detail-action-bar"
      >
        <MovieDetailActionsBar
          actions={actions}
          router={router}
          tmdbId={tmdbId}
          groupId={groupId}
          watchlistEntryId={watchlistEntryId}
          activeGroupId={activeGroupId}
          currentUserId={currentUserId}
          collectionId={collectionId}
        />
      </View>
    </View>
  );
}
