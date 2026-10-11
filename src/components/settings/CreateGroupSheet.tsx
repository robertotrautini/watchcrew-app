import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { GLASS_INSET_EDGE } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Text, TextInput } from "@/components/ui/Text";
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
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<GroupThemeName>(DEFAULT_GROUP_THEME);
  const selectedAccent = resolveGroupTheme(theme).colors.accent;
  const isValid = name.trim().length > 0;

  function reset() {
    setName("");
    setTheme(DEFAULT_GROUP_THEME);
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  function handleCreate() {
    if (!isValid || loading) {
      return;
    }
    onCreate({ name: name.trim(), theme });
    // Draft survives until the caller closes the sheet (error keeps input).
  }

  return (
    <Sheet visible={visible} onClose={handleCancel} title="Neue Gruppe anlegen">
      <View testID={`${TEST_ID}-dialog`} className="gap-4">
        <TextInput
          testID={`${TEST_ID}-name-input`}
          value={name}
          onChangeText={setName}
          placeholder="Gruppenname"
          placeholderTextColor={PLACEHOLDER_COLOR}
          className={`rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-3 py-2 text-text-primary`}
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
        <View testID={`${TEST_ID}-actions`} className="flex-row gap-3">
          <Button
            testID={`${TEST_ID}-cancel-button`}
            label="Abbrechen"
            icon="close"
            variant="secondary"
            className="flex-1"
            onPress={handleCancel}
          />
          <Button
            testID={`${TEST_ID}-confirm-button`}
            label="Anlegen"
            icon="add"
            className="flex-1"
            loading={loading}
            disabled={!isValid}
            onPress={handleCreate}
          />
        </View>
      </View>
    </Sheet>
  );
}
