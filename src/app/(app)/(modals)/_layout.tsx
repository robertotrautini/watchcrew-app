import { Stack } from "expo-router";

/**
 * M6 part 2b: modal-stacked route group for the movie sub-view screens
 * (collection/filmography/similar-movies). Sibling of `(tabs)` inside the
 * outer `(app)` Stack (see src/app/(app)/_layout.tsx), presented as a modal
 * so each sub-view screen gets its own native header/back button while the
 * tab bar's own stack stays untouched (fully resets on tab switch, per the
 * M3 nav shell). Individual screens can override `headerShown`/title via
 * their own `<Stack.Screen options={{...}}>` export.
 */
export default function ModalsLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
