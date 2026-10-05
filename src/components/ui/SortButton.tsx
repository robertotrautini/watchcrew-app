import { Pressable, Text } from "react-native";

import { BUTTON_ICON_COLORS } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export interface SortButtonProps {
  testID: string;
  /** Compact label shown on the button. */
  shortLabel: string;
  /** Full label for the accessibility label (the sort Sheet shows full labels too). */
  fullLabel: string;
  onPress: () => void;
}

/** Secondary-style sort button: sort icon, short value (one line, ellipsis), chevron. Fills the row (`flex-1`). */
export function SortButton({ testID, shortLabel, fullLabel, onPress }: SortButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Sortieren, aktuell: ${fullLabel}`}
      onPress={onPress}
      className="min-h-touch-comfortable flex-1 flex-row items-center gap-2 rounded-lg border border-glass-border bg-white/10 px-3 active:bg-white/20"
    >
      <Icon name="sort" size="M" color={BUTTON_ICON_COLORS.secondary} />
      <Text numberOfLines={1} className="flex-1 text-base font-medium text-text-primary">
        {shortLabel}
      </Text>
      <Icon name="chevronDown" size="M" color={BUTTON_ICON_COLORS.secondary} />
    </Pressable>
  );
}
