import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";

import { memberDisplayLabel } from "@/lib/diaryDisplay";
import type { GroupRatingRow } from "@/lib/movieDetailLogic";

/**
 * Einklappbare Liste "Bewertungen der Gruppe" im Abschnitt Bewertung (nur
 * Tagebuch-Kontext, Gating im Parent). Zeigt NUR die anderen Mitglieder (die
 * eigene Bewertung steht darueber), bewertete zuerst, dann "nicht bewertet".
 * Ohne andere Mitglieder rendert die Komponente nichts.
 *
 * Starts COLLAPSED (kompakter Overlay, wie "Mehr anzeigen").
 */
export const MOVIE_DETAIL_GROUP_ROW_CLASSNAME = "h-10 flex-row items-center";

export interface MovieDetailRatingsSectionProps {
  rows: GroupRatingRow[];
  displayNameById: Map<string, string>;
  starColor: string;
}

export function MovieDetailRatingsSection({
  rows,
  displayNameById,
  starColor,
}: MovieDetailRatingsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View testID="movie-detail-ratings-section" className="self-stretch">
      <Pressable
        testID="movie-detail-ratings-toggle"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={{ top: 12, bottom: 12 }}
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center justify-between"
      >
        <Text className="text-sm font-sans-semibold text-text-primary">
          Bewertungen der Gruppe
        </Text>
        <Icon
          name={expanded ? "chevronUp" : "chevronDown"}
          size="M"
          color={starColor}
        />
      </Pressable>

      {expanded ? (
        <View testID="movie-detail-ratings-content" className="pt-2">
          {rows.map((row) => (
            <View
              key={row.memberId}
              testID="member-rating-row"
              className={MOVIE_DETAIL_GROUP_ROW_CLASSNAME}
            >
              <Text
                testID="member-rating-name"
                numberOfLines={1}
                className="w-28 pr-2 text-sm text-text-secondary"
              >
                {memberDisplayLabel(row.memberId, displayNameById.get(row.memberId))}
              </Text>
              {row.rating != null ? (
                <>
                  <StarRating
                    rating={row.rating}
                    starColor={starColor}
                    iconSize="S"
                    compactBox
                  />
                  <Text
                    testID="member-rating-value"
                    className="w-10 pl-2 text-right text-sm text-text-primary"
                  >
                    {row.rating.toFixed(1)}
                  </Text>
                </>
              ) : (
                <Text
                  testID="member-rating-unrated"
                  className="text-sm text-text-secondary opacity-60"
                >
                  nicht bewertet
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
