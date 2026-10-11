import { startTransition, useState } from "react";
import { View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import type { SortField, SortFieldItem, SortState } from "@/lib/entrySorting";

/**
 * Panel row 2: sort field (Select, leading sort icon) + direction toggle. Changes
 * apply immediately. Derived testIDs: `<prefix>-sort-field` (Select, with
 * `-option-<field>`), `<prefix>-sort-direction`.
 */
export function EntrySortRow({
  testIDPrefix,
  fields,
  sort,
  onChange,
}: {
  testIDPrefix: string;
  fields: SortFieldItem[];
  sort: SortState;
  onChange: (sort: SortState) => void;
}) {
  // Local mirror of the direction so the arrow flips in the tap's own frame.
  const [direction, setDirection] = useState(sort.direction);
  const [seenPropDirection, setSeenPropDirection] = useState(sort.direction);
  if (seenPropDirection !== sort.direction) {
    setSeenPropDirection(sort.direction);
    setDirection(sort.direction);
  }
  const ascending = direction === "asc";
  return (
    <View
      className="flex-row items-center gap-2"
      testID={`${testIDPrefix}-sort-row`}
    >
      <Select
        testID={`${testIDPrefix}-sort-field`}
        className="flex-1"
        leadingIcon="sort"
        accessibilityLabel={`Sortieren nach ${fields.find((f) => f.key === sort.field)?.label ?? ""}`.trim()}
        options={fields.map((f) => ({ value: f.key, label: f.label }))}
        value={sort.field}
        onChange={(field) => onChange({ ...sort, field: field as SortField })}
      />
      <IconButton
        testID={`${testIDPrefix}-sort-direction`}
        icon={ascending ? "sortAsc" : "sortDesc"}
        accessibilityLabel={
          ascending
            ? "Richtung: aufsteigend, tippen für absteigend"
            : "Richtung: absteigend, tippen für aufsteigend"
        }
        onPress={() => {
          const next = ascending ? "desc" : "asc";
          setDirection(next);
          startTransition(() => onChange({ ...sort, direction: next }));
        }}
      />
    </View>
  );
}
