import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Image } from "@/components/ui/Image";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";

import type { TmdbCastMember, TmdbCrewMember } from "@/lib/movieDetailTypes";

/**
 * Director and cast blocks for the Movie-Detail-Overlay (each lives in its own
 * `MovieDetailSection`, headings come from there). `cast` arrives already
 * capped to 10 entries server-side (tmdb-proxy `credits` action), so this
 * component renders it as-is with no further slicing.
 *
 * Interim decision: cast is laid out as a horizontally-scrolling row
 * (`ScrollView horizontal`) rather than wrapping, since the overlay's
 * available width is limited and a scrollable strip is the simpler,
 * standard RN pattern for "10 tappable names" — not mandated by the spec,
 * which left the exact layout open.
 */
/** Shared size/text tokens. */
const CAST_DIRECTOR_NAME_CLASSNAME = "text-base text-accent";
/** Kein min-h/Padding: 44dp Tippflaeche kommt per hitSlop, Layout bleibt kompakt. */
const CAST_DIRECTOR_BOX_CLASSNAME = "self-start";
const CAST_AVATAR_SIZE_CLASSNAME = "h-16 w-16";
const CAST_NAME_CLASSNAME = "mt-1 text-center text-xs text-accent";
const CAST_CHARACTER_CLASSNAME = "text-center text-[10px] text-text-secondary";

export interface MovieDetailDirectorProps {
  director: TmdbCrewMember;
  onDirectorPress: (personId: number) => void;
}

export function MovieDetailDirector({
  director,
  onDirectorPress,
}: MovieDetailDirectorProps) {
  return (
    <View testID="movie-detail-director-row" className="items-start">
      <Pressable
        testID="movie-detail-director"
        accessibilityRole="button"
        onPress={() => onDirectorPress(director.id)}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        className={CAST_DIRECTOR_BOX_CLASSNAME}
      >
        <Text className={CAST_DIRECTOR_NAME_CLASSNAME}>{director.name}</Text>
      </Pressable>
    </View>
  );
}

export interface MovieDetailCastRowProps {
  cast: TmdbCastMember[];
  onCastMemberPress: (personId: number) => void;
}

export function MovieDetailCastRow({
  cast,
  onCastMemberPress,
}: MovieDetailCastRowProps) {
  if (cast.length === 0) {
    return null;
  }
  return (
    <View testID="movie-detail-cast-frame" className="self-stretch">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
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
                  className={`${CAST_AVATAR_SIZE_CLASSNAME} rounded-[32px] border-[1.5px] border-accent-a45 bg-card`}
                  contentFit="cover"
                />
              ) : (
                <View className={`${CAST_AVATAR_SIZE_CLASSNAME} items-center justify-center rounded-full border-[1.5px] border-accent-a45 bg-card`}>
                  <Icon name="person" size="M" color={PLACEHOLDER_COLOR} />
                </View>
              )}
              <Text numberOfLines={2} className={CAST_NAME_CLASSNAME}>
                {castMember.name}
              </Text>
              {castMember.character ? (
                <Text numberOfLines={1} className={CAST_CHARACTER_CLASSNAME}>
                  {castMember.character}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
