import { Icon, type IconRole } from "@/components/ui/Icon";
import { Pressable, View } from "react-native";

export type ViewMode = "cards" | "grid" | "list";

const MODES: { key: ViewMode; label: string; icon: IconRole }[] = [
  { key: "cards", label: "Karten", icon: "viewCards" },
  { key: "grid", label: "Grid", icon: "viewGrid" },
  { key: "list", label: "Liste", icon: "viewList" },
];

const SEGMENT_HIT_SLOP = { top: 4, bottom: 4, left: 2, right: 2 };
const ACTIVE_ICON_COLOR = "#0a0a0a";
const INACTIVE_ICON_COLOR = "#e8e8e8";

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  testID: string;
  /** Per-mode button testID (tabs keep their historic ids so tests/Maestro keep working). */
  buttonTestID: (mode: ViewMode) => string;
}

/** Segmented Karten/Grid/Liste switch: three identical 40x40 icon cells, equal 4px inset (1 border + 3 padding) and 4px gaps (lives inside the search glass card). */
export function ViewModeToggle({ value, onChange, testID, buttonTestID }: ViewModeToggleProps) {
  return (
    <View className="h-12 flex-row items-center gap-1 self-center rounded-lg border border-glass-border bg-black/35 p-[3px]" testID={testID}>
      {MODES.map((mode) => {
        const active = value === mode.key;
        return (
          <Pressable
            key={mode.key}
            testID={buttonTestID(mode.key)}
            accessibilityRole="button"
            accessibilityLabel={mode.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(mode.key)}
            // identical 40x40 cells; hitSlop tops the touch box up to 44x48 without overlapping neighbours (gap 4)
            hitSlop={SEGMENT_HIT_SLOP}
            className="h-10 w-10 items-center justify-center"
          >
            <View
              testID={`${buttonTestID(mode.key)}-segment`}
              className={`h-10 w-10 items-center justify-center rounded-md ${
                active ? "bg-accent" : "bg-transparent"
              }`}
            >
              <Icon name={mode.icon} size="S" color={active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
