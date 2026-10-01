import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const OFFLINE_BANNER_TEXT = "Offline – gespeicherte Daten werden angezeigt";

function subscribe(onChange: () => void) {
  return onlineManager.subscribe(onChange);
}

/** Slim top banner, rendered only while `onlineManager` reports offline. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => onlineManager.isOnline());
  if (online) return null;
  return (
    <SafeAreaView edges={["top"]} className="bg-danger px-4 pb-1" testID="offline-banner">
      <Text className="text-center text-xs text-text-primary">{OFFLINE_BANNER_TEXT}</Text>
    </SafeAreaView>
  );
}
