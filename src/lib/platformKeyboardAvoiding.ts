/**
 * M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
 * Keyboard-Avoiding"): the "which `behavior` value to pass to
 * `KeyboardAvoidingView`" decision extracted into small, pure,
 * `Platform.OS`-string-parameterized functions -- exactly the kind of
 * "platform-detection branch" this task's own rules call out as real,
 * testable logic (unlike the animation timing/easing values elsewhere in
 * this task, which aren't meaningfully unit-testable). Callers pass
 * `Platform.OS` in explicitly rather than these functions reading it
 * themselves, purely so a test can exercise both branches deterministically
 * without needing to mock `react-native`'s `Platform` module.
 */
export type KeyboardAvoidingBehavior = "padding" | "height" | undefined;

/**
 * For a plain, in-Activity screen (i.e. NOT rendered inside an RN `Modal`):
 * iOS has no automatic keyboard-resize behavior, so an explicit `"padding"`
 * is needed. Android already gets this via its own Activity-level
 * `windowSoftInputMode: "adjustResize"` default, so `undefined` here
 * deliberately leaves Android's own default behavior untouched.
 */
export function screenKeyboardAvoidingBehavior(platformOS: string): KeyboardAvoidingBehavior {
  return platformOS === "ios" ? "padding" : undefined;
}

/**
 * For content rendered inside an RN `Modal` (its own separate native
 * window -- a Dialog on Android, a UIWindow on iOS): unlike a plain screen,
 * Android's Activity-level `adjustResize` does NOT apply to a `Modal`'s own
 * window, so `"height"` is used there too instead of leaving it
 * `undefined`. See `src/components/ui/Sheet.tsx`, the sole caller.
 */
export function modalKeyboardAvoidingBehavior(platformOS: string): KeyboardAvoidingBehavior {
  return platformOS === "ios" ? "padding" : "height";
}
