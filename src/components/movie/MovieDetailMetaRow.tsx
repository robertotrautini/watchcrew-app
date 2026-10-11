import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Icon } from "@/components/ui/Icon";
import { LoadingArea } from "@/components/ui/LoadingArea";

/**
 * Movie Detail Overlay (M6 part 2a): runtime + release-date meta row.
 * Purely presentational — both `runtimeLabel` (formatted by
 * `src/lib/movieDetailLogic.ts`'s `formatRuntime`) and `releaseInfo`
 * (picked by `pickPreferredReleaseDate`) are already resolved upstream.
 */

/** Meta text classes. */
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
  /** Live details still loading and no runtime/date known yet: small spinner area. */
  isLoading?: boolean;
}

export function MovieDetailMetaRow({
  runtimeLabel,
  releaseInfo,
  onEditReleaseDate,
  isLoading = false,
}: MovieDetailMetaRowProps) {
  if (isLoading && runtimeLabel == null && releaseInfo == null) {
    return (
      <LoadingArea
        testID="movie-detail-meta-loading"
        className="min-h-10 w-full"
        size="small"
      />
    );
  }

  return (
    <View
      testID="movie-detail-meta-row"
      className="flex-row flex-wrap items-center justify-center gap-2"
    >
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
