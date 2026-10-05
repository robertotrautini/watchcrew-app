import { useGroupTheme } from "@/components/GroupThemeProvider";
import { Icon } from "@/components/ui/Icon";
import { useParallaxScroll } from "@/components/parallaxContext";
import type { ReactNode } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { Image } from "@/components/ui/Image";
import { isGridPlaceholder, padToFullRows } from "@/lib/gridPadding";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";

/**
 * Shared, presentational movie grid used by the M6 movie-detail sub-views
 * (Filmreihe/collection, Regisseur-/Schauspieler-/Studio-Filmografie,
 * Ähnliche Filme). Purely presentational — it receives already-fetched,
 * already-filtered data via props and does no fetching/Supabase/tmdb-proxy
 * work of its own. The 4 route screens built on top of this own all
 * data-loading, filtering, and pagination logic; this component only knows
 * how to render a list of items plus optional progress/filter/footer UI.
 *
 * Poster/placeholder/badge-pill conventions follow
 * `src/components/movie/DiaryPosterTile.tsx` (read that file for the exact
 * precedent this mirrors).
 */

// Fixed regardless of active group theme — same "fixed semantic icon color"
// approach as DiaryPosterTile.tsx's LIKE_HEART_COLOR / StarRating.tsx.
const WATCHED_EYE_COLOR = "#22c55e"; // green — "watched"
// "on watchlist" bookmark follows the group theme accent (useGroupTheme in MovieGrid).
// Neutral placeholder-icon color (matches the "#8b8b8b" placeholder text
// color already used elsewhere, e.g. src/app/(app)/(tabs)/watchlist.tsx's
// search input) — deliberately distinct from the two fixed semantic badge
// colors above, since "no poster" isn't a watched/watchlist state.
const PLACEHOLDER_ICON_COLOR = "#8b8b8b";
// M7 part 2 (Add-Movie-Modal quick-add button): white, for contrast against
// the same semi-opaque dark badge/score pill background already used here.
const ADD_BUTTON_ICON_COLOR = "#ffffff";

const DEFAULT_EMPTY_MESSAGE = "Keine Filme gefunden.";

export interface MovieGridItem {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null; // TMDB score 0-10
}

export type MovieGridBadge = "watched" | "watchlist" | null;

export type StreamingFilterValue = "flatrate" | "rent" | "buy";

export interface MovieGridStreamingFilterProps {
  active: StreamingFilterValue | null;
  onChange: (value: StreamingFilterValue | null) => void;
}

export interface MovieGridProgressHeader {
  watched: number;
  total: number;
  percent: number;
  label: string;
}

export interface MovieGridProps<T extends MovieGridItem = MovieGridItem> {
  items: T[];
  onPressItem: (item: T) => void;
  testID: string;
  getBadge?: (item: T) => MovieGridBadge;
  progressHeader?: MovieGridProgressHeader | null;
  streamingFilter?: MovieGridStreamingFilterProps | null;
  footer?: ReactNode;
  emptyMessage?: string;
  /**
   * M7 part 2 (Add-Movie-Modal): optional per-tile quick-add affordance,
   * rendered as a small "+" button overlay distinct from tapping the tile
   * itself (which still calls `onPressItem` to navigate to the movie's
   * detail overlay, unchanged for every existing caller). Omitted entirely
   * (no prop given) renders no add button at all — every M6 sub-view screen
   * using this component is unaffected.
   */
  onAddItem?: (item: T) => void;
  /** Number of grid columns (default 3; the Add-Movie search uses 4 like the legacy app). */
  columns?: number;
}

const STREAMING_FILTER_OPTIONS: Array<{
  value: StreamingFilterValue;
  label: string;
}> = [
  { value: "flatrate", label: "Flatrate" },
  { value: "rent", label: "Leihen" },
  { value: "buy", label: "Kaufen" },
];

function formatScore(voteAverage: number): string {
  return voteAverage.toFixed(1);
}

