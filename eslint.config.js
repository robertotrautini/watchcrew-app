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
    // Node CLI scripts (CommonJS, plain Node globals) and their tests/fixtures.
    files: ["scripts/**", "__tests__/scripts/**", "__tests__/helpers/legacyDumpFixture.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly", module: "writable", exports: "writable", process: "readonly",
        console: "readonly", Buffer: "readonly", __dirname: "readonly", __filename: "readonly",
        describe: "readonly", it: "readonly", expect: "readonly", jest: "readonly", beforeEach: "readonly", afterEach: "readonly", beforeAll: "readonly", afterAll: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", URL: "readonly", fetch: "readonly",
      },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Maestro GraalJS subflow scripts: globals (http, NAME) are injected by Maestro.
    files: [".maestro/**/*.js"],
    languageOptions: {
      globals: { http: "readonly", NAME: "readonly" },
    },
    rules: { "no-var": "off" },
  },
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*", "supabase/functions/*"],
  },
]);
