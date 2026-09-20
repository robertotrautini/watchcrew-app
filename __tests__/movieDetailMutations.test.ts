// M6 part 2a: data-layer tests for the Movie Detail Overlay's write
// operations (toggle-like, delete-from-watchlist, add-to-watchlist).
//
// Same convention as __tests__/watchlist.test.ts: mock "../src/lib/supabase"
// with jest.fn()-based chain builders, and assert the underlying functions
// return Supabase's raw `{ data, error }` shape unchanged (never throw) --
// including the one non-Postgres case (`MovieNotCatalogedError`), which is
// surfaced through the SAME `{ data: null, error }` shape rather than a
// thrown exception, so hooks can keep translating `error` into React
// Query's throw-based channel exactly like every other hook in this repo.

const mockFrom = jest.fn();

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

// A minimal thenable Supabase query-builder mock: every chain method
// (select/eq/upsert/update/insert/delete/maybeSingle/single) returns the
// SAME object, and that object resolves to `finalResult` when awaited --
// mirroring how the real supabase-js PostgrestFilterBuilder is itself
// thenable regardless of how many methods were chained onto it.
function makeChain(finalResult: unknown) {
  const chain: Record<string, jest.Mock> & { then?: unknown } = {};
  ["select", "eq", "upsert", "update", "insert", "delete", "maybeSingle", "single"].forEach(
    (method) => {
      chain[method] = jest.fn(() => chain);
    }
  );
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

describe("toggleLike", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upserts a ratings row (watchlist_entry_id, member_id, liked) with onConflict when no existingRatingId is given", async () => {
    const fakeResult = { data: { id: "r1", liked: true }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { toggleLike } = require("../src/lib/movieDetailMutations");
    const result = await toggleLike({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      nextLiked: true,
    });

    expect(mockFrom).toHaveBeenCalledWith("ratings");
    expect(chain.upsert).toHaveBeenCalledWith(
      { watchlist_entry_id: "we-1", member_id: "user-1", liked: true },
      { onConflict: "watchlist_entry_id,member_id" }
    );
    expect(chain.update).not.toHaveBeenCalled();
    expect(result).toBe(fakeResult);
  });

  it("updates only the liked field on the existing rating row when existingRatingId is given, without touching rating/seen_at", async () => {
    const fakeResult = { data: { id: "r1", liked: false }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { toggleLike } = require("../src/lib/movieDetailMutations");
    const result = await toggleLike({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      nextLiked: false,
      existingRatingId: "r1",
    });

    expect(mockFrom).toHaveBeenCalledWith("ratings");
    expect(chain.update).toHaveBeenCalledWith({ liked: false });
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty("rating");
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty("seen_at");
    expect(chain.eq).toHaveBeenCalledWith("id", "r1");
    expect(chain.upsert).not.toHaveBeenCalled();
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged when the upsert fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "rls denied" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { toggleLike } = require("../src/lib/movieDetailMutations");
    const result = await toggleLike({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      nextLiked: true,
    });

    expect(result).toBe(fakeResult);
  });
});

describe("deleteWatchlistEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes the watchlist_entries row targeted by id", async () => {
    const fakeResult = { data: null, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { deleteWatchlistEntry } = require("../src/lib/movieDetailMutations");
    const result = await deleteWatchlistEntry({ watchlistEntryId: "we-42" });

    expect(mockFrom).toHaveBeenCalledWith("watchlist_entries");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "we-42");
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged when the delete fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "rls denied" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { deleteWatchlistEntry } = require("../src/lib/movieDetailMutations");
    const result = await deleteWatchlistEntry({ watchlistEntryId: "we-42" });

    expect(result).toBe(fakeResult);
  });
});

