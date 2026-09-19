import { Text, View } from "react-native";

import { StarRating } from "../ui/StarRating";

/**
 * One row of the Diary card's per-member rating breakdown: member name +
 * a READ-ONLY star display (StarRating with no `onChange`, per its own
 * "omit onChange for read-only display" contract from M2) + the numeric
 * value, or "–" for a member who hasn't rated yet (feature-inventory.md
 * diary-card spec, per the M5-part-2 Tagebuch task brief).
 *
 * `rating === 0` is treated the same as `null` here ("–"), consistent with
 * this project's project-wide "0/null both mean no real rating" convention
 * (see splitWatchlistAndDiary's `ownRatingCounts` in watchlistLogic.ts).
 */
export interface MemberRatingRowProps {
  memberLabel: string;
  rating: number | null;
  starColor: string;
}

function hasRealRating(rating: number | null): rating is number {
  return rating != null && rating > 0;
}

export function MemberRatingRow({ memberLabel, rating, starColor }: MemberRatingRowProps) {
  const displayValue = hasRealRating(rating) ? rating.toFixed(1) : "–";

  return (
    <View testID="member-rating-row" className="flex-row items-center justify-between py-1">
      <Text testID="member-rating-name" className="text-text-secondary">
        {memberLabel}
      </Text>
      <View className="flex-row items-center gap-2">
        <StarRating rating={rating} starColor={starColor} />
        <Text testID="member-rating-value" className="w-10 text-right text-text-primary">
          {displayValue}
        </Text>
      </View>
    </View>
  );
}
