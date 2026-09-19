const mockIn = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

describe("getGroupWatchlistEntries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries watchlist_entries filtered by group_id with the movie/genre/ratings nested select", async () => {
    const fakeResult = { data: [{ id: "e1" }], error: null };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupWatchlistEntries } = require("../src/lib/watchlist");
    const result = await getGroupWatchlistEntries("group-1");

    expect(mockFrom).toHaveBeenCalledWith("watchlist_entries");
    expect(mockSelect).toHaveBeenCalledWith("*, movie:movies(*, movie_genres(genre_id)), ratings(*)");
    expect(mockEq).toHaveBeenCalledWith("group_id", "group-1");
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged when the query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupWatchlistEntries } = require("../src/lib/watchlist");
    const result = await getGroupWatchlistEntries("group-1");

    expect(result).toBe(fakeResult);
  });
});

describe("getStreamingAvailabilityForTmdbIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries streaming_availability_cache filtered by tmdb_id .in(...)", async () => {
    const fakeResult = { data: [{ tmdb_id: 1, region: "DE" }], error: null };
    mockIn.mockResolvedValue(fakeResult);

    const { getStreamingAvailabilityForTmdbIds } = require("../src/lib/watchlist");
    const result = await getStreamingAvailabilityForTmdbIds([1, 2, 3]);

    expect(mockFrom).toHaveBeenCalledWith("streaming_availability_cache");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockIn).toHaveBeenCalledWith("tmdb_id", [1, 2, 3]);
    expect(result).toBe(fakeResult);
  });

  it("short-circuits to an empty result without querying when given no tmdb_ids", async () => {
    const { getStreamingAvailabilityForTmdbIds } = require("../src/lib/watchlist");
    const result = await getStreamingAvailabilityForTmdbIds([]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], error: null });
  });
});
