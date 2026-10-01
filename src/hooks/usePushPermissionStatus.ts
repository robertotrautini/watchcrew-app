import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

export type PushPermissionStatus = "unknown" | "granted" | "denied" | "undetermined";

/**
 * Current OS notification permission (does NOT prompt). Re-checked whenever
 * the app returns to the foreground, so the hint disappears right after the
 * user enabled notifications in the system settings.
 */
export function usePushPermissionStatus(): PushPermissionStatus {
  const [status, setStatus] = useState<PushPermissionStatus>("unknown");

  const refresh = useCallback(async () => {
    try {
      const { status: osStatus } = await Notifications.getPermissionsAsync();
      setStatus(osStatus as PushPermissionStatus);
    } catch (err) {
      console.warn("usePushPermissionStatus: permission lookup failed", err);
      setStatus("unknown");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  return status;
}
