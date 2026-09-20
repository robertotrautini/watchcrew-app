import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { signOut } from "@/lib/auth";
import { deleteOwnAccount } from "@/lib/deleteAccount";

/**
 * M10 Settings hub — "Konto löschen". Genuinely irreversible, so this uses a
 * real confirmation gate rather than a single tap-to-confirm: a `Sheet`
 * requiring the user to type the exact phrase "LÖSCHEN" before the delete
 * button even enables (per docs/interim-decisions.md, "M10 — Settings hub").
 *
 * On success: signs the local session out, then explicitly navigates to "/"
 * so `useAuthGate` (src/hooks/useAuthGate.ts) re-evaluates fresh and
 * redirects to the login screen — same explicit-navigation reasoning as
 * settings.tsx's own "Abmelden" handler.
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
    setIsDeleting(true);
    setErrorMessage(null);

    const { error } = await deleteOwnAccount();
    if (error) {
      setIsDeleting(false);
      setErrorMessage(error.message);
      return;
    }

    await signOut();
    router.replace("/");
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="settings-delete-account-screen">
      <Text className="mb-2 font-display text-xl text-text-primary">Konto löschen</Text>
      <Text className="mb-4 text-text-secondary">
        Dein Konto sowie alle deine Gruppenmitgliedschaften, Bewertungen und Zahlungsdaten werden
        endgültig gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.
      </Text>

      <Button
        testID="delete-account-open-button"
        variant="danger"
        label="Konto löschen"
        onPress={openSheet}
      />

      <Sheet visible={sheetVisible} onClose={closeSheet} title="Konto endgültig löschen">
        <View className="gap-3">
          <Text className="text-text-secondary">
            Gib zur Bestätigung "{CONFIRMATION_PHRASE}" ein. Diese Aktion ist endgültig.
          </Text>
          <TextInput
            testID="delete-account-confirm-input"
            className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
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
            disabled={!isConfirmed}
            loading={isDeleting}
            onPress={handleConfirmDelete}
          />
        </View>
      </Sheet>
    </View>
  );
}
