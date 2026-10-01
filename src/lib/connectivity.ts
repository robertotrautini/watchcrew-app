import { onlineManager } from "@tanstack/react-query";
import Constants from "expo-constants";
import { AppState } from "react-native";

/**
 * React Native has no `window` online/offline events, so TanStack Query's
 * `onlineManager` would always report "online". Without adding a native
 * module (netinfo/expo-network are not dependencies), we probe the Supabase
 * host with a plain fetch: any HTTP response (even 401) means reachable; a
 * rejected/timed-out fetch means offline.
 */
type FetchLike = (url: string, init?: { method?: string; signal?: AbortSignal }) => Promise<unknown>;

export async function probeConnectivity(
  url: string,
  fetchImpl: FetchLike = fetch as FetchLike,
  timeoutMs = 4000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl(url, { method: "HEAD", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export interface ConnectivityMonitorOptions {
  url?: string;
  fetchImpl?: FetchLike;
  intervalMs?: number;
  timeoutMs?: number;
}

/** Starts probing (now, every interval, on app foreground). Returns a stop function. */
export function startConnectivityMonitor(options: ConnectivityMonitorOptions = {}): () => void {
  const url = options.url ?? `${Constants.expoConfig?.extra?.supabaseUrl}/auth/v1/health`;
  const intervalMs = options.intervalMs ?? 15000;
  let stopped = false;

  const check = async () => {
    const online = await probeConnectivity(url, options.fetchImpl, options.timeoutMs);
    if (!stopped) onlineManager.setOnline(online);
  };

  void check();
  const interval = setInterval(check, intervalMs);
  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") void check();
  });

  return () => {
    stopped = true;
    clearInterval(interval);
    appStateSub.remove();
  };
}
