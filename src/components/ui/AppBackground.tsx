import { Image } from "expo-image";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";

import { useParallaxValues } from "@/components/parallaxContext";
import {
  backgroundLayout,
  parallaxTranslateX,
  tabPanFraction,
} from "@/lib/parallax";

/**
 * App-wide legacy backdrop: the ORIGINAL legacy photo (assets/images/
 * cinema-bg.jpg, 1920x1280 colour, kept untouched as the source) behind
 * everything, rendered ONCE in the root layout; screens have transparent
 * backgrounds. Legacy look (greyscale + dim = luminosity blend at 0.6 over
 * #0a0a0a) is PRE-COMPOSITED into assets/images/cinema-bg-baked.jpg
 * (scripts/generate-bg-assets.py, same resolution, sharp): no runtime
 * mixBlendMode / opacity layer (offscreen layer + blend on every frame).
 *
 * Framing: photo height = 100% of the screen height (no zoom, no vertical
 * overscan, no vertical parallax). Horizontal parallax only: first tab =
 * translateX = centre + travel/2, last = centre - travel/2 (BG_PARALLAX_TRAVEL_FRACTION
 * of the full travel, see parallax.ts), evenly interpolated, middle centred; the position follows the swipe live (tabProgress is
 * written by TabSwipeView / the route sync on the UI thread). Reduce-motion:
 * centred, static.
 *
 * Geometry uses explicit style objects instead of NativeWind className: in the
 * EAS release build className-only `absolute inset-0` / `h-full w-full`
 * collapsed the image to zero size, while the dev-client was fine.
 */
export function AppBackground() {
  const { width, height } = useWindowDimensions();
  const layout = backgroundLayout(width, height);
  const reduceMotion = useReducedMotion();
  const parallax = useParallaxValues();
  const fallbackProgress = useSharedValue(0);
  const fallbackCount = useSharedValue(1);
  const tabProgress = parallax?.tabProgress ?? fallbackProgress;
  const tabCount = parallax?.tabCount ?? fallbackCount;

  const animatedStyle = useAnimatedStyle(() => {
    const fraction = reduceMotion
      ? 0.5
      : tabPanFraction(tabProgress.value, tabCount.value);
    return {
      transform: [{ translateX: parallaxTranslateX(fraction, layout.slackX) }],
    };
  });

  return (
    <View
      testID="app-background"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      className="bg-bg-primary"
    >
      <Animated.View
        testID="app-background-parallax"
        style={[
          {
            position: "absolute",
            left: layout.left,
            top: layout.top,
            width: layout.boxWidth,
            height: layout.boxHeight,
          },
          animatedStyle,
        ]}
      >
        <Image
          testID="app-background-image"
          source={require("../../../assets/images/cinema-bg-baked.jpg")}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
      </Animated.View>
    </View>
  );
}
