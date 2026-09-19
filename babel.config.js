// NativeWind (see docs/adr/0007-client-tech-stack.md) needs the
// `jsxImportSource: "nativewind"` override on babel-preset-expo plus its own
// babel preset, per NativeWind's official Expo setup guide.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
