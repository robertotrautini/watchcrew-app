import type { ExpoConfig } from "expo/config";

// Non-secret config only — see docs/adr/0009-config-and-secrets.md.
// Real secrets live in Supabase Edge Function Secrets / GitHub Actions
// Secrets / EAS Secrets, never here and never in a .env file.
const config: ExpoConfig = {
  name: "WatchCrew",
  slug: "watchcrew",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "watchcrew",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: "com.watchcrew.app",
  },
  android: {
    package: "com.watchcrew.app",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl: "https://vketnadfeyovguikpaao.supabase.co",
    supabasePublishableKey: "sb_publishable_KFJgGHttxOlTEGMXrV6aYw_C8CdlO39",
    sentryDsn:
      "https://81fe18bbee281b14d29e1a416e7df5e2@o4512112781557760.ingest.de.sentry.io/4512112790995024",
  },
};

export default config;
