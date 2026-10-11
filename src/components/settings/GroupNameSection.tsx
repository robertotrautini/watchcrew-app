import { View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";

interface GroupNameSectionProps {
  value: string;
  onChangeText: (text: string) => void;
  canSave: boolean;
  saving: boolean;
  error: Error | null;
  /** Blocks touches while the group dropdown (which overlaps this section) is open. */
  blocked: boolean;
  onSave: () => void;
}

/** Owner-only rename field with save button and inline error. */
export function GroupNameSection({
  value,
  onChangeText,
  canSave,
  saving,
  error,
  blocked,
  onSave,
}: GroupNameSectionProps) {
  return (
    <View
      className="gap-2"
      testID="group-settings-rename-section"
      pointerEvents={blocked ? "none" : "auto"}
    >
      <Text className="font-title text-lg text-accent-light">Gruppenname</Text>
      <View testID="group-settings-rename-row" className="flex-row items-center gap-3">
        <TextField
          testID="group-settings-name-input"
          value={value}
          onChangeText={onChangeText}
          className="flex-1"
        />
        <IconButton
          testID="group-settings-rename-save-button"
          icon="save"
          variant="accent"
          accessibilityLabel="Gruppenname speichern"
          disabled={!canSave}
          loading={saving}
          onPress={onSave}
        />
      </View>
      {error ? (
        <Text testID="group-settings-rename-error" className="text-sm text-danger">
          Umbenennen fehlgeschlagen: {(error as { message?: string })?.message}
        </Text>
      ) : null}
    </View>
  );
}
