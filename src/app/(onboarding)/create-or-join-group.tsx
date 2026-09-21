import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_GROUP_THEME, resolveGroupTheme, type GroupThemeName } from "@/lib/groupTheme";
import { createWatchGroup, isInvalidInviteTokenError, joinWatchGroupByToken } from "@/lib/groups";
import { extractInviteToken } from "@/lib/inviteToken";

/**
 * The real "create or join a Watch-Group" onboarding screen content
 * (M3 UI, M9 part 1 real write-path). Shown to an authenticated user with
 * zero Watch-Group memberships yet (see src/lib/authGate.ts's
 * `resolveAuthGate`).
 *
 * Both submit handlers now call the real M9 RPC wrappers
 * (`createWatchGroup` / `joinWatchGroupByToken`, src/lib/groups.ts), which
 * in turn call the SECURITY DEFINER `create_watch_group` /
 * `join_watch_group_by_token` Postgres functions (see
 * supabase/migrations/20260920130000_group_invite_and_rpcs.sql) — there is
 * intentionally no direct client INSERT under RLS for either table.
 *
 * Post-success navigation: does NOT rely on `useAuthGate`'s
 * `onAuthStateChange` subscription to pick this up automatically — that
 * subscription only re-evaluates on a Supabase auth event (sign-in/sign-out/
 * token refresh), not on a plain group-membership data change with the same
 * session still active, so creating/joining a group here would otherwise
 * leave the user stranded on this screen until their next auth event. This
 * screen instead navigates explicitly via `router.replace` to the same
 * `(app)/(tabs)/tracker` route `src/app/index.tsx` uses for its `'app'` gate
 * state, once the RPC confirms the new membership exists.
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

// Same target the root `useAuthGate`/index.tsx redirect uses for its
// `'app'` gate state — kept as a constant here so both call sites read from
// one obviously-matching literal instead of two independently-typed route
// strings.
const APP_HOME_ROUTE = "/(app)/(tabs)/tracker";

const INVALID_INVITE_TOKEN_MESSAGE = "Ungültiger oder deaktivierter Einladungscode.";

export default function CreateOrJoinGroupScreen() {
  const [mode, setMode] = useState<ScreenMode>("select");
  const [groupName, setGroupName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<GroupThemeName>(DEFAULT_GROUP_THEME);
  const [groupCode, setGroupCode] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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
    setCreateError(null);
    setJoinError(null);
  }

  async function handleCreateSubmit() {
    setCreateError(null);
    setIsCreating(true);

    const { error } = await createWatchGroup(groupName.trim(), selectedTheme);

    setIsCreating(false);

    if (error) {
      setCreateError(`Erstellen fehlgeschlagen: ${error.message}`);
      return;
    }

    router.replace(APP_HOME_ROUTE);
  }

  async function handleJoinSubmit() {
    setJoinError(null);

    const token = extractInviteToken(groupCode);
    if (!token) {
      setJoinError(INVALID_INVITE_TOKEN_MESSAGE);
      return;
    }

    setIsJoining(true);

    const { error } = await joinWatchGroupByToken(token);

    setIsJoining(false);

    if (error) {
      setJoinError(
        isInvalidInviteTokenError(error)
          ? INVALID_INVITE_TOKEN_MESSAGE
          : `Beitritt fehlgeschlagen: ${error.message}`,
      );
      return;
    }

    router.replace(APP_HOME_ROUTE);
  }

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Safe-Area"): standalone `headerShown: false` onboarding screen (no
    // tab bar below it either), so both top and bottom insets are this
    // screen's own responsibility.
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-bg-primary px-6 py-8" testID="create-or-join-group-screen">
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

          {createError ? (
            <Text testID="create-group-error" className="text-sm text-danger">
              {createError}
            </Text>
          ) : null}

          <Button
            testID="create-group-submit"
            label="Gruppe erstellen"
            disabled={!isCreateValid || isCreating}
            loading={isCreating}
            onPress={handleCreateSubmit}
          />
          <Button
            testID="create-group-back"
            variant="secondary"
            label="Zurück"
            disabled={isCreating}
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

          {joinError ? (
            <Text testID="join-group-error" className="text-sm text-danger">
              {joinError}
            </Text>
          ) : null}

          <Button
            testID="join-group-submit"
            label="Gruppe beitreten"
            disabled={!isJoinValid || isJoining}
            loading={isJoining}
            onPress={handleJoinSubmit}
          />
          <Button
            testID="join-group-back"
            variant="secondary"
            label="Zurück"
            disabled={isJoining}
            onPress={goBackToSelect}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
