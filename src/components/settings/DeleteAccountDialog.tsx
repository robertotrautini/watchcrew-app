import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SURFACE_EDGE } from "@/components/ui/Surface";
import { Text, TextInput } from "@/components/ui/Text";
import { signOut } from "@/lib/auth";
import { deleteOwnAccount } from "@/lib/deleteAccount";

const DELETE_CONFIRMATION_PHRASE = "LÖSCHEN";

interface DeleteAccountDialogProps {
  visible: boolean;
  onCancel: () => void;
}

/**
 * "Konto löschen": ConfirmDialog with a typed confirmation phrase. Owns the
 * phrase input, the in-flight flag and the server error; they reset every
 * time the dialog is opened. On success it navigates to login first, then
 * ends the session (see Settings `handleSignOut` for why that order).
 */
export function DeleteAccountDialog({ visible, onCancel }: DeleteAccountDialogProps) {
  const router = useRouter();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isConfirmed = confirmationInput === DELETE_CONFIRMATION_PHRASE;

  // Reset on every open (state adjusted during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setConfirmationInput("");
      setErrorMessage(null);
    }
  }

  async function handleConfirm() {
    if (!isConfirmed || isDeleting) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDeleting(true);
    setErrorMessage(null);

    const { error } = await deleteOwnAccount();
    if (error) {
      setIsDeleting(false);
      setErrorMessage(error.message);
      return;
    }

    // Navigate FIRST, then end the session.
    router.replace("/(auth)/login");
    await signOut();
  }

  return (
    <ConfirmDialog
      visible={visible}
      testID="delete-account"
      title="Konto endgültig löschen"
      confirmLabel="Endgültig löschen"
      confirmDisabled={!isConfirmed}
      loading={isDeleting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <View className="gap-3">
        <Text className="text-text-secondary">
          Dein Konto sowie alle deine Gruppenmitgliedschaften, Bewertungen und
          Zahlungsdaten werden endgültig gelöscht. Dieser Vorgang kann nicht
          rückgängig gemacht werden.
        </Text>
        <Text className="text-text-secondary">
          Gib zur Bestätigung &quot;{DELETE_CONFIRMATION_PHRASE}&quot; ein.
        </Text>
        <TextInput
          testID="delete-account-confirm-input"
          className={`rounded-lg ${SURFACE_EDGE} bg-black/35 px-3 py-2 text-text-primary`}
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
      </View>
    </ConfirmDialog>
  );
}
