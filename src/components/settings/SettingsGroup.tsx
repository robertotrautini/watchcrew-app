import { Children, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";


export interface SettingsGroupProps {
  /** Small gold serif section heading (legacy settings look). */
  title?: string;
  testID?: string;
  /** Rows (ListRow). Falsy children are dropped. */
  children: ReactNode;
}

/**
 * One settings section: a heading and a stack of `ListRow`s (each row has its own
 * border/fill and CONTROL_HEIGHT; uniform `gap-2` between them).
 */
export function SettingsGroup({ title, testID, children }: SettingsGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View testID={testID} className="gap-2">
      {title ? <Text className="px-1 font-title text-base text-accent-light">{title}</Text> : null}
      {items.map((item, index) => (
        <View key={item.key ?? index} testID={testID ? `${testID}-item-${index}` : undefined}>
          {item}
        </View>
      ))}
    </View>
  );
}
