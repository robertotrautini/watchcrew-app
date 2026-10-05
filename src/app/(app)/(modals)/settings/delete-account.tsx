import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";

import { SettingsBackBar } from "@/components/settings/SettingsBackBar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { signOut } from "@/lib/auth";
import { deleteOwnAccount } from "@/lib/deleteAccount";
import { GLASS_INSET_EDGE } from "@/components/ui/Glass";

/**
 * M10 Settings hub — "Konto löschen". Genuinely irreversible, so this uses a
 * real confirmation gate rather than a single tap-to-confirm: a `Sheet`
 * requiring the user to type the exact phrase "LÖSCHEN" before the delete
 * button even enables (per docs/interim-decisions.md, "M10 — Settings hub").
 *
 * On success: navigates to the login screen, then signs the local session
 * out — same order and reasoning as settings.tsx's "Abmelden" handler.
 */

const CONFIRMATION_PHRASE = "LÖSCHEN";

export default function SettingsDeleteAccountScreen() {
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmed = confirmationInput === CONFIRMATION_PHRASE;

  function openSheet() {
    setConfirmationInput("");
    setErrorMessage(null);
    setSheetVisible(true);
  }

  function closeSheet() {
    setSheetVisible(false);
  }

  async function handleConfirmDelete() {
    if (!isConfirmed || isDeleting) {
      return;
    }
    // M11 (haptic polish, see docs/interim-decisions.md "M11 — Haptik"):
    // same "medium impact, right on the confirm tap" destructive-confirm
    // treatment as the other delete confirmations in this app.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDeleting(true);
    setErrorMessage(null);

    const { error } = await deleteOwnAccount();
    if (error) {
      setIsDeleting(false);
      setErrorMessage(error.message);
      return;
    }

    // Navigate FIRST, then end the session (see settings.tsx handleSignOut:
    // signOut() resets cache/theme while this modal stack is mounted and
    // crashes Android). Account deletion has already completed here.
    router.replace("/(auth)/login");
    await signOut();
  }

  return (
    <View className="flex-1" testID="settings-delete-account-screen">
      <View className="flex-1 px-4 pt-4">
        <Text className="mb-4 text-text-secondary">
          Dein Konto sowie alle deine Gruppenmitgliedschaften, Bewertungen und
          Zahlungsdaten werden endgültig gelöscht. Dieser Vorgang kann nicht
          rückgängig gemacht werden.
        </Text>

        <Button
          testID="delete-account-open-button"
          variant="danger"
          label="Konto löschen"
          icon="delete"
          onPress={openSheet}
        />

        <Sheet
          visible={sheetVisible}
          onClose={closeSheet}
          title="Konto endgültig löschen"
        >
          <View className="gap-3">
            <Text className="text-text-secondary">
              Gib zur Bestätigung "{CONFIRMATION_PHRASE}" ein. Diese Aktion ist
              endgültig.
            </Text>
            <TextInput
              testID="delete-account-confirm-input"
              className={`rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-3 py-2 text-text-primary`}
              autoCapitalize="characters"
              autoCorrect={false}
              value={confirmationInput}
              onChangeText={setConfirmationInput}
            />
            {errorMessage ? (
              <Text testID="delete-account-error" className="text-danger">
                Konto konnte nicht gelöscht werden: {errorMessage}
              </Text>
            ) : null}
            <Button
              testID="delete-account-confirm-button"
              variant="danger"
              label="Endgültig löschen"
              icon="delete"
              disabled={!isConfirmed}
              loading={isDeleting}
              onPress={handleConfirmDelete}
            />
          </View>
        </Sheet>
      </View>
      <SettingsBackBar />
    </View>
  );
}
