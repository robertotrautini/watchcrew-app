import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";

/**
 * Tab-bar item with the legacy gold top line over the active tab. The
 * navigator hands over its own pressable props (incl. the selected a11y
 * state); we only add the indicator line as an absolutely positioned child.
 * Props are loosely typed on purpose: React Navigation's button props are not
 * a direct subset of Pressable's.
 */
export function TabBarButton(props: ComponentProps<typeof Pressable> & { children?: React.ReactNode }) {
  const { children, style, ...rest } = props;
  const selected = Boolean(
    (rest.accessibilityState as { selected?: boolean } | undefined)?.selected,
  );
  return (
    <Pressable {...rest} style={style as never}>
      {selected ? (
        <View testID="tab-active-indicator" className="absolute left-3 right-3 top-0 h-0.5 rounded-full bg-accent" />
      ) : null}
      {children}
    </Pressable>
  );
}
