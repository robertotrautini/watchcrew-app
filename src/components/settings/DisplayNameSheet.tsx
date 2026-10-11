import { useState } from "react";

import { DraftSheet, DraftSheetForm } from "@/components/ui/DraftSheet";
import { SURFACE_INPUT_CLASSNAME } from "@/components/ui/Surface";
import { Text, TextInput } from "@/components/ui/Text";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { showToast } from "@/lib/toast";

export interface DisplayNameSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Currently stored display name; the draft starts with it on every open. */
  storedDisplayName: string;
}

/** Flyout "Anzeigename bearbeiten" (Settings). */
export function DisplayNameSheet({
  visible,
  onClose,
  storedDisplayName,
}: DisplayNameSheetProps) {
  return (
    <DraftSheet
      visible={visible}
      onCancel={onClose}
      title="Anzeigename bearbeiten"
    >
      <DisplayNameForm storedDisplayName={storedDisplayName} />
    </DraftSheet>
  );
}

function DisplayNameForm({ storedDisplayName }: { storedDisplayName: string }) {
  const updateDisplayName = useUpdateDisplayName();
  const [draft, setDraft] = useState(storedDisplayName);
  const [error, setError] = useState<string | null>(null);

  const trimmed = draft.trim();
  const changed = trimmed.length > 0 && trimmed !== storedDisplayName;

  async function handleSave() {
    if (trimmed.length === 0) {
      setError("Bitte gib einen Anzeigenamen ein.");
      return false;
    }
    setError(null);
    try {
      await updateDisplayName.mutateAsync(trimmed);
      showToast("Anzeigename gespeichert", { variant: "success" });
      return true;
    } catch {
      setError("Anzeigename konnte nicht gespeichert werden.");
      showToast("Anzeigename konnte nicht gespeichert werden.", {
        variant: "error",
      });
      return false;
    }
  }

  return (
    <DraftSheetForm
      testID="settings-display-name-sheet"
      cancelTestID="settings-display-name-cancel-button"
      confirmTestID="settings-display-name-confirm-button"
      onSave={handleSave}
      saveDisabled={!changed}
      loading={updateDisplayName.isPending}
      error={error}
      errorTestID="settings-display-name-error"
    >
      <Text className="text-sm text-text-secondary">Anzeigename</Text>
      <TextInput
        testID="settings-display-name-input"
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="words"
        placeholder="Anzeigename"
        placeholderTextColor={PLACEHOLDER_COLOR}
        className={SURFACE_INPUT_CLASSNAME}
      />
    </DraftSheetForm>
  );
}
