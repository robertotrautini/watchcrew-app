import { queryKeys } from "@/lib/queryKeys";
// M10 (Realtime foreground sync, ADR 0006): src/hooks/useGroupRealtimeSync.ts.
//
// IMPORTANT scope note (per task instructions): a real Supabase Realtime
// WebSocket connection cannot be exercised headlessly here. The
// `supabase.channel(...).on(...).on(...).subscribe()` chain is mocked below
// to the exact shape src/lib/supabase.ts's `RealtimeChannel` API exposes
// (verified against node_modules/@supabase/realtime-js's type defs) --
// these tests verify the hook's OWN decision logic (which table/filter it
// subscribes with, and the silent-update-vs-toast-vs-noop branching once a
// change event fires) against that mocked contract. Real server-side
// filtering/delivery behavior of Supabase Realtime itself is NOT verified
// by these tests.

import { act, renderHook } from "@testing-library/react-native";

const mockInvalidateQueries = jest.fn();
const mockGetQueryData = jest.fn();
// A single stable object (not a fresh literal per call) -- otherwise
// `useQueryClient()` would return a new reference on every render, which
// would needlessly re-trigger the hook's `useEffect` (dependency array
// includes `queryClient`) on renders that aren't actually testing re-sync
// behavior.
const mockQueryClient = { invalidateQueries: mockInvalidateQueries, getQueryData: mockGetQueryData };
const mockUseQueryClient = jest.fn(() => mockQueryClient);
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: mockUseQueryClient,
}));

const mockShowToast = jest.fn();
jest.mock("@/lib/toast", () => ({
  showToast: mockShowToast,
}));

