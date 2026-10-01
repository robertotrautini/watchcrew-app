import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { PaymentModal } from "@/components/movie/PaymentModal";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { formatDateForInput } from "@/lib/ratingLogic";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import { useDeletePayment, useSetPayment } from "@/hooks/useTrackerPayments";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import {
  assignMemberColors,
  daysSincePayment,
  getLastPaidAtByMember,
  getPaidEntries,
} from "@/lib/trackerLogic";
import { showToast } from "@/lib/toast";
import { searchEntries } from "@/lib/watchlistLogic";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

/**
 * M8: the Bezahl-Tracker screen (third tab). Single flat table view -- NO
 * card/grid/list toggle, unlike Watchlist/Tagebuch (per the task spec).
 *
 * Governing rule (confirmed, twice-reinforced in feature-inventory.md):
 * the table shows ONLY entries that already have `paid_at` set -- a movie
 * that's been rated but not yet paid for does NOT appear here. See
 * `getPaidEntries` (src/lib/trackerLogic.ts).
 *
 * M9 part 2 addition, UPDATED for M10: a "⚙️" header button, now navigating
 * to the real Settings hub (`/settings`,
 * src/app/(app)/(modals)/settings.tsx) instead of straight to Group-Settings
 * -- Group-Settings is one of that hub's sub-sections now (see the hub's own
 * "Gruppe verwalten" row), not a standalone destination from here anymore.
 */

