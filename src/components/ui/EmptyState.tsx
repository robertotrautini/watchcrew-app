import { Icon, type IconRole } from "@/components/ui/Icon";
import { Text, View } from "react-native";

import { cn } from "@/lib/utils";

const ICON_COLOR = "#888888";

export interface EmptyStateProps {
  /** Muted main text, e.g. "Keine Filme gefunden". */
  title: string;
  /** Optional second line. */
  hint?: string;
  icon?: IconRole;
  testID?: string;
  className?: string;
}

/** Legacy empty state: clapperboard-style icon in a glass circle + muted text. */
export function EmptyState({
  title,
  hint,
  icon = "film",
  testID,
  className,
}: EmptyStateProps) {
  return (
    <View
      testID={testID}
      className={cn("items-center gap-3 px-6 py-10", className)}
    >
      <View className="h-20 w-20 items-center justify-center rounded-full bg-card border border-glass-border">
        <Icon name={icon} size="L" color={ICON_COLOR} />
      </View>
      <Text className="text-center text-base text-text-secondary">{title}</Text>
      {hint ? (
        <Text className="text-center text-sm text-text-dim">{hint}</Text>
      ) : null}
    </View>
  );
}
