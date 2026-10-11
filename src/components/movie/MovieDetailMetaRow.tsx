import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Icon } from "@/components/ui/Icon";

/**
 * Movie Detail Overlay (M6 part 2a): runtime + release-date meta row.
 * Purely presentational — both `runtimeLabel` (formatted by
 * `src/lib/movieDetailLogic.ts`'s `formatRuntime`) and `releaseInfo`
 * (picked by `pickPreferredReleaseDate`) are already resolved upstream.
 */

/** Meta text classes. */
const MOVIE_DETAIL_META_TEXT_CLASSNAME = "text-sm text-text-secondary";

/** Abstand (dp) links und rechts des Mittelpunkt-Trenners. Explizit per style, da className-gap auf Android nicht zuverlaessig greift. */
export const META_ROW_GAP = 8;
/** Vertikaler Abstand (dp) zwischen umgebrochenen Zeilen. */
export const META_ROW_ROW_GAP = 6;

const styles = StyleSheet.create({
  row: { rowGap: META_ROW_ROW_GAP },
  separator: { marginLeft: META_ROW_GAP, marginRight: META_ROW_GAP },
});

interface MovieDetailReleaseInfo {
  label: string;
  date: string;
}

export interface MovieDetailMetaRowProps {
  runtimeLabel: string | null;
  releaseInfo: MovieDetailReleaseInfo | null;
  /** When set (watchlist + group context only), the date line is a tappable button with an edit icon; without a date it shows the "Kein Datum" placeholder. */
  onEditReleaseDate?: () => void;
  /** Gleichberechtigtes weiteres Element der Zeile (TMDB-Badge), gleicher Abstand wie die anderen. */
  trailing?: ReactNode;
}

export function MovieDetailMetaRow({
  runtimeLabel,
  releaseInfo,
  onEditReleaseDate,
  trailing,
}: MovieDetailMetaRowProps) {
  const items: ReactNode[] = [];
  if (runtimeLabel != null) {
    items.push(
      <Text key="runtime" testID="movie-detail-runtime" className={MOVIE_DETAIL_META_TEXT_CLASSNAME}>
        {runtimeLabel}
      </Text>,
    );
  }
  if (onEditReleaseDate) {
    items.push(
      <Pressable
        key="date"
        testID="movie-detail-release-date-edit"
        accessibilityRole="button"
        accessibilityLabel="Erscheinungsdatum ändern"
        onPress={onEditReleaseDate}
        hitSlop={8}
        className="flex-row items-center gap-1"
      >
        <Text testID="movie-detail-release-date" className={MOVIE_DETAIL_META_TEXT_CLASSNAME}>
          {releaseInfo != null ? `${releaseInfo.label} ${releaseInfo.date}` : "Kein Datum"}
        </Text>
        <Icon name="edit" size="S" color="#a8a8a8" />
      </Pressable>,
    );
  } else if (releaseInfo != null) {
    items.push(
      <Text key="date" testID="movie-detail-release-date" className={MOVIE_DETAIL_META_TEXT_CLASSNAME}>
        {`${releaseInfo.label} ${releaseInfo.date}`}
      </Text>,
    );
  }
  if (trailing != null && trailing !== false) {
    items.push(<View key="trailing">{trailing}</View>);
  }

  return (
    <View
      testID="movie-detail-meta-row"
      className="flex-row flex-wrap items-center"
      style={styles.row}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        // Trenner haengt am VORHERIGEN Element (Zeilenende), steht so nie am Zeilenanfang.
        return (
          <View key={(item as { key: string }).key} className="flex-row items-center">
            {item}
            {isLast ? null : (
              <Text
                testID={`movie-detail-meta-separator-${index}`}
                className={MOVIE_DETAIL_META_TEXT_CLASSNAME}
                style={styles.separator}
              >
                {"\u00B7"}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
