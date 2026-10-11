import { Image } from "@/components/ui/Image";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

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
  /** Logo only (table header). */
  hideScore?: boolean;
  /** Larger logo (sortable table header). */
  largeLogo?: boolean;
}

export function TmdbBadge({ score, testID = "tmdb-badge", valueTestID, className = "", hideScore = false, largeLogo = false }: TmdbBadgeProps) {
  const text = score != null ? score.toFixed(1) : "–";
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`TMDB Bewertung ${score != null ? text : "unbekannt"}`}
      className={`flex-row items-center gap-1.5 ${className}`.trim()}
    >
      <Image testID={`${testID}-logo`} source={LOGO} contentFit="contain" className={largeLogo ? "h-4 w-9" : "h-3.5 w-8"} />
      {hideScore ? null : (
        <Text testID={valueTestID ?? `${testID}-value`} className="text-xs font-sans-semibold text-white">
          {text}
        </Text>
      )}
    </View>
  );
}
