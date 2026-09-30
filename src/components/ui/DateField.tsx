import { useState } from "react";
import { Platform, Pressable, Text } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { isoDateToLocalDate, toLocalIsoDate } from "@/lib/localDate";
import { cn } from "@/lib/utils";

/**
 * M7 consolidation (Item 3, see docs/interim-decisions.md): shared native
 * date-picker field, replacing the plain `TextInput` + manual DD.MM.YYYY/
 * YYYY-MM-DD string parsing previously used by the Rating-Dialog's
 * "Gesehen am"/"Bezahlt am" fields and the Add-Movie-Modal's manual-
 * release-date field.
 *
 * Renders as a pressable field showing `displayText`; tapping it opens the
 * platform-native `@react-native-community/datetimepicker`. The picker's
 * native `Date` is converted to a plain ISO "YYYY-MM-DD" string right here
 * (`onChangeIso`) -- this is the ONLY place that touches a native `Date`
 * object. Every caller keeps working with plain ISO/German date strings
 * exactly as before; the existing pure conversion functions
 * (`parseGermanDateInput`/`formatDateForInput`, src/lib/ratingLogic.ts) are
 * completely untouched -- this component only replaces the input widget
 * around them, per the task's explicit instruction not to touch that
 * business logic.
 */
export interface DateFieldProps {
  testID: string;
  /**
   * The date the picker should open to, as an ISO "YYYY-MM-DD" string, or
   * `null` when nothing valid is selected yet (the picker then opens to
   * today, same as a fresh native date-picker default).
   */
  valueIso: string | null;
  /** Already-formatted text to show in the field -- caller decides the display format (German vs. ISO). */
  displayText: string;
  placeholder: string;
  /** When `false`, tapping the field does nothing (mirrors the old TextInput's `editable={false}`). */
  editable?: boolean;
  onChangeIso: (iso: string) => void;
  className?: string;
}

export function DateField({
  testID,
  valueIso,
  displayText,
  placeholder,
  editable = true,
  onChangeIso,
  className,
}: DateFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  function handlePress() {
    if (!editable) {
      return;
    }
    setPickerVisible(true);
  }

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    // Android's native dialog is imperative (opens/closes itself) and
    // reports "dismissed" on cancel -- close our own picker state
    // immediately there. iOS's inline spinner stays mounted/open until the
    // user picks a value (there's no separate "confirm" step in this
    // design), so it closes only once a real date comes back.
    if (Platform.OS !== "ios" || (event.type !== "dismissed" && selectedDate)) {
      setPickerVisible(false);
    }
    if (event.type === "dismissed" || !selectedDate) {
      return;
    }
    onChangeIso(toLocalIsoDate(selectedDate));
  }

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !editable }}
        disabled={!editable}
        onPress={handlePress}
        className={cn(
          "rounded-lg border border-border-subtle bg-card px-4 py-3",
          !editable && "opacity-50",
          className,
        )}
      >
        <Text className={displayText ? "text-text-primary" : "text-text-secondary"}>
          {displayText || placeholder}
        </Text>
      </Pressable>
      {pickerVisible ? (
        <DateTimePicker
          testID={`${testID}-picker`}
          value={valueIso ? isoDateToLocalDate(valueIso) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
        />
      ) : null}
    </>
  );
}
