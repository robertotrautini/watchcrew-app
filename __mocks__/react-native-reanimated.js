// Jest mock for `react-native-reanimated` (its worklets runtime is native-only
// and cannot load under Jest). Minimal surface used by the parallax background.
const { View } = require("react-native");

const useSharedValue = (initial) => ({ value: initial });
const useDerivedValue = (fn) => ({ value: fn() });
const useAnimatedStyle = (fn) => fn();
const withTiming = (value) => value;
const Easing = { bezier: () => (t) => t };
const useReducedMotion = () => false;
const Animated = { View, createAnimatedComponent: (c) => c };

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
};