function formatPlainDate(dateStr: string | null): string {
  if (dateStr == null) {
    return "";
  }
  const [year, month, day] = dateStr.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

export default function TrackerScreen() {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  // M9 part 2: real, persisted active-group resolution (replaces the former
  // "first group = active group" interim simplification) -- see
  // src/hooks/useActiveGroup.ts.
  const { activeGroupId, groupsQuery: userGroupsQuery } = useActiveGroup(currentUserId);

  // M10 (Realtime foreground sync, ADR 0006): see the identical comment in
  // src/app/(app)/(tabs)/watchlist.tsx -- same wiring, same reasoning.
  useGroupRealtimeSync(activeGroupId);
  useRegisterFocusedGroupScreen(activeGroupId);

  const groupMembersQuery = useGroupMembers(activeGroupId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editPayerId, setEditPayerId] = useState<string | null>(null);
  const [editDateInput, setEditDateInput] = useState<string>("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const setPaymentMutation = useSetPayment();
  const deletePaymentMutation = useDeletePayment();

  const isLoading = userGroupsQuery.isLoading || groupMembersQuery.isLoading || watchlistQuery.isLoading;
  const isError = userGroupsQuery.isError || groupMembersQuery.isError || watchlistQuery.isError;

  const allEntries = useMemo(() => watchlistQuery.data?.entries ?? [], [watchlistQuery.data]);
  const groupMembers = groupMembersQuery.data ?? [];
  const memberColors = useMemo(() => assignMemberColors(groupMembers), [groupMembers]);
  const lastPaidByMember = useMemo(() => getLastPaidAtByMember(allEntries), [allEntries]);
  const displayNameById = useMemo(
    () => new Map(groupMembers.map((m) => [m.user_id, m.profiles?.display_name ?? null])),
    [groupMembers],
  );

  const paidEntries = useMemo(() => getPaidEntries(allEntries), [allEntries]);
  const searchedEntries = useMemo(
    () => searchEntries(paidEntries, searchQuery),
    [paidEntries, searchQuery],
  );

  function toggleExpanded(entryId: string) {
    setExpandedEntryId((current) => (current === entryId ? null : entryId));
    setEditingEntryId(null);
    setDeletingEntryId(null);
  }

  function startEdit(entry: WatchlistEntry) {
    setEditingEntryId(entry.id);
    setEditPayerId(entry.paid_by_member_id);
    setEditDateInput((entry.paid_at ?? "").slice(0, 10));
    setDeletingEntryId(null);
  }

  function cancelEdit() {
    setEditingEntryId(null);
  }

  function saveEdit(entry: WatchlistEntry) {
    if (!activeGroupId || !editPayerId) {
      return;
    }
    setPaymentMutation.mutate(
      {
        groupId: activeGroupId,
        watchlistEntryId: entry.id,
        paidByMemberId: editPayerId,
        explicitDate: editDateInput,
        existingPaidAt: entry.paid_at,
      },
      {
        onSuccess: () => {
          showToast("Zahlung gespeichert");
          setEditingEntryId(null);
        },
      },
    );
  }

  function startDelete(entryId: string) {
    setDeletingEntryId(entryId);
    setEditingEntryId(null);
  }

  function cancelDelete() {
    setDeletingEntryId(null);
  }

  function confirmDelete(entryId: string) {
    if (!activeGroupId) {
      return;
    }
    // M11 (haptic polish, see docs/interim-decisions.md "M11 — Haptik"):
    // same "medium impact, right on the confirm tap" treatment as the
    // Movie-Detail-Overlay's delete confirmation (MovieDetailActionsBar).
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deletePaymentMutation.mutate(
      { groupId: activeGroupId, watchlistEntryId: entryId },
      {
        onSuccess: () => {
          setDeletingEntryId(null);
          setExpandedEntryId(null);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-bg-primary" testID="tracker-screen">
        <ActivityIndicator testID="tracker-loading" />
        <Text className="mt-2 text-text-secondary">Tracker wird geladen…</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-bg-primary px-4" testID="tracker-screen">
        <Text testID="tracker-error" className="text-center text-danger">
          Der Tracker konnte nicht geladen werden.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Safe-Area"): this tab screen renders with `headerShown: false`
    // (src/app/(app)/(tabs)/_layout.tsx), so nothing else accounts for the
    // top status-bar/notch/Dynamic-Island inset -- without this, the
    // "Tracker" title row would render partially underneath it on affected
    // devices. The bottom edge is already handled by the Tabs navigator's
    // own tab bar (which safe-area-pads itself), so only `top` is added
    // here, not `bottom`.
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg-primary" testID="tracker-screen">
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Text className="font-display text-xl text-text-primary">Tracker</Text>
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant="secondary"
            label="⚙️"
            testID="tracker-group-settings-button"
            accessibilityLabel="Einstellungen"
            onPress={() => router.push("/settings")}
          />
          <Button
            size="sm"
            variant="primary"
            label="💰"
            testID="tracker-log-payment-button"
            accessibilityLabel="Zahlung erfassen"
            onPress={() => setPaymentModalVisible(true)}
          />
        </View>
      </View>

      <View className="flex-row items-center gap-2 px-4 pt-3">
        <TextInput
          testID="tracker-search-input"
          className="flex-1 rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
          placeholder="Suchen…"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {searchedEntries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8" testID="tracker-empty">
          <Text className="text-center text-text-primary">Noch keine Zahlungen erfasst.</Text>
          <Text className="mt-1 text-center text-text-secondary">
            Tippe auf "💰", um eine Zahlung zu erfassen.
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row px-4 pt-3" testID="tracker-table-header">
            <Text className="flex-1 text-xs text-text-secondary">Film</Text>
            <Text className="w-24 text-xs text-text-secondary">Bezahlt von</Text>
            <Text className="w-28 text-right text-xs text-text-secondary">Datum</Text>
          </View>
          <FlatList
            testID="tracker-list"
            data={searchedEntries}
            keyExtractor={(entry) => entry.id}
            contentContainerClassName="px-4 pt-1"
            renderItem={({ item: entry }) => {
              const isExpanded = expandedEntryId === entry.id;
              const isEditing = editingEntryId === entry.id;
              const isDeleting = deletingEntryId === entry.id;
              const payerName = entry.paid_by_member_id
                ? memberDisplayLabel(entry.paid_by_member_id, displayNameById.get(entry.paid_by_member_id))
                : "–";

              return (
                <View testID={`tracker-row-${entry.id}`} className="border-b border-border-subtle">
                  <Pressable
                    testID={`tracker-row-${entry.id}-header`}
                    accessibilityRole="button"
                    onPress={() => toggleExpanded(entry.id)}
                    className="flex-row items-center py-3"
                  >
                    <Text className="flex-1 text-text-primary">{entry.movie.name}</Text>
                    <Text className="w-24 text-text-secondary">{payerName}</Text>
                    <Text
                      testID={`tracker-row-${entry.id}-date`}
                      numberOfLines={1}
                      className="w-28 text-right text-text-secondary">
                      {formatPlainDate(entry.paid_at)}
                    </Text>
                  </Pressable>

                  {isExpanded ? (
                    <View testID={`tracker-row-${entry.id}-expanded`} className="gap-2 pb-3">
                      {isDeleting ? (
                        <View testID={`tracker-row-${entry.id}-delete-confirm`} className="gap-2">
                          <Text className="text-text-primary">Wirklich löschen?</Text>
                          <View className="flex-row gap-2">
                            <Button
                              testID={`tracker-row-${entry.id}-delete-cancel-button`}
                              label="Abbrechen"
                              variant="secondary"
                              className="flex-1"
                              onPress={cancelDelete}
                            />
                            <Button
                              testID={`tracker-row-${entry.id}-delete-confirm-button`}
                              label="Löschen"
                              variant="danger"
                              className="flex-1"
                              loading={deletePaymentMutation.isPending}
                              onPress={() => confirmDelete(entry.id)}
                            />
                          </View>
                        </View>
                      ) : isEditing ? (
                        <View testID={`tracker-row-${entry.id}-edit-form`} className="gap-2">
                          <Text className="text-text-secondary">Bezahlt von</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {groupMembers.map((member) => {
                              const isSelected = editPayerId === member.user_id;
                              const color = memberColors.get(member.user_id);
                              const hint = daysSincePayment(
                                lastPaidByMember.get(member.user_id) ?? null,
                                new Date(),
                              );
                              return (
                                <Pressable
                                  key={member.user_id}
                                  testID={`tracker-row-${entry.id}-edit-payer-${member.user_id}`}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected: isSelected }}
                                  onPress={() => setEditPayerId(member.user_id)}
                                  className="items-center rounded-full px-3 py-1"
                                  // Inline style exception -- same documented,
                                  // narrow precedent as PaymentModal.tsx and
                                  // the M6-Cleanup MovieGrid progress-bar
                                  // exception: `color` is a runtime per-member
                                  // hex value, not a fixed enumerable set.
                                  style={
                                    isSelected
                                      ? { backgroundColor: color }
                                      : { borderWidth: 1, borderColor: color }
                                  }
                                >
                                  <Text
                                    className={isSelected ? "text-xs text-bg-primary" : "text-xs text-text-primary"}
                                  >
                                    {memberDisplayLabel(member.user_id, member.profiles?.display_name)}
                                  </Text>
                                  {hint ? (
                                    <Text
                                      testID={`tracker-row-${entry.id}-edit-payer-hint-${member.user_id}`}
                                      className={
                                        isSelected ? "text-[10px] text-bg-primary" : "text-[10px] text-text-secondary"
                                      }
                                    >
                                      {hint}
                                    </Text>
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </View>
                          <DateField
                            testID={`tracker-row-${entry.id}-edit-date-field`}
                            valueIso={editDateInput || null}
                            displayText={formatDateForInput(editDateInput)}
                            placeholder="Datum wählen"
                            onChangeIso={setEditDateInput}
                          />
                          <View className="flex-row gap-2">
                            <Button
                              testID={`tracker-row-${entry.id}-edit-cancel-button`}
                              label="Abbrechen"
                              variant="secondary"
                              className="flex-1"
                              onPress={cancelEdit}
                            />
                            <Button
                              testID={`tracker-row-${entry.id}-edit-save-button`}
                              label="Speichern"
                              className="flex-1"
                              disabled={!editPayerId}
                              loading={setPaymentMutation.isPending}
                              onPress={() => saveEdit(entry)}
                            />
                          </View>
                        </View>
                      ) : (
                        <View className="flex-row gap-2">
                          <Button
                            testID={`tracker-row-${entry.id}-edit-button`}
                            label="Bearbeiten"
                            variant="secondary"
                            className="flex-1"
                            onPress={() => startEdit(entry)}
                          />
                          <Button
                            testID={`tracker-row-${entry.id}-delete-button`}
                            label="Löschen"
                            variant="danger"
                            className="flex-1"
                            onPress={() => startDelete(entry.id)}
                          />
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        </>
      )}

      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        groupId={activeGroupId ?? ""}
        entries={allEntries}
        groupMembers={groupMembers}
        displayNameById={displayNameById as Map<string, string>}
        memberColors={memberColors}
      />
    </SafeAreaView>
  );
}
