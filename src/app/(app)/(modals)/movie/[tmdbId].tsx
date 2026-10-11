import { Stack } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useParallaxScroll } from "@/components/parallaxContext";
import { MovieDetailActionsBar } from "@/components/movie/MovieDetailActionsBar";
import { MovieDetailContent } from "@/components/movie/MovieDetailContent";
import { MovieDetailDescription } from "@/components/movie/MovieDetailDescription";
import { MovieDetailOwnRating } from "@/components/movie/MovieDetailOwnRating";
import { MovieDetailPosterTrailer } from "@/components/movie/MovieDetailPosterTrailer";
import { MovieDetailRatingsSection } from "@/components/movie/MovieDetailRatingsSection";
import { MovieDetailReleaseDateSheet } from "@/components/movie/MovieDetailReleaseDateSheet";
import { MovieDetailSection } from "@/components/movie/MovieDetailSection";
import { MovieDetailTitleRow } from "@/components/movie/MovieDetailTitleRow";
import { RatingDialog } from "@/components/movie/RatingDialog";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { SheetHost } from "@/components/ui/Sheet";
import { SURFACE_BAR_CLASSNAME } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { useMovieDetailScreen } from "@/hooks/useMovieDetailScreen";
import { PLACEHOLDER_COLOR } from "@/lib/colors";
import {
  navigateToActorFilmography,
  navigateToDirectorFilmography,
} from "@/lib/movieDetailNavigation";

/**
 * Movie-Detail-Overlay route (M6 part 2a): layout only. The route-params
 * contract, data merging and all handlers live in `useMovieDetailScreen`
 * (src/hooks/useMovieDetailScreen.ts); the live-data sections are
 * `MovieDetailContent`.
 */
