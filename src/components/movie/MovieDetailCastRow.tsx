import { Pressable, ScrollView, Text } from "react-native";

import type { TmdbCastMember, TmdbCrewMember } from "@/lib/movieDetailTypes";

/**
 * Director + cast row for the Movie-Detail-Overlay. `cast` arrives already
 * capped to 10 entries server-side (tmdb-proxy `credits` action), so this
 * component renders it as-is with no further slicing.
 *
 * Interim decision: cast is laid out as a horizontally-scrolling row
 * (`ScrollView horizontal`) rather than wrapping, since the overlay's
 * available width is limited and a scrollable strip is the simpler,
 * standard RN pattern for "10 tappable names" — not mandated by the spec,
 * which left the exact layout open.
 */
export interface MovieDetailCastRowProps {
  director: TmdbCrewMember | null;
  cast: TmdbCastMember[];
  onDirectorPress: (personId: number) => void;
  onCastMemberPress: (personId: number) => void;
}

export function MovieDetailCastRow({
  director,
  cast,
  onDirectorPress,
  onCastMemberPress,
}: MovieDetailCastRowProps) {
  return (
    <>
      {director ? (
        <Pressable
          testID="movie-detail-director"
          onPress={() => onDirectorPress(director.id)}
          className="py-1"
        >
          <Text className="text-text-primary">{director.name}</Text>
        </Pressable>
      ) : null}

      {cast.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 py-1">
          {cast.map((castMember, index) => (
            <Pressable
              key={castMember.id}
              testID={`movie-detail-cast-member-${index}`}
              onPress={() => onCastMemberPress(castMember.id)}
              className="mr-3"
            >
              <Text className="text-text-secondary">{castMember.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </>
  );
}
