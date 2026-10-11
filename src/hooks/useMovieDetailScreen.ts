import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import type { RatingDialogMode } from "@/components/movie/RatingDialog";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMovieDetail } from "@/hooks/useMovieDetail";
import { useToggleLike } from "@/hooks/useMovieDetailMutations";
import { useSafeBack } from "@/hooks/useSafeBack";
import { resolveDetailEntryContext } from "@/lib/movieDetailEntryContext";
import {
  buildGroupRatingRows,
  formatRuntime,
  getVisibleActions,
  pickGenres,
  pickPreferredReleaseDate,
  pickRuntime,
  type GetVisibleActionsContext,
} from "@/lib/movieDetailLogic";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import type { Movie } from "@/lib/watchlistTypes";

/**
 * Controller for the Movie-Detail-Overlay route
 * (src/app/(app)/(modals)/movie/[tmdbId].tsx, M6 part 2a): reads the route
 * params, resolves the group/entry context, merges stored and live TMDB data
 * (stored wins), derives the section visibility flags and owns the
 * rating-dialog / release-date-sheet state. The screen only lays out.
 *
 * Route params contract (query string, all but `tmdbId` optional):
 *   - `tmdbId` (dynamic segment, required): TMDB movie id.
 *   - `groupId?: string` -- the watch-group this overlay was opened from.
 *   - `source?: "watchlist" | "diary"` -- which screen opened it; together
 *     with `groupId` this defines "group context" (see `routeHasGroupContext`
 *     below), and gates the "Bewertungen" section (diary only).
 *   - `watchlistEntryId?: string` -- the group's `watchlist_entries.id` for
 *     this movie, when already known.
 *   - `movieJson?: string` -- `encodeURIComponent(JSON.stringify(movie))` of
 *     a `Movie` (src/lib/watchlistTypes.ts) for instant-paint before the
 *     authoritative `useGroupWatchlist` data resolves. Parsed defensively:
 *     malformed/absent JSON, or a parsed value that isn't a non-null object,
 *     is treated as "no movieJson" and never crashes the screen.
 */
export function useMovieDetailScreen() {
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
  // from a search result, which carries only `tmdbId`). No
  // placeholder text: while neither has resolved the title is empty and the
  // title row renders nothing (only the central spinner shows).
  const title = storedMovie?.name ?? liveDetails?.title ?? "";
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

  return {
    router,
    goBack,
    tmdbId,
    isValidTmdbId,
    groupId,
    watchlistEntryId,
    activeGroupId,
    currentUserId,
    groupMembers: groupMembersQuery.data ?? [],
    displayNameById,
    movieDetail: movieDetailQuery.data,
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
    isTogglingLike: toggleLikeMutation.isPending,
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
  };
}
