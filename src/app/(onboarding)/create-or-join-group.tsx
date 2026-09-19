import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_GROUP_THEME, resolveGroupTheme, type GroupThemeName } from "@/lib/groupTheme";

/**
 * The real "create or join a Watch-Group" onboarding screen content (M3).
 * Shown to an authenticated user with zero Watch-Group memberships yet
 * (see src/lib/authGate.ts's `resolveAuthGate`).
 *
 * --- Scope boundary (do not "helpfully" wire real data here) ---
 * The M1 schema task explicitly left undecided whether app users INSERT
 * `watch_groups` / `watch_group_members` rows directly under RLS, or
 * whether group creation/joining goes through a service-role Edge
 * Function. The full invite-link/join-by-Group-ID flow is separately
 * explicitly M9 scope ("Watch-Gruppen-Verwaltung: Erstellen, Invite-Link
 * generieren/widerrufen, per ID beitreten..."). So this screen is UI-only:
 * both submit actions below are intentional placeholders (see
 * `handleCreateSubmit` / `handleJoinSubmit`) until that decision lands and
 * M9 implements the real thing. This is *not* corner-cutting.
 *
 * Chosen stub shape: each submit handler shows a plain `Alert.alert`
 * ("Bald verfügbar") rather than calling a separate exported stub
 * function. This was a deliberate pick over an exported stub function:
 * `Alert.alert` is a real module boundary (its own object/property), so
 * jest can `jest.spyOn(Alert, "alert")` and reliably intercept the call —
 * a same-file exported function called directly by local reference would
 * NOT be interceptable that way (the internal call uses the local binding,
 * not the exported property), per the ES/CommonJS interop gotcha already
 * called out in __tests__/StarRating.test.tsx's top comment.
 *
 * Chrome accent: this screen renders with no Watch-Group (and therefore no
 * GroupThemeProvider ancestor) yet — that's exactly why the user is here.
 * Anything styled via NativeWind `className` tokens (Button/Card/TextInput
 * border, all using the `accent`/`bg-card`/etc. Tailwind tokens) already
 * falls back to the Gold default automatically, via that token's own CSS
 * variable fallback (tailwind.config.js: `var(--color-accent, #c8a44e)`) —
 * no extra code needed for those. The one place this screen needs a raw
 * hex color (not a className token) is the selected-swatch checkmark badge
 * below, an Ionicons `color` prop — same category of raw-hex-prop surface
 * as the M3 tab bar shell's `tabBarActiveTintColor`. For that, this screen
 * resolves `resolveGroupTheme(undefined)` -> Gold/default explicitly, same
 * pattern as that tab bar shell task.
 */

type ScreenMode = "select" | "create" | "join";

const THEME_OPTIONS: readonly GroupThemeName[] = ["gold", "red", "blue", "green", "purple", "orange"];

const THEME_LABELS: Record<GroupThemeName, string> = {
  gold: "Gold",
  red: "Rot",
  blue: "Blau",
  green: "Grün",
  purple: "Lila",
  orange: "Orange",
};

const PLACEHOLDER_TEXT_COLOR = "#888888";

// TODO(M9): replace with a real Supabase call once the create-group
// data-layer question flagged in the M1 schema task (direct client INSERT
// under RLS vs. a service-role Edge Function) is resolved, and M9 builds
// the real "Gruppe erstellen" flow. Intentionally a stub for this UI-only
// M3 task — see the file-level comment above.
function handleCreateSubmit(_groupName: string, _theme: GroupThemeName) {
  Alert.alert("Bald verfügbar", "Das Erstellen einer Gruppe kommt in einem späteren Update.");
}

// TODO(M9): replace with a real Supabase call once the join-by-invite-
// link/Group-ID flow (M9 roadmap scope, ADR 0003) is built. Intentionally a
// stub for this UI-only M3 task — see the file-level comment above.
function handleJoinSubmit(_groupCode: string) {
  Alert.alert("Bald verfügbar", "Das Beitreten zu einer Gruppe kommt in einem späteren Update.");
}

