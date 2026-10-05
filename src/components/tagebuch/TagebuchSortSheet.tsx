import { Pressable, Text, View } from "react-native";

import { Sheet } from "@/components/ui/Sheet";
import type { SortOptionItem } from "@/lib/entryFilters";
import type { DiarySortOption } from "@/lib/watchlistTypes";

export const TAGEBUCH_SORT_OPTIONS: SortOptionItem<DiarySortOption>[] = [
  { key: "my_diary", label: "Mein Tagebuch" },
  { key: "all_rated", label: "Von allen bewertet" },
  { key: "missing", label: "Fehlende Bewertungen" },
  { key: "rating", label: "Beste Bewertung" },
  { key: "tmdb_score", label: "TMDB Score" },
  { key: "my_streaming", label: "Meine Streaming-Dienste" },
  { key: "genre", label: "Nach Genre" },
  { key: "year", label: "Nach Jahr" },
  { key: "liked", label: "Mag ich" },
];

export function TagebuchSortSheet({
  visible,
  sortOption,
  onClose,
  onSelect,
}: {
  visible: boolean;
  sortOption: DiarySortOption;
  onClose: () => void;
  onSelect: (option: DiarySortOption) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Sortieren nach">
      <View testID="tagebuch-sort-sheet" className="gap-1">
        {TAGEBUCH_SORT_OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            testID={`tagebuch-sort-option-${option.key}`}
            accessibilityRole="button"
            accessibilityState={{ selected: sortOption === option.key }}
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
