import { View } from "react-native";

import { ChipTag } from "@/components/ui/Chip";
import { LoadingArea } from "@/components/ui/LoadingArea";

/**
 * Movie Detail Overlay (M6 part 2a): the genre pill row shown under the
 * title/meta rows. Purely presentational — genre names are resolved
 * upstream (TMDB genre ids joined to names) and passed in already-ordered.
 */

export interface MovieDetailGenreTagsProps {
  genres: string[];
  /** Live details still loading and no genres known yet: small spinner area. */
  isLoading?: boolean;
}

export function MovieDetailGenreTags({
  genres,
  isLoading = false,
}: MovieDetailGenreTagsProps) {
  if (isLoading && genres.length === 0) {
    return (
      <LoadingArea
        testID="movie-detail-genres-loading"
        className="min-h-10 w-full"
        size="small"
      />
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
