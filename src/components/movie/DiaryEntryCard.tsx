import { MOVIE_TITLE_TEXT } from "@/components/ui/movieTitle";
import { Icon } from "@/components/ui/Icon";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

import { MemberRatingRow } from "@/components/movie/MemberRatingRow";
import { Card } from "@/components/ui/Card";
import { TmdbBadge } from "@/components/ui/TmdbBadge";
import { Image } from "@/components/ui/Image";

/** Fixed regardless of theme (same value as StarRating / DiaryPosterTile). */
export const LIKE_HEART_COLOR = "#e05c6e";
const PLACEHOLDER_ICON_COLOR = "#8b8b8b";

export interface DiaryEntryCardMember {
  id: string;
  label: string;
  rating: number | null;
}

export interface DiaryEntryCardProps {
  posterUrl: string | null;
  title: string;
  seenLabel: string;
  seenLabelTestID?: string;
  starColor: string;
  averageRating: number | null;
  /** Whether the CURRENT user has liked this entry. */
  liked: boolean;
  tmdbScore: number | null;
  members: DiaryEntryCardMember[];
}

/**
 * Legacy Tagebuch row card (docs/reference-screenshots/05-tagebuch.jpg): glass
 * card, small poster left, gold serif title, "Gesehen am ...", one labelled
 * star row per group member, average-rating corner badge flush top-right (+ like heart inside it),
 * TMDB badge flush in the bottom-right corner (radius on the inner corner only). Press handling lives in the caller's wrapper.
 */
export function DiaryEntryCard({
  posterUrl,
  title,
  seenLabel,
  seenLabelTestID,
  starColor,
  averageRating,
  liked,
  tmdbScore,
  members,
}: DiaryEntryCardProps) {
  return (
    <Card testID="diary-entry-card" className="flex-row overflow-hidden">
      <View testID="poster-card-poster-wrapper" className="min-h-36 w-24 self-stretch bg-black/40">
        {posterUrl ? (
          <Image
            testID="poster-card-image"
            source={{ uri: posterUrl }}
            accessibilityLabel={title}
            className="absolute inset-0 h-full w-full"
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            testID="poster-card-placeholder"
            className="absolute inset-0 items-center justify-center"
          >
            <Icon name="film" size="L" color={PLACEHOLDER_ICON_COLOR} />
          </View>
        )}
      </View>

      <View className="flex-1 px-3 py-2">
        <View className="pr-20">
          <Text numberOfLines={1} ellipsizeMode="tail" className={`text-base ${MOVIE_TITLE_TEXT}`}>
            {title}
          </Text>
          <Text testID={seenLabelTestID} className="text-sm text-text-secondary">
            {seenLabel}
          </Text>
        </View>

        <View className="mt-1">
          {members.map((member) => (
            <MemberRatingRow
              key={member.id}
              memberLabel={member.label}
              rating={member.rating}
              starColor={starColor}
              compact
            />
          ))}
        </View>
      </View>

      <View
        testID="poster-card-average-badge"
        className="absolute right-0 top-0 flex-row items-center gap-1 rounded-bl-xl bg-black/60 px-3 py-1"
      >
        {liked ? (
          <View testID="poster-card-like-badge">
            <Icon testID="poster-card-like-icon" name="heart" size="S" color={LIKE_HEART_COLOR} />
          </View>
        ) : null}
        <Icon name="star" size="S" color={starColor} />
        <Text testID="poster-card-average-value" className="text-xs font-sans-semibold text-white">
          {averageRating != null ? averageRating.toFixed(1) : "–"}
        </Text>
      </View>

      <TmdbBadge
        testID="poster-card-tmdb-badge"
        valueTestID="poster-card-tmdb-value"
        score={tmdbScore}
        className="absolute bottom-0 right-0 rounded-tl-xl bg-black/60 px-3 py-1"
      />
    </Card>
  );
}
