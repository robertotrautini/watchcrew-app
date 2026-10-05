import { useMemo, useState } from "react";
import { useParallaxScroll } from "@/components/parallaxContext";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";

import { TrackerEntrySheet } from "@/components/movie/TrackerEntrySheet";
import { PaymentModal } from "@/components/movie/PaymentModal";
import { Button, BUTTON_ICON_COLORS } from "@/components/ui/Button";
import { AppHeader } from "@/components/ui/AppHeader";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { Glass, GLASS_SEARCH_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import { formatPlainDate } from "@/lib/dateFormat";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import { assignMemberColors, getPaidEntries } from "@/lib/trackerLogic";
import { searchEntries } from "@/lib/watchlistLogic";

/**
 * M8: the Bezahl-Tracker screen (third tab). Single flat table view -- NO
 * card/grid/list toggle, unlike Watchlist/Tagebuch (per the task spec).
 *
 * Governing rule (confirmed, twice-reinforced in feature-inventory.md):
 * the table shows ONLY entries that already have `paid_at` set -- a movie
 * that's been rated but not yet paid for does NOT appear here. See
 * `getPaidEntries` (src/lib/trackerLogic.ts).
 *
 * M9 part 2 addition, UPDATED for M10: a gear header button, now navigating
 * to the real Settings hub (`/settings`,
 * src/app/(app)/(modals)/settings.tsx) instead of straight to Group-Settings
 * -- Group-Settings is one of that hub's sub-sections now (see the hub's own
 * "Gruppe verwalten" row), not a standalone destination from here anymore.
 */

export default function TrackerScreen() {
  const parallaxScroll = useParallaxScroll();
  const currentUserId = useCurrentUserId();
  // M9 part 2: real, persisted active-group resolution (replaces the former
  // "first group = active group" interim simplification) -- see
  // src/hooks/useActiveGroup.ts.
  const { activeGroupId, groupsQuery: userGroupsQuery } =
    useActiveGroup(currentUserId);

  // M10 (Realtime foreground sync, ADR 0006): see the identical comment in
  // src/app/(app)/(tabs)/watchlist.tsx -- same wiring, same reasoning.
  useGroupRealtimeSync(activeGroupId);
  useRegisterFocusedGroupScreen(activeGroupId);

  const groupMembersQuery = useGroupMembers(activeGroupId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const isLoading =
    userGroupsQuery.isLoading ||
    groupMembersQuery.isLoading ||
    watchlistQuery.isLoading;
  const isError =
    userGroupsQuery.isError ||
    groupMembersQuery.isError ||
    watchlistQuery.isError;

  const allEntries = useMemo(
    () => watchlistQuery.data?.entries ?? [],
    [watchlistQuery.data],
  );
  const groupMembers = useMemo(
    () => groupMembersQuery.data ?? [],
    [groupMembersQuery.data],
  );
  const memberColors = useMemo(
    () => assignMemberColors(groupMembers),
    [groupMembers],
  );
  const displayNameById = useMemo(
    () =>
      new Map(
        groupMembers.map((m) => [m.user_id, m.profiles?.display_name ?? null]),
      ),
    [groupMembers],
  );

  const paidEntries = useMemo(() => getPaidEntries(allEntries), [allEntries]);
  const searchedEntries = useMemo(
    () => searchEntries(paidEntries, searchQuery),
    [paidEntries, searchQuery],
  );

  const selectedEntry = useMemo(
    () => paidEntries.find((e) => e.id === selectedEntryId) ?? null,
    [paidEntries, selectedEntryId],
  );

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center"
        testID="tracker-screen"
      >
        <ActivityIndicator testID="tracker-loading" />
        <Text className="mt-2 text-text-secondary">Tracker wird geladen…</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center px-4"
        testID="tracker-screen"
      >
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
    <SafeAreaView edges={["top"]} className="flex-1" testID="tracker-screen">
      <AppHeader
        title="Tracker"
        settingsTestID="tracker-group-settings-button"
      />

      <Glass
        variant="strong"
        className="mx-4 mt-3 flex-row items-center gap-3 p-3"
      >
        <TextInput
          testID="tracker-search-input"
          className={GLASS_SEARCH_INPUT_CLASSNAME}
          placeholder="Film suchen…"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Button
          testID="tracker-log-payment-button"
          variant="primary"
          iconOnly
          accessibilityLabel="Zahlung erfassen"
          onPress={() => setPaymentModalVisible(true)}
        >
          <Icon name="price" size="M" color={BUTTON_ICON_COLORS.primary} />
        </Button>
      </Glass>

      {searchedEntries.length === 0 ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="tracker-empty"
        >
          <Text className="text-center text-text-primary">
            Noch keine Zahlungen erfasst.
          </Text>
          <Text className="mt-1 text-center text-text-secondary">
            Tippe auf den Geld-Button, um eine Zahlung zu erfassen.
          </Text>
        </View>
      ) : (
        <ScrollView
          {...parallaxScroll}
          testID="tracker-list"
          className="flex-1"
          contentContainerClassName="px-4 pb-3 pt-3"
        >
          <Glass className="px-3 pb-1 pt-3">
            <View
              className="flex-row border-b border-glass-border pb-2"
              testID="tracker-table-header"
            >
              <Text className="flex-1 text-sm text-text-secondary">Film</Text>
              <Text className="w-24 text-sm text-text-secondary">
                Bezahlt von
              </Text>
              <Text className="w-28 text-right text-sm text-text-secondary">
                Datum
              </Text>
            </View>
            {searchedEntries.map((entry, entryIndex) => {
              const payerName = entry.paid_by_member_id
                ? memberDisplayLabel(
                    entry.paid_by_member_id,
                    displayNameById.get(entry.paid_by_member_id),
                  )
                : "–";
              const payerColor = entry.paid_by_member_id
                ? memberColors.get(entry.paid_by_member_id)
                : undefined;

              return (
                <FadeInItem
                  key={entry.id}
                  index={entryIndex}
                  replayTab="tracker"
                >
                  <View
                    testID={`tracker-row-${entry.id}`}
                    className={
                      entryIndex < searchedEntries.length - 1
                        ? "border-b border-glass-border"
                        : ""
                    }
                  >
                    <Pressable
                      testID={`tracker-row-${entry.id}-header`}
                      accessibilityRole="button"
                      onPress={() => setSelectedEntryId(entry.id)}
                      className="flex-row items-center py-3"
                    >
                      <Text
                        numberOfLines={2}
                        className="flex-1 pr-2 text-text-primary"
                      >
                        {entry.movie.name}
                      </Text>
                      <Text
                        testID={`tracker-row-${entry.id}-payer`}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="w-24 pr-2 font-semibold text-text-secondary"
                        // Inline style exception (same documented precedent as
                        // the payer chips below): per-member runtime hex colour.
                        style={payerColor ? { color: payerColor } : undefined}
                      >
                        {payerName}
                      </Text>
                      <Text
                        testID={`tracker-row-${entry.id}-date`}
                        numberOfLines={1}
                        className="w-28 text-right text-text-secondary"
                      >
                        {formatPlainDate(entry.paid_at)}
                      </Text>
                    </Pressable>
                  </View>
                </FadeInItem>
              );
            })}
          </Glass>
        </ScrollView>
      )}

      <TrackerEntrySheet
        entry={selectedEntry}
        onClose={() => setSelectedEntryId(null)}
        groupId={activeGroupId ?? ""}
        groupMembers={groupMembers}
        memberColors={memberColors}
      />

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
