import { View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Sheet } from "@/components/ui/Sheet";
import { useSetReleaseDateOverride } from "@/hooks/useMovieDetailMutations";
import { formatDateForInput } from "@/lib/ratingLogic";

// "Eintrag bearbeiten" sheet of a watchlist entry (release date only). Opened
// by tapping the date line in MovieDetailMetaRow; saves immediately on pick /
// reset (null = back to the TMDB date) and closes itself.

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

  function saveReleaseDate(nextReleaseDate: string | null) {
    if (!watchlistEntryId || !groupId) {
      return;
    }
    releaseDateMutation.mutate({
      watchlistEntryId,
      groupId,
      releaseDate: nextReleaseDate,
    });
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Eintrag bearbeiten">
      <View testID="movie-detail-edit-sheet" className="gap-3">
        <Text className="text-sm text-text-secondary">Erscheinungsdatum</Text>
        <DateField
          testID="movie-detail-release-date-field"
          valueIso={releaseDate}
          displayText={formatDateForInput(releaseDate)}
          placeholder="Datum wählen"
          onChangeIso={saveReleaseDate}
        />
        {hasReleaseDateOverride ? (
          <Button
            testID="movie-detail-release-date-reset"
            label="Auf TMDB-Datum zurücksetzen"
            icon="reset"
            variant="secondary"
            onPress={() => saveReleaseDate(null)}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
