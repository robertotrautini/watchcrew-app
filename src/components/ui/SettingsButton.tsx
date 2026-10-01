import { useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";

export interface SettingsButtonProps {
  testID: string;
}

/**
 * The settings gear shared by all three tab screens (Tracker, Watchlist,
 * Tagebuch): the Settings hub must stay reachable even when the Tracker tab
 * is hidden ("Tracker aktiv" off).
 */
export function SettingsButton({ testID }: SettingsButtonProps) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="secondary"
      label="⚙️"
      testID={testID}
      accessibilityLabel="Einstellungen"
      onPress={() => router.push("/settings")}
    />
  );
}
