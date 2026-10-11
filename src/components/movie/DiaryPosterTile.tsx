import { Icon } from "@/components/ui/Icon";
import { Image } from "@/components/ui/Image";
import type { ReactNode } from "react";
import { View } from "react-native";

import { Card } from "@/components/ui/Card";
import { PosterCornerBadge } from "@/components/movie/PosterCornerBadge";
import { PosterTmdbBadge } from "@/components/movie/PosterTmdbBadge";

/**
 * Diary-specific poster tile: poster art + 2 overlay badges on the poster:
 *  - top-right: `PosterCornerBadge` (heart only on own like, star + average)
 *  - bottom-right: `PosterTmdbBadge` (logo + score, "–" when missing)
 *
 * NOT the same component as the parallel Watchlist task's
 * `src/components/movie/MoviePosterCard.tsx` (date-badge/progress-badge/
 * overview, no average-rating or like-heart badge) — deliberately separate.
 */

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
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            testID="poster-card-placeholder"
            className="aspect-[2/3] w-full items-center justify-center bg-black/40"
          >
            <Icon name="film" size="L" color={starColor} />
          </View>
        )}
        <PosterCornerBadge
          testID="poster-card-average-badge"
          idPrefix="poster-card"
          liked={liked}
          average={averageRating}
          starColor={starColor}
        />
        <PosterTmdbBadge
          testID="poster-card-tmdb-badge"
          valueTestID="poster-card-tmdb-value"
          score={tmdbScore}
        />
      </View>
      {children != null ? (
        <View testID="poster-card-info" className="px-2 py-1.5">
          {children}
        </View>
      ) : null}
    </Card>
  );
}
