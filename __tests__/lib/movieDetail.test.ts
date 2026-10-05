const mockInvoke = jest.fn();

jest.mock("../../src/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe("movieDetail lib (tmdb-proxy client wrappers)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getMovieDetails invokes tmdb-proxy with kind: 'details' and unwraps the { data } envelope", async () => {
    mockInvoke.mockResolvedValue({ data: { data: { id: 42, runtime: 120 } }, error: null });

    const { getMovieDetails } = require("../../src/lib/movieDetail");
    const result = await getMovieDetails(42);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "details", tmdbId: 42, region: "DE" },
    });
    expect(result).toEqual({ data: { id: 42, runtime: 120 }, error: null });
  });

  it("getMovieTrailer invokes tmdb-proxy with kind: 'videos'", async () => {
    mockInvoke.mockResolvedValue({ data: { data: null }, error: null });

    const { getMovieTrailer } = require("../../src/lib/movieDetail");
    const result = await getMovieTrailer(42);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "videos", tmdbId: 42, region: "DE" },
    });
    expect(result).toEqual({ data: null, error: null });
  });

  it("getMovieCredits invokes tmdb-proxy with kind: 'credits'", async () => {
    const credits = { cast: [], crew: [], director: null };
    mockInvoke.mockResolvedValue({ data: { data: credits }, error: null });

    const { getMovieCredits } = require("../../src/lib/movieDetail");
    const result = await getMovieCredits(7);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "credits", tmdbId: 7, region: "DE" },
    });
    expect(result).toEqual({ data: credits, error: null });
  });

  it("getGermanReleaseDate invokes tmdb-proxy with kind: 'release_dates'", async () => {
    const releaseDate = { category: "Kino", release_date: "2026-01-01", type: 3 };
    mockInvoke.mockResolvedValue({ data: { data: releaseDate }, error: null });

    const { getGermanReleaseDate } = require("../../src/lib/movieDetail");
    const result = await getGermanReleaseDate(7);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "release_dates", tmdbId: 7, region: "DE" },
    });
    expect(result).toEqual({ data: releaseDate, error: null });
  });

  it("getMovieProviders invokes tmdb-proxy with kind: 'providers' and region 'DE'", async () => {
    const providers = { flatrate: [], rent: [], buy: [] };
    mockInvoke.mockResolvedValue({ data: { data: providers }, error: null });

    const { getMovieProviders } = require("../../src/lib/movieDetail");
    const result = await getMovieProviders(7);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "providers", tmdbId: 7, region: "DE" },
    });
    expect(result).toEqual({ data: providers, error: null });
  });

  it("returns { data: null, error } unchanged (never throws) when functions.invoke errors", async () => {
    const fakeError = { message: "edge function failed" };
    mockInvoke.mockResolvedValue({ data: null, error: fakeError });

    const { getMovieDetails } = require("../../src/lib/movieDetail");
    const result = await getMovieDetails(42);

    expect(result).toEqual({ data: null, error: fakeError });
  });
});
