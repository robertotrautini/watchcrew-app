import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const DURATION = 600;
/** Glyph size in dp; equals `imageWidth` of the native splash (app.config.ts) so both line up. */
export const SPLASH_GLYPH_SIZE = 288;

/**
 * In-app start screen: black with a subtle diagonal grey gradient (assets/
 * images/splash-bg.png, from scripts/generate-brand-assets.py) and the brand
 * glyph centered. Mounted until the native splash is hidden, then fades out.
 *
 * Geometry uses explicit style objects, not className (release-build quirk,
 * see docs/style-guide.md "Brand-Assets").
 */
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const fadeOut = new Keyframe({
    0: { opacity: 1 },
    20: { opacity: 1 },
    100: { opacity: 0 },
  });

  const content = (
    <>
      <Image
        testID="splash-gradient"
        style={StyleSheet.absoluteFill}
        source={require("../../assets/images/splash-bg.png")}
        contentFit="cover"
      />
      <Image
        testID="splash-icon"
        style={styles.glyph}
        source={require("../../assets/images/splash-icon.png")}
        contentFit="contain"
      />
    </>
  );

  return animate ? (
    <Animated.View
      testID="splash-overlay"
      entering={fadeOut.duration(DURATION).withCallback((finished) => {
        "worklet";
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}
    >
      {content}
    </Animated.View>
  ) : (
    <View
      testID="splash-overlay"
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: {
    width: SPLASH_GLYPH_SIZE,
    height: SPLASH_GLYPH_SIZE,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});
