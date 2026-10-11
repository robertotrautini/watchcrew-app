import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { Icon, type IconRole } from "@/components/ui/Icon";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

export interface EmptyStateProps {
  /** Short muted text, e.g. "Keine Filme gefunden". */
  title: string;
  icon?: IconRole;
  testID?: string;
}

/** The ONLY empty state: one large muted icon + ONE short text, centered both ways in the free space. */
export function EmptyState({ title, icon = "film", testID }: EmptyStateProps) {
  return (
    <View testID={testID} className="min-h-40 flex-1 items-center justify-center gap-3 px-6">
      <Icon name={icon} size="L" color={PLACEHOLDER_COLOR} />
      <Text className="text-center text-base text-text-secondary">{title}</Text>
    </View>
  );
}
