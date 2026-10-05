// Jest mock for `expo-blur` (native module, not available under Jest).
const React = require("react");
const { View } = require("react-native");

function BlurView(props) {
  return React.createElement(View, { testID: "expo-blur-view", ...props });
}
function BlurTargetView(props) {
  return React.createElement(View, { testID: "expo-blur-target", ...props });
}

module.exports = { BlurView, BlurTargetView };