// Chainable mock channel: `.on()` returns itself (so a second `.on()` call
// can be chained) and records each registered (event, filterConfig,
// callback) triple so tests can trigger them directly, exactly like
// src/hooks/useGroupRealtimeSync.ts registers them.
let registeredHandlers: Array<{ table: string; filter?: string; callback: (payload: unknown) => void }>;
let mockSubscribe: jest.Mock;
let mockOn: jest.Mock;
let mockChannel: { on: jest.Mock; subscribe: jest.Mock };
let mockChannelFn: jest.Mock;
let mockRemoveChannel: jest.Mock;

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannelFn(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

function loadHook() {
  return require("@/hooks/useGroupRealtimeSync");
}

async function fireChange(table: string, payload: unknown) {
  const handler = registeredHandlers.find((h) => h.table === table);
  if (!handler) {
    throw new Error(`No handler registered for table "${table}"`);
  }
  await act(async () => {
    handler.callback(payload);
  });
}

describe("useGroupRealtimeSync", () => {
  const { AppState } = require("react-native");

  beforeEach(() => {
    jest.clearAllMocks();
    registeredHandlers = [];
    mockOn = jest.fn((_type: string, config: { table: string; filter?: string }, callback: (payload: unknown) => void) => {
      registeredHandlers.push({ table: config.table, filter: config.filter, callback });
      return mockChannel;
    });
    mockSubscribe = jest.fn(() => mockChannel);
    mockChannel = { on: mockOn, subscribe: mockSubscribe };
    mockChannelFn = jest.fn(() => mockChannel);
    mockRemoveChannel = jest.fn();

    // Default: app foreground, no cached watchlist data, not focused anywhere.
    AppState.currentState = "active";
    mockGetQueryData.mockReturnValue(undefined);

    const { useFocusedGroupScreen } = require("@/stores/useFocusedGroupScreen");
    useFocusedGroupScreen.setState({ focusedGroupId: null });
  });

  it("does nothing (no channel) when groupId is undefined", async () => {
    const { useGroupRealtimeSync } = loadHook();
    await renderHook(() => useGroupRealtimeSync(undefined));
    expect(mockChannelFn).not.toHaveBeenCalled();
  });

  it("opens a channel and subscribes to watchlist_entries filtered by the active group, and to ratings unfiltered", async () => {
    const { useGroupRealtimeSync } = loadHook();
    await renderHook(() => useGroupRealtimeSync("group-1"));

    expect(mockChannelFn).toHaveBeenCalledWith("group-realtime-sync-group-1");
    expect(mockOn).toHaveBeenCalledTimes(2);

    const watchlistCall = mockOn.mock.calls.find((c) => c[1].table === "watchlist_entries");
    expect(watchlistCall[1]).toMatchObject({
      schema: "public",
      table: "watchlist_entries",
      filter: "group_id=eq.group-1",
    });

    const ratingsCall = mockOn.mock.calls.find((c) => c[1].table === "ratings");
    expect(ratingsCall[1]).toMatchObject({ schema: "public", table: "ratings" });
    expect(ratingsCall[1].filter).toBeUndefined();

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("removes the channel on unmount", async () => {
    const { useGroupRealtimeSync } = loadHook();
    const { unmount } = await renderHook(() => useGroupRealtimeSync("group-1"));

    await unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("re-subscribes to a new channel when the groupId changes", async () => {
    const { useGroupRealtimeSync } = loadHook();
    const { rerender } = await renderHook(({ groupId }: { groupId: string }) => useGroupRealtimeSync(groupId), {
      initialProps: { groupId: "group-1" },
    });

    await rerender({ groupId: "group-2" });

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    expect(mockChannelFn).toHaveBeenCalledWith("group-realtime-sync-group-2");
  });

  describe("watchlist_entries change handling", () => {
    it("always invalidates the group's watchlist cache", async () => {
      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("watchlist_entries", { eventType: "INSERT", new: { id: "we-1", group_id: "group-1" }, old: null });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.byGroup("group-1") });
    });

    it("ADR-0006 branch 1: foreground + currently on the affected screen -> silent, no toast", async () => {
      const { useFocusedGroupScreen } = require("@/stores/useFocusedGroupScreen");
      useFocusedGroupScreen.setState({ focusedGroupId: "group-1" });
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("watchlist_entries", { eventType: "INSERT", new: { id: "we-1", group_id: "group-1" }, old: null });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("ADR-0006 branch 2: foreground + on a DIFFERENT screen -> toast with the new-entry copy", async () => {
      const { useFocusedGroupScreen } = require("@/stores/useFocusedGroupScreen");
      useFocusedGroupScreen.setState({ focusedGroupId: null });
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("watchlist_entries", { eventType: "INSERT", new: { id: "we-1", group_id: "group-1" }, old: null });

      expect(mockShowToast).toHaveBeenCalledWith("Neuer Film zur Watchlist hinzugefügt");
    });

    it("ADR-0006 branch 2, focused on a DIFFERENT group's screen still toasts for this group", async () => {
      const { useFocusedGroupScreen } = require("@/stores/useFocusedGroupScreen");
      useFocusedGroupScreen.setState({ focusedGroupId: "some-other-group" });
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("watchlist_entries", { eventType: "INSERT", new: { id: "we-1", group_id: "group-1" }, old: null });

      expect(mockShowToast).toHaveBeenCalledWith("Neuer Film zur Watchlist hinzugefügt");
    });

    it("ADR-0006 branch 3: app backgrounded -> no toast at all (parallel push task's job), but still invalidates", async () => {
      const { useFocusedGroupScreen } = require("@/stores/useFocusedGroupScreen");
      useFocusedGroupScreen.setState({ focusedGroupId: null });
      AppState.currentState = "background";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("watchlist_entries", { eventType: "INSERT", new: { id: "we-1", group_id: "group-1" }, old: null });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("toasts the payment-recorded copy when paid_at transitions null -> value, even off-screen", async () => {
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("watchlist_entries", {
        eventType: "UPDATE",
        new: { id: "we-1", group_id: "group-1", paid_at: "2026-09-20" },
        old: { id: "we-1", group_id: "group-1", paid_at: null },
      });

      expect(mockShowToast).toHaveBeenCalledWith("Eine Zahlung wurde erfasst");
    });

    it("does not toast for a change classified as 'other' (e.g. a DELETE), even off-screen and foregrounded", async () => {
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("watchlist_entries", { eventType: "DELETE", new: null, old: { id: "we-1", group_id: "group-1" } });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe("BUG REPRO: concurrently-mounted screens sharing the same active group (real Watchlist-tab crash)", () => {
    // Tracker/Watchlist/Tagebuch all call this hook with the SAME
    // `activeGroupId` (see this hook's own module comment), and
    // expo-router/react-navigation keeps visited tab screens mounted (no
    // `unmountOnBlur`) -- so once a user has visited more than one of the
    // three tabs, more than one mounted screen calls this hook for the same
    // group at once.
    //
    // supabase-js's REAL `RealtimeClient.channel(topic)` dedupes by topic
    // string: "If a channel with the same topic already exists it will be
    // returned instead of creating a duplicate connection" (see
    // node_modules/@supabase/realtime-js/dist/main/RealtimeClient.js's
    // `channel()` doc comment/implementation). And its REAL `.on()` throws
    // once the channel is joined/joining: "cannot add `postgres_changes`
    // callbacks for <topic> after `subscribe()`." (RealtimeChannel.js's
    // `on()`). The default mock elsewhere in this file (a single canned
    // `mockChannel` returned unconditionally) does NOT model this dedup, so
    // this describe block installs a faithful, topic-keyed replacement for
    // this test only, matching the exact real-world contract that produced
    // the confirmed crash.
    it("does not throw supabase-js's real 'cannot add postgres_changes callbacks after subscribe()' error when two screens mount for the same groupId", async () => {
      const channelsByTopic = new Map<string, { channel: { on: jest.Mock; subscribe: jest.Mock }; subscribed: boolean }>();

      mockChannelFn.mockImplementation((topic: string) => {
        const existing = channelsByTopic.get(topic);
        if (existing) {
          return existing.channel;
        }
        const entry: { channel: { on: jest.Mock; subscribe: jest.Mock }; subscribed: boolean } = {
          channel: null as any,
          subscribed: false,
        };
        const on = jest.fn((type: string, config: { table: string; filter?: string }, callback: (payload: unknown) => void) => {
          if (entry.subscribed) {
            // The exact real supabase-js error text (RealtimeChannel.js's `on()`).
            throw new Error(`cannot add \`${type}\` callbacks for realtime:${topic} after \`subscribe()\`.`);
          }
          registeredHandlers.push({ table: config.table, filter: config.filter, callback });
          return entry.channel;
        });
        const subscribe = jest.fn(() => {
          entry.subscribed = true;
          return entry.channel;
        });
        entry.channel = { on, subscribe };
        channelsByTopic.set(topic, entry);
        return entry.channel;
      });

      mockRemoveChannel.mockImplementation((channel: { on: jest.Mock; subscribe: jest.Mock }) => {
        for (const [topic, entry] of channelsByTopic) {
          if (entry.channel === channel) {
            channelsByTopic.delete(topic);
          }
        }
      });

      const { useGroupRealtimeSync } = loadHook();

      // Two independent call sites for the SAME groupId, mounted in the same
      // commit -- standing in for Tracker + Watchlist both being mounted at
      // once with the same active group.
      let renderError: unknown = null;
      await act(async () => {
        try {
          renderHook(() => {
            useGroupRealtimeSync("group-1");
            useGroupRealtimeSync("group-1");
          });
        } catch (err) {
          renderError = err;
        }
      });

      expect(renderError).toBeNull();
      // Exactly one real channel/subscription for the shared group, not two.
      expect(mockChannelFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("ratings change handling (no group_id column -- client-side membership check)", () => {
    it("ignores a ratings change for an entry NOT in the active group's cached watchlist", async () => {
      mockGetQueryData.mockReturnValue({ entries: [{ id: "we-other-group" }], streamingAvailability: new Map() });

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("ratings", { eventType: "INSERT", new: { id: "r-1", watchlist_entry_id: "we-1" }, old: null });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("ignores a ratings change entirely when the active group's watchlist isn't cached yet", async () => {
      mockGetQueryData.mockReturnValue(undefined);

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("ratings", { eventType: "INSERT", new: { id: "r-1", watchlist_entry_id: "we-1" }, old: null });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it("handles a ratings change for an entry that DOES belong to the active group's cached watchlist", async () => {
      mockGetQueryData.mockReturnValue({ entries: [{ id: "we-1" }], streamingAvailability: new Map() });
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("ratings", { eventType: "INSERT", new: { id: "r-1", watchlist_entry_id: "we-1" }, old: null });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.byGroup("group-1") });
      expect(mockShowToast).toHaveBeenCalledWith("Jemand hat einen Film bewertet");
    });

    it("does not toast a rating CORRECTION (UPDATE) even for a matching entry, but does invalidate", async () => {
      mockGetQueryData.mockReturnValue({ entries: [{ id: "we-1" }], streamingAvailability: new Map() });
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("ratings", {
        eventType: "UPDATE",
        new: { id: "r-1", watchlist_entry_id: "we-1", rating: 5 },
        old: { id: "r-1", watchlist_entry_id: "we-1", rating: 4 },
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.byGroup("group-1") });
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("silently updates (no toast) for a matching entry's rating when the user is on the affected screen", async () => {
      mockGetQueryData.mockReturnValue({ entries: [{ id: "we-1" }], streamingAvailability: new Map() });
      const { useFocusedGroupScreen } = require("@/stores/useFocusedGroupScreen");
      useFocusedGroupScreen.setState({ focusedGroupId: "group-1" });
      AppState.currentState = "active";

      const { useGroupRealtimeSync } = loadHook();
      await renderHook(() => useGroupRealtimeSync("group-1"));

      await fireChange("ratings", { eventType: "INSERT", new: { id: "r-1", watchlist_entry_id: "we-1" }, old: null });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