export function MovieGrid<T extends MovieGridItem = MovieGridItem>({
  items,
  onPressItem,
  testID,
  getBadge,
  progressHeader,
  streamingFilter,
  footer,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  onAddItem,
  columns = 3,
}: MovieGridProps<T>) {
  const parallaxScroll = useParallaxScroll();
  const { colors: themeColors } = useGroupTheme();
  function renderTile(item: T) {
    const badge = getBadge ? getBadge(item) : null;
    const hasScore = typeof item.voteAverage === "number";

    return (
      <Card
        testID={`${testID}-item-${item.tmdbId}`}
        accessibilityRole="button"
        onPress={() => onPressItem(item)}
        className="overflow-hidden"
      >
        <View
          testID={`${testID}-item-${item.tmdbId}-poster-wrapper`}
          className="relative w-full"
        >
          {item.posterPath ? (
            <Image
              testID={`${testID}-item-${item.tmdbId}-poster`}
              source={{ uri: buildTmdbImageUrl(item.posterPath) as string }}
              accessibilityLabel={item.title}
              className="aspect-[2/3] w-full bg-card"
              contentFit="cover"
            />
          ) : (
            <View
              testID={`${testID}-item-${item.tmdbId}-poster-placeholder`}
              className="aspect-[2/3] w-full items-center justify-center bg-black/40 px-1"
            >
              <Icon name="film" size="L" color={PLACEHOLDER_ICON_COLOR} />
              <Text
                testID={`${testID}-item-${item.tmdbId}-placeholder-title`}
                numberOfLines={3}
                className="mt-1 text-center text-xs text-text-secondary"
              >
                {item.title}
              </Text>
            </View>
          )}

          {badge != null ? (
            <View
              testID={`${testID}-badge-${item.tmdbId}`}
              accessibilityLabel={
                badge === "watched" ? "Gesehen" : "Auf der Watchlist"
              }
              className="absolute left-1 top-1 flex-row items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5"
            >
              <Icon
                testID={`${testID}-badge-icon-${item.tmdbId}`}
                name={badge === "watched" ? "watched" : "bookmark"}
                size="S"
                color={
                  badge === "watched"
                    ? WATCHED_EYE_COLOR
                    : themeColors.accent
                }
              />
            </View>
          ) : null}

          {hasScore ? (
            <View
              testID={`${testID}-score-${item.tmdbId}`}
              className="absolute bottom-0 right-0 rounded-tl-xl bg-black/60 px-2 py-0.5"
            >
              <Text
                testID={`${testID}-score-${item.tmdbId}-value`}
                className="text-[10px] font-semibold text-white"
              >
                {formatScore(item.voteAverage as number)}
              </Text>
            </View>
          ) : null}

          {onAddItem ? (
            <Pressable
              testID={`${testID}-add-${item.tmdbId}`}
              accessibilityRole="button"
              accessibilityLabel="Zur Watchlist hinzufügen"
              onPress={() => onAddItem(item)}
              // 48x48 touch box in the tile corner; the dark 24dp circle stays the visible size
              className="absolute right-0 top-0 h-12 w-12 items-center justify-center"
            >
              <View className="items-center justify-center rounded-full bg-black/70 p-1">
                <Icon name="add" size="S" color={ADD_BUTTON_ICON_COLOR} />
              </View>
            </Pressable>
          ) : null}
        </View>

        <View
          testID={`${testID}-item-${item.tmdbId}-info`}
          className="px-1 py-1.5"
        >
          <Text
            testID={`${testID}-item-${item.tmdbId}-title`}
            numberOfLines={1}
            className="text-center text-xs text-text-primary"
          >
            {item.title}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View testID={testID} className="flex-1">
      {progressHeader != null ? (
        <View testID={`${testID}-progress-header`} className="mb-3 px-1">
          <Text className="mb-1 text-sm text-text-primary">
            {progressHeader.label}
          </Text>
          <View className="h-2 w-full overflow-hidden rounded-full bg-card">
            <View
              testID={`${testID}-progress-header-bar`}
              className="h-2 rounded-full bg-accent"
              // Narrow, deliberate exception to the "NativeWind classes only"
              // rule: `percent` is a genuinely continuous runtime value (any
              // 0-100 float), so it has no discrete class equivalent — a
              // template-literal class like `w-[${percent}%]` can't be
              // statically extracted by NativeWind/Tailwind's JIT (arbitrary
              // values must be known at compile time), so it silently never
              // applies at runtime. `style` is the only mechanism that can
              // express a truly dynamic percentage. See
              // docs/interim-decisions.md for why this is scoped to only
              // this one case, not a general inline-style allowance.
              style={{ width: `${progressHeader.percent}%` }}
            />
          </View>
        </View>
      ) : null}

      {streamingFilter != null ? (
        <View
          testID={`${testID}-streaming-filter`}
          className="mb-3 flex-row gap-2 px-1"
        >
          {STREAMING_FILTER_OPTIONS.map((option) => {
            const isActive = streamingFilter.active === option.value;
            return (
              <Chip
                key={option.value}
                testID={`${testID}-filter-${option.value}`}
                active={isActive}
                onPress={() =>
                  streamingFilter.onChange(isActive ? null : option.value)
                }
                label={option.label}
              />
            );
          })}
        </View>
      ) : null}

      {items.length === 0 ? (
        <View className="mt-16 items-center gap-3">
          <Icon name="film" size="L" color={PLACEHOLDER_ICON_COLOR} />
          <Text
            testID={`${testID}-empty`}
            className="text-center text-base text-text-secondary"
          >
            {emptyMessage}
          </Text>
        </View>
      ) : (
        <FlatList
          {...parallaxScroll}
          data={padToFullRows(items, columns)}
          keyExtractor={(item) =>
            isGridPlaceholder(item) ? item.key : String(item.tmdbId)
          }
          numColumns={columns}
          key={columns}
          columnWrapperClassName="gap-2"
          contentContainerClassName="gap-2"
          renderItem={({ item, index }) =>
            isGridPlaceholder(item) ? (
              <View
                testID={`${testID}-placeholder-${index - items.length}`}
                className="flex-1"
              />
            ) : (
              <FadeInItem index={index} className="flex-1">
                {renderTile(item)}
              </FadeInItem>
            )
          }
          ListFooterComponent={
            footer != null ? (
              <View testID={`${testID}-footer`}>{footer}</View>
            ) : null
          }
        />
      )}
    </View>
  );
}
