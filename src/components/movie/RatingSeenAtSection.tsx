import { Pressable, View } from "react-native";

import { DateField } from "@/components/ui/DateField";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { formatDateForInput, parseGermanDateInput, type SeenAtMode } from "@/lib/ratingLogic";

interface RatingSeenAtSectionProps {
  mode: SeenAtMode;
  manualDateInput: string;
  onChangeManualDate: (input: string) => void;
  onToggleUnknown: () => void;
  onToggleReleaseDate: () => void;
  /** Theatrical release date (YYYY-MM-DD); `null` hides the "Release Date" checkbox. */
  movieReleaseDate: string | null;
  starColor: string;
}

/** "Gesehen am": manual date field plus the mutually exclusive "Weiß nicht" / "Release Date" checkboxes. */
export function RatingSeenAtSection({
  mode,
  manualDateInput,
  onChangeManualDate,
  onToggleUnknown,
  onToggleReleaseDate,
  movieReleaseDate,
  starColor,
}: RatingSeenAtSectionProps) {
  return (
    <View className="gap-2">
      <Text className="text-text-secondary">Gesehen am</Text>
      <DateField
        testID="rating-dialog-seen-at-input"
        valueIso={parseGermanDateInput(manualDateInput)}
        displayText={manualDateInput}
        placeholder="TT.MM.JJJJ"
        editable={mode === "manual"}
        onChangeIso={(iso) => onChangeManualDate(formatDateForInput(iso))}
      />

      <View className="flex-row flex-wrap gap-x-6">
        <Pressable
          testID="rating-dialog-checkbox-unknown"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: mode === "unknown" }}
          onPress={onToggleUnknown}
          className="min-h-touch-comfortable flex-row items-center gap-2"
        >
          <Icon
            name={mode === "unknown" ? "checkboxOn" : "checkboxOff"}
            size="M"
            color={starColor}
          />
          <Text className="text-text-primary">Weiß nicht</Text>
        </Pressable>

        {movieReleaseDate != null ? (
          <Pressable
            testID="rating-dialog-checkbox-release-date"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: mode === "release_date" }}
            onPress={onToggleReleaseDate}
            className="min-h-touch-comfortable flex-row items-center gap-2"
          >
            <Icon
              name={mode === "release_date" ? "checkboxOn" : "checkboxOff"}
              size="M"
              color={starColor}
            />
            <Text className="text-text-primary">
              Release Date ({formatDateForInput(movieReleaseDate)})
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
