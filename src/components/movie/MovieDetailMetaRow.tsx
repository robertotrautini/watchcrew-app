import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Icon } from "@/components/ui/Icon";
import { SkeletonText } from "@/components/ui/Skeleton";

/**
 * Movie Detail Overlay (M6 part 2a): runtime + release-date meta row.
 * Purely presentational — both `runtimeLabel` (formatted by
 * `src/lib/movieDetailLogic.ts`'s `formatRuntime`) and `releaseInfo`
 * (picked by `pickPreferredReleaseDate`) are already resolved upstream.
 */

/** Meta text classes (real text and its skeleton share them). */
export const MOVIE_DETAIL_META_TEXT_CLASSNAME = "text-sm text-text-secondary";

export interface MovieDetailReleaseInfo {
  label: string;
  date: string;
}

export interface MovieDetailMetaRowProps {
  runtimeLabel: string | null;
  releaseInfo: MovieDetailReleaseInfo | null;
  /** When set (watchlist + group context only), the date line is a tappable button with an edit icon; without a date it shows the "Kein Datum" placeholder. */
  onEditReleaseDate?: () => void;
  /** Live details still loading: skeleton chips for the missing runtime / date. */
  isLoading?: boolean;
}

export function MovieDetailMetaRow({
  runtimeLabel,
  releaseInfo,
  onEditReleaseDate,
  isLoading = false,
}: MovieDetailMetaRowProps) {
  return (
    <View
      testID="movie-detail-meta-row"
      className="flex-row flex-wrap items-center justify-center gap-2"
    >
      {runtimeLabel == null && isLoading ? (
        <SkeletonText
          testID="movie-detail-runtime-skeleton"
          textClassName={MOVIE_DETAIL_META_TEXT_CLASSNAME}
          className="w-16"
        />
      ) : null}
      {releaseInfo == null && isLoading && !onEditReleaseDate ? (
        <SkeletonText
          testID="movie-detail-release-date-skeleton"
          textClassName={MOVIE_DETAIL_META_TEXT_CLASSNAME}
          className="w-40"
        />
      ) : null}
      {runtimeLabel != null ? (
        <Text
          testID="movie-detail-runtime"
          className={MOVIE_DETAIL_META_TEXT_CLASSNAME}
        >
          {runtimeLabel}
        </Text>
      ) : null}
      {releaseInfo != null || onEditReleaseDate ? (
        onEditReleaseDate ? (
          <Pressable
            testID="movie-detail-release-date-edit"
            accessibilityRole="button"
            accessibilityLabel="Erscheinungsdatum ändern"
            onPress={onEditReleaseDate}
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <Text
              testID="movie-detail-release-date"
              className={MOVIE_DETAIL_META_TEXT_CLASSNAME}
            >
              {releaseInfo != null
                ? `${releaseInfo.label} ${releaseInfo.date}`
                : "Kein Datum"}
            </Text>
            <Icon name="edit" size="S" color="#a8a8a8" />
          </Pressable>
        ) : releaseInfo != null ? (
          <Text
            testID="movie-detail-release-date"
            className={MOVIE_DETAIL_META_TEXT_CLASSNAME}
          >
            {`${releaseInfo.label} ${releaseInfo.date}`}
          </Text>
        ) : null
      ) : null}
    </View>
  );
}
