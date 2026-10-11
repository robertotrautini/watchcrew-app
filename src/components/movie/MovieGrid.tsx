import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { MOVIE_TITLE_TEXT } from "@/components/ui/movieTitle";
import { Icon, type IconRole } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useParallaxScroll } from "@/components/parallaxContext";
import type { ReactNode } from "react";
import { FlatList, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { Image } from "@/components/ui/Image";
import { PosterCornerBadge } from "@/components/movie/PosterCornerBadge";
import { PosterTmdbBadge } from "@/components/movie/PosterTmdbBadge";
import { GRID_COLUMN_WRAPPER_STYLE, isGridPlaceholder, padToFullRows } from "@/lib/gridPadding";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Shared, presentational movie grid used by the M6 movie-detail sub-views
 * (Filmreihe/collection, Regisseur-/Schauspieler-/Studio-Filmografie,
 * Ähnliche Filme). Purely presentational — it receives already-fetched,
 * already-filtered data via props and does no fetching/Supabase/tmdb-proxy
 * work of its own. The 4 route screens built on top of this own all
 * data-loading, filtering, and pagination logic; this component only knows
 * how to render a list of items plus optional progress/filter/footer UI.
 *
 * Corner badges come only from `PosterCornerBadge` (top-right: eye/bookmark)
 * and `PosterTmdbBadge` (bottom-right).
 */

const DEFAULT_EMPTY_MESSAGE = "Keine Filme gefunden";

export interface MovieGridItem {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null; // TMDB score 0-10
}

export type MovieGridBadge = "watched" | "watchlist" | null;

type StreamingFilterValue = "flatrate" | "rent" | "buy";

interface MovieGridStreamingFilterProps {
  active: StreamingFilterValue | null;
  onChange: (value: StreamingFilterValue | null) => void;
}

interface MovieGridProgressHeader {
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
  /** Icon role of the empty state (default: film). */
  emptyIcon?: IconRole;
  /** Number of grid columns (default: the "Raster Aehnliche Filme & Filmsuche" setting, 3 or 4). */
  columns?: number;
}

const STREAMING_FILTER_OPTIONS: {
  value: StreamingFilterValue;
  label: string;
}[] = [
  { value: "flatrate", label: "Flatrate" },
  { value: "rent", label: "Leihen" },
  { value: "buy", label: "Kaufen" },
];

export function MovieGrid<T extends MovieGridItem = MovieGridItem>({
  items,
  onPressItem,
  testID,
  getBadge,
  progressHeader,
  streamingFilter,
  footer,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  emptyIcon = "film",
  columns: columnsProp,
}: MovieGridProps<T>) {
  const parallaxScroll = useParallaxScroll();
  const storeColumns = usePreferencesStore((s) => s.gridColumnsMovies);
  const columns = columnsProp ?? storeColumns;
  function renderTile(item: T) {
    const badge = getBadge ? getBadge(item) : null;

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
              <Icon name="film" size="L" color={PLACEHOLDER_COLOR} />
              <Text
                testID={`${testID}-item-${item.tmdbId}-placeholder-title`}
                numberOfLines={3}
                className="mt-1 text-center text-xs text-text-secondary"
              >
                {item.title}
              </Text>
            </View>
          )}

          <PosterCornerBadge
            testID={`${testID}-badge-${item.tmdbId}`}
            idPrefix={`${testID}-badge-${item.tmdbId}`}
            watched={badge === "watched"}
            onWatchlist={badge === "watchlist"}
          />

          <PosterTmdbBadge
            testID={`${testID}-score-${item.tmdbId}`}
            valueTestID={`${testID}-score-${item.tmdbId}-value`}
            score={item.voteAverage}
          />

        </View>

        <View
          testID={`${testID}-item-${item.tmdbId}-info`}
          className="px-1 py-1.5"
        >
          <Text
            testID={`${testID}-item-${item.tmdbId}-title`}
            numberOfLines={1}
            className={`text-center text-xs ${MOVIE_TITLE_TEXT}`}
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
        <EmptyState
          testID={`${testID}-empty`}
          icon={emptyIcon}
          title={emptyMessage}
        />
      ) : (
        <FlatList
          {...parallaxScroll}
          data={padToFullRows(items, columns)}
          keyExtractor={(item) =>
            isGridPlaceholder(item) ? item.key : String(item.tmdbId)
          }
          numColumns={columns}
          key={columns}
          columnWrapperStyle={GRID_COLUMN_WRAPPER_STYLE}
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
