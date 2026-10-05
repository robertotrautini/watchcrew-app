import { Text, View, type GestureResponderEvent } from "react-native";

import { Image } from "@/components/ui/Image";

import { Card } from "../ui/Card";
import { TmdbBadge } from "../ui/TmdbBadge";
import { buildTmdbImageUrl } from "../../lib/tmdbImage";
import {
  getDateBadgeText,
  isEntryDimmed,
  type DateBadgeMovie,
} from "../../lib/watchlistDateBadge";
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
  movie: DateBadgeMovie &
    Pick<
      import("../../lib/watchlistTypes").Movie,
      "name" | "poster" | "overview" | "vote_average"
    >;
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
  const hasOverview =
    movie.overview != null && movie.overview.trim().length > 0;
  const overviewText = hasOverview
    ? (movie.overview as string)
    : OVERVIEW_FALLBACK;

  // Dim only the content layer; the glass surface (blur + tint) must stay untouched.
  const dimClassName = dimmed ? " opacity-50" : "";

  if (variant === "card") {
    // Legacy list row: small poster left, gold serif title, date line,
    // 2-line synopsis, TMDB badge bottom-right.
    return (
      <Card testID={testID} onPress={onPress} className="overflow-hidden">
        <View
          testID={`${testID}-content`}
          className={`flex-row${dimClassName}`}
        >
          <View
            testID={`${testID}-poster-wrapper`}
            className="w-24 self-stretch"
          >
            <Image
              testID={`${testID}-poster`}
              source={posterUrl ? { uri: posterUrl } : undefined}
              className="aspect-[2/3] w-24 bg-black/40"
            />
          </View>

          <View className="flex-1 px-3 py-2">
            <View className="flex-row items-start justify-between gap-2">
              <Text
                testID={`${testID}-title`}
                numberOfLines={2}
                className="flex-1 font-display-bold text-base text-accent-light"
              >
                {movie.name}
              </Text>
              {showProgressBadge ? (
                <View className="rounded-sm bg-black/70 px-2 py-0.5">
                  <Text
                    testID={`${testID}-progress-badge`}
                    className="text-xs text-white"
                  >
                    {progressBadgeText}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              testID={`${testID}-date-badge`}
              className="text-sm text-text-secondary"
            >
              {dateBadgeText}
            </Text>
            <Text
              testID={`${testID}-overview`}
              numberOfLines={2}
              className={`mt-1 text-sm italic ${hasOverview ? "text-text-secondary" : "text-text-dim"}`}
            >
              {overviewText}
            </Text>
          </View>

          {hasTmdbScore ? (
            <TmdbBadge
              testID={`${testID}-tmdb-badge`}
              score={movie.vote_average as number}
              className="absolute bottom-0 right-0 rounded-tl-xl bg-black/60 px-3 py-1"
            />
          ) : null}
        </View>
      </Card>
    );
  }

  // Edge-to-edge poster: the tile (Card, overflow-hidden) clips the poster's top
  // corners; the bottom edge is a straight cut above the info area.
  return (
    <Card testID={testID} onPress={onPress} className="overflow-hidden">
      <View testID={`${testID}-content`} className={dimClassName.trim()}>
        <View testID={`${testID}-poster-wrapper`} className="relative w-full">
          <Image
            testID={`${testID}-poster`}
            source={posterUrl ? { uri: posterUrl } : undefined}
            contentFit="cover"
            className="aspect-[2/3] w-full bg-black/40"
          />

          {showProgressBadge ? (
            <View className="absolute left-1 top-1 rounded-sm bg-black/70 px-2 py-0.5">
              <Text
                testID={`${testID}-progress-badge`}
                className="text-xs text-white"
              >
                {progressBadgeText}
              </Text>
            </View>
          ) : (
            <View className="absolute left-1 top-1 rounded-sm bg-black/70 px-2 py-0.5">
              <Text
                testID={`${testID}-date-badge-overlay`}
                className="text-xs text-white"
              >
                {dateBadgeText}
              </Text>
            </View>
          )}

          {hasTmdbScore ? (
            <View
              testID={`${testID}-tmdb-badge`}
              className="absolute bottom-0 right-0 rounded-tl-xl bg-black/60 px-2.5 py-1"
            >
              <Text className="text-xs font-semibold text-white">
                {formatTmdbScore(movie.vote_average as number)}
              </Text>
            </View>
          ) : null}
        </View>

        {showTitle ? (
          <View testID={`${testID}-info`} className="px-2 py-1.5">
            <Text
              testID={`${testID}-title`}
              className="font-semibold text-text-primary"
              numberOfLines={1}
            >
              {movie.name}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
