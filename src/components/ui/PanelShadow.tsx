import { View } from "react-native";

import {
  PANEL_RADIUS,
  PANEL_RADIUS_CLASSNAME,
  panelShadowOpacities,
} from "@/components/ui/Glass";

const OPACITIES = panelShadowOpacities();

/**
 * Soft shadow that follows the panel shape: stacked black views with the same
 * width and corner radius as the panel, each 1dp further down with falling
 * opacity (pure JS, no native module / elevation). Render it as the FIRST child
 * of the (non-clipping) panel wrapper so it sits behind the opaque panel; only
 * the parts below / around the lower corners are visible. Never takes touches.
 */
export function PanelShadow({
  testID,
  radius = PANEL_RADIUS,
}: {
  testID?: string;
  radius?: number;
}) {
  return (
    <View
      testID={testID}
      pointerEvents="none"
      className="absolute inset-0"
    >
      {OPACITIES.map((opacity, i) => (
        <View
          key={i}
          testID={testID ? `${testID}-layer-${i}` : undefined}
          className={`absolute inset-0 bg-black ${
            radius === PANEL_RADIUS ? PANEL_RADIUS_CLASSNAME : ""
          }`}
          style={{
            opacity,
            transform: [{ translateY: i + 1 }],
            ...(radius === PANEL_RADIUS ? null : { borderRadius: radius }),
          }}
        />
      ))}
    </View>
  );
}
