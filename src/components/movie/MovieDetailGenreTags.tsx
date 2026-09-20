import { Text, View } from "react-native";

/**
 * Movie Detail Overlay (M6 part 2a): the genre pill row shown under the
 * title/meta rows. Purely presentational — genre names are resolved
 * upstream (TMDB genre ids joined to names) and passed in already-ordered.
 */

export interface MovieDetailGenreTagsProps {
  genres: string[];
}

export function MovieDetailGenreTags({ genres }: MovieDetailGenreTagsProps) {
  if (genres.length === 0) {
    return <View testID="movie-detail-genre-tags" />;
  }

  return (
    <View testID="movie-detail-genre-tags" className="flex-row flex-wrap gap-2">
      {genres.map((genre, index) => (
        <View
          key={`${genre}-${index}`}
          testID={`movie-detail-genre-tag-${index}`}
          className="rounded-full bg-card px-3 py-1"
        >
          <Text className="text-xs text-text-secondary">{genre}</Text>
        </View>
      ))}
    </View>
  );
}
