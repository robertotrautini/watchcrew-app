import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

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
const WATCHLIST_BOOKMARK_COLOR = "#f5b301"; // gold/amber — "on watchlist"
const BADGE_ICON_SIZE = 14;
// Neutral placeholder-icon color (matches the "#8b8b8b" placeholder text
// color already used elsewhere, e.g. src/app/(app)/(tabs)/watchlist.tsx's
// search input) — deliberately distinct from the two fixed semantic badge
// colors above, since "no poster" isn't a watched/watchlist state.
const PLACEHOLDER_ICON_COLOR = "#8b8b8b";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";

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
}

const STREAMING_FILTER_OPTIONS: Array<{ value: StreamingFilterValue; label: string }> = [
  { value: "flatrate", label: "Flatrate" },
  { value: "rent", label: "Leihen" },
  { value: "buy", label: "Kaufen" },
];

function formatScore(voteAverage: number): string {
  return voteAverage.toFixed(1);
}

function buildPosterUrl(posterPath: string): string {
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
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
}: MovieGridProps<T>) {
  function renderTile(item: T) {
    const badge = getBadge ? getBadge(item) : null;
    const hasScore = typeof item.voteAverage === "number";

    return (
      <Pressable
        testID={`${testID}-item-${item.tmdbId}`}
        accessibilityRole="button"
        onPress={() => onPressItem(item)}
        className="flex-1"
      >
        <View className="relative">
          {item.posterPath ? (
            <Image
              testID={`${testID}-item-${item.tmdbId}-poster`}
              source={{ uri: buildPosterUrl(item.posterPath) }}
              accessibilityLabel={item.title}
              className="aspect-[2/3] w-full rounded-lg bg-card"
              contentFit="cover"
            />
          ) : (
            <View
              testID={`${testID}-item-${item.tmdbId}-poster-placeholder`}
              className="aspect-[2/3] w-full items-center justify-center rounded-lg bg-card"
            >
              <Ionicons name="film-outline" size={32} color={PLACEHOLDER_ICON_COLOR} />
            </View>
          )}

          {badge != null ? (
            <View
              testID={`${testID}-badge-${item.tmdbId}`}
              accessibilityLabel={badge === "watched" ? "Gesehen" : "Auf der Watchlist"}
              className="absolute left-1 top-1 flex-row items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5"
            >
              <Ionicons
                name={badge === "watched" ? "eye" : "bookmark"}
                size={BADGE_ICON_SIZE}
                color={badge === "watched" ? WATCHED_EYE_COLOR : WATCHLIST_BOOKMARK_COLOR}
              />
            </View>
          ) : null}

          {hasScore ? (
            <View
              testID={`${testID}-score-${item.tmdbId}`}
              className="absolute bottom-1 right-1 flex-row items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5"
            >
              <Ionicons name="star" size={BADGE_ICON_SIZE} color={WATCHLIST_BOOKMARK_COLOR} />
              <Text testID={`${testID}-score-${item.tmdbId}-value`} className="text-xs text-white">
                {formatScore(item.voteAverage as number)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text testID={`${testID}-item-${item.tmdbId}-title`} numberOfLines={2} className="mt-1 text-text-primary">
          {item.title}
        </Text>
      </Pressable>
    );
  }

  return (
    <View testID={testID} className="flex-1">
      {progressHeader != null ? (
        <View testID={`${testID}-progress-header`} className="mb-3 px-1">
          <Text className="mb-1 text-sm text-text-primary">{progressHeader.label}</Text>
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
        <View testID={`${testID}-streaming-filter`} className="mb-3 flex-row gap-2 px-1">
          {STREAMING_FILTER_OPTIONS.map((option) => {
            const isActive = streamingFilter.active === option.value;
            return (
              <Pressable
                key={option.value}
                testID={`${testID}-filter-${option.value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() =>
                  streamingFilter.onChange(isActive ? null : option.value)
                }
                className={`rounded-full border border-border-subtle px-3 py-1 ${
                  isActive ? "bg-accent" : "bg-card"
                }`}
              >
                <Text className="text-xs text-text-primary">{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {items.length === 0 ? (
        <Text testID={`${testID}-empty`} className="mt-8 text-center text-text-secondary">
          {emptyMessage}
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.tmdbId)}
          numColumns={3}
          columnWrapperClassName="gap-3"
          contentContainerClassName="gap-3"
          renderItem={({ item }) => renderTile(item)}
          ListFooterComponent={
            footer != null ? <View testID={`${testID}-footer`}>{footer}</View> : null
          }
        />
      )}
    </View>
  );
}
