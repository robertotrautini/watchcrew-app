import { Icon } from "@/components/ui/Icon";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Image } from "@/components/ui/Image";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";

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
        <View className="flex-row items-center gap-3 border-t border-accent-a30 pt-3">
          <Text className="text-xs uppercase tracking-widest text-text-secondary">
            Regie
          </Text>
          <Pressable
            testID="movie-detail-director"
            accessibilityRole="button"
            onPress={() => onDirectorPress(director.id)}
            className="min-h-touch-comfortable justify-center"
          >
            <Text className="text-base text-accent">{director.name}</Text>
          </Pressable>
        </View>
      ) : null}

      {cast.length > 0 ? (
        <View
          testID="movie-detail-cast-frame"
          className="gap-2 border-y border-accent-a30 py-3"
        >
          <Text className="text-xs uppercase tracking-widest text-text-secondary">
            Besetzung
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row py-1"
          >
            {cast.map((castMember, index) => {
              const photoUrl = buildTmdbImageUrl(
                castMember.profile_path ?? null,
                "w185",
              );
              return (
                <Pressable
                  key={castMember.id}
                  testID={`movie-detail-cast-member-${index}`}
                  onPress={() => onCastMemberPress(castMember.id)}
                  className="mr-3 w-20 items-center"
                >
                  {photoUrl ? (
                    <Image
                      source={{ uri: photoUrl }}
                      accessibilityLabel={castMember.name}
                      className="h-16 w-16 rounded-[32px] border-[1.5px] border-accent-a45 bg-card"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-accent-a45 bg-card">
                      <Icon name="person" size="M" color="#888888" />
                    </View>
                  )}
                  <Text
                    numberOfLines={2}
                    className="mt-1 text-center text-xs text-accent"
                  >
                    {castMember.name}
                  </Text>
                  {castMember.character ? (
                    <Text
                      numberOfLines={1}
                      className="text-center text-[10px] text-text-secondary"
                    >
                      {castMember.character}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}
