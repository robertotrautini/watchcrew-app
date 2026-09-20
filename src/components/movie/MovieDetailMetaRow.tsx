import { Text, View } from "react-native";

/**
 * Movie Detail Overlay (M6 part 2a): runtime + release-date meta row.
 * Purely presentational — both `runtimeLabel` (formatted by
 * `src/lib/movieDetailLogic.ts`'s `formatRuntime`) and `releaseInfo`
 * (picked by `pickPreferredReleaseDate`) are already resolved upstream.
 */

export interface MovieDetailReleaseInfo {
  label: string;
  date: string;
}

export interface MovieDetailMetaRowProps {
  runtimeLabel: string | null;
  releaseInfo: MovieDetailReleaseInfo | null;
}

export function MovieDetailMetaRow({ runtimeLabel, releaseInfo }: MovieDetailMetaRowProps) {
  return (
    <View testID="movie-detail-meta-row" className="flex-row flex-wrap items-center gap-2">
      {runtimeLabel != null ? (
        <Text testID="movie-detail-runtime" className="text-sm text-text-secondary">
          {runtimeLabel}
        </Text>
      ) : null}
      {releaseInfo != null ? (
        <Text testID="movie-detail-release-date" className="text-sm text-text-secondary">
          {`${releaseInfo.label} ${releaseInfo.date}`}
        </Text>
      ) : null}
    </View>
  );
}
