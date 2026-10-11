import { MOVIE_TITLE_FONT } from "@/components/ui/movieTitle";
import { Icon } from "@/components/ui/Icon";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { LoadingArea } from "@/components/ui/LoadingArea";
import { TmdbBadge } from "@/components/ui/TmdbBadge";

/**
 * Movie Detail Overlay (M6 part 2a): title + TMDB score badge + like-heart
 * row. Purely presentational — `showHeart`/`liked` are already resolved
 * upstream (`ratings.find(r => r.member_id === currentUserId)?.liked`) and
 * `onToggleLike` is a pure toggle callback with no navigation/dialog
 * side-effects of its own (that belongs to the caller/hook layer).
 *
 * Fixed heart color, same spec value as StarRating.tsx's LIKE_HEART_COLOR —
 * never swapped by the active group theme.
 */
/** Title text classes . */
export const MOVIE_DETAIL_TITLE_TEXT_CLASSNAME = `text-2xl ${MOVIE_TITLE_FONT}`;

const LIKE_HEART_COLOR = "#e05c6e";

export interface MovieDetailTitleRowProps {
  title: string;
  /** TMDB score, e.g. 7.8; rendered rounded to 1 decimal. Badge hidden entirely if null. */
  voteAverage: number | null;
  showHeart: boolean;
  /** Current toggle state to render (filled vs outline heart) — only meaningful when showHeart is true. */
  liked: boolean;
  onToggleLike: () => void;
  isTogglingLike?: boolean;
  /** No title known yet (no stored movie, live details pending): small spinner instead of the title. */
  isLoading?: boolean;
}

export function MovieDetailTitleRow({
  title,
  voteAverage,
  showHeart,
  liked,
  onToggleLike,
  isTogglingLike = false,
  isLoading = false,
}: MovieDetailTitleRowProps) {
  return (
    <View
      testID="movie-detail-title-row"
      className="flex-row flex-wrap items-center justify-center gap-2 px-2"
    >
      {isLoading ? (
        <LoadingArea
          testID="movie-detail-title-loading"
          size="small"
          className="h-8 w-16"
        />
      ) : (
        <Text
          testID="movie-detail-title"
          className={`shrink text-center ${MOVIE_DETAIL_TITLE_TEXT_CLASSNAME} text-accent-light`}
        >
          {title}
        </Text>
      )}

      {voteAverage != null ? (
        <TmdbBadge
          testID="movie-detail-score-badge"
          score={voteAverage}
          className="rounded-sm bg-black/60 px-2 py-1"
        />
      ) : null}

      {showHeart ? (
        <Pressable
          testID="movie-detail-like-heart"
          accessibilityRole="button"
          disabled={isTogglingLike}
          onPress={onToggleLike}
          accessibilityLabel="Mag ich"
          accessibilityState={{ checked: liked, disabled: isTogglingLike }}
          className={`h-touch-comfortable w-touch-comfortable items-center justify-center${
            isTogglingLike ? " opacity-50" : ""
          }`}
        >
          <Icon
            testID="movie-detail-like-heart-icon"
            name={liked ? "heart" : "heartEmpty"}
            size="M"
            color={LIKE_HEART_COLOR}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
