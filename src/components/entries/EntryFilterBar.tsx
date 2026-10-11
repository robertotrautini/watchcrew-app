import { BG_PRIMARY_COLOR } from "@/lib/colors";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { chipClassName, chipTextClassName } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { filterChipLabel } from "@/lib/entryFilters";
import type { EntryFilters, FilterKey } from "@/lib/listFilters";

const CHIP_ICON_COLOR = BG_PRIMARY_COLOR;

/**
 * Panel row 3: fixed "+ Filter" button (opens the flyout) at the left, the
 * removable active-filter chips (tap = remove) in a horizontally scrollable
 * strip, and an optional fixed `trailing` slot (view mode toggle) at the right. Derived testIDs:
 * `<prefix>-filter-chips`, `<prefix>-filter-chip-<key>` (key = `genre-<id>`,
 * `year`, `streaming`, `liked`, `upcoming`, `unrated`, `has_ratings`,
 * `all_rated`, `missing`), `<prefix>-filter-add`.
 */
export function EntryFilterBar({
  testIDPrefix,
  keys,
  filters,
  genreNamesById,
  onRemove,
  onAdd,
  trailing,
}: {
  testIDPrefix: string;
  keys: FilterKey[];
  filters: EntryFilters;
  genreNamesById: ReadonlyMap<string, string>;
  onRemove: (key: FilterKey) => void;
  onAdd: () => void;
  trailing?: ReactNode;
}) {
  return (
    <View
      className="flex-row items-center gap-2"
      testID={`${testIDPrefix}-filter-row`}
    >
      <Pressable
        testID={`${testIDPrefix}-filter-add`}
        accessibilityRole="button"
        accessibilityLabel="Filter hinzufügen"
        onPress={onAdd}
        className={chipClassName(false)}
      >
        <Text className={chipTextClassName(false)}>+ Filter</Text>
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="items-center gap-2"
        keyboardShouldPersistTaps="handled"
        testID={`${testIDPrefix}-filter-chips`}
      >
        {keys.map((key) => {
          const label = filterChipLabel(key, filters, genreNamesById);
          return (
            <Pressable
              key={key}
              testID={`${testIDPrefix}-filter-chip-${key.replace(":", "-")}`}
              accessibilityRole="button"
              accessibilityLabel={`${label} entfernen`}
              onPress={() => onRemove(key)}
              className={chipClassName(true)}
            >
              <Text className={chipTextClassName(true)}>{label}</Text>
              <Icon name="close" size="S" color={CHIP_ICON_COLOR} />
            </Pressable>
          );
        })}
      </ScrollView>
      {trailing}
    </View>
  );
}
