import { View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { genreDisplayLabel } from "@/lib/diaryDisplay";
import { PROVIDER_CATEGORY_LABELS } from "@/lib/entryFilters";
import {
  ALL_PROVIDER_CATEGORIES,
  type ProviderCategory,
} from "@/lib/movieProviderFilter";
import type { YearFilterValue } from "@/lib/watchlistTypes";

// Pill rows of the Tagebuch/Watchlist filter panel. `testIDPrefix` is
// "tagebuch" or "watchlist" (Maestro relies on the resulting testIDs).

export function GenrePills({
  testIDPrefix,
  genreIds,
  selectedGenreIds,
  genreNamesById,
  onToggle,
}: {
  testIDPrefix: string;
  genreIds: string[];
  selectedGenreIds: string[];
  genreNamesById: Map<string, string>;
  onToggle: (genreId: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2" testID={`${testIDPrefix}-genre-pills`}>
      {genreIds.map((genreId) => (
        <Chip
          key={genreId}
          testID={`${testIDPrefix}-genre-pill-${genreId}`}
          active={selectedGenreIds.includes(genreId)}
          onPress={() => onToggle(genreId)}
          label={genreDisplayLabel(genreId, genreNamesById.get(genreId))}
        />
      ))}
    </View>
  );
}

export function YearPills({
  testIDPrefix,
  years,
  selectedYear,
  showNoDate = false,
  onSelect,
}: {
  testIDPrefix: string;
  years: number[];
  selectedYear: YearFilterValue | undefined;
  /** Adds the trailing "Kein Datum" pill (Tagebuch only). */
  showNoDate?: boolean;
  onSelect: (year: YearFilterValue) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2" testID={`${testIDPrefix}-year-pills`}>
      {years.map((year) => (
        <Chip
          key={year}
          testID={`${testIDPrefix}-year-pill-${year}`}
          active={selectedYear === year}
          onPress={() => onSelect(year)}
          label={String(year)}
        />
      ))}
      {showNoDate ? (
        <Chip
          testID={`${testIDPrefix}-year-pill-no_date`}
          active={selectedYear === "no_date"}
          onPress={() => onSelect("no_date")}
          label="Kein Datum"
        />
      ) : null}
    </View>
  );
}

export function ProviderCategoryPills({
  testIDPrefix,
  active,
  onToggle,
}: {
  testIDPrefix: string;
  active: ProviderCategory[];
  onToggle: (category: ProviderCategory) => void;
}) {
  return (
    <View
      className="flex-row flex-wrap gap-2"
      testID={`${testIDPrefix}-provider-categories`}
    >
      {ALL_PROVIDER_CATEGORIES.map((category) => (
        <Chip
          key={category}
          testID={`${testIDPrefix}-provider-category-${category}`}
          active={active.includes(category)}
          onPress={() => onToggle(category)}
          label={PROVIDER_CATEGORY_LABELS[category]}
        />
      ))}
    </View>
  );
}
