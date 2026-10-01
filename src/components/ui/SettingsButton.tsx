import { Ionicons } from "@expo/vector-icons";
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
 * is hidden ("Tracker aktiv" off). Round icon button, like the legacy header.
 */
export function SettingsButton({ testID }: SettingsButtonProps) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="secondary"
      className="h-10 min-h-0 w-10 rounded-full px-0"
      testID={testID}
      accessibilityLabel="Einstellungen"
      onPress={() => router.push("/settings")}
    >
      <Ionicons name="settings-outline" size={20} color={GEAR_COLOR} />
    </Button>
  );
}
