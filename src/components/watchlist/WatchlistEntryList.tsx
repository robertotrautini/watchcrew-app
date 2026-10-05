import { useParallaxScroll } from "@/components/parallaxContext";
import { FlatList, Text, View } from "react-native";

import { WatchlistPosterCard } from "@/components/movie/WatchlistPosterCard";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { GlassBlur } from "@/components/ui/GlassBlur";
import { formatPlainDate } from "@/lib/dateFormat";
import { isGridPlaceholder, padToFullRows } from "@/lib/gridPadding";
import {
  getEffectiveReleaseDate,
  withEffectiveReleaseDate,
} from "@/lib/watchlistLogic";
import type {
  StreamingAvailabilityLookup,
  WatchlistEntry,
} from "@/lib/watchlistTypes";
import type { WatchlistViewMode } from "@/stores/usePreferencesStore";

function ratedCountFor(entry: WatchlistEntry): number {
  return entry.ratings.filter((r) => r.rating != null && r.rating > 0).length;
}

export function WatchlistEntryList({
  entries,
  viewMode,
  streamingAvailability,
  totalMembers,
  showTitlesInGrid,
  onOpenEntry,
}: {
  entries: WatchlistEntry[];
  viewMode: WatchlistViewMode;
  streamingAvailability: StreamingAvailabilityLookup;
  totalMembers: number;
  showTitlesInGrid: boolean;
  onOpenEntry: (entry: WatchlistEntry) => void;
}) {
  const parallaxScroll = useParallaxScroll();

  if (viewMode === "list") {
    return (
      <FlatList
        {...parallaxScroll}
        testID="watchlist-list"
        data={entries}
        keyExtractor={(entry) => entry.id}
        contentContainerClassName="px-4 pb-3 pt-3"
        renderItem={({ item, index }) => (
          <GlassBlur
            testID={`watchlist-list-row-${item.id}`}
            accessibilityRole="button"
            onPress={() => onOpenEntry(item)}
            fallbackClassName="bg-glass"
            blurClassName="bg-bg-card-blur"
            className={`flex-row items-center gap-3 border-x border-b border-glass-border px-3 py-3 ${
              index === 0 ? "rounded-t-xl border-t" : ""
            } ${index === entries.length - 1 ? "rounded-b-xl" : ""}`}
          >
            <Text
              numberOfLines={1}
              className="flex-1 font-display-bold text-accent-light"
            >
              {item.movie.name}
            </Text>
            <Text className="text-sm text-text-secondary">
              {formatPlainDate(getEffectiveReleaseDate(item), "Kein Datum")}
            </Text>
            {item.movie.vote_average != null ? (
              <Text className="w-9 text-right text-sm font-semibold text-text-primary">
                {item.movie.vote_average.toFixed(1)}
              </Text>
            ) : null}
          </GlassBlur>
        )}
      />
    );
  }

  const isGrid = viewMode === "grid";
  return (
    <FlatList
      {...parallaxScroll}
      testID="watchlist-grid-or-cards"
      key={viewMode}
      data={padToFullRows(entries, isGrid ? 3 : 1)}
      keyExtractor={(entry) => (isGridPlaceholder(entry) ? entry.key : entry.id)}
      numColumns={isGrid ? 3 : 1}
      contentContainerClassName="px-4 pt-3 gap-3"
      columnWrapperClassName={isGrid ? "gap-3" : undefined}
      renderItem={({ item, index }) =>
        isGridPlaceholder(item) ? (
          <View className="flex-1" />
        ) : (
          <FadeInItem
            replayTab="watchlist"
            index={index}
            className={isGrid ? "flex-1" : undefined}
          >
            <WatchlistPosterCard
              variant={isGrid ? "grid" : "card"}
              movie={withEffectiveReleaseDate(item)}
              streamingAvailability={streamingAvailability}
              ratedCount={ratedCountFor(item)}
              totalMembers={totalMembers}
              showTitle={showTitlesInGrid}
              onPress={() => onOpenEntry(item)}
              testID={`watchlist-entry-${item.id}`}
            />
          </FadeInItem>
        )
      }
    />
  );
}
