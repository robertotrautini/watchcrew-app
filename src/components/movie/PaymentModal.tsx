import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DateField } from "@/components/ui/DateField";
import { Sheet } from "@/components/ui/Sheet";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import type { GroupMemberRow } from "@/lib/groups";
import {
  computeNextPayer,
  lastPaidHint,
  getLastPaidAtByMember,
  getUnpaidDiaryEntries,
} from "@/lib/trackerLogic";
import { useSetPayment } from "@/hooks/useTrackerPayments";
import type { WatchlistEntry } from "@/lib/watchlistTypes";
import { showToast } from "@/lib/toast";
import { toLocalIsoDate } from "@/lib/localDate";
import { formatDateForInput } from "@/lib/ratingLogic";

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
/** Success toast copy; the Sheet is an RN Modal, so the toast becomes visible as the sheet finishes closing. */
const PAYMENT_SAVED_TOAST = "Zahlung gespeichert";

export interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  /** The group's full (unfiltered) watchlist_entries set -- same shape as `useGroupWatchlist`'s `entries`. */
  entries: WatchlistEntry[];
  groupMembers: GroupMemberRow[];
  displayNameById: Map<string, string>;
  /** member_id -> payer-button color (`assignMemberColors`, src/lib/trackerLogic.ts). */
  memberColors?: Map<string, string>;
  /** Injectable for deterministic tests; defaults to the real current time. */
  now?: Date;
  onSaved?: () => void;
}

/** Latest seen_at across all ratings of an entry ("" when none) -- ISO strings sort lexicographically. */
function latestSeenAt(entry: WatchlistEntry): string {
  return entry.ratings.reduce((max, r) => (r.seen_at && r.seen_at > max ? r.seen_at : max), "");
}

function todayIso(now: Date): string {
  return toLocalIsoDate(now);
}

export function PaymentModal({
  visible,
  onClose,
  groupId,
  entries,
  groupMembers,
  displayNameById,
  now,
  onSaved,
}: PaymentModalProps) {
  const effectiveNow = now ?? new Date();

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState<string>(todayIso(effectiveNow));

  const setPaymentMutation = useSetPayment();

  // Re-derive the draft every time the modal transitions to visible --
  // same "don't leak a stale draft across open/close cycles" convention as
  // RatingDialog.tsx.
  useEffect(() => {
    if (!visible) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- draft reset on open must stay effect-timed
    setSelectedEntryId(null);
    setSelectedPayerId(computeNextPayer(groupMembers, entries));
    setDateInput(todayIso(effectiveNow));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const unpaidEntries = getUnpaidDiaryEntries(entries);
  const movieOptions = unpaidEntries.map((entry) => ({
    value: entry.id,
    label: entry.movie.name,
  }));
  const lastPaidByMember = getLastPaidAtByMember(entries);
  // Empty query: ALL unpaid movies, most recently seen first (scrollable list, no cut-off).
  const recentMovieOptions = [...unpaidEntries]
    .sort((a, b) => latestSeenAt(b).localeCompare(latestSeenAt(a)))
    .map((entry) => ({ value: entry.id, label: entry.movie.name }));
  const payerOptions = groupMembers.map((member) => ({
    value: member.user_id,
    label: memberDisplayLabel(member.user_id, member.profiles?.display_name),
    hint: lastPaidHint(lastPaidByMember.get(member.user_id) ?? null, effectiveNow),
  }));

  const canSave =
    selectedEntryId != null &&
    selectedPayerId != null &&
    !setPaymentMutation.isPending;

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
          showToast(PAYMENT_SAVED_TOAST, { variant: "success" });
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
    <Sheet visible={visible} onClose={onClose} title="Zahlung erfassen">
      <View testID="payment-modal" className="gap-3">
        <View className="gap-2">
          <Text className="text-text-secondary">Film</Text>
          <Select
            testID="payment-modal-movie-select"
            searchable
            autoFocusSearch={false}
            defaultOptions={recentMovieOptions}
            options={movieOptions}
            value={selectedEntryId}
            onChange={setSelectedEntryId}
            placeholder="Film wählen"
            searchPlaceholder="Film suchen…"
            emptyText="Keine unbezahlten Filme gefunden."
          />
        </View>

        <View className="gap-2">
          <Text className="text-text-secondary">Wer hat bezahlt?</Text>
          <Select
            testID="payment-modal-payer-select"
            accessibilityLabel="Wer hat bezahlt?"
            options={payerOptions}
            value={selectedPayerId}
            onChange={setSelectedPayerId}
            placeholder="Person wählen"
          />
        </View>

        <View className="gap-2">
          <Text className="text-text-secondary">Bezahlt am</Text>
          <DateField
            testID="payment-modal-date-field"
            valueIso={dateInput || null}
            displayText={formatDateForInput(dateInput)}
            placeholder="Datum wählen"
            onChangeIso={setDateInput}
          />
        </View>

        <Button
          testID="payment-modal-save-button"
          label="Speichern"
          icon="save"
          disabled={!canSave}
          loading={setPaymentMutation.isPending}
          onPress={handleSave}
        />
      </View>
    </Sheet>
  );
}
