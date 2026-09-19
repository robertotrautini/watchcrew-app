// Jest has no CSS parser, so real stylesheet imports (e.g. the `import
// '@/global.css'` side-effect import in src/constants/theme.ts, now that
// NativeWind gives global.css real Tailwind directives + theme rules) need
// to resolve to something under Jest instead of being parsed as JS. See the
// `moduleNameMapper` entry for `\.css$` in package.json's jest config.
module.exports = {};
