import { Stack } from "expo-router";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { modalScreenLayout } from "@/components/modalScreenLayout";

/**
 * M6 part 2b: modal-stacked route group for the movie sub-view screens
 * (collection/filmography/similar-movies). Sibling of `(tabs)` inside the
 * outer `(app)` Stack (see src/app/(app)/_layout.tsx), presented as a modal
 * so each sub-view screen gets its own native header/back button while the
 * tab bar's own stack stays untouched (fully resets on tab switch, per the
 * M3 nav shell). Individual screens can override `headerShown`/title via
 * their own `<Stack.Screen options={{...}}>` export.
 */
/**
 * Every modal route gets a dimmed blurred glass backdrop instead of the busy
 * projector photo (see ScreenBackdrop + docs/style-guide.md): detail-style
 * routes "calm", settings routes "dim". Only the three tabs show the undimmed
 * photo. (expo-router drops a per-`Stack.Screen` `layout` prop, so this uses
 * the navigator-level `screenLayout` and picks the level by route name.)
 */

export default function ModalsLayout() {
  // Header tint (back arrow) + title follow the active group theme (accent-light).
  const { colors } = useGroupTheme();
  return (
    <Stack
      screenLayout={modalScreenLayout}
      screenOptions={{
        headerShown: true,
        // Back navigation: swipe pops one level (iOS: whole screen, Android:
        // system edge gesture + BackSwipeView), see docs/style-guide.md "Navigation".
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        // Dark header matching the black body (not the nav theme's grey),
        // accent-light Playfair title like the legacy headings; the screens do not
        // repeat the title in their body.
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerShadowVisible: false,
        headerTintColor: colors.accentLight,
        headerTitleStyle: {
          fontFamily: "PlayfairDisplay_700Bold",
          color: colors.accentLight,
        },
      }}
    >
      <Stack.Screen name="add-movie" options={{ title: "Film hinzufügen" }} />
      <Stack.Screen
        name="similar/[tmdbId]"
        options={{ title: "Ähnliche Filme" }}
      />
      <Stack.Screen name="movie/[tmdbId]" />
      <Stack.Screen name="settings" options={{ title: "Einstellungen" }} />
      <Stack.Screen
        name="settings/streaming-services"
        options={{ title: "Meine Streaming-Dienste" }}
      />
      <Stack.Screen
        name="settings/display"
        options={{ title: "Darstellung" }}
      />
      <Stack.Screen
        name="settings/notifications"
        options={{ title: "Benachrichtigungen" }}
      />
      <Stack.Screen
        name="settings/delete-account"
        options={{ title: "Konto löschen" }}
      />
      <Stack.Screen name="group-settings" />
      <Stack.Screen
        name="collection/[collectionId]"
        options={{ title: "Filmreihe" }}
      />
      <Stack.Screen
        name="filmography/director/[personId]"
        options={{ title: "Filmografie: Regisseur" }}
      />
      <Stack.Screen
        name="filmography/actor/[personId]"
        options={{ title: "Filmografie: Schauspieler:in" }}
      />
      <Stack.Screen
        name="filmography/studio/[companyId]"
        options={{ title: "Filmografie: Studio" }}
      />
    </Stack>
  );
}
