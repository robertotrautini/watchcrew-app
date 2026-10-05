import { type ReactNode } from "react";
import { Platform, View } from "react-native";

import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

/**
 * Screen wrapper that shrinks its content by the on-screen keyboard height on
 * Android, where (edge-to-edge) the window is not resized by the keyboard. The
 * ScrollView inside then ends at the keyboard top, so Android's native
 * "scroll the focused input into view" works and the input stays visible.
 * iOS: no-op (ScrollViews there use the system inset handling).
 *
 * `paddingBottom` is keyboard-dependent, i.e. a legitimately dynamic value
 * that cannot be a static NativeWind class.
 */
export function KeyboardInsetView({
  children,
  testID,
  className = "",
}: {
  children: ReactNode;
  testID?: string;
  className?: string;
}) {
  const keyboardHeight = useKeyboardHeight();
  const paddingBottom = Platform.OS === "android" ? keyboardHeight : 0;
  return (
    <View testID={testID} className={`flex-1 ${className}`} style={{ paddingBottom }}>
      {children}
    </View>
  );
}
