import { Image, Text, View, type GestureResponderEvent } from "react-native";

import { Card } from "../ui/Card";
import { buildTmdbImageUrl } from "../../lib/tmdbImage";
import { getDateBadgeText, isEntryDimmed, type DateBadgeMovie } from "../../lib/watchlistDateBadge";
import type { StreamingAvailabilityLookup } from "../../lib/watchlistTypes";

/**
 * Shared, presentational movie-poster tile used by the Watchlist screen
 * (M5 part 2) in "card"/"grid" mode, generic enough that the parallel
 * Tagebuch (diary) screen work could plausibly reuse it too (see
 * src/app/(app)/(tabs)/watchlist.tsx task brief) — it only takes raw
 * movie/streaming/rating-count data, no group/query/hook knowledge.
 *
 * Business rules implemented here (feature-inventory.md, watchlist card
 * spec, extracted verbatim into the M5-part-2 task brief):
 *  - "Karten" (card variant): poster + title + date-badge + overview (or a
 *    fallback placeholder) + TMDB score badge (bottom-right) + an
 *    "x/y bewertet" progress badge (top), shown ONLY while 0 < ratedCount
 *    < totalMembers (omitted entirely at 0 or "everyone rated").
 *  - "Grid" (grid variant): poster tile only, no overview text. Per the task
 *    brief's literal "progress-badge-or-date" wording (as opposed to cards,
 *    which show BOTH the progress badge and the date badge as separate,
 *    non-overlapping elements), the grid tile has only a single top-overlay
 *    badge slot: the progress badge when it applies, otherwise the date
 *    badge — see the flagged ambiguity in this task's final report for why
 *    this reading was chosen over "show both, same as cards".
 *  - Both variants dim (reduced opacity) an entry that is neither released
 *    nor streaming-available, via `isEntryDimmed`.
 */

const OVERVIEW_FALLBACK = "Keine Beschreibung vorhanden";

export type WatchlistPosterCardVariant = "card" | "grid";

export interface WatchlistPosterCardProps {
  variant: WatchlistPosterCardVariant;
  /** Only the movie fields this component actually renders/needs. */
  movie: DateBadgeMovie & Pick<import("../../lib/watchlistTypes").Movie, "name" | "poster" | "overview" | "vote_average">;
  streamingAvailability: StreamingAvailabilityLookup;
  /** How many group members have a real (>0) rating on this entry. */
  ratedCount: number;
  /** Total current group membership size. */
  totalMembers: number;
  /** Injectable "now" for deterministic date-badge tests; defaults to `new Date()`. */
  now?: Date;
  onPress?: (event: GestureResponderEvent) => void;
  /** Base testID; sub-elements are suffixed, e.g. `${testID}-title`. */
  testID?: string;
  /**
   * M10 Settings hub ("Filmtitel in Grid anzeigen" toggle,
   * `usePreferencesStore`'s `showTitlesInGrid`): whether to render the title
   * text in "grid" variant. Has no effect on "card" variant, which always
   * shows its title regardless of this preference (the toggle is scoped to
   * grid mode only, per the task brief). Defaults to `true` to match the
   * pre-M10 always-shown behavior.
   */
  showTitle?: boolean;
}

function formatTmdbScore(voteAverage: number): string {
  return voteAverage.toFixed(1);
}

export function WatchlistPosterCard({
  variant,
  movie,
  streamingAvailability,
  ratedCount,
  totalMembers,
  now,
  onPress,
  testID = "watchlist-poster-card",
  showTitle = true,
}: WatchlistPosterCardProps) {
  const posterUrl = buildTmdbImageUrl(movie.poster);
  const dateBadgeText = getDateBadgeText(movie, streamingAvailability, now);
  const dimmed = isEntryDimmed(movie, streamingAvailability, now);
  const showProgressBadge = ratedCount > 0 && ratedCount < totalMembers;
  const progressBadgeText = `${ratedCount}/${totalMembers} bewertet`;
  const hasTmdbScore = movie.vote_average != null;
  const overviewText =
    movie.overview != null && movie.overview.trim().length > 0 ? movie.overview : OVERVIEW_FALLBACK;

  const containerClassName = `p-2${dimmed ? " opacity-50" : ""}`;

  return (
    <Card testID={testID} onPress={onPress} className={containerClassName}>
      <View testID={`${testID}-poster-wrapper`} className="relative">
        <Image
          testID={`${testID}-poster`}
          source={posterUrl ? { uri: posterUrl } : undefined}
          className="aspect-[2/3] w-full rounded-lg bg-card"
        />

        {showProgressBadge ? (
          <View className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5">
            <Text testID={`${testID}-progress-badge`} className="text-xs text-white">
              {progressBadgeText}
            </Text>
          </View>
        ) : variant === "grid" ? (
          <View className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5">
            <Text testID={`${testID}-date-badge-overlay`} className="text-xs text-white">
              {dateBadgeText}
            </Text>
          </View>
        ) : null}

        {hasTmdbScore ? (
          <View
            testID={`${testID}-tmdb-badge`}
            className="absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-0.5"
          >
            <Text className="text-xs text-white">{formatTmdbScore(movie.vote_average as number)}</Text>
          </View>
        ) : null}
      </View>

      {variant === "card" || showTitle ? (
        <Text
          testID={`${testID}-title`}
          className="mt-2 font-semibold text-text-primary"
          numberOfLines={variant === "grid" ? 1 : undefined}
        >
          {movie.name}
        </Text>
      ) : null}

      {variant === "card" ? (
        <>
          <Text testID={`${testID}-date-badge`} className="text-xs text-text-secondary">
            {dateBadgeText}
          </Text>
          <Text testID={`${testID}-overview`} className="mt-1 text-sm text-text-secondary">
            {overviewText}
          </Text>
        </>
      ) : null}
    </Card>
  );
}
