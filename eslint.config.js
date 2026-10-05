// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Jest tests use jest.mock() + require() after mocks and import order tricks.
    files: ["__tests__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/first": "off",
    },
  },
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*", "supabase/functions/*"],
  },
]);
