import { useState } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { DraftSheet, DraftSheetForm } from "@/components/ui/DraftSheet";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import {
  DEFAULT_GROUP_THEME,
  GROUP_THEME_LABELS,
  GROUP_THEME_OPTIONS,
  resolveGroupTheme,
  type GroupThemeName,
} from "@/lib/groupTheme";

export interface CreateGroupSheetProps {
  visible: boolean;
  loading?: boolean;
  /** Draft is discarded on cancel/close. */
  onCancel: () => void;
  onCreate: (params: { name: string; theme: GroupThemeName }) => void;
}

const TEST_ID = "group-settings-create";

/** Flyout "Neue Gruppe anlegen": name (required, same rule as onboarding) + optional colour theme. */
export function CreateGroupSheet({
  visible,
  loading = false,
  onCancel,
  onCreate,
}: CreateGroupSheetProps) {
  return (
    <DraftSheet visible={visible} onCancel={onCancel} title="Neue Gruppe anlegen">
      <CreateGroupForm loading={loading} onCreate={onCreate} />
    </DraftSheet>
  );
}

function CreateGroupForm({
  loading,
  onCreate,
}: Pick<CreateGroupSheetProps, "onCreate"> & { loading: boolean }) {
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<GroupThemeName>(DEFAULT_GROUP_THEME);
  const selectedAccent = resolveGroupTheme(theme).colors.accent;
  const isValid = name.trim().length > 0;

  function handleCreate() {
    if (!isValid || loading) {
      return;
    }
    // The caller closes the sheet on success; on error the draft (input) stays.
    onCreate({ name: name.trim(), theme });
  }

  return (
    <DraftSheetForm
      testID={`${TEST_ID}-dialog`}
      className="gap-4"
      actionsTestID={`${TEST_ID}-actions`}
      cancelTestID={`${TEST_ID}-cancel-button`}
      confirmTestID={`${TEST_ID}-confirm-button`}
      saveLabel="Anlegen"
      saveIcon="add"
      saveDisabled={!isValid}
      loading={loading}
      onSave={handleCreate}
    >
      <TextField
        testID={`${TEST_ID}-name-input`}
        value={name}
        onChangeText={setName}
        placeholder="Gruppenname"
      />
      <Text className="text-text-secondary">Farbthema</Text>
      <View className="flex-row flex-wrap gap-3">
        {GROUP_THEME_OPTIONS.map((themeName) => {
          const { colors } = resolveGroupTheme(themeName);
          const isSelected = theme === themeName;
          return (
            <Pressable
              key={themeName}
              testID={`${TEST_ID}-theme-${themeName}`}
              accessibilityRole="button"
              accessibilityLabel={GROUP_THEME_LABELS[themeName]}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setTheme(themeName)}
              className="h-touch-comfortable w-touch-comfortable items-center justify-center"
            >
              <Icon name="swatch" size="L" color={colors.accent} />
              {isSelected ? (
                <Icon
                  name="selected"
                  size="S"
                  color={selectedAccent}
                  className="absolute -right-1 -top-1"
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </DraftSheetForm>
  );
}
