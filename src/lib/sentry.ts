import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

// Sentry is used ONLY for crash reporting here — see docs/adr (no performance
// tracing, no session replay, no logs integration, no PII flags). Keep
// Sentry.init() minimal: pass only `dsn`.
export function initSentry(): void {
  const dsn = Constants.expoConfig?.extra?.sentryDsn;

  if (typeof dsn !== "string" || dsn.length === 0) {
    console.warn("initSentry: sentryDsn is missing, skipping Sentry.init()");
    return;
  }

  Sentry.init({ dsn });
}
