import { Icon } from "@/components/ui/Icon";
import { useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";

export interface SettingsButtonProps {
  testID: string;
}

/** Legacy gear colour (--text-secondary). */
const GEAR_COLOR = "#888888";

/**
 * The settings gear shared by all three tab screens (Tracker, Watchlist,
 * Tagebuch): the Settings hub must stay reachable even when the Tracker tab
 * is hidden ("Tracker aktiv" off). Round icon button, like the legacy header. Plain Pressable with fixed equal
 * width/height: the shared Button's `min-h-touch-min` is not merged away by
 * twMerge (custom token), which stretched the gear into an oval.
 */
export function SettingsButton({ testID }: SettingsButtonProps) {
  const router = useRouter();
  return (
    <Button
      testID={testID}
      variant="secondary"
      size="sm"
      iconOnly
      accessibilityLabel="Einstellungen"
      onPress={() => router.push("/settings")}
      className="self-start"
    >
      <Icon name="settings" size="M" color={GEAR_COLOR} />
    </Button>
  );
}
