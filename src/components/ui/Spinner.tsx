import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";

import { useGroupTheme } from "@/components/GroupThemeProvider";

/**
 * The one loading spinner of the app: an `ActivityIndicator` that always uses
 * the group-theme accent colour (follows gold/red/... per group). Use it directly in
 * (buttons, inline areas); whole content areas use `LoadingArea` (spinner
 * centered with a min height; docs/style-guide.md "Laden").
 * Never use a raw `ActivityIndicator`. `color` is only overridden for
 * contrast on accent/danger filled buttons.
 */
export type SpinnerProps = ActivityIndicatorProps;

export function Spinner({ color, ...rest }: SpinnerProps) {
  const { colors } = useGroupTheme();
  // `color` is only overridden for contrast on filled surfaces (Button primary/danger).
  return <ActivityIndicator {...rest} color={color ?? colors.accent} />;
}
