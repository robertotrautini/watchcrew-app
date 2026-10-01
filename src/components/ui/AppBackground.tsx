import { Image } from "expo-image";
import { View } from "react-native";

/**
 * App-wide legacy backdrop: the cinema projector photo (assets/images/
 * cinema-bg.jpg, pre-grayscaled and pre-dimmed to ~40% so no overlay layer
 * is needed, matching the legacy luminosity/.25 look) behind everything.
 * Rendered ONCE in the root layout; screens have transparent backgrounds.
 * Not touch-interactive and static, so it costs nothing during scrolling.
 */
export function AppBackground() {
  return (
    <View testID="app-background" pointerEvents="none" className="absolute inset-0 bg-bg-primary">
      <Image
        source={require("../../../assets/images/cinema-bg.jpg")}
        contentFit="cover"
        className="h-full w-full"
        accessible={false}
      />
    </View>
  );
}