export default function MovieDetailScreen() {
  const parallaxScroll = useParallaxScroll();
  const {
    router,
    goBack,
    tmdbId,
    isValidTmdbId,
    groupId,
    watchlistEntryId,
    activeGroupId,
    currentUserId,
    groupMembers,
    displayNameById,
    movieDetail,
    isDetailLoading,
    title,
    posterUrl,
    overview,
    runtimeLabel,
    releaseInfo,
    releaseDateOverride,
    releaseDateSheetVisible,
    setReleaseDateSheetVisible,
    canEditReleaseDate,
    genres,
    voteAverage,
    isContentPending,
    startedPending,
    hasDetails,
    director,
    cast,
    hasProviders,
    currentUserRating,
    showHeart,
    liked,
    handleToggleLike,
    isTogglingLike,
    ratedCount,
    totalMembers,
    groupRatingRows,
    showRatingSection,
    starColor,
    actions,
    collectionId,
    ratingDialogVisible,
    setRatingDialogVisible,
    ratingDialogTarget,
    ratingDialogEntry,
    handleOpenRatingDialog,
    handleDirectRate,
  } = useMovieDetailScreen();

  if (!isValidTmdbId) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center px-4"
        testID="movie-detail-invalid"
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-center text-text-primary">Ungültiger Film</Text>
        <Pressable
          testID="movie-detail-back-button"
          accessibilityRole="button"
          onPress={goBack}
          accessibilityLabel="Zurück"
          className="mt-4 h-touch-comfortable min-w-touch-comfortable items-center justify-center px-4"
        >
          <Icon
            name={router.canGoBack() ? "back" : "close"}
            size="M"
            color={PLACEHOLDER_COLOR}
          />
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Safe-Area"): this screen explicitly overrides the (modals) group's
    // default native header (`headerShown: false` below), so nothing else
    // accounts for the top status-bar/notch/Dynamic-Island inset -- the
    // manual back button rendered right at the top of the ScrollView would
    // otherwise sit partially under it. `bottom` is handled separately, on
    // the absolutely-positioned action bar below (its own home-indicator
    // inset, not this outer container's).
    <SafeAreaView
      edges={["top"]}
      className="flex-1"
      testID="movie-detail-screen"
    >
      <SheetHost>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Inner flex-1 box = inside the SafeAreaView's top padding, so the absolute back button sits below the status bar. */}
        <View className="flex-1">
          <ScrollView
            {...parallaxScroll}
            contentContainerClassName={
              actions.length > 4 ? "pb-60 pt-14" : "pb-40 pt-14"
            }
          >
            <MovieDetailPosterTrailer
              posterUrl={posterUrl}
              title={title}
              isLoadingDetail={isDetailLoading}
              trailer={movieDetail?.trailer ?? null}
            />

            <View className="px-4 pt-3">
              <MovieDetailSection name="info">
                <MovieDetailTitleRow title={title} />
                <MovieDetailDescription overview={overview} />
              </MovieDetailSection>

              {showRatingSection ? (
                <MovieDetailSection name="rating" title="Bewertung" withDivider>
                  {currentUserRating ? (
                    <MovieDetailOwnRating
                      rating={currentUserRating.rating}
                      starColor={starColor}
                      showHeart={showHeart}
                      liked={liked}
                      onToggleLike={handleToggleLike}
                      isTogglingLike={isTogglingLike}
                      ratedCount={ratedCount}
                      totalMembers={totalMembers}
                    />
                  ) : null}
                  {groupRatingRows.length > 0 ? (
                    <MovieDetailRatingsSection
                      rows={groupRatingRows}
                      displayNameById={displayNameById}
                      starColor={starColor}
                    />
                  ) : null}
                </MovieDetailSection>
              ) : null}

              <MovieDetailContent
                pending={isContentPending}
                fadeIn={startedPending}
                hasDetails={hasDetails}
                runtimeLabel={runtimeLabel}
                releaseInfo={releaseInfo}
                onEditReleaseDate={
                  canEditReleaseDate ? () => setReleaseDateSheetVisible(true) : undefined
                }
                voteAverage={voteAverage}
                genres={genres}
                director={director}
                cast={cast}
                providers={movieDetail?.providers ?? null}
                hasProviders={hasProviders}
                onDirectorPress={(personId) => navigateToDirectorFilmography(router, personId)}
                onCastMemberPress={(personId) => navigateToActorFilmography(router, personId)}
              />
            </View>
          </ScrollView>

          {/* Fixed (not inside the ScrollView): stays inside the top safe-area inset and never scrolls away. */}
          <View className="absolute left-4 top-2 z-10" pointerEvents="box-none">
            <IconButton
              testID="movie-detail-back-button"
              icon={router.canGoBack() ? "back" : "close"}
              accessibilityLabel={router.canGoBack() ? "Zurück" : "Schließen"}
              onPress={goBack}
            />
          </View>
        </View>

        <View
          className={`absolute bottom-0 left-0 right-0 overflow-hidden ${SURFACE_BAR_CLASSNAME} bg-black`}
        >
          <SafeAreaView edges={["bottom"]} testID="movie-detail-action-bar">
            <MovieDetailActionsBar
              actions={actions}
              router={router}
              tmdbId={tmdbId}
              groupId={groupId}
              watchlistEntryId={watchlistEntryId}
              activeGroupId={activeGroupId}
              currentUserId={currentUserId}
              collectionId={collectionId}
              onOpenRatingDialog={handleOpenRatingDialog}
              onDirectRate={handleDirectRate}
            />
          </SafeAreaView>
        </View>

        <MovieDetailReleaseDateSheet
          visible={releaseDateSheetVisible}
          onClose={() => setReleaseDateSheetVisible(false)}
          groupId={groupId}
          watchlistEntryId={watchlistEntryId}
          releaseDate={releaseInfo?.date ?? null}
          hasReleaseDateOverride={releaseDateOverride != null}
        />

        <RatingDialog
          visible={ratingDialogVisible}
          onClose={() => setRatingDialogVisible(false)}
          mode={ratingDialogTarget?.mode ?? "watchlist"}
          groupId={ratingDialogTarget?.groupId ?? ""}
          currentUserId={currentUserId ?? ""}
          movieTitle={title}
          movieReleaseDate={releaseInfo?.date ?? null}
          watchlistEntryId={ratingDialogTarget?.watchlistEntryId ?? ""}
          movieId={ratingDialogTarget?.movieId ?? ratingDialogEntry?.movie_id ?? ""}
          paidByMemberId={ratingDialogEntry?.paid_by_member_id ?? null}
          paidAt={ratingDialogEntry?.paid_at ?? null}
          ratings={ratingDialogEntry?.ratings ?? []}
          groupMembers={groupMembers}
          displayNameById={displayNameById}
          starColor={starColor}
          directCreate={ratingDialogTarget?.mode === "direct" ? { tmdbId } : undefined}
        />
      </SheetHost>
    </SafeAreaView>
  );
}
