import { ListRow } from "@/components/ui/ListRow";
import { SwitchIndicator } from "@/components/ui/Switch";

export interface SettingsToggleRowProps {
  testID: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Switch row (ListRow with Material 3 `SwitchIndicator` trailing). */
export function SettingsToggleRow({ testID, label, checked, disabled, onPress }: SettingsToggleRowProps) {
  return (
    <ListRow
      testID={testID}
      label={label}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      trailing={(pressed) => (
        <SwitchIndicator checked={checked} pressed={pressed} disabled={!!disabled} testID={`${testID}-switch`} />
      )}
    />
  );
}
