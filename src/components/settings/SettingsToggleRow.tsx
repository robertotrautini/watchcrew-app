import { Pressable, Text } from "react-native";

import { SwitchIndicator } from "@/components/ui/Switch";

export interface SettingsToggleRowProps {
  testID: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Flat switch row for a `SettingsGroup` card (Material 3 `SwitchIndicator`). */
export function SettingsToggleRow({ testID, label, checked, disabled, onPress }: SettingsToggleRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-touch-comfortable flex-row items-center justify-between px-4 py-3"
    >
      {({ pressed }) => (
        <>
          <Text className="flex-1 pr-3 text-text-primary">{label}</Text>
          <SwitchIndicator checked={checked} pressed={pressed} disabled={!!disabled} testID={`${testID}-switch`} />
        </>
      )}
    </Pressable>
  );
}
