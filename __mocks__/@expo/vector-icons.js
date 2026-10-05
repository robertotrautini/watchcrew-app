// Global Jest fake for @expo/vector-icons: icon components render as plain Views
// that forward all props (name/size/color/testID), so tests can assert on them.
// Tests that need the real glyph map (e.g. Icon.test.tsx) keep a local mock.
const React = require("react");
const { View } = require("react-native");

const MaterialIcons = (props) => React.createElement(View, props);

module.exports = { MaterialIcons };
