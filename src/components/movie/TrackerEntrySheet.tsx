import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import * as Haptics from "expo-haptics";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DateField } from "@/components/ui/DateField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DraftSheet, DraftSheetForm } from "@/components/ui/DraftSheet";
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
  /** Unused since the payer chips became a Select; kept so callers need no change. */
  memberColors?: Map<string, string>;
}

/**
 * Bottom flyout opened by tapping a Tracker row: change payer + date, save,
 * or delete (with a confirmation step inside the same flyout). Keyed by entry
 * id, so switching entries starts with a fresh draft and no pending confirmation.
 */
export function TrackerEntrySheet(props: TrackerEntrySheetProps) {
  return <TrackerEntrySheetInner key={props.entry?.id ?? "none"} {...props} />;
}

function TrackerEntrySheetInner({
  entry,
  onClose,
  groupId,
  groupMembers,
}: TrackerEntrySheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deletePaymentMutation = useDeletePayment();

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
    <>
      <DraftSheet
        visible={entry != null}
        onCancel={onClose}
        title={entry?.movie.name}
      >
        {entry ? (
          <TrackerEntryForm
            entry={entry}
            groupId={groupId}
            groupMembers={groupMembers}
            onClose={onClose}
            onRequestDelete={() => setConfirmingDelete(true)}
          />
        ) : null}
      </DraftSheet>
      <ConfirmDialog
        visible={confirmingDelete && entry != null}
        testID="tracker-entry-sheet-delete"
        title="Zahlung löschen?"
        description={`Die Zahlung für „${entry?.movie.name ?? ""}“ wird entfernt. Der Film bleibt im Tagebuch.`}
        loading={deletePaymentMutation.isPending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

function TrackerEntryForm({
  entry,
  groupId,
  groupMembers,
  onClose,
  onRequestDelete,
}: {
  entry: WatchlistEntry;
  groupId: string;
  groupMembers: GroupMemberRow[];
  onClose: () => void;
  onRequestDelete: () => void;
}) {
  const [payerId, setPayerId] = useState<string | null>(
    entry.paid_by_member_id ?? null,
  );
  const [dateInput, setDateInput] = useState((entry.paid_at ?? "").slice(0, 10));
  const setPaymentMutation = useSetPayment();

  function handleSave() {
    if (!payerId) {
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
          showToast("Zahlung konnte nicht gespeichert werden", {
            variant: "error",
          });
        },
      },
    );
  }

  return (
    <DraftSheetForm
      testID="tracker-entry-sheet"
      className="gap-4"
      actionsTestID="tracker-entry-sheet-actions"
      confirmTestID="tracker-entry-sheet-save-button"
      cancelLabel={null}
      onSave={handleSave}
      saveDisabled={!payerId}
      loading={setPaymentMutation.isPending}
      extraAction={
        <Button
          testID="tracker-entry-sheet-delete-button"
          label="Löschen"
          icon="delete"
          variant="danger"
          className="flex-1"
          onPress={onRequestDelete}
        />
      }
    >
      <View testID="tracker-entry-sheet-payer-section" className="gap-2">
        <Text className="text-text-secondary">Bezahlt von</Text>
        <Select
          testID="tracker-entry-sheet-payer-select"
          accessibilityLabel="Bezahlt von"
          options={groupMembers.map((member) => ({
            value: member.user_id,
            label: memberDisplayLabel(
              member.user_id,
              member.profiles?.display_name,
            ),
          }))}
          value={payerId}
          onChange={setPayerId}
          placeholder="Person wählen"
        />
      </View>
      <View testID="tracker-entry-sheet-date-section" className="gap-2">
        <Text className="text-text-secondary">Bezahlt am</Text>
        <DateField
          testID="tracker-entry-sheet-date-field"
          valueIso={dateInput || null}
          displayText={formatDateForInput(dateInput)}
          placeholder="Datum wählen"
          onChangeIso={setDateInput}
        />
      </View>
    </DraftSheetForm>
  );
}
