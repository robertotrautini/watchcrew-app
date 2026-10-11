import { View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import type { DiaryScope } from "@/lib/listFilters";

const SCOPES: { key: DiaryScope; label: string }[] = [
  { key: "my_diary", label: "Mein Tagebuch" },
  { key: "group", label: "Gruppe" },
];

/**
 * Scope switch above the filter panel: "Mein Tagebuch" (all movies I rated/saw,
 * across ALL my groups and movies in no group; ADR 0014) vs. "Gruppe" (movies
 * any member of the active group rated). Independent of sort and filters.
 * testIDs: `tagebuch-scope`, `tagebuch-scope-my_diary`, `tagebuch-scope-group`.
 */
export function TagebuchScopeSwitch({
  scope,
  onChange,
}: {
  scope: DiaryScope;
  onChange: (scope: DiaryScope) => void;
}) {
  return (
    <View className="mx-4 mt-3 flex-row gap-2" testID="tagebuch-scope">
      {SCOPES.map((option) => (
        <Chip
          key={option.key}
          testID={`tagebuch-scope-${option.key}`}
          label={option.label}
          active={scope === option.key}
          accessibilityState={{ selected: scope === option.key }}
          onPress={() => onChange(option.key)}
        />
      ))}
    </View>
  );
}
