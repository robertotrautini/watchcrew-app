import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MemberRatingRow } from "@/components/movie/MemberRatingRow";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import type { Rating } from "@/lib/watchlistTypes";

/**
 * Collapsible "Bewertungen" (ratings) section of the Movie-Detail-Overlay,
 * shown ONLY when the parent route was opened with `source === "diary"` —
 * that gating happens upstream (this component doesn't know about `source`).
 *
 * Interim decision: starts COLLAPSED by default (`expanded` initial state is
 * `false`). Nothing in the spec mandates either default; collapsed keeps the
 * overlay compact for the common case, matching this project's general
 * pattern of hiding secondary detail behind a tap (e.g. the "Mehr anzeigen"
 * overview toggle).
 */
export interface MovieDetailRatingsSectionProps {
  ratings: Rating[];
  displayNameById: Map<string, string>;
  starColor: string;
}

export function MovieDetailRatingsSection({
  ratings,
  displayNameById,
  starColor,
}: MovieDetailRatingsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View testID="movie-detail-ratings-section">
      <Pressable
        testID="movie-detail-ratings-toggle"
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center justify-between py-2"
      >
        <Text className="text-base font-semibold text-text-primary">Bewertungen</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={starColor}
        />
      </Pressable>

      {expanded ? (
        <View testID="movie-detail-ratings-content">
          {ratings.map((rating) => (
            <MemberRatingRow
              key={rating.id}
              memberLabel={memberDisplayLabel(rating.member_id, displayNameById.get(rating.member_id))}
              rating={rating.rating}
              starColor={starColor}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
