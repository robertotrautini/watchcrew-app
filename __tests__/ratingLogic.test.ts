// M7 part 2b (Rating-Dialog): pure-function tests for src/lib/ratingLogic.ts.
//
// `resolvePaymentDate`'s 4-branch priority chain is this feature's single
// most bug-prone rule per the project's own bugfix history (see the task
// brief) — every branch gets its own dedicated test below, including the
// "falsy but not null" edge cases (empty string) that a naive
// `??`-based implementation would get wrong.

import {
  buildRatingUpsertPayload,
  formatDateForInput,
  parseGermanDateInput,
  resolvePaymentDate,
  resolveSeenAtDate,
} from "../src/lib/ratingLogic";

describe("resolvePaymentDate", () => {
  const NOW = new Date("2026-09-20T12:00:00.000Z");

  it("branch 1: an explicitly-passed new payment date wins over everything else", () => {
    const result = resolvePaymentDate("2026-09-15", "2026-09-01T00:00:00.000Z", "2026-09-10", NOW);
    expect(result).toBe("2026-09-15");
  });

  it("branch 2: an existing paid_at is preserved when no explicit date is given", () => {
    const result = resolvePaymentDate(null, "2026-09-01T00:00:00.000Z", "2026-09-10", NOW);
    expect(result).toBe("2026-09-01T00:00:00.000Z");
  });

  it("branch 2 (undefined explicit): same as null -- treated as 'not passed'", () => {
    const result = resolvePaymentDate(undefined, "2026-09-01T00:00:00.000Z", "2026-09-10", NOW);
    expect(result).toBe("2026-09-01T00:00:00.000Z");
  });

  it("branch 3: falls back to the dialog's own 'Gesehen am' date when there's no explicit date and no existing paid_at", () => {
    const result = resolvePaymentDate(null, null, "2026-09-10", NOW);
    expect(result).toBe("2026-09-10");
  });

  it("branch 4: falls back to 'now' as the final fallback when nothing else is available", () => {
    const result = resolvePaymentDate(null, null, null, NOW);
    expect(result).toBe(NOW.toISOString());
  });

  it("treats an empty-string explicitDate as 'not passed', not as a real value (falls through to branch 2)", () => {
    const result = resolvePaymentDate("", "2026-09-01T00:00:00.000Z", "2026-09-10", NOW);
    expect(result).toBe("2026-09-01T00:00:00.000Z");
  });

  it("treats an empty-string existingPaidAt as 'not set', not as a real value (falls through to branch 3)", () => {
    const result = resolvePaymentDate(null, "", "2026-09-10", NOW);
    expect(result).toBe("2026-09-10");
  });

  it("treats a null seenAtDate ('Weiß nicht' was checked) as 'not available', falling through to branch 4", () => {
    const result = resolvePaymentDate(null, null, null, NOW);
    expect(result).toBe(NOW.toISOString());
  });

  it("never mutates its now argument", () => {
    const now = new Date("2026-09-20T12:00:00.000Z");
    const beforeIso = now.toISOString();
    resolvePaymentDate(null, null, null, now);
    expect(now.toISOString()).toBe(beforeIso);
  });
});

describe("resolveSeenAtDate", () => {
  it("'unknown' mode ('Weiß nicht' checked) always resolves to null, regardless of any dates present", () => {
    expect(resolveSeenAtDate("unknown", "2026-09-10", "2026-09-01")).toBeNull();
  });

  it("'release_date' mode adopts the movie's release date", () => {
    expect(resolveSeenAtDate("release_date", "2026-09-10", "2026-09-01")).toBe("2026-09-01");
  });

  it("'release_date' mode resolves to null if the movie has no release date (defensive -- UI should disable this option in that case)", () => {
    expect(resolveSeenAtDate("release_date", "2026-09-10", null)).toBeNull();
  });

  it("'manual' mode uses the manually-entered date as-is", () => {
    expect(resolveSeenAtDate("manual", "2026-09-10", "2026-09-01")).toBe("2026-09-10");
  });

  it("'manual' mode with no manual date yet resolves to null", () => {
    expect(resolveSeenAtDate("manual", null, "2026-09-01")).toBeNull();
  });
});

describe("buildRatingUpsertPayload", () => {
  const NOW = new Date("2026-09-20T12:00:00.000Z");

  it("shapes the full payload, keeping seen_at and rated_at as separate, independent fields", () => {
    const payload = buildRatingUpsertPayload({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      rating: 4.5,
      liked: true,
      seenAt: "2026-09-10",
      now: NOW,
    });

    expect(payload).toEqual({
      watchlist_entry_id: "we-1",
      member_id: "user-1",
      rating: 4.5,
      liked: true,
      seen_at: "2026-09-10",
      rated_at: NOW.toISOString(),
    });
  });

  it("always sets rated_at to the given 'now', even when seen_at is null ('Weiß nicht')", () => {
    const payload = buildRatingUpsertPayload({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      rating: 3,
      liked: false,
      seenAt: null,
      now: NOW,
    });

    expect(payload.seen_at).toBeNull();
    expect(payload.rated_at).toBe(NOW.toISOString());
  });

  it("passes rating=null through unchanged (e.g. a not-yet-rated direct-rate row before the user taps a star)", () => {
    const payload = buildRatingUpsertPayload({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      rating: null,
      liked: false,
      seenAt: "2026-09-10",
      now: NOW,
    });

    expect(payload.rating).toBeNull();
  });
});

describe("parseGermanDateInput / formatDateForInput", () => {
  it("parses a well-formed DD.MM.YYYY string into YYYY-MM-DD", () => {
    expect(parseGermanDateInput("10.09.2026")).toBe("2026-09-10");
  });

  it("formats a YYYY-MM-DD string back into DD.MM.YYYY", () => {
    expect(formatDateForInput("2026-09-10")).toBe("10.09.2026");
  });

  it("round-trips through both directions", () => {
    const iso = "2026-01-05";
    expect(parseGermanDateInput(formatDateForInput(iso))).toBe(iso);
  });

  it("formatDateForInput returns an empty string for null (no date set yet)", () => {
    expect(formatDateForInput(null)).toBe("");
  });

  it("parseGermanDateInput returns null for an empty string", () => {
    expect(parseGermanDateInput("")).toBeNull();
  });

  it("parseGermanDateInput returns null for a malformed string", () => {
    expect(parseGermanDateInput("not a date")).toBeNull();
    expect(parseGermanDateInput("10-09-2026")).toBeNull();
    expect(parseGermanDateInput("32.13.2026")).toBeNull();
  });
});
