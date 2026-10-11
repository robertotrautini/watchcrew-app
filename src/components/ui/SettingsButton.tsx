import { IconButton } from "@/components/ui/IconButton";
import { useRouter } from "expo-router";

export interface SettingsButtonProps {
  testID: string;
}

/**
 * The settings gear shared by all three tab screens (Tracker, Watchlist,
 * Tagebuch): the Settings hub must stay reachable even when the Tracker tab
 * is hidden ("Tracker aktiv" off). Round `IconButton` (48dp), like the legacy header.
 */
export function SettingsButton({ testID }: SettingsButtonProps) {
  const router = useRouter();
  return (
    <IconButton
      testID={testID}
      icon="settings"
      accessibilityLabel="Einstellungen"
      onPress={() => router.push("/settings")}
      className="self-start"
    />
  );
}
