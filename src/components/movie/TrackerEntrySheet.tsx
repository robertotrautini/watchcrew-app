import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { Button } from "@/components/ui/Button";
import { SMALL_PILL_HIT_SLOP } from "@/components/ui/touchTarget";
import { DateField } from "@/components/ui/DateField";
import { Sheet } from "@/components/ui/Sheet";
import { useDeletePayment, useSetPayment } from "@/hooks/useTrackerPayments";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import type { GroupMemberRow } from "@/lib/groups";
import { formatDateForInput } from "@/lib/ratingLogic";
import { showToast } from "@/lib/toast";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

export interface TrackerEntrySheetProps {
  /** The tracked (paid) entry to edit/delete; `null` = sheet closed. */
  entry: WatchlistEntry | null;
  onClose: () => void;
  groupId: string;
  groupMembers: GroupMemberRow[];
  /** member_id -> payer-chip colour (`assignMemberColors`). */
  memberColors: Map<string, string>;
}

/**
 * Bottom flyout opened by tapping a Tracker row: change payer + date, save,
 * or delete (with a confirmation step inside the same flyout).
 */
export function TrackerEntrySheet({
  entry,
  onClose,
  groupId,
  groupMembers,
  memberColors,
}: TrackerEntrySheetProps) {
  const [payerId, setPayerId] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const setPaymentMutation = useSetPayment();
  const deletePaymentMutation = useDeletePayment();

  const entryId = entry?.id ?? null;
  // Re-derive the draft each time a different entry is opened.
  useEffect(() => {
    setPayerId(entry?.paid_by_member_id ?? null);
    setDateInput((entry?.paid_at ?? "").slice(0, 10));
    setConfirmingDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  function handleSave() {
    if (!entry || !payerId) {
      return;
    }
    setPaymentMutation.mutate(
      {
        groupId,
        watchlistEntryId: entry.id,
        paidByMemberId: payerId,
        explicitDate: dateInput,
        existingPaidAt: entry.paid_at,
      },
      {
        onSuccess: () => {
          showToast("Zahlung gespeichert", { variant: "success" });
          onClose();
        },
        onError: () => {
          showToast("Zahlung konnte nicht gespeichert werden", { variant: "error" });
        },
      },
    );
  }

  function handleConfirmDelete() {
    if (!entry) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deletePaymentMutation.mutate(
      { groupId, watchlistEntryId: entry.id },
      {
        onSuccess: () => {
          setConfirmingDelete(false);
          onClose();
        },
      },
    );
  }

  return (
    <Sheet visible={entry != null} onClose={onClose} title={entry?.movie.name}>
      {entry ? (
        <View testID="tracker-entry-sheet" className="gap-3">
          {confirmingDelete ? (
            <View testID="tracker-entry-sheet-delete-confirm" className="gap-3">
              <Text className="text-text-primary">Wirklich löschen?</Text>
              <View className="flex-row gap-2">
                <Button
                  testID="tracker-entry-sheet-delete-cancel-button"
                  label="Abbrechen" icon="close"
                  variant="secondary"
                  className="flex-1"
                  onPress={() => setConfirmingDelete(false)}
                />
                <Button
                  testID="tracker-entry-sheet-delete-confirm-button"
                  label="Löschen" icon="delete"
                  variant="danger"
                  className="flex-1"
                  loading={deletePaymentMutation.isPending}
                  onPress={handleConfirmDelete}
                />
              </View>
            </View>
          ) : (
            <>
              <Text className="text-text-secondary">Bezahlt von</Text>
              <View className="flex-row flex-wrap gap-2">
                {groupMembers.map((member) => {
                  const isSelected = payerId === member.user_id;
                  const color = memberColors.get(member.user_id);
                  return (
                    <Pressable
                      key={member.user_id}
                      testID={`tracker-entry-sheet-payer-${member.user_id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      // visual pill stays small; hitSlop tops the touch area up to 48dp
                      hitSlop={SMALL_PILL_HIT_SLOP}
                      onPress={() => setPayerId(member.user_id)}
                      className={
                        isSelected
                          ? "items-center rounded-sm px-3 py-1"
                          : "items-center rounded-sm border px-3 py-1"
                      }
                      // Inline style exception (same documented precedent as
                      // PaymentModal.tsx): runtime per-member hex colour.
                      style={isSelected ? { backgroundColor: color } : { borderColor: color }}
                    >
                      <Text className={isSelected ? "text-xs text-bg-primary" : "text-xs text-text-primary"}>
                        {memberDisplayLabel(member.user_id, member.profiles?.display_name)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <DateField
                testID="tracker-entry-sheet-date-field"
                valueIso={dateInput || null}
                displayText={formatDateForInput(dateInput)}
                placeholder="Datum wählen"
                onChangeIso={setDateInput}
              />
              <View className="flex-row gap-2">
                <Button
                  testID="tracker-entry-sheet-save-button"
                  label="Speichern" icon="save"
                  className="flex-1"
                  disabled={!payerId}
                  loading={setPaymentMutation.isPending}
                  onPress={handleSave}
                />
                <Button
                  testID="tracker-entry-sheet-delete-button"
                  label="Löschen" icon="delete"
                  variant="danger"
                  className="flex-1"
                  onPress={() => setConfirmingDelete(true)}
                />
              </View>
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