export default function CreateOrJoinGroupScreen() {
  const [mode, setMode] = useState<ScreenMode>("select");
  const [groupName, setGroupName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<GroupThemeName>(DEFAULT_GROUP_THEME);
  const [groupCode, setGroupCode] = useState("");

  // Only needed for the raw-hex-prop swatch checkmark badge — see the
  // file-level comment above for why className-based chrome needs no
  // explicit call here.
  const chromeAccent = resolveGroupTheme(undefined).colors.accent;

  const isCreateValid = groupName.trim().length > 0;
  const isJoinValid = groupCode.trim().length > 0;

  // Back resets the just-abandoned form's fields rather than preserving
  // them — a deliberate, cheap UI-polish call (not a business rule): a
  // clean slate is less surprising than stale input reappearing if the
  // user goes select -> create -> back -> join -> back -> create again.
  function goBackToSelect() {
    setMode("select");
    setGroupName("");
    setSelectedTheme(DEFAULT_GROUP_THEME);
    setGroupCode("");
  }

  return (
    <View className="flex-1 bg-bg-primary px-6 py-8" testID="create-or-join-group-screen">
      <Text className="mb-8 text-center font-display text-3xl text-text-primary">
        Willkommen bei WatchCrew
      </Text>

      {mode === "select" ? (
        <View testID="mode-select" className="gap-4">
          <Card testID="option-create-group" className="p-4" onPress={() => setMode("create")}>
            <Text className="mb-1 text-lg font-semibold text-text-primary">Gruppe erstellen</Text>
            <Text className="text-text-secondary">
              Starte eine neue Watch-Gruppe für dich und deine Crew.
            </Text>
          </Card>
          <Card testID="option-join-group" className="p-4" onPress={() => setMode("join")}>
            <Text className="mb-1 text-lg font-semibold text-text-primary">Gruppe beitreten</Text>
            <Text className="text-text-secondary">
              Tritt einer bestehenden Gruppe per Einladungscode oder Gruppen-ID bei.
            </Text>
          </Card>
        </View>
      ) : null}

      {mode === "create" ? (
        <View testID="mode-create" className="gap-4">
          <Text className="text-lg font-semibold text-text-primary">Gruppe erstellen</Text>

          <TextInput
            testID="create-group-name-input"
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Gruppenname"
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-text-primary"
          />

          <Text className="text-text-secondary">Farbthema</Text>
          <View className="flex-row flex-wrap gap-3" testID="theme-swatch-row">
            {THEME_OPTIONS.map((themeName) => {
              const { colors } = resolveGroupTheme(themeName);
              const isSelected = selectedTheme === themeName;

              return (
                <Pressable
                  key={themeName}
                  testID={`theme-swatch-${themeName}`}
                  accessibilityRole="button"
                  accessibilityLabel={THEME_LABELS[themeName]}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedTheme(themeName)}
                  className="h-touch-min w-touch-min items-center justify-center">
                  <Ionicons
                    testID={`theme-swatch-icon-${themeName}`}
                    name="ellipse"
                    size={32}
                    color={colors.accent}
                  />
                  {isSelected ? (
                    <Ionicons
                      testID={`theme-swatch-selected-${themeName}`}
                      name="checkmark-circle"
                      size={16}
                      color={chromeAccent}
                      className="absolute -right-1 -top-1"
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Button
            testID="create-group-submit"
            label="Gruppe erstellen"
            disabled={!isCreateValid}
            onPress={() => handleCreateSubmit(groupName.trim(), selectedTheme)}
          />
          <Button
            testID="create-group-back"
            variant="secondary"
            label="Zurück"
            onPress={goBackToSelect}
          />
        </View>
      ) : null}

      {mode === "join" ? (
        <View testID="mode-join" className="gap-4">
          <Text className="text-lg font-semibold text-text-primary">Gruppe beitreten</Text>

          <TextInput
            testID="join-group-code-input"
            value={groupCode}
            onChangeText={setGroupCode}
            placeholder="Einladungscode / Gruppen-ID"
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-text-primary"
          />

          <Button
            testID="join-group-submit"
            label="Gruppe beitreten"
            disabled={!isJoinValid}
            onPress={() => handleJoinSubmit(groupCode.trim())}
          />
          <Button
            testID="join-group-back"
            variant="secondary"
            label="Zurück"
            onPress={goBackToSelect}
          />
        </View>
      ) : null}
    </View>
  );
}
