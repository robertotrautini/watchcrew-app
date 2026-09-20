import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Sheet } from "@/components/ui/Sheet";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import type { GroupMemberRow } from "@/lib/groups";
import { searchEntries } from "@/lib/watchlistLogic";
import {
  computeNextPayer,
  daysSincePayment,
  getLastPaidAtByMember,
  getUnpaidDiaryEntries,
} from "@/lib/trackerLogic";
import { useSetPayment } from "@/hooks/useTrackerPayments";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

/**
 * M8 (Bezahl-Tracker): the "Zahlung erfassen" modal ("💰" button on the
 * Tracker screen). Lets a group member log a payment for any already-rated
 * movie that hasn't been paid for yet.
 *
 * Picker scope (confirmed legacy rule, feature-inventory.md §2.1/§6,
 * changelog 2026-05-09 "Tracker: Alle Tagebuch-Filme auswählbar"): ALL
 * unpaid diary movies -- a real rating from ANY single member is enough,
 * this is deliberately NOT restricted to "everyone in the group has rated
 * it" (see `getUnpaidDiaryEntries`, src/lib/trackerLogic.ts).
 */
export interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  /** The group's full (unfiltered) watchlist_entries set -- same shape as `useGroupWatchlist`'s `entries`. */
  entries: WatchlistEntry[];
  groupMembers: GroupMemberRow[];
  displayNameById: Map<string, string>;
  /** member_id -> payer-button color (`assignMemberColors`, src/lib/trackerLogic.ts). */
  memberColors: Map<string, string>;
  /** Injectable for deterministic tests; defaults to the real current time. */
  now?: Date;
  onSaved?: () => void;
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function PaymentModal({
  visible,
  onClose,
  groupId,
  entries,
  groupMembers,
  displayNameById,
  memberColors,
  now,
  onSaved,
}: PaymentModalProps) {
  const effectiveNow = now ?? new Date();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState<string>(todayIso(effectiveNow));

  const setPaymentMutation = useSetPayment();

  // Re-derive the draft every time the modal transitions to visible --
  // same "don't leak a stale draft across open/close cycles" convention as
  // RatingDialog.tsx.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!visible) {
      return;
    }
    setSearchQuery("");
    setSelectedEntryId(null);
    setSelectedPayerId(computeNextPayer(groupMembers, entries));
    setDateInput(todayIso(effectiveNow));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const unpaidEntries = getUnpaidDiaryEntries(entries);
  const searchedEntries = searchEntries(unpaidEntries, searchQuery);
  const lastPaidByMember = getLastPaidAtByMember(entries);

  const canSave = selectedEntryId != null && selectedPayerId != null && !setPaymentMutation.isPending;

  function handleSave() {
    if (!selectedEntryId || !selectedPayerId) {
      return;
    }
    setPaymentMutation.mutate(
      {
        groupId,
        watchlistEntryId: selectedEntryId,
        paidByMemberId: selectedPayerId,
        explicitDate: dateInput,
        existingPaidAt: null,
        now: effectiveNow,
      },
      {
        onSuccess: () => {
          onSaved?.();
          onClose();
        },
      },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Zahlung erfassen">
      <View testID="payment-modal" className="gap-3">
        <TextInput
          testID="payment-modal-search-input"
          className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
          placeholder="Film suchen…"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View testID="payment-modal-movie-list" className="max-h-48">
          {searchedEntries.length === 0 ? (
            <Text testID="payment-modal-movie-empty" className="py-3 text-text-secondary">
              Keine unbezahlten Filme gefunden.
            </Text>
          ) : (
            searchedEntries.map((entry) => {
              const isSelected = entry.id === selectedEntryId;
              return (
                <Pressable
                  key={entry.id}
                  testID={`payment-modal-movie-${entry.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedEntryId(entry.id)}
                  className={
                    isSelected
                      ? "rounded-lg bg-accent px-3 py-2"
                      : "rounded-lg border-b border-border-subtle px-3 py-2"
                  }
                >
                  <Text className={isSelected ? "text-bg-primary" : "text-text-primary"}>
                    {entry.movie.name}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        <View className="gap-2">
          <Text className="text-text-secondary">Wer hat bezahlt?</Text>
          <View className="flex-row flex-wrap gap-2" testID="payment-modal-payer-buttons">
            {groupMembers.map((member) => {
              const isSelected = selectedPayerId === member.user_id;
              const color = memberColors.get(member.user_id);
              const hint = daysSincePayment(lastPaidByMember.get(member.user_id) ?? null, effectiveNow);
              return (
                <Pressable
                  key={member.user_id}
                  testID={`payment-modal-payer-button-${member.user_id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedPayerId(member.user_id)}
                  className="items-center rounded-full px-3 py-1"
                  // Inline style exception (documented, narrow -- see
                  // docs/interim-decisions.md "M8", same precedent as the
                  // M6-Cleanup MovieGrid progress-bar-fill exception):
                  // `color` is a runtime hex value from `assignMemberColors`
                  // (src/lib/trackerLogic.ts), one per member, with no fixed
                  // enumerable set NativeWind's JIT could pre-generate
                  // classes for.
                  style={isSelected ? { backgroundColor: color } : { borderWidth: 1, borderColor: color }}
                >
                  <Text className={isSelected ? "text-xs text-bg-primary" : "text-xs text-text-primary"}>
                    {memberDisplayLabel(member.user_id, member.profiles?.display_name)}
                  </Text>
                  {hint ? (
                    <Text
                      testID={`payment-modal-payer-hint-${member.user_id}`}
                      className={isSelected ? "text-[10px] text-bg-primary" : "text-[10px] text-text-secondary"}
                    >
                      {hint}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-text-secondary">Bezahlt am</Text>
          <DateField
            testID="payment-modal-date-field"
            valueIso={dateInput || null}
            displayText={dateInput}
            placeholder="Datum wählen"
            onChangeIso={setDateInput}
          />
        </View>

        <Button
          testID="payment-modal-save-button"
          label="Speichern"
          disabled={!canSave}
          loading={setPaymentMutation.isPending}
          onPress={handleSave}
        />
      </View>
    </Sheet>
  );
}
