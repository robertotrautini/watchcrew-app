import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { LIKE_HEART_COLOR } from "@/lib/colors";

/**
 * Eigene Bewertung im Abschnitt "Bewertung": read-only Sterne + Mag-ich-Herz
 * in EINER Zeile (5 x 44dp + 48dp = 268dp, passt in 328dp Inhaltsbreite auf
 * 360dp) und optional der Zaehler "x/y bewertet" darunter. Linksbuendig.
 */
export interface MovieDetailOwnRatingProps {
  rating: number | null;
  starColor: string;
  /** Herz nur zeigen, wenn eine eigene Bewertung existiert. */
  showHeart: boolean;
  liked: boolean;
  onToggleLike: () => void;
  isTogglingLike?: boolean;
  ratedCount?: number;
  totalMembers?: number;
}

export function MovieDetailOwnRating({
  rating,
  starColor,
  showHeart,
  liked,
  onToggleLike,
  isTogglingLike = false,
  ratedCount = 0,
  totalMembers = 0,
}: MovieDetailOwnRatingProps) {
  const showCount = ratedCount > 0 && totalMembers > 0;
  return (
    <View testID="movie-detail-own-rating" className="items-start">
      <View className="flex-row items-center">
        <View testID="movie-detail-own-stars">
          <StarRating rating={rating} starColor={starColor} />
        </View>
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
      {showCount ? (
        <Text
          testID="movie-detail-rated-count"
          className="text-sm text-text-secondary"
        >
          {`${ratedCount}/${totalMembers} bewertet`}
        </Text>
      ) : null}
    </View>
  );
}
