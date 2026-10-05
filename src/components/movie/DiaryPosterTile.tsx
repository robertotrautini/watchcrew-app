import { Icon } from "@/components/ui/Icon";
import { Image } from "@/components/ui/Image";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/Card";

/**
 * Diary-specific poster tile: poster art + the 3 overlay badges the
 * Tagebuch (diary) "Karten"/"Grid" view modes need (feature-inventory.md
 * diary card/grid spec, per the M5-part-2 Tagebuch task brief):
 *  - average-rating badge (star icon + number), top-right
 *  - like-heart badge, to its left, shown ONLY when the current user has
 *    liked this entry — always in the FIXED heart color (never the active
 *    group theme's star/accent color), matching the same fixed-color rule
 *    already enforced inside `StarRating.tsx` (M2). This component does
 *    NOT reuse `StarRating` for the heart itself (that component only
 *    exposes the heart bundled with its 5-star row, which doesn't fit a
 *    poster-corner badge), but uses the exact same fixed hex value.
 *  - TMDB score badge, bottom-right (or "–" when the movie has no score)
 *
 * NOT the same component as the parallel Watchlist task's
 * `src/components/movie/MoviePosterCard.tsx` (date-badge/progress-badge/
 * overview, no average-rating or like-heart badge) — that component's
 * badge set doesn't cover the Diary screen's needs, so this is a
 * deliberately separate, diary-specific sibling rather than a shared one
 * (per this task's explicit "acceptable cheap-to-reconcile duplication,
 * don't block on coordinating" allowance).
 */

// Fixed regardless of theme — same spec value as StarRating.tsx's LIKE_HEART_COLOR.
const LIKE_HEART_COLOR = "#e05c6e";

export interface DiaryPosterTileProps {
  posterUrl: string | null;
  title: string;
  /** The active group theme's star color (for the average-rating badge's star icon). */
  starColor: string;
  /** Diary entries always have at least the current user's own rating, but this stays nullable for a safe/generic component contract. */
  averageRating: number | null;
  /** Whether the CURRENT user has liked this entry. */
  liked: boolean;
  tmdbScore: number | null;
  testID?: string;
  /** Optional info area below the poster (e.g. the title); gets its own padding inside the tile. */
  children?: ReactNode;
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

export function DiaryPosterTile({
  posterUrl,
  title,
  starColor,
  averageRating,
  liked,
  tmdbScore,
  testID = "diary-poster-tile",
  children,
}: DiaryPosterTileProps) {
  return (
    <Card testID={testID} className="overflow-hidden">
      <View testID="poster-card-poster-wrapper" className="relative w-full">
        {posterUrl ? (
          <Image
            testID="poster-card-image"
            source={{ uri: posterUrl }}
            accessibilityLabel={title}
            className="aspect-[2/3] w-full bg-black/40"
            contentFit="cover"
          />
        ) : (
          <View
            testID="poster-card-placeholder"
            className="aspect-[2/3] w-full items-center justify-center bg-black/40"
          >
            <Icon name="film" size="L" color={starColor} />
          </View>
        )}

        <View className="absolute right-1 top-1 flex-row items-center gap-1">
          {liked ? (
            <View
              testID="poster-card-like-badge"
              className="flex-row items-center rounded-sm bg-black/70 px-1.5 py-0.5"
            >
              <Icon
                testID="poster-card-like-icon"
                name="heart"
                size="S"
                color={LIKE_HEART_COLOR}
              />
            </View>
          ) : null}

          <View
            testID="poster-card-average-badge"
            className="flex-row items-center gap-0.5 rounded-sm bg-black/70 px-1.5 py-0.5"
          >
            <Icon name="star" size="S" color={starColor} />
            <Text
              testID="poster-card-average-value"
              className="text-xs text-white"
            >
              {averageRating != null ? formatOneDecimal(averageRating) : "–"}
            </Text>
          </View>
        </View>

        <View
          testID="poster-card-tmdb-badge"
          className="absolute bottom-0 right-0 rounded-tl-xl bg-black/60 px-2.5 py-1"
        >
          <Text
            testID="poster-card-tmdb-value"
            className="text-xs font-semibold text-white"
          >
            {tmdbScore != null ? formatOneDecimal(tmdbScore) : "–"}
          </Text>
        </View>
      </View>
      {children != null ? (
        <View testID="poster-card-info" className="px-2 py-1.5">
          {children}
        </View>
      ) : null}
    </Card>
  );
}
