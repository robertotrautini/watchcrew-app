import { Pressable, Text, View } from "react-native";

import { Sheet } from "@/components/ui/Sheet";
import type { SortOptionItem } from "@/lib/entryFilters";
import type { WatchlistSortOption } from "@/lib/watchlistTypes";

export const WATCHLIST_SORT_OPTIONS: SortOptionItem<WatchlistSortOption>[] = [
  { key: "added", label: "Hinzugefügt" },
  { key: "upcoming", label: "Kommt noch" },
  { key: "unrated", label: "Keine Bewertung" },
  { key: "has_ratings", label: "Mit Bewertung(en)" },
  { key: "tmdb_score", label: "TMDB Score" },
  { key: "my_streaming", label: "Meine Streaming-Dienste" },
  { key: "genre", label: "Nach Genre" },
  { key: "year", label: "Nach Jahr" },
];

export function WatchlistSortSheet({
  visible,
  sortOption,
  onClose,
  onSelect,
}: {
  visible: boolean;
  sortOption: WatchlistSortOption;
  onClose: () => void;
  onSelect: (option: WatchlistSortOption) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Sortieren nach">
      <View testID="watchlist-sort-options">
        {WATCHLIST_SORT_OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            testID={`watchlist-sort-option-${option.key}`}
            onPress={() => onSelect(option.key)}
            className="py-3"
          >
            <Text
              className={
                sortOption === option.key
                  ? "font-semibold text-accent"
                  : "text-text-primary"
              }
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
