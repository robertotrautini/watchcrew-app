import { Children, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export interface SettingsGroupProps {
  /** Small gold serif section heading (legacy settings look). */
  title?: string;
  testID?: string;
  /** Rows. Falsy children are dropped; a hairline separates only neighbouring items. */
  children: ReactNode;
}

/**
 * One surface card per settings section: rows are separated by hairlines
 * (`border-t` on every item except the first, so there is never a separator
 * after the last row) instead of one bordered box per row.
 */
export function SettingsGroup({ title, testID, children }: SettingsGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View testID={testID} className="gap-2">
      {title ? <Text className="px-1 font-title text-base text-accent-light">{title}</Text> : null}
      <Surface>
        {items.map((item, index) => (
          <View
            key={item.key ?? index}
            testID={testID ? `${testID}-item-${index}` : undefined}
            className={cn(index > 0 && "border-t border-surface-border")}
          >
            {item}
          </View>
        ))}
      </Surface>
    </View>
  );
}
