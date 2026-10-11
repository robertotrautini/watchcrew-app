import { View } from "react-native";

import { Spinner } from "@/components/ui/Spinner";

/**
 * Loading state of a content area (docs/style-guide.md "Laden"): the accent
 * `Spinner` centered in the area, with a minimum height so nothing jumps when
 * the content arrives. Replaces the former skeleton placeholders.
 * The spinner itself has testID `${testID}-spinner`.
 */
export interface LoadingAreaProps {
  testID?: string;
  /** Replaces the default sizing (`min-h-48 w-full flex-1`). */
  className?: string;
  size?: "small" | "large";
}

const DEFAULT_CLASSNAME = "min-h-48 w-full flex-1";

export function LoadingArea({
  testID,
  className = DEFAULT_CLASSNAME,
  size = "large",
}: LoadingAreaProps) {
  return (
    <View
      testID={testID}
      accessibilityLabel="Lädt"
      className={`items-center justify-center ${className}`}
    >
      <Spinner testID={testID ? `${testID}-spinner` : undefined} size={size} />
    </View>
  );
}
