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

export interface PillItem {
  key: string;
  testID: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

/** Shared wrapping row of filter chips; the three pill groups below only map their data to it. */
export function PillRow({ testID, pills }: { testID: string; pills: PillItem[] }) {
  return (
    <View className="flex-row flex-wrap gap-2" testID={testID}>
      {pills.map(({ key, ...chip }) => (
        <Chip key={key} {...chip} />
      ))}
    </View>
  );
}

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
    <PillRow
      testID={`${testIDPrefix}-genre-pills`}
      pills={genreIds.map((genreId) => ({
        key: genreId,
        testID: `${testIDPrefix}-genre-pill-${genreId}`,
        active: selectedGenreIds.includes(genreId),
        onPress: () => onToggle(genreId),
        label: genreDisplayLabel(genreId, genreNamesById.get(genreId)),
      }))}
    />
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
  const values: YearFilterValue[] = showNoDate ? [...years, "no_date"] : years;
  return (
    <PillRow
      testID={`${testIDPrefix}-year-pills`}
      pills={values.map((year) => ({
        key: String(year),
        testID: `${testIDPrefix}-year-pill-${year}`,
        active: selectedYear === year,
        onPress: () => onSelect(year),
        label: year === "no_date" ? "Kein Datum" : String(year),
      }))}
    />
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
    <PillRow
      testID={`${testIDPrefix}-provider-categories`}
      pills={ALL_PROVIDER_CATEGORIES.map((category) => ({
        key: category,
        testID: `${testIDPrefix}-provider-category-${category}`,
        active: active.includes(category),
        onPress: () => onToggle(category),
        label: PROVIDER_CATEGORY_LABELS[category],
      }))}
    />
  );
}
