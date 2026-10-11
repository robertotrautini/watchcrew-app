import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { MOVIE_TITLE_FONT } from "@/components/ui/movieTitle";

/**
 * Film-Detail: Titel, linksbuendig (Outfit, Akzentfarbe). Score-Badge und Herz
 * leben in den Abschnitten "Details" bzw. "Bewertung".
 */
const MOVIE_DETAIL_TITLE_TEXT_CLASSNAME = `text-2xl ${MOVIE_TITLE_FONT}`;

export interface MovieDetailTitleRowProps {
  title: string;
}

export function MovieDetailTitleRow({ title }: MovieDetailTitleRowProps) {
  if (!title) return null;
  return (
    <View testID="movie-detail-title-row" className="self-stretch">
      <Text
        testID="movie-detail-title"
        className={`${MOVIE_DETAIL_TITLE_TEXT_CLASSNAME} text-accent-light`}
      >
        {title}
      </Text>
    </View>
  );
}
