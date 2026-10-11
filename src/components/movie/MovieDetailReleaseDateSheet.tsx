import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Sheet } from "@/components/ui/Sheet";
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
  groupId,
  watchlistEntryId,
  releaseDate = null,
  hasReleaseDateOverride = false,
}: MovieDetailReleaseDateSheetProps) {
  const releaseDateMutation = useSetReleaseDateOverride();
  const [draftDate, setDraftDate] = useState<string | null>(releaseDate);
  const [resetDraft, setResetDraft] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- draft reset on open must stay effect-timed
    setDraftDate(releaseDate);
    setResetDraft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, watchlistEntryId]);

  function handleSave() {
    if (!watchlistEntryId || !groupId) {
      return;
    }
    releaseDateMutation.mutate({
      watchlistEntryId,
      groupId,
      releaseDate: resetDraft ? null : draftDate,
    });
    onClose();
  }

  const dirty = resetDraft || draftDate !== releaseDate;

  return (
    <Sheet visible={visible} onClose={onClose} title="Eintrag bearbeiten">
      <View testID="movie-detail-edit-sheet" className="gap-3">
        <Text className="text-sm text-text-secondary">Erscheinungsdatum</Text>
        <DateField
          testID="movie-detail-release-date-field"
          valueIso={resetDraft ? null : draftDate}
          displayText={
            resetDraft ? "TMDB-Datum" : formatDateForInput(draftDate)
          }
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
        <View className="flex-row gap-3">
          <Button
            testID="movie-detail-release-date-cancel-button"
            label="Abbrechen"
            icon="close"
            variant="secondary"
            className="flex-1"
            onPress={onClose}
          />
          <Button
            testID="movie-detail-release-date-save-button"
            label="Speichern"
            icon="save"
            className="flex-1"
            disabled={!dirty}
            onPress={handleSave}
          />
        </View>
      </View>
    </Sheet>
  );
}
