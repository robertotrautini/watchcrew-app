import { Icon, type IconRole } from "@/components/ui/Icon";
import { Pressable, View } from "react-native";

export type ViewMode = "cards" | "grid" | "list";

const MODES: Array<{ key: ViewMode; label: string; icon: IconRole }> = [
  { key: "cards", label: "Karten", icon: "viewCards" },
  { key: "grid", label: "Grid", icon: "viewGrid" },
  { key: "list", label: "Liste", icon: "viewList" },
];

const ACTIVE_ICON_COLOR = "#0a0a0a";
const INACTIVE_ICON_COLOR = "#e8e8e8";

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  testID: string;
  /** Per-mode button testID (tabs keep their historic ids so tests/Maestro keep working). */
  buttonTestID: (mode: ViewMode) => string;
}

/** Segmented Karten/Grid/Liste switch: three compact rounded-box icon segments (lives inside the search glass card). */
export function ViewModeToggle({ value, onChange, testID, buttonTestID }: ViewModeToggleProps) {
  return (
    <View className="flex-row overflow-hidden rounded-lg border border-glass-border bg-black/35" testID={testID}>
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
            // 48x48 touch box; the visible segment (36x40) stays small inside it
            className="h-12 w-12 items-center justify-center"
          >
            <View
              testID={`${buttonTestID(mode.key)}-segment`}
              className={`h-9 w-10 items-center justify-center rounded-md ${
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
