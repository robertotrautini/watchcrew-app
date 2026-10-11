import { useState } from "react";
import { Text } from "@/components/ui/Text";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { DraftSheet, DraftSheetForm } from "@/components/ui/DraftSheet";
import { useSetReleaseDateOverride } from "@/hooks/useMovieDetailMutations";
import { formatDateForInput } from "@/lib/ratingLogic";

// "Eintrag bearbeiten" sheet of a watchlist entry (release date only). Opened
// by tapping the date line in MovieDetailMetaRow. Pick / reset only change a
// local draft; "Speichern" persists it (reset = null = back to the TMDB date),
// "Abbrechen" / closing discards it.

export interface MovieDetailReleaseDateSheetProps {
  visible: boolean;
  onClose: () => void;
  groupId?: string;
  watchlistEntryId?: string;
  /** Effective release date (ISO) of this group's entry, preselected in the field. */
  releaseDate?: string | null;
  /** True when the entry carries its own per-group date (enables the reset button). */
  hasReleaseDateOverride?: boolean;
}

export function MovieDetailReleaseDateSheet({
  visible,
  onClose,
  ...formProps
}: MovieDetailReleaseDateSheetProps) {
  return (
    <DraftSheet visible={visible} onCancel={onClose} title="Eintrag bearbeiten">
      <ReleaseDateForm {...formProps} />
    </DraftSheet>
  );
}

function ReleaseDateForm({
  groupId,
  watchlistEntryId,
  releaseDate = null,
  hasReleaseDateOverride = false,
}: Omit<MovieDetailReleaseDateSheetProps, "visible" | "onClose">) {
  const releaseDateMutation = useSetReleaseDateOverride();
  const [draftDate, setDraftDate] = useState<string | null>(releaseDate);
  const [resetDraft, setResetDraft] = useState(false);

  function handleSave() {
    if (!watchlistEntryId || !groupId) {
      return false;
    }
    releaseDateMutation.mutate({
      watchlistEntryId,
      groupId,
      releaseDate: resetDraft ? null : draftDate,
    });
    return true;
  }

  const dirty = resetDraft || draftDate !== releaseDate;

  return (
    <DraftSheetForm
      testID="movie-detail-edit-sheet"
      cancelTestID="movie-detail-release-date-cancel-button"
      confirmTestID="movie-detail-release-date-save-button"
      onSave={handleSave}
      saveDisabled={!dirty}
    >
      <Text className="text-sm text-text-secondary">Erscheinungsdatum</Text>
      <DateField
        testID="movie-detail-release-date-field"
        valueIso={resetDraft ? null : draftDate}
        displayText={resetDraft ? "TMDB-Datum" : formatDateForInput(draftDate)}
        placeholder="Datum wählen"
        onChangeIso={(iso) => {
          setResetDraft(false);
          setDraftDate(iso);
        }}
      />
      {hasReleaseDateOverride && !resetDraft ? (
        <Button
          testID="movie-detail-release-date-reset"
          label="Auf TMDB-Datum zurücksetzen"
          icon="reset"
          variant="secondary"
          onPress={() => setResetDraft(true)}
        />
      ) : null}
    </DraftSheetForm>
  );
}
