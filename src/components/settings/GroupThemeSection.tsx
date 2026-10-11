import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import {
  GROUP_THEME_LABELS,
  GROUP_THEME_OPTIONS,
  resolveGroupTheme,
  type GroupThemeName,
} from "@/lib/groupTheme";

interface GroupThemeSectionProps {
  selected: GroupThemeName;
  /** Accent colour of the currently selected theme (for the checkmark badge). */
  selectedAccent: string;
  pending: boolean;
  error: Error | null;
  onSelect: (theme: GroupThemeName) => void;
}

/** Owner-only colour theme swatches. */
export function GroupThemeSection({
  selected,
  selectedAccent,
  pending,
  error,
  onSelect,
}: GroupThemeSectionProps) {
  return (
    <View className="gap-2" testID="group-settings-theme-section">
      <Text className="font-title text-lg text-accent-light">Farbthema</Text>
      <View className="flex-row flex-wrap gap-3">
        {GROUP_THEME_OPTIONS.map((themeName) => {
          const { colors } = resolveGroupTheme(themeName);
          const isSelected = selected === themeName;

          return (
            <Pressable
              key={themeName}
              testID={`group-settings-theme-swatch-${themeName}`}
              accessibilityRole="button"
              accessibilityLabel={GROUP_THEME_LABELS[themeName]}
              accessibilityState={{ selected: isSelected, disabled: pending }}
              disabled={pending}
              onPress={() => onSelect(themeName)}
              className="h-touch-comfortable w-touch-comfortable items-center justify-center"
            >
              <Icon name="swatch" size="L" color={colors.accent} />
              {isSelected ? (
                <Icon
                  testID={`group-settings-theme-selected-${themeName}`}
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
      {error ? (
        <Text testID="group-settings-theme-error" className="text-sm text-danger">
          Farbthema konnte nicht geändert werden: {(error as { message?: string })?.message}
        </Text>
      ) : null}
    </View>
  );
}
