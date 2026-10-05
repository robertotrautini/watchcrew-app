import { createRef, type ComponentType, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Real blur for glass surfaces via `expo-blur` (native module).
 *
 * The module is required guarded: a dev client built before expo-blur was
 * added has no ExpoBlur native module and importing it throws at load time.
 * In that case (and when `enabled={false}`) the surface falls back to the
 * tinted translucent fill (`fallbackClassName`), i.e. the pre-blur look.
 *
 * Android: expo-blur only blurs the content of a `BlurTargetView` (shared
 * ref `glassBlurTargetRef`, wrapped around the app background in the root
 * layout via `GlassBlurTarget`). The photo background is therefore blurred;
 * list content scrolling between bar and photo is not. A BlurView inside an
 * RN `Modal` (separate Android window) is not supported -> Sheet does not use it.
 */
let BlurViewImpl: ComponentType<any> | null = null;
let BlurTargetImpl: ComponentType<any> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("expo-blur");
  BlurViewImpl = mod.BlurView ?? null;
  BlurTargetImpl = mod.BlurTargetView ?? null;
} catch {
  BlurViewImpl = null;
  BlurTargetImpl = null;
}

export function isBlurAvailable(): boolean {
  return BlurViewImpl != null;
}

/** Ref to the Android blur target (the app background); read by every BlurView. */
export const glassBlurTargetRef = createRef<View>();

/** Wraps the content that glass surfaces should blur (the app background). */
export function GlassBlurTarget({ children, ...rest }: ViewProps & { children?: ReactNode }) {
  if (BlurTargetImpl != null && Platform.OS === "android") {
    const Target = BlurTargetImpl;
    return (
      <Target ref={glassBlurTargetRef} style={StyleSheet.absoluteFill} {...rest}>
        {children}
      </Target>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill} {...rest}>
      {children}
    </View>
  );
}

/**
 * Android blur radius = intensity / blurReductionFactor (4), capped by the
 * native lib at 25px. The old default of 30 gave ~7px, too weak to hide the
 * sharp full-resolution background photo; 100 gives the maximum 25px.
 */
export const GLASS_BLUR_INTENSITY = 100;

export interface GlassBlurProps extends ViewProps {
  /** Fill used when blur is unavailable (more opaque, legible without blur). */
  fallbackClassName?: string;
  /** Tint drawn over the blur (translucent, lets the blur show). */
  blurClassName?: string;
  intensity?: number;
  tint?: string;
  /** When set the surface is a Pressable. */
  onPress?: (event: GestureResponderEvent) => void;
  /** Set false to force the fallback (e.g. unsupported contexts). */
  enabled?: boolean;
}

export function GlassBlur({
  className,
  fallbackClassName,
  blurClassName,
  intensity = GLASS_BLUR_INTENSITY,
  tint = "dark",
  enabled = true,
  children,
  onPress,
  ...rest
}: GlassBlurProps) {
  const Root = (onPress ? Pressable : View) as typeof View;
  const rootProps = onPress ? { onPress, ...rest } : rest;
  const BlurView = enabled ? BlurViewImpl : null;
  if (BlurView == null) {
    return (
      <Root className={cn(className, fallbackClassName)} {...rootProps}>
        {children}
      </Root>
    );
  }
  return (
    <Root className={cn("overflow-hidden", className)} {...rootProps}>
      <BlurView
        testID="glass-blur-view"
        pointerEvents="none"
        tint={tint}
        intensity={intensity}
        blurMethod="dimezisBlurView"
        blurTarget={glassBlurTargetRef}
        style={StyleSheet.absoluteFill}
      />
      <View
        testID="glass-blur-tint"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className={blurClassName}
      />
      {children}
    </Root>
  );
}
