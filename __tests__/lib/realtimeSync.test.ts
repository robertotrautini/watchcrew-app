// M10 (Realtime foreground sync): pure classification logic for
// src/lib/realtimeSync.ts. Kept dependency-free (no Supabase client, no
// React) so the ADR-0006 "which change matters, and what should the toast
// say" decision tree is fully unit-testable without mocking a Realtime
// channel — see src/hooks/useGroupRealtimeSync.ts for the wiring that
// actually opens the channel and reacts to these classifications.

import {
  classifyRatingsChange,
  classifyWatchlistEntriesChange,
  extractWatchlistEntryId,
  REALTIME_TOAST_COPY,
} from "@/lib/realtimeSync";

function payload(eventType: "INSERT" | "UPDATE" | "DELETE", newRow: Record<string, unknown> | null, oldRow: Record<string, unknown> | null) {
  return { eventType, new: newRow, old: oldRow };
}

describe("classifyWatchlistEntriesChange", () => {
  it("classifies an INSERT as a new watchlist entry", () => {
    const kind = classifyWatchlistEntriesChange(
      payload("INSERT", { id: "we-1", group_id: "g-1", paid_at: null }, null),
    );
    expect(kind).toBe("watchlist_entry_added");
  });

  it("classifies an UPDATE with paid_at transitioning null -> value as a payment recorded", () => {
    const kind = classifyWatchlistEntriesChange(
      payload(
        "UPDATE",
        { id: "we-1", group_id: "g-1", paid_at: "2026-09-20" },
        { id: "we-1", group_id: "g-1", paid_at: null },
      ),
    );
    expect(kind).toBe("payment_recorded");
  });

  it("classifies an UPDATE that already had a paid_at as 'other' (not a fresh payment)", () => {
    const kind = classifyWatchlistEntriesChange(
      payload(
        "UPDATE",
        { id: "we-1", group_id: "g-1", paid_at: "2026-09-21" },
        { id: "we-1", group_id: "g-1", paid_at: "2026-09-20" },
      ),
    );
    expect(kind).toBe("other");
  });

  it("classifies an UPDATE unrelated to paid_at as 'other'", () => {
    const kind = classifyWatchlistEntriesChange(
      payload(
        "UPDATE",
        { id: "we-1", group_id: "g-1", paid_at: null, added_by: "user-2" },
        { id: "we-1", group_id: "g-1", paid_at: null, added_by: "user-1" },
      ),
    );
    expect(kind).toBe("other");
  });

  it("classifies a DELETE as 'other'", () => {
    const kind = classifyWatchlistEntriesChange(payload("DELETE", null, { id: "we-1", group_id: "g-1", paid_at: null }));
    expect(kind).toBe("other");
  });
});

describe("classifyRatingsChange", () => {
  it("classifies an INSERT as a first rating", () => {
    const kind = classifyRatingsChange(payload("INSERT", { id: "r-1", watchlist_entry_id: "we-1", rating: 4 }, null));
    expect(kind).toBe("rating_first");
  });

  it("classifies an UPDATE (a rating correction, per ADR 0006) as 'other'", () => {
    const kind = classifyRatingsChange(
      payload(
        "UPDATE",
        { id: "r-1", watchlist_entry_id: "we-1", rating: 5 },
        { id: "r-1", watchlist_entry_id: "we-1", rating: 4 },
      ),
    );
    expect(kind).toBe("other");
  });

  it("classifies a DELETE as 'other'", () => {
    const kind = classifyRatingsChange(payload("DELETE", null, { id: "r-1", watchlist_entry_id: "we-1", rating: 4 }));
    expect(kind).toBe("other");
  });
});

describe("extractWatchlistEntryId", () => {
  it("reads watchlist_entry_id from the new row when present (INSERT/UPDATE)", () => {
    expect(extractWatchlistEntryId(payload("INSERT", { watchlist_entry_id: "we-1" }, null))).toBe("we-1");
  });

  it("falls back to the old row when new is null (DELETE)", () => {
    expect(extractWatchlistEntryId(payload("DELETE", null, { watchlist_entry_id: "we-2" }))).toBe("we-2");
  });

  it("returns undefined when neither row carries the field", () => {
    expect(extractWatchlistEntryId(payload("DELETE", null, null))).toBeUndefined();
  });
});

describe("REALTIME_TOAST_COPY", () => {
  it("has German copy for every kind that should ever toast, and null for the silent-only 'other' kind", () => {
    expect(REALTIME_TOAST_COPY.watchlist_entry_added).toBe("Neuer Film zur Watchlist hinzugefügt");
    expect(REALTIME_TOAST_COPY.rating_first).toBe("Jemand hat einen Film bewertet");
    expect(REALTIME_TOAST_COPY.payment_recorded).toBe("Eine Zahlung wurde erfasst");
    expect(REALTIME_TOAST_COPY.other).toBeNull();
  });
});
