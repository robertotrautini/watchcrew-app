import { Platform, View } from "react-native";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { Icon } from "@/components/ui/Icon";

export interface SwitchIndicatorProps {
  checked: boolean;
  /** Pressed state of the surrounding row: handle grows to 28dp + 40dp state layer (M3). */
  pressed?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** Light handle colour (text-primary token) and off-state grey (text-secondary token) for the native switch. */
const NATIVE_HANDLE_ON = "#e8e8e8";
const NATIVE_OUTLINE_OFF = "#a8a8a8";
const NATIVE_TRACK_OFF = "#0a0a0a";

/**
 * Real Material 3 Compose switch (`@expo/ui` Jetpack Compose, already part of the installed
 * dev-client), Android only. Non-interactive: the surrounding row owns the touch, so the host
 * sits under `pointerEvents="none"`. On-colour = group accent (hex from `useGroupTheme`).
 */
function NativeSwitch({ checked, disabled, testID }: SwitchIndicatorProps) {
  const { colors } = useGroupTheme();
  // Lazy require: the Compose module only exists on Android; jest/iOS/web never load it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Host, Switch } = require("@expo/ui/jetpack-compose") as typeof import("@expo/ui/jetpack-compose");
  return (
    <View testID={testID} pointerEvents="none">
      <Host matchContents>
        <Switch
          value={checked}
          enabled={!disabled}
          colors={{
            checkedTrackColor: colors.accent,
            checkedBorderColor: colors.accent,
            checkedThumbColor: NATIVE_HANDLE_ON,
            uncheckedTrackColor: NATIVE_TRACK_OFF,
            uncheckedBorderColor: NATIVE_OUTLINE_OFF,
            uncheckedThumbColor: NATIVE_OUTLINE_OFF,
          }}
        />
      </Host>
    </View>
  );
}

/**
 * Material 3 switch visual (non-interactive; the surrounding row is the
 * `accessibilityRole="switch"` Pressable). Android: native Compose switch; elsewhere the
 * M3-exact fallback: track 52x32, 2dp outline off, handle 16dp off / 24dp on / 28dp pressed
 * with a check icon when on, 40dp state layer, disabled = 38% opacity. On-colour = `accent`
 * token (group theme). See docs/style-guide.md "Switches".
 */
export function SwitchIndicator(props: SwitchIndicatorProps) {
  if (Platform.OS === "android") {
    return <NativeSwitch {...props} />;
  }
  return <FallbackSwitch {...props} />;
}

export function FallbackSwitch({ checked, pressed = false, disabled = false, testID }: SwitchIndicatorProps) {
  const { colors } = useGroupTheme();
  const handleSize = pressed ? "h-7 w-7" : checked ? "h-6 w-6" : "h-4 w-4";
  return (
    <View
      testID={testID}
      className={`h-8 w-[52px] justify-center rounded-full border-2 ${
        checked ? "border-accent bg-accent" : "border-text-secondary bg-bg-primary"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <View
        testID={testID ? `${testID}-state-layer` : undefined}
        className={`h-10 w-10 items-center justify-center rounded-full ${checked ? "-mr-1.5 self-end" : "-ml-1.5 self-start"} ${
          pressed ? "bg-white/10" : ""
        }`}
      >
        <View
          testID={testID ? `${testID}-thumb` : undefined}
          className={`items-center justify-center rounded-full ${handleSize} ${
            checked ? "bg-text-primary" : "bg-text-secondary"
          }`}
        >
          {checked ? <Icon testID={testID ? `${testID}-check` : undefined} name="check" size="S" color={colors.accent} /> : null}
        </View>
      </View>
    </View>
  );
}
