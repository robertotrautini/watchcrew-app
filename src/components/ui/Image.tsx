import { Image as ExpoImage } from "expo-image";
import { cssInterop } from "nativewind";

/**
 * expo-image's `Image` registered with NativeWind so `className` maps to
 * `style`. Without this registration NativeWind silently drops `className` on
 * expo-image (only react-native core components are auto-wrapped), which made
 * every poster render at 0 size. Use this instead of importing from
 * "expo-image" directly whenever a `className` is passed.
 */
cssInterop(ExpoImage, { className: "style" });

export const Image = ExpoImage;
