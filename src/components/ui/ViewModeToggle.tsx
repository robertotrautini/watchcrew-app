import { BG_PRIMARY_COLOR, TEXT_PRIMARY_COLOR } from "@/lib/colors";
import { Icon, type IconRole } from "@/components/ui/Icon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type ViewMode = "cards" | "grid" | "list";

const MODES: { key: ViewMode; label: string; icon: IconRole }[] = [
  { key: "cards", label: "Karten", icon: "viewCards" },
  { key: "grid", label: "Grid", icon: "viewGrid" },
  { key: "list", label: "Liste", icon: "viewList" },
];

const ACTIVE_ICON_COLOR = BG_PRIMARY_COLOR;
const INACTIVE_ICON_COLOR = TEXT_PRIMARY_COLOR;

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  testID: string;
  /** Per-mode button testID (tabs keep their historic ids so tests/Maestro keep working). */
  buttonTestID: (mode: ViewMode) => string;
}

/** Segmented Karten/Grid/Liste switch (shared `SegmentedControl`): three identical 40x40 icon cells, equal 4px inset (1 border + 3 padding) and 4px gaps (lives inside the search glass card). */
export function ViewModeToggle({ value, onChange, testID, buttonTestID }: ViewModeToggleProps) {
  return (
    <SegmentedControl
      testID={testID}
      className="self-center"
      value={value}
      onChange={onChange}
      options={MODES.map((mode) => ({
        key: mode.key,
        testID: buttonTestID(mode.key),
        accessibilityLabel: mode.label,
        render: (active) => <Icon name={mode.icon} size="S" color={active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR} />,
      }))}
    />
  );
}
