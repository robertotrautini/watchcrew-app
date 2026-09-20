import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

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
}

export function MovieDetailTitleRow({
  title,
  voteAverage,
  showHeart,
  liked,
  onToggleLike,
  isTogglingLike = false,
}: MovieDetailTitleRowProps) {
  return (
    <View testID="movie-detail-title-row" className="flex-row items-center gap-2">
      <Text testID="movie-detail-title" className="flex-1 font-display-bold text-xl text-text-primary">
        {title}
      </Text>

      {voteAverage != null ? (
        <View testID="movie-detail-score-badge" className="rounded-full bg-card px-2 py-1">
          <Text className="text-xs font-semibold text-text-primary">{voteAverage.toFixed(1)}</Text>
        </View>
      ) : null}

      {showHeart ? (
        <Pressable
          testID="movie-detail-like-heart"
          accessibilityRole="button"
          disabled={isTogglingLike}
          onPress={onToggleLike}
          className={`h-touch-min w-touch-min items-center justify-center${
            isTogglingLike ? " opacity-50" : ""
          }`}
        >
          <Ionicons
            testID="movie-detail-like-heart-icon"
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={LIKE_HEART_COLOR}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