describe("addToWatchlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts a watchlist_entries row using the movie's id when the movie is found by tmdb_id", async () => {
    const movieChain = makeChain({ data: { id: "movie-uuid-1" }, error: null });
    const insertResult = { data: { id: "we-new-1" }, error: null };
    const entriesChain = makeChain(insertResult);
    mockFrom.mockReturnValueOnce(movieChain).mockReturnValueOnce(entriesChain);

    const { addToWatchlist } = require("../src/lib/movieDetailMutations");
    const result = await addToWatchlist({ tmdbId: 603, groupId: "group-1", addedBy: "user-1" });

    expect(mockFrom).toHaveBeenNthCalledWith(1, "movies");
    expect(movieChain.select).toHaveBeenCalledWith("id");
    expect(movieChain.eq).toHaveBeenCalledWith("tmdb_id", 603);
    expect(movieChain.maybeSingle).toHaveBeenCalled();

    expect(mockFrom).toHaveBeenNthCalledWith(2, "watchlist_entries");
    expect(entriesChain.insert).toHaveBeenCalledWith({
      group_id: "group-1",
      movie_id: "movie-uuid-1",
      added_by: "user-1",
    });
    expect(result).toBe(insertResult);
  });

  it("throws-as-error a MovieNotCatalogedError (via { data: null, error }) and never attempts an insert when the movie is not found", async () => {
    const movieChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(movieChain);

    const {
      addToWatchlist,
      MovieNotCatalogedError,
    } = require("../src/lib/movieDetailMutations");
    const result = await addToWatchlist({ tmdbId: 999, groupId: "group-1", addedBy: "user-1" });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(MovieNotCatalogedError);
    // Only the `movies` lookup happened -- no doomed insert attempt into
    // `movies`, and no `watchlist_entries` insert either.
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("movies");
  });

  it("propagates a real Postgres error from the movies lookup without attempting an insert", async () => {
    const lookupError = { message: "network error" };
    const movieChain = makeChain({ data: null, error: lookupError });
    mockFrom.mockReturnValueOnce(movieChain);

    const { addToWatchlist } = require("../src/lib/movieDetailMutations");
    const result = await addToWatchlist({ tmdbId: 603, groupId: "group-1", addedBy: "user-1" });

    expect(result).toEqual({ data: null, error: lookupError });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("propagates a raw unique-violation (23505) error from the watchlist_entries insert unchanged (no friendly-message translation)", async () => {
    const movieChain = makeChain({ data: { id: "movie-uuid-1" }, error: null });
    const uniqueViolation = {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "watchlist_entries_group_id_movie_id_key"',
    };
    const insertResult = { data: null, error: uniqueViolation };
    const entriesChain = makeChain(insertResult);
    mockFrom.mockReturnValueOnce(movieChain).mockReturnValueOnce(entriesChain);

    const { addToWatchlist } = require("../src/lib/movieDetailMutations");
    const result = await addToWatchlist({ tmdbId: 603, groupId: "group-1", addedBy: "user-1" });

    expect(result).toBe(insertResult);
    expect(result.error.code).toBe("23505");
  });
});

// M7 part 2b (Rating-Dialog): the ratings/payment writes. `saveRating` is a
// real UPSERT (never a delete-then-reinsert) so a future server-side
// NULL->value push trigger (ADR 0006, out of scope here) can still correctly
// observe the transition -- see docs/interim-decisions.md "M7 Teil 2b".
describe("saveRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upserts the full ratings payload keyed on (watchlist_entry_id, member_id)", async () => {
    const fakeResult = { data: { id: "r1" }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { saveRating } = require("../src/lib/movieDetailMutations");
    const payload = {
      watchlist_entry_id: "we-1",
      member_id: "user-1",
      rating: 4.5,
      liked: true,
      seen_at: "2026-09-10",
      rated_at: "2026-09-20T12:00:00.000Z",
    };
    const result = await saveRating(payload);

    expect(mockFrom).toHaveBeenCalledWith("ratings");
    expect(chain.upsert).toHaveBeenCalledWith(payload, {
      onConflict: "watchlist_entry_id,member_id",
    });
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged on failure, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "rls denied" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { saveRating } = require("../src/lib/movieDetailMutations");
    const result = await saveRating({
      watchlist_entry_id: "we-1",
      member_id: "user-1",
      rating: 3,
      liked: false,
      seen_at: null,
      rated_at: "2026-09-20T12:00:00.000Z",
    });

    expect(result).toBe(fakeResult);
  });
});

describe("resetRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates only rating and liked on the existing row (also resets the like, per the known rule), leaving seen_at/rated_at untouched", async () => {
    const fakeResult = { data: { id: "r1", rating: null, liked: false }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { resetRating } = require("../src/lib/movieDetailMutations");
    const result = await resetRating({ ratingId: "r1" });

    expect(mockFrom).toHaveBeenCalledWith("ratings");
    expect(chain.update).toHaveBeenCalledWith({ rating: null, liked: false });
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty("seen_at");
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty("rated_at");
    expect(chain.eq).toHaveBeenCalledWith("id", "r1");
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged on failure, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "rls denied" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { resetRating } = require("../src/lib/movieDetailMutations");
    const result = await resetRating({ ratingId: "r1" });

    expect(result).toBe(fakeResult);
  });
});

describe("savePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates paid_by_member_id and paid_at on the targeted watchlist_entries row", async () => {
    const fakeResult = { data: { id: "we-1" }, error: null };
    const chain = makeChain(fakeResult);
    mockFrom.mockReturnValue(chain);

    const { savePayment } = require("../src/lib/movieDetailMutations");
    const result = await savePayment({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: "2026-09-20T12:00:00.000Z",
    });

    expect(mockFrom).toHaveBeenCalledWith("watchlist_entries");
    expect(chain.update).toHaveBeenCalledWith({
      paid_by_member_id: "user-2",
      paid_at: "2026-09-20T12:00:00.000Z",
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "we-1");
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged on failure, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "rls denied" } };
    mockFrom.mockReturnValue(makeChain(fakeResult));

    const { savePayment } = require("../src/lib/movieDetailMutations");
    const result = await savePayment({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: "2026-09-20T12:00:00.000Z",
    });

    expect(result).toBe(fakeResult);
  });
});
