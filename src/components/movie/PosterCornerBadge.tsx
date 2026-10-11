import { LIKE_HEART_COLOR } from "@/lib/colors";
import type { ReactElement } from "react";
import { View } from "react-native";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";

/**
 * Shared top-right corner badge for ALL poster tiles (Tagebuch, Watchlist,
 * Ähnliche Filme, Collection, Filmografien, Add-Movie). Flush in the poster's
 * top-right corner (`right-0 top-0`, `rounded-bl-xl`).
 *
 * Fixed element order (defined once, here): heart (own like), star + average,
 * eye (watched), bookmark (on watchlist), date text. At most TWO elements are
 * shown at once (the first two present in that order). Renders nothing when
 * there is nothing to show.
 */

const WATCHED_EYE_COLOR = "#22c55e";

const POSTER_CORNER_BADGE_MAX_ELEMENTS = 2;

export interface PosterCornerBadgeProps {
  /** Current user liked this entry -> heart. */
  liked?: boolean;
  /** undefined = no star/average; null = star with "–"; number = star + one decimal. */
  average?: number | null;
  /** Green eye. */
  watched?: boolean;
  /** Theme-accent bookmark. */
  onWatchlist?: boolean;
  /** Date text (Watchlist). */
  dateText?: string | null;
  /** Star color; defaults to the theme's fixed star color. */
  starColor?: string;
  testID?: string;
  /** Prefix of the element testIDs: `${idPrefix}-like-badge|like-icon|average-value|watched|watched-icon|watchlist|watchlist-icon|date-value`. */
  idPrefix?: string;
}

export function PosterCornerBadge({
  liked = false,
  average,
  watched = false,
  onWatchlist = false,
  dateText,
  starColor,
  testID = "poster-corner-badge",
  idPrefix = testID,
}: PosterCornerBadgeProps) {
  const { colors } = useGroupTheme();
  const elements: ReactElement[] = [];

  if (liked) {
    elements.push(
      <View key="like" testID={`${idPrefix}-like-badge`}>
        <Icon testID={`${idPrefix}-like-icon`} name="heart" size="XS" color={LIKE_HEART_COLOR} />
      </View>,
    );
  }
  if (average !== undefined) {
    elements.push(
      <View key="average" className="flex-row items-center gap-1">
        <Icon name="star" size="XS" color={starColor ?? colors.starColor} />
        <Text testID={`${idPrefix}-average-value`} numberOfLines={1} className="text-xs text-white">
          {average != null ? average.toFixed(1) : "–"}
        </Text>
      </View>,
    );
  }
  if (watched) {
    elements.push(
      <View key="watched" testID={`${idPrefix}-watched`} accessibilityLabel="Gesehen">
        <Icon testID={`${idPrefix}-watched-icon`} name="watched" size="XS" color={WATCHED_EYE_COLOR} />
      </View>,
    );
  }
  if (onWatchlist) {
    elements.push(
      <View key="watchlist" testID={`${idPrefix}-watchlist`} accessibilityLabel="Auf der Watchlist">
        <Icon testID={`${idPrefix}-watchlist-icon`} name="bookmark" size="XS" color={colors.accent} />
      </View>,
    );
  }
  if (dateText != null && dateText !== "") {
    elements.push(
      <Text key="date" testID={`${idPrefix}-date-value`} numberOfLines={1} className="text-xs text-white">
        {dateText}
      </Text>,
    );
  }

  const shown = elements.slice(0, POSTER_CORNER_BADGE_MAX_ELEMENTS);
  if (shown.length === 0) return null;

  return (
    <View
      testID={testID}
      className="absolute right-0 top-0 flex-row items-center gap-1 rounded-bl-xl bg-black/60 py-1 pl-2.5 pr-1.5"
    >
      {shown}
    </View>
  );
}
