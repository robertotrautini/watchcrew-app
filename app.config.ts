import type { ExpoConfig } from "expo/config";

// Non-secret config only — see docs/adr/0009-config-and-secrets.md.
// Real secrets live in Supabase Edge Function Secrets / GitHub Actions
// Secrets / EAS Secrets, never here and never in a .env file.
const config: ExpoConfig = {
  name: "WatchCrew",
  slug: "watchcrew",
  // EAS account that owns this project (set during `eas init` — EAS
  // requires this on a dynamic app.config.ts since it can't write it in
  // automatically). See docs/interim-decisions.md.
  owner: "rt-software-service",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "watchcrew",
  userInterfaceStyle: "automatic",
  // Deep-linking today is via the `scheme: "watchcrew"` above (Expo Router's
  // file-based routes handle `watchcrew://...` links automatically — no
  // extra config needed for that part). "Universal Links" (opening
  // `https://watch-crew.app/...` URLs directly in the app instead of just
  // the custom scheme) is EXPLICITLY DEFERRED to M11 ("Apple/Google-Dev-
  // Accounts einrichten") per the roadmap, not skipped/forgotten — it needs
  // real Apple/Google Developer accounts and hosting an
  // apple-app-site-association / assetlinks.json file on that actual
  // domain, none of which exist yet. When that's ready, the additional
  // plumbing goes here:
  //   ios.associatedDomains: ["applinks:watch-crew.app"]
  //     (see https://docs.expo.dev/linking/ios-universal-links/)
  //   android.intentFilters: [{ action: "VIEW", autoVerify: true,
  //     data: [{ scheme: "https", host: "watch-crew.app" }],
  //     category: ["BROWSABLE", "DEFAULT"] }]
  //     (see https://docs.expo.dev/linking/android-app-links/)
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
    // M7 consolidation: real native date-picker for the Rating-Dialog's
    // "Gesehen am"/payment-date fields and the Add-Movie-Modal's manual-
    // release-date field — see docs/interim-decisions.md.
    "@react-native-community/datetimepicker",
    // M10: expo-notifications' config plugin (Android notification-icon/
    // color/channel setup, iOS entitlements). No custom icon/color/sound
    // options passed -- no dedicated notification-icon asset exists yet;
    // this is the library's own plain default, a cheap/reversible detail
    // logged in docs/interim-decisions.md, not a design decision made here.
    "expo-notifications",
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
    // M11 part 2 (Job 3) — plumbing only, per ADR 0011: the real content
    // comes from an iubenda-generated embed once that account is set up
    // (NOT this task's job to write). These are placeholder URLs, not real
    // pages yet — src/lib/legalLinks.ts's `isPlaceholderLegalUrl` MUST keep
    // recognizing these exact strings so the Settings hub/Register screen
    // show a "Wird bald ergänzt" message instead of opening a broken link.
    // Replace both with the real iubenda embed URLs once that account
    // exists.
    privacyPolicyUrl: "https://watch-crew.app/privacy",
    termsOfServiceUrl: "https://watch-crew.app/terms",
    // EAS project link (created via `eas init` during the EAS Cloud Build
    // setup) — required so `eas build` knows which EAS project to upload
    // to, and so `Notifications.getExpoPushTokenAsync()` (M10) can resolve
    // its projectId automatically instead of falling back to the
    // warn-and-skip path documented in docs/interim-decisions.md (M10 —
    // "Push-Registrierung: kein EAS-Projekt konfiguriert").
    eas: {
      projectId: "5fa29efd-5cbe-4283-975c-9108f61720bf",
    },
  },
};

export default config;
