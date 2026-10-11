import { Children, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import { GroupedRowsContext } from "@/components/ui/ListRow";
import { SURFACE_TILE_CLASSNAME } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";


export interface SettingsGroupProps {
  /** Small gold serif section heading (legacy settings look). */
  title?: string;
  testID?: string;
  /** Rows (ListRow). Falsy children are dropped. */
  children: ReactNode;
  /** true (default): rows share ONE card with dividers; false: loose children stacked with gap-2 (e.g. a single Select). */
  grouped?: boolean;
}

/**
 * One settings section: a heading and ONE card (`field` fill, rounded, border, overflow hidden)
 * holding the `ListRow`s with thin dividers between them (last row without). Rows learn about
 * the card via `GroupedRowsContext`. Wrapper testID `<testID>-card`.
 */
export function SettingsGroup({ title, testID, children, grouped = true }: SettingsGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);
  const rows = items.map((item, index) => {
    const row = (
      <View key={item.key ?? index} testID={testID ? `${testID}-item-${index}` : undefined}>
        {item}
      </View>
    );
    return grouped ? (
      <GroupedRowsContext.Provider key={item.key ?? index} value={{ isLast: index === items.length - 1 }}>
        {row}
      </GroupedRowsContext.Provider>
    ) : (
      row
    );
  });
  return (
    <View testID={testID} className="gap-2">
      {title ? <Text className="px-1 font-title text-base text-accent-light">{title}</Text> : null}
      {grouped ? (
        <View testID={testID ? `${testID}-card` : undefined} className={`${SURFACE_TILE_CLASSNAME} overflow-hidden`}>
          {rows}
        </View>
      ) : (
        <View className="gap-2">{rows}</View>
      )}
    </View>
  );
}
