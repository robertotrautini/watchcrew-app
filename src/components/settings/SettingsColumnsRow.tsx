import { View } from "react-native";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import type { GridColumns } from "@/stores/usePreferencesStore";

const OPTIONS: GridColumns[] = [3, 4];

export interface SettingsColumnsRowProps {
  testID: string;
  label: string;
  value: GridColumns;
  onChange: (columns: GridColumns) => void;
}

/** Settings row with a small 3 | 4 segment switch (posters per row). Option testIDs: `<testID>-3` / `<testID>-4`. */
export function SettingsColumnsRow({ testID, label, value, onChange }: SettingsColumnsRowProps) {
  return (
    <View testID={testID} className="min-h-touch-comfortable flex-row items-center justify-between px-4 py-3">
      <Text className="flex-1 pr-3 text-text-primary">{label}</Text>
      <SegmentedControl
        value={value}
        onChange={onChange}
        options={OPTIONS.map((option) => ({
          key: option,
          testID: `${testID}-${option}`,
          accessibilityLabel: `${option} Spalten`,
          render: (active) => (
            <Text className={active ? "font-bold text-black" : "text-text-primary"}>{option}</Text>
          ),
        }))}
      />
    </View>
  );
}
