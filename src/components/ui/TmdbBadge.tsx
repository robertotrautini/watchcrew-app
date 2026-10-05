import { Image } from "@/components/ui/Image";
import { Text, View } from "react-native";

/**
 * Shared TMDB score badge: the real TMDB short logo (same asset the legacy
 * app used) followed by the score. Used by the sheet badges (DiaryEntryCard,
 * WatchlistPosterCard card variant) and the movie detail title row. Tiles
 * (grid view) keep their score-only corner badge. Positioning/background
 * come from the caller's `className`.
 */
const LOGO = require("../../../assets/images/tmdb-logo.png");

export interface TmdbBadgeProps {
  /** TMDB vote average; null renders a dash. */
  score: number | null;
  testID?: string;
  /** Overrides the score text testID (default `${testID}-value`). */
  valueTestID?: string;
  className?: string;
}

export function TmdbBadge({ score, testID = "tmdb-badge", valueTestID, className = "" }: TmdbBadgeProps) {
  const text = score != null ? score.toFixed(1) : "–";
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`TMDB Bewertung ${score != null ? text : "unbekannt"}`}
      className={`flex-row items-center gap-1.5 ${className}`.trim()}
    >
      <Image testID={`${testID}-logo`} source={LOGO} contentFit="contain" className="h-3.5 w-8" />
      <Text testID={valueTestID ?? `${testID}-value`} className="text-xs font-semibold text-white">
        {text}
      </Text>
    </View>
  );
}
