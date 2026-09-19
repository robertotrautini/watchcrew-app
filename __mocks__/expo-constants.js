// Manual Jest mock for `expo-constants`.
//
// `Constants.expoConfig` is normally populated by the native module / Expo
// dev server at runtime by embedding the resolved app config into the app
// manifest. That embedding step doesn't happen under plain Jest (there's no
// bundler/dev-server/native runtime in the test environment), so
// `Constants.expoConfig` would otherwise always be `null` in tests.
//
// To keep tests meaningful (i.e. actually fail if app.config.ts stops
// exporting the expected values), this mock resolves the *real*
// app.config.ts via `@expo/config` (the same config-resolution library the
// Expo CLI itself uses) rather than hardcoding a duplicate copy of the
// config here.
const { getConfig } = require("@expo/config");

const { exp } = getConfig(process.cwd(), { skipSDKVersionRequirement: true });

module.exports = {
  __esModule: true,
  default: {
    expoConfig: exp,
  },
};
