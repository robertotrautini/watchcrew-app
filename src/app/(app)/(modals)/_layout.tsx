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
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        // Dark header matching the black body (not the nav theme's grey),
        // gold Playfair title like the legacy headings; the screens do not
        // repeat the title in their body.
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerShadowVisible: false,
        headerTintColor: "#e8d5a3",
        headerTitleStyle: { fontFamily: "PlayfairDisplay_700Bold", color: "#e8d5a3" },
      }}
    >
      <Stack.Screen name="add-movie" options={{ title: "Film hinzufügen" }} />
      <Stack.Screen name="similar/[tmdbId]" options={{ title: "Ähnliche Filme" }} />
      <Stack.Screen name="settings" options={{ title: "Einstellungen" }} />
      <Stack.Screen name="settings/streaming-services" options={{ title: "Meine Streaming-Dienste" }} />
      <Stack.Screen name="settings/display" options={{ title: "Darstellung" }} />
      <Stack.Screen name="settings/notifications" options={{ title: "Benachrichtigungen" }} />
      <Stack.Screen name="settings/changelog" options={{ title: "Changelog" }} />
      <Stack.Screen name="settings/delete-account" options={{ title: "Konto löschen" }} />
      <Stack.Screen name="collection/[collectionId]" options={{ title: "Filmreihe" }} />
      <Stack.Screen name="filmography/director/[personId]" options={{ title: "Filmografie: Regisseur" }} />
      <Stack.Screen name="filmography/actor/[personId]" options={{ title: "Filmografie: Schauspieler:in" }} />
      <Stack.Screen name="filmography/studio/[companyId]" options={{ title: "Filmografie: Studio" }} />
    </Stack>
  );
}
