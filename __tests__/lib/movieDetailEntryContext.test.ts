import { resolveDetailEntryContext } from "../../src/lib/movieDetailEntryContext";
import type { WatchlistEntry } from "../../src/lib/watchlistTypes";

function entry(tmdbId: number, ratings: WatchlistEntry["ratings"] = [], id = "e1"): WatchlistEntry {
  return {
    id,
    group_id: "g-active",
    movie_id: "m",
    added_at: "2026-01-01T00:00:00Z",
    added_by: "u1",
    paid_by_member_id: null,
    paid_at: null,
    movie: { tmdb_id: tmdbId } as WatchlistEntry["movie"],
    ratings,
  };
}

const base = { tmdbId: 42, activeGroupId: "g-active", currentUserId: "u1" as string | undefined };

describe("resolveDetailEntryContext", () => {
  it("keeps the route's own group context untouched", () => {
    expect(
      resolveDetailEntryContext({
        ...base,
        routeGroupId: "g-route",
        routeSource: "diary",
        routeWatchlistEntryId: "e9",
        activeGroupEntries: [entry(42)],
      }),
    ).toEqual({ groupId: "g-route", source: "diary", watchlistEntryId: "e9", hasGroupContext: true });
  });

  it("without route context and no matching entry: no group context", () => {
    expect(
      resolveDetailEntryContext({ ...base, activeGroupEntries: [entry(7)] }),
    ).toEqual({ groupId: undefined, source: undefined, watchlistEntryId: undefined, hasGroupContext: false });
  });

  it("without route context but the movie is now in the active group's watchlist: watchlist context", () => {
    expect(
      resolveDetailEntryContext({ ...base, activeGroupEntries: [entry(42)] }),
    ).toEqual({ groupId: "g-active", source: "watchlist", watchlistEntryId: "e1", hasGroupContext: true });
  });

  it("resolves to diary when the current user has a rating > 0", () => {
    const rated = entry(42, [
      { id: "r", watchlist_entry_id: "e1", member_id: "u1", rating: 4, liked: false, seen_at: null, rated_at: null },
    ]);
    expect(resolveDetailEntryContext({ ...base, activeGroupEntries: [rated] }).source).toBe("diary");
  });

  it("no active group entries loaded yet: no group context", () => {
    expect(resolveDetailEntryContext({ ...base, activeGroupEntries: undefined }).hasGroupContext).toBe(false);
  });
});
