// Jest mock for `react-native-reanimated` (its worklets runtime is native-only
// and cannot load under Jest). Minimal surface used by the parallax background.
const { View } = require("react-native");

const useSharedValue = (initial) => ({
  value: initial,
  get() {
    return this.value;
  },
  set(next) {
    this.value = typeof next === "function" ? next(this.value) : next;
  },
});
const useDerivedValue = (fn) => ({ value: fn() });
const useAnimatedStyle = (fn) => fn();
const withTiming = (value) => value;
const withRepeat = (value) => value;
const withSequence = (...values) => values[values.length - 1];
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
  withRepeat,
  withSequence,
  Easing,
  useReducedMotion,
};
