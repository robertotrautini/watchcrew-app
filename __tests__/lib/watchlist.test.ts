const mockIn = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockRpc = jest.fn();

jest.mock("../../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

describe("getGroupWatchlistEntries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries watchlist_entries filtered by group_id with the movie/genre nested select (no embedded ratings)", async () => {
    const fakeResult = { data: [{ id: "e1" }], error: null };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupWatchlistEntries } = require("../../src/lib/watchlist");
    const result = await getGroupWatchlistEntries("group-1");

    expect(mockFrom).toHaveBeenCalledWith("watchlist_entries");
    expect(mockSelect).toHaveBeenCalledWith(
      "*, movie:movies(*, movie_genres(genre_id, genres(name)))",
    );
    expect(mockEq).toHaveBeenCalledWith("group_id", "group-1");
    expect(result).toBe(fakeResult);
  });

  it("returns the { data, error } shape unchanged when the query fails, instead of throwing", async () => {
    const fakeResult = { data: null, error: { message: "network error" } };
    mockEq.mockResolvedValue(fakeResult);

    const { getGroupWatchlistEntries } = require("../../src/lib/watchlist");
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

    const { getStreamingAvailabilityForTmdbIds } = require("../../src/lib/watchlist");
    const result = await getStreamingAvailabilityForTmdbIds([1, 2, 3]);

    expect(mockFrom).toHaveBeenCalledWith("streaming_availability_cache");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockIn).toHaveBeenCalledWith("tmdb_id", [1, 2, 3]);
    expect(result).toBe(fakeResult);
  });

  it("short-circuits to an empty result without querying when given no tmdb_ids", async () => {
    const { getStreamingAvailabilityForTmdbIds } = require("../../src/lib/watchlist");
    const result = await getStreamingAvailabilityForTmdbIds([]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], error: null });
  });
});

describe("getGroupMemberRatings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls RPC get_group_member_ratings with p_group_id and returns { data, error } unchanged", async () => {
    const fakeResult = { data: [{ user_id: "u1", movie_id: "m1" }], error: null };
    mockRpc.mockResolvedValue(fakeResult);

    const { getGroupMemberRatings } = require("../../src/lib/watchlist");
    const result = await getGroupMemberRatings("group-1");

    expect(mockRpc).toHaveBeenCalledWith("get_group_member_ratings", { p_group_id: "group-1" });
    expect(result).toBe(fakeResult);
  });
});

describe("getMyDiaryRows", () => {
  const range = jest.fn();
  const order = jest.fn(() => ({ range }));
  const eqUser = jest.fn(() => ({ order }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockImplementation((() => ({ eq: eqUser })) as never);
  });

  it("queries the user's user_movie_ratings with embedded movie, ordered, as one page when < 1000 rows", async () => {
    range.mockResolvedValueOnce({ data: [{ movie_id: "a" }], error: null });
    const { getMyDiaryRows } = require("../../src/lib/watchlist");

    const result = await getMyDiaryRows("u1");

    expect(mockFrom).toHaveBeenCalledWith("user_movie_ratings");
    expect(mockSelect).toHaveBeenCalledWith("*, movie:movies(*, movie_genres(genre_id, genres(name)))");
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(range).toHaveBeenCalledTimes(1);
    expect(range).toHaveBeenCalledWith(0, 999);
    expect(result).toEqual({ data: [{ movie_id: "a" }], error: null });
  });

  it("pages through the 1000-row PostgREST limit until a short page", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ movie_id: `m${i}` }));
    range
      .mockResolvedValueOnce({ data: full, error: null })
      .mockResolvedValueOnce({ data: [{ movie_id: "last" }], error: null });
    const { getMyDiaryRows } = require("../../src/lib/watchlist");

    const result = await getMyDiaryRows("u1");

    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(result.data).toHaveLength(1001);
    expect(result.error).toBeNull();
  });

  it("returns the error and no data when a page fails", async () => {
    const error = { message: "nope" };
    range.mockResolvedValueOnce({ data: null, error });
    const { getMyDiaryRows } = require("../../src/lib/watchlist");

    expect(await getMyDiaryRows("u1")).toEqual({ data: null, error });
  });
});
