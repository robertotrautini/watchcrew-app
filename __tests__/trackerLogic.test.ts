// M8 (Bezahl-Tracker): pure-function tests for src/lib/trackerLogic.ts.
//
// `computeNextPayer`'s tie-breaking and the "only paid entries, sorted
// paid_at desc" filter are this feature's most bug-prone rules (per the
// task brief) -- every branch gets its own dedicated test.

import {
  assignMemberColors,
  computeNextPayer,
  daysSincePayment,
  getLastPaidAtByMember,
  getPaidEntries,
  getUnpaidDiaryEntries,
} from "../src/lib/trackerLogic";
import type { GroupMemberRow } from "../src/lib/groups";
import type { Rating, WatchlistEntry } from "../src/lib/watchlistTypes";

function makeMovie(overrides: Partial<WatchlistEntry["movie"]> = {}): WatchlistEntry["movie"] {
  return {
    id: "movie-x",
    tmdb_id: 1,
    name: "Movie X",
    release_date: null,
    poster: null,
    overview: null,
    runtime: null,
    director: null,
    director_id: null,
    vote_average: null,
    ...overrides,
  };
}

function makeRating(overrides: Partial<Rating> = {}): Rating {
  return {
    id: "r1",
    watchlist_entry_id: "we-1",
    member_id: "u1",
    rating: null,
    liked: false,
    seen_at: null,
    rated_at: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WatchlistEntry> = {}): WatchlistEntry {
  return {
    id: "entry-x",
    group_id: "g1",
    movie_id: "movie-x",
    added_at: "2026-01-01T00:00:00Z",
    added_by: "u1",
    paid_by_member_id: null,
    paid_at: null,
    movie: makeMovie(),
    ratings: [],
    ...overrides,
  };
}

function makeMember(userId: string, joinedAt: string): GroupMemberRow {
  return {
    group_id: "g1",
    user_id: userId,
    role: "member",
    joined_at: joinedAt,
    profiles: { display_name: userId },
  };
}

describe("getPaidEntries", () => {
  it("excludes entries with no paid_at (rated but not yet paid)", () => {
    const paid = makeEntry({ id: "e1", paid_at: "2026-09-01T00:00:00.000Z" });
    const unpaid = makeEntry({ id: "e2", paid_at: null });

    expect(getPaidEntries([paid, unpaid])).toEqual([paid]);
  });

  it("sorts by paid_at descending -- newest payment first", () => {
    const oldest = makeEntry({ id: "e1", paid_at: "2026-08-01T00:00:00.000Z" });
    const newest = makeEntry({ id: "e2", paid_at: "2026-09-15T00:00:00.000Z" });
    const middle = makeEntry({ id: "e3", paid_at: "2026-09-01T00:00:00.000Z" });

    expect(getPaidEntries([oldest, newest, middle]).map((e) => e.id)).toEqual(["e2", "e3", "e1"]);
  });

  it("returns an empty array when nothing has been paid yet", () => {
    expect(getPaidEntries([makeEntry({ paid_at: null })])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const entries = [
      makeEntry({ id: "e1", paid_at: "2026-08-01T00:00:00.000Z" }),
      makeEntry({ id: "e2", paid_at: "2026-09-01T00:00:00.000Z" }),
    ];
    const original = [...entries];
    getPaidEntries(entries);
    expect(entries).toEqual(original);
  });
});

describe("getUnpaidDiaryEntries", () => {
  it("includes an entry with a real rating from ANY member, not just the current user (no 'everyone rated' restriction)", () => {
    const entry = makeEntry({
      id: "e1",
      ratings: [makeRating({ member_id: "u2", rating: 3 })],
    });
    expect(getUnpaidDiaryEntries([entry])).toEqual([entry]);
  });

  it("excludes an entry that already has paid_at set", () => {
    const entry = makeEntry({
      id: "e1",
      paid_at: "2026-09-01T00:00:00.000Z",
      ratings: [makeRating({ member_id: "u2", rating: 3 })],
    });
    expect(getUnpaidDiaryEntries([entry])).toEqual([]);
  });

  it("excludes an entry with no real rating (rating null or 0 only)", () => {
    const noRating = makeEntry({ id: "e1", ratings: [] });
    const zeroRating = makeEntry({ id: "e2", ratings: [makeRating({ rating: 0 })] });
    const nullRating = makeEntry({ id: "e3", ratings: [makeRating({ rating: null })] });

    expect(getUnpaidDiaryEntries([noRating, zeroRating, nullRating])).toEqual([]);
  });

  it("includes an entry as soon as ONE member has rated it, even if others haven't", () => {
    const entry = makeEntry({
      id: "e1",
      ratings: [makeRating({ member_id: "u1", rating: null }), makeRating({ member_id: "u2", rating: 4.5 })],
    });
    expect(getUnpaidDiaryEntries([entry])).toEqual([entry]);
  });
});

describe("computeNextPayer", () => {
  it("returns null when the group has no members", () => {
    expect(computeNextPayer([], [])).toBeNull();
  });

  it("suggests a member who has never paid over a member who has paid at least once", () => {
    const members = [makeMember("u1", "2026-01-01"), makeMember("u2", "2026-01-02")];
    const entries = [
      makeEntry({ paid_at: "2026-09-01T00:00:00.000Z", paid_by_member_id: "u1" }),
    ];
    expect(computeNextPayer(members, entries)).toBe("u2");
  });

  it("among members who have all paid before, suggests the one with the OLDEST most-recent-payment date", () => {
    const members = [makeMember("u1", "2026-01-01"), makeMember("u2", "2026-01-02")];
    const entries = [
      makeEntry({ id: "e1", paid_at: "2026-09-15T00:00:00.000Z", paid_by_member_id: "u1" }),
      makeEntry({ id: "e2", paid_at: "2026-08-01T00:00:00.000Z", paid_by_member_id: "u2" }),
    ];
    // u2's last payment (Aug 1) is older than u1's (Sep 15) -> u2 is due.
    expect(computeNextPayer(members, entries)).toBe("u2");
  });

  it("uses each member's MOST RECENT payment, not their first ever payment", () => {
    const members = [makeMember("u1", "2026-01-01"), makeMember("u2", "2026-01-02")];
    const entries = [
      // u1's most recent payment is Sep 20 (not the older Jan 1 one).
      makeEntry({ id: "e1", paid_at: "2026-01-01T00:00:00.000Z", paid_by_member_id: "u1" }),
      makeEntry({ id: "e2", paid_at: "2026-09-20T00:00:00.000Z", paid_by_member_id: "u1" }),
      makeEntry({ id: "e3", paid_at: "2026-05-01T00:00:00.000Z", paid_by_member_id: "u2" }),
    ];
    // u2's most recent (May 1) is older than u1's most recent (Sep 20).
    expect(computeNextPayer(members, entries)).toBe("u2");
  });

  it("tie-break: multiple members who have NEVER paid -> earliest-joined member wins", () => {
    const members = [makeMember("u2", "2026-03-01"), makeMember("u1", "2026-01-01")];
    expect(computeNextPayer(members, [])).toBe("u1");
  });

  it("tie-break: multiple members with the EXACT SAME last-paid date -> earliest-joined member wins", () => {
    const members = [makeMember("u2", "2026-03-01"), makeMember("u1", "2026-01-01")];
    const entries = [
      makeEntry({ id: "e1", paid_at: "2026-09-01T00:00:00.000Z", paid_by_member_id: "u1" }),
      makeEntry({ id: "e2", paid_at: "2026-09-01T00:00:00.000Z", paid_by_member_id: "u2" }),
    ];
    expect(computeNextPayer(members, entries)).toBe("u1");
  });

  it("is deterministic for a brand-new group's very first payment (everyone never paid)", () => {
    const members = [makeMember("u3", "2026-01-03"), makeMember("u1", "2026-01-01"), makeMember("u2", "2026-01-02")];
    expect(computeNextPayer(members, [])).toBe("u1");
  });

  it("ignores paid entries assigned to a user who is no longer a group member", () => {
    const members = [makeMember("u1", "2026-01-01")];
    const entries = [makeEntry({ paid_at: "2026-09-01T00:00:00.000Z", paid_by_member_id: "u-ghost" })];
    // u1 has never paid (the ghost entry doesn't belong to any current member) -> u1 is suggested.
    expect(computeNextPayer(members, entries)).toBe("u1");
  });
});

describe("getLastPaidAtByMember", () => {
  it("returns each member's MOST RECENT paid_at, not their first", () => {
    const entries = [
      makeEntry({ id: "e1", paid_at: "2026-01-01T00:00:00.000Z", paid_by_member_id: "u1" }),
      makeEntry({ id: "e2", paid_at: "2026-09-20T00:00:00.000Z", paid_by_member_id: "u1" }),
    ];
    expect(getLastPaidAtByMember(entries).get("u1")).toBe("2026-09-20T00:00:00.000Z");
  });

  it("omits members who have never paid", () => {
    expect(getLastPaidAtByMember([makeEntry({ paid_at: null })]).has("u1")).toBe(false);
  });
});

describe("daysSincePayment", () => {
  const NOW = new Date("2026-09-20T18:00:00.000Z");

  it("returns null when the member has never paid", () => {
    expect(daysSincePayment(null, NOW)).toBeNull();
    expect(daysSincePayment(undefined, NOW)).toBeNull();
  });

  it("returns 'heute' for a payment made today, regardless of time-of-day", () => {
    expect(daysSincePayment("2026-09-20T02:00:00.000Z", NOW)).toBe("heute");
  });

  it("returns 'gestern' for a payment made exactly one calendar day ago", () => {
    expect(daysSincePayment("2026-09-19T23:00:00.000Z", NOW)).toBe("gestern");
  });

  it("returns 'vor X Tagen' for anything further back", () => {
    expect(daysSincePayment("2026-09-15T00:00:00.000Z", NOW)).toBe("vor 5 Tagen");
    expect(daysSincePayment("2026-08-21T00:00:00.000Z", NOW)).toBe("vor 30 Tagen");
  });

  it("treats a same-day comparison based on calendar date, not a 24h rolling window", () => {
    // Paid at 23:50 the day before "now" at 00:10 -- still only 1 calendar day apart.
    expect(daysSincePayment("2026-09-19T00:00:00.000Z", new Date("2026-09-20T00:10:00.000Z"))).toBe(
      "gestern",
    );
  });
});

describe("assignMemberColors", () => {
  it("assigns each member a distinct color", () => {
    const members = [makeMember("u1", "2026-01-01"), makeMember("u2", "2026-01-02"), makeMember("u3", "2026-01-03")];
    const colors = assignMemberColors(members);
    const values = Array.from(colors.values());
    expect(new Set(values).size).toBe(3);
  });

  it("assigns colors deterministically by joined_at order, independent of input array order", () => {
    const inOrder = [makeMember("u1", "2026-01-01"), makeMember("u2", "2026-01-02")];
    const reversed = [makeMember("u2", "2026-01-02"), makeMember("u1", "2026-01-01")];

    expect(assignMemberColors(inOrder)).toEqual(assignMemberColors(reversed));
  });

  it("wraps around the palette (modulo) for a group with more than 6 members, without crashing", () => {
    const members = Array.from({ length: 8 }, (_, i) =>
      makeMember(`u${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`),
    );
    const colors = assignMemberColors(members);
    // Member 0 and member 6 (index 0 and 6, palette length 6) share a color.
    expect(colors.get("u0")).toBe(colors.get("u6"));
    expect(colors.get("u1")).toBe(colors.get("u7"));
  });
});
