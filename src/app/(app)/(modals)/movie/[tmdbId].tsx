import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { useParallaxScroll } from "@/components/parallaxContext";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";

import { SURFACE_BAR_CLASSNAME } from "@/components/ui/Surface";
import { SheetHost } from "@/components/ui/Sheet";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { MovieDetailActionsBar } from "@/components/movie/MovieDetailActionsBar";
import {
  MovieDetailCastRow,
  MovieDetailDirector,
} from "@/components/movie/MovieDetailCastRow";
import { MovieDetailOwnRating } from "@/components/movie/MovieDetailOwnRating";
import { MovieDetailSection } from "@/components/movie/MovieDetailSection";
import { TmdbBadge } from "@/components/ui/TmdbBadge";
import { MovieDetailDescription } from "@/components/movie/MovieDetailDescription";
import { MovieDetailGenreTags } from "@/components/movie/MovieDetailGenreTags";
import { MovieDetailMetaRow } from "@/components/movie/MovieDetailMetaRow";
import { MovieDetailPosterTrailer } from "@/components/movie/MovieDetailPosterTrailer";
import { MovieDetailReleaseDateSheet } from "@/components/movie/MovieDetailReleaseDateSheet";
import { MovieDetailProviders } from "@/components/movie/MovieDetailProviders";
import { MovieDetailRatingsSection } from "@/components/movie/MovieDetailRatingsSection";
import { MovieDetailTitleRow } from "@/components/movie/MovieDetailTitleRow";
import {
  RatingDialog,
  type RatingDialogMode,
} from "@/components/movie/RatingDialog";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useSafeBack } from "@/hooks/useSafeBack";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { resolveDetailEntryContext } from "@/lib/movieDetailEntryContext";
import { useMovieDetail } from "@/hooks/useMovieDetail";
import { useToggleLike } from "@/hooks/useMovieDetailMutations";
import { useGroupTheme } from "@/components/GroupThemeProvider";
import { formatDateForInput } from "@/lib/ratingLogic";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import {
  buildGroupRatingRows,
  formatRuntime,
  getVisibleActions,
  pickGenres,
  pickPreferredReleaseDate,
  pickRuntime,
  type GetVisibleActionsContext,
} from "@/lib/movieDetailLogic";
import {
  navigateToActorFilmography,
  navigateToDirectorFilmography,
} from "@/lib/movieDetailNavigation";
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
  const parallaxScroll = useParallaxScroll();
  const params = useLocalSearchParams<{
    tmdbId: string;
    groupId?: string;
    source?: "watchlist" | "diary";
    watchlistEntryId?: string;
    movieJson?: string;
  }>();
  const router = useRouter();
  const goBack = useSafeBack();

  const rawTmdbId = params.tmdbId;
  const tmdbId = Number(rawTmdbId);
  // `Number("")` is 0 (finite), so an empty/missing segment must be rejected
  // explicitly rather than relying on `Number.isFinite` alone.
  const isValidTmdbId =
    typeof rawTmdbId === "string" &&
    rawTmdbId.trim() !== "" &&
    Number.isFinite(tmdbId);

  const routeGroupId = params.groupId;
  const routeHasGroupContext = Boolean(routeGroupId && params.source);

  const currentUserId = useCurrentUserId();
  // M9 part 2: real, persisted active-group resolution (replaces the former
  // "first group = active group" interim simplification) -- see
  // src/hooks/useActiveGroup.ts. Used ONLY for the no-group-context
  // "zur_watchlist"/"direkt_bewerten" branch below. When `groupId` IS
  // present via route params, that's the group context used everywhere
  // else, not `activeGroupId`.
  const { activeGroupId } = useActiveGroup(currentUserId);

  // Without route group context, also watch the ACTIVE group's watchlist so
  // the action bar reacts once this movie gets added to it ("Zur Watchlist").
  const groupWatchlistQuery = useGroupWatchlist(
    routeHasGroupContext ? routeGroupId : activeGroupId,
  );
  const { groupId, source, watchlistEntryId, hasGroupContext } =
    resolveDetailEntryContext({
      routeGroupId,
      routeSource: params.source,
      routeWatchlistEntryId: params.watchlistEntryId,
      tmdbId,
      activeGroupId,
      currentUserId,
      activeGroupEntries: routeHasGroupContext
        ? undefined
        : groupWatchlistQuery.data?.entries,
    });
  const groupMembersQuery = useGroupMembers(
    hasGroupContext ? groupId : undefined,
  );

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

  // Structure first: poster/title/description/rating render at once from whatever
  // exists (stored movie / route JSON). The rest (meta, genres, cast, providers)
  // sits behind ONE central loading state, see `isContentPending` below.
  const isDetailLoading = movieDetailQuery.isLoading;

  // Stored movie (DB row / instant-paint JSON) wins; the live TMDB `details`
  // payload fills in when the movie isn't stored yet (e.g. opened straight
  // from a search result, which carries only `tmdbId`). "Film" stays the
  // last-resort placeholder while neither has resolved.
  const title = storedMovie?.name ?? liveDetails?.title ?? "Film";
  const posterUrl = buildTmdbImageUrl(
    storedMovie?.poster ?? liveDetails?.posterPath ?? null,
    "w780",
  );
  const overview = storedMovie?.overview ?? liveDetails?.overview ?? null;
  const runtimeLabel = formatRuntime(
    pickRuntime(storedMovie?.runtime ?? null, liveDetails?.runtime ?? null),
  );
  // Per-group override (watchlist_entries.release_date_override) wins over every
  // TMDB-derived date, including the German cinema/digital date.
  const releaseDateOverride = watchlistEntry?.release_date_override ?? null;
  // Release-date line is tappable (-> edit sheet) only in watchlist + group context.
  const [releaseDateSheetVisible, setReleaseDateSheetVisible] = useState(false);
  const canEditReleaseDate =
    hasGroupContext &&
    source === "watchlist" &&
    Boolean(groupId) &&
    Boolean(watchlistEntryId);
  const releaseInfo =
    releaseDateOverride != null
      ? { label: "Erscheinungsdatum", date: releaseDateOverride }
      : pickPreferredReleaseDate(
          movieDetailQuery.data?.germanReleaseDate ?? null,
          storedMovie?.release_date ?? liveDetails?.releaseDate ?? null,
        );
  const genres = pickGenres(
    liveDetails?.genres ?? null,
    storedMovie?.movie_genres ?? null,
  );
  const voteAverage =
    liveDetails?.vote_average ?? storedMovie?.vote_average ?? null;

  // One central loading state for the whole content area under the title: only
  // while the live query loads AND nothing of it is known yet (first open from a
  // search result). With cached data the sections show immediately.
  const isContentPending =
    isDetailLoading &&
    runtimeLabel == null &&
    releaseInfo == null &&
    genres.length === 0;
  const director = movieDetailQuery.data?.credits?.director ?? null;
  const cast = movieDetailQuery.data?.credits?.cast ?? [];
  const providerData = movieDetailQuery.data?.providers ?? null;
  const hasProviders =
    providerData != null &&
    providerData.flatrate.length + providerData.rent.length + providerData.buy.length > 0;
  const hasDetails =
    runtimeLabel != null ||
    releaseInfo != null ||
    canEditReleaseDate ||
    genres.length > 0 ||
    voteAverage != null;
  // Fade the content in only if it actually came out of the loading state.
  const [startedPending] = useState(isContentPending);

  const currentUserRating = ratings.find(
    (rating) => rating.member_id === currentUserId,
  );
  const showHeart = currentUserRating != null;
  const liked = currentUserRating?.liked === true;

  function handleToggleLike() {
    // `groupId` is required so the mutation can invalidate this group's
    // `["watchlist", groupId]` cache on success. It's always defined here in
    // practice -- `currentUserRating` only exists when `watchlistEntry`
    // resolved from `useGroupWatchlist(groupId)`'s data -- but the check is
    // explicit for type-safety rather than a non-null assertion.
    if (currentUserRating && watchlistEntry && currentUserId && groupId) {
      toggleLikeMutation.mutate({
        movieId: watchlistEntry.movie_id,
        memberId: currentUserId,
        nextLiked: !currentUserRating.liked,
        groupId,
      });
    }
  }

  // Abschnitt "Bewertung": nur wenn der Film eine eigene Bewertung hat oder im
  // Tagebuch liegt (dort zusaetzlich die Gruppen-Liste). Film aus der Suche ohne
  // Bewertung -> kein Abschnitt.
  const ratedCount = ratings.filter(
    (rating) => rating.rating != null && rating.rating > 0,
  ).length;
  const totalMembers = groupMembersQuery.data?.length ?? 0;
  // Gruppen-Liste: nur andere Mitglieder; ohne andere entfaellt der Block.
  const groupRatingRows =
    source === "diary"
      ? buildGroupRatingRows(
          (groupMembersQuery.data ?? []).map((member) => member.user_id),
          ratings,
          currentUserId,
        )
      : [];
  const showRatingSection =
    currentUserRating != null || groupRatingRows.length > 0;

  const starColor = useGroupTheme().colors.starColor;

  // Two NEW decision points not pre-specified anywhere upstream — flagged
  // explicitly in the hand-off report for user confirmation.
  // Captured once per mount (impure Date.now() must not run during render).
  const [nowMs] = useState(() => Date.now());
  const isReleased =
    releaseInfo != null && new Date(releaseInfo.date).getTime() <= nowMs;
  const isOnStreaming =
    (movieDetailQuery.data?.providers?.flatrate.length ?? 0) > 0;

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

  // M7 consolidation (Item 2, see docs/interim-decisions.md): the
  // Rating-Dialog is rendered directly by THIS screen as a controlled
  // overlay, matching the delete-confirmation `Sheet` convention already
  // used by MovieDetailActionsBar -- a plain `visible` boolean plus a
  // separate "what/for whom" target, rather than unmounting the dialog on
  // close (RN `Modal`'s own `visible` prop already handles that).
  const [ratingDialogVisible, setRatingDialogVisible] = useState(false);
  const [ratingDialogTarget, setRatingDialogTarget] = useState<{
    mode: RatingDialogMode;
    watchlistEntryId: string;
    /** Set for "direct" (fresh entry in another group); otherwise resolved from the entry. */
    movieId?: string;
    groupId: string;
  } | null>(null);

  // Resolves the target watchlist_entries row's ratings/paid_by_member_id/
  // paid_at for the dialog, when known. For "watchlist"/"diary" (an
  // existing entry, always within the CURRENT `groupId` route param) this
  // is the same `groupWatchlistQuery` this screen already loads. For
  // "direct" (a brand-new entry, created for `activeGroupId` -- there is no
  // group context on this screen at all in that case) `groupWatchlistQuery`
  // was never fetching that group's data, so this resolves to `undefined`
  // and the dialog falls back to sensible "nothing set yet" defaults below
  // -- correct for a freshly-created entry either way.
  const ratingDialogEntry = ratingDialogTarget
    ? groupWatchlistQuery.data?.entries.find(
        (entry) => entry.id === ratingDialogTarget.watchlistEntryId,
      )
    : undefined;

  function handleOpenRatingDialog(
    entryId: string,
    mode: "watchlist" | "diary",
  ) {
    if (!groupId) {
      return;
    }
    setRatingDialogTarget({ mode, watchlistEntryId: entryId, groupId });
    setRatingDialogVisible(true);
  }

  function handleDirectRate() {
    if (!activeGroupId) {
      return;
    }
    // No write here: the entry is created together with the rating on the dialog's Speichern.
    setRatingDialogTarget({
      mode: "direct",
      watchlistEntryId: "",
      groupId: activeGroupId,
    });
    setRatingDialogVisible(true);
  }

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
              isLoadingDetail={movieDetailQuery.isLoading}
              trailer={movieDetailQuery.data?.trailer ?? null}
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
                      isTogglingLike={toggleLikeMutation.isPending}
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

              {isContentPending ? (
                <LoadingArea
                  testID="movie-detail-content-loading"
                  className="min-h-64 w-full"
                />
              ) : (
                <FadeInItem
                  index={0}
                  skipInitialFade={!startedPending}
                  testID="movie-detail-content"
                >
                  {hasDetails ? (
                    <MovieDetailSection name="details" title="Details" withDivider>
                      <MovieDetailMetaRow
                        runtimeLabel={runtimeLabel}
                        releaseInfo={
                          releaseInfo
                            ? {
                                ...releaseInfo,
                                date: formatDateForInput(releaseInfo.date),
                              }
                            : null
                        }
                        onEditReleaseDate={
                          canEditReleaseDate
                            ? () => setReleaseDateSheetVisible(true)
                            : undefined
                        }
                        trailing={
                          voteAverage != null ? (
                            <TmdbBadge
                              testID="movie-detail-score-badge"
                              score={voteAverage}
                            />
                          ) : null
                        }
                      />
                      <MovieDetailGenreTags genres={genres} />
                    </MovieDetailSection>
                  ) : null}

                  {director ? (
                    <MovieDetailSection name="director" title="Regie" withDivider>
                      <MovieDetailDirector
                        director={director}
                        onDirectorPress={(personId) =>
                          navigateToDirectorFilmography(router, personId)
                        }
                      />
                    </MovieDetailSection>
                  ) : null}

                  {cast.length > 0 ? (
                    <MovieDetailSection name="cast" title="Besetzung" withDivider>
                      <MovieDetailCastRow
                        cast={cast}
                        onCastMemberPress={(personId) =>
                          navigateToActorFilmography(router, personId)
                        }
                      />
                    </MovieDetailSection>
                  ) : null}

                  {hasProviders ? (
                    <MovieDetailSection name="streaming" title="Streaming" withDivider>
                      <MovieDetailProviders
                        providers={movieDetailQuery.data?.providers ?? null}
                      />
                    </MovieDetailSection>
                  ) : null}
                </FadeInItem>
              )}
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
          groupMembers={groupMembersQuery.data ?? []}
          displayNameById={displayNameById}
          starColor={starColor}
          directCreate={ratingDialogTarget?.mode === "direct" ? { tmdbId } : undefined}
        />
      </SheetHost>
    </SafeAreaView>
  );
}
