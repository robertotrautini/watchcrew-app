import { View } from "react-native";

import { CHIP_HEIGHT_CLASSNAME, ChipTag } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Movie Detail Overlay (M6 part 2a): the genre pill row shown under the
 * title/meta rows. Purely presentational — genre names are resolved
 * upstream (TMDB genre ids joined to names) and passed in already-ordered.
 */

export interface MovieDetailGenreTagsProps {
  genres: string[];
  /** Live details still loading: three chip-shaped skeletons while no genres are known. */
  isLoading?: boolean;
}

export function MovieDetailGenreTags({
  genres,
  isLoading = false,
}: MovieDetailGenreTagsProps) {
  if (genres.length === 0 && isLoading) {
    return (
      <View
        testID="movie-detail-genre-tags"
        className="flex-row flex-wrap justify-center gap-2"
      >
        {[0, 1, 2].map((index) => (
          <Skeleton
            key={index}
            testID={`movie-detail-genre-skeleton-${index}`}
            className={`${CHIP_HEIGHT_CLASSNAME} w-20 rounded-full`}
          />
        ))}
      </View>
    );
  }
  if (genres.length === 0) {
    return <View testID="movie-detail-genre-tags" />;
  }

  return (
    <View
      testID="movie-detail-genre-tags"
      className="flex-row flex-wrap justify-center gap-2"
    >
      {genres.map((genre, index) => (
        <ChipTag
          key={`${genre}-${index}`}
          testID={`movie-detail-genre-tag-${index}`}
          label={genre}
        />
      ))}
    </View>
  );
}
