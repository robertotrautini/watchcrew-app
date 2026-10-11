// M10 (Realtime foreground sync): pure classification logic for
// src/lib/realtimeSync.ts. Kept dependency-free (no Supabase client, no
// React) so the ADR-0006 "which change matters, and what should the toast
// say" decision tree is fully unit-testable without mocking a Realtime
// channel — see src/hooks/useGroupRealtimeSync.ts for the wiring that
// actually opens the channel and reacts to these classifications.

import {
  classifyRatingsChange,
  classifyWatchlistEntriesChange,
  extractMovieId,
} from "@/lib/realtimeSync";

function payload(eventType: "INSERT" | "UPDATE" | "DELETE", newRow: Record<string, unknown> | null, oldRow: Record<string, unknown> | null) {
  return { eventType, new: newRow, old: oldRow };
}

describe("classifyWatchlistEntriesChange", () => {
  it("classifies an INSERT as a new watchlist entry", () => {
    const kind = classifyWatchlistEntriesChange(
      payload("INSERT", { id: "m-1", group_id: "g-1", paid_at: null }, null),
    );
    expect(kind).toBe("watchlist_entry_added");
  });

  it("classifies an UPDATE with paid_at transitioning null -> value as a payment recorded", () => {
    const kind = classifyWatchlistEntriesChange(
      payload(
        "UPDATE",
        { id: "m-1", group_id: "g-1", paid_at: "2026-09-20" },
        { id: "m-1", group_id: "g-1", paid_at: null },
      ),
    );
    expect(kind).toBe("payment_recorded");
  });

  it("classifies an UPDATE that already had a paid_at as 'other' (not a fresh payment)", () => {
    const kind = classifyWatchlistEntriesChange(
      payload(
        "UPDATE",
        { id: "m-1", group_id: "g-1", paid_at: "2026-09-21" },
        { id: "m-1", group_id: "g-1", paid_at: "2026-09-20" },
      ),
    );
    expect(kind).toBe("other");
  });

  it("classifies an UPDATE unrelated to paid_at as 'other'", () => {
    const kind = classifyWatchlistEntriesChange(
      payload(
        "UPDATE",
        { id: "m-1", group_id: "g-1", paid_at: null, added_by: "user-2" },
        { id: "m-1", group_id: "g-1", paid_at: null, added_by: "user-1" },
      ),
    );
    expect(kind).toBe("other");
  });

  it("classifies a DELETE as 'other'", () => {
    const kind = classifyWatchlistEntriesChange(payload("DELETE", null, { id: "m-1", group_id: "g-1", paid_at: null }));
    expect(kind).toBe("other");
  });
});

describe("classifyRatingsChange", () => {
  it("classifies an INSERT as a first rating", () => {
    const kind = classifyRatingsChange(payload("INSERT", { id: "r-1", movie_id: "m-1", rating: 4 }, null));
    expect(kind).toBe("rating_first");
  });

  it("classifies an UPDATE (a rating correction, per ADR 0006) as 'other'", () => {
    const kind = classifyRatingsChange(
      payload(
        "UPDATE",
        { id: "r-1", movie_id: "m-1", rating: 5 },
        { id: "r-1", movie_id: "m-1", rating: 4 },
      ),
    );
    expect(kind).toBe("other");
  });

  it("classifies a DELETE as 'other'", () => {
    const kind = classifyRatingsChange(payload("DELETE", null, { id: "r-1", movie_id: "m-1", rating: 4 }));
    expect(kind).toBe("other");
  });
});

describe("extractMovieId", () => {
  it("reads movie_id from the new row when present (INSERT/UPDATE)", () => {
    expect(extractMovieId(payload("INSERT", { movie_id: "m-1" }, null))).toBe("m-1");
  });

  it("falls back to the old row when new is null (DELETE)", () => {
    expect(extractMovieId(payload("DELETE", null, { movie_id: "m-2" }))).toBe("m-2");
  });

  it("returns undefined when neither row carries the field", () => {
    expect(extractMovieId(payload("DELETE", null, null))).toBeUndefined();
  });
});

describe("extractUserId", () => {
  const { extractUserId } = require("@/lib/realtimeSync");

  it("reads user_id from the new row, else from the old row (DELETE)", () => {
    expect(extractUserId({ eventType: "INSERT", new: { user_id: "u1" }, old: null })).toBe("u1");
    expect(extractUserId({ eventType: "DELETE", new: null, old: { user_id: "u2" } })).toBe("u2");
    expect(extractUserId({ eventType: "UPDATE", new: {}, old: null })).toBeUndefined();
  });
});
