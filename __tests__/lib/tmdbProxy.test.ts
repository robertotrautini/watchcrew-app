const mockInvoke = jest.fn();

jest.mock("../../src/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

// M6 part 2b: thin client-side wrappers around the additional `tmdb-proxy`
// Edge Function actions used by the movie sub-view screens (collection,
// director/actor/studio filmography, similar-movies, providers). Mirrors
// the "never throw, always resolve { data, error }" convention already
// used by src/lib/movieDetail.ts / __tests__/movieDetail.test.ts.

describe("tmdbProxy lib (tmdb-proxy client wrappers, M6 part 2b actions)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getCollection invokes tmdb-proxy with kind: 'collection' and both required params, and unwraps the { data } envelope", async () => {
    const collection = {
      id: 99,
      name: "Some Collection",
      parts: [{ id: 1, title: "Part One", release_date: "2020-01-01" }],
    };
    mockInvoke.mockResolvedValue({ data: { data: collection }, error: null });

    const { getCollection } = require("../../src/lib/tmdbProxy");
    const result = await getCollection(42, 99);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "collection", tmdbId: 42, collectionId: 99 },
    });
    expect(result).toEqual({ data: collection, error: null });
  });

  it("getDirectorMovies invokes tmdb-proxy with kind: 'director_movies'", async () => {
    const movies = [{ id: 1, title: "Movie One", job: "Director" }];
    mockInvoke.mockResolvedValue({ data: { data: movies }, error: null });

    const { getDirectorMovies } = require("../../src/lib/tmdbProxy");
    const result = await getDirectorMovies(7);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "director_movies", personId: 7 },
    });
    expect(result).toEqual({ data: movies, error: null });
  });

  it("getActorMovies invokes tmdb-proxy with kind: 'person_movies'", async () => {
    const movies = [{ id: 2, title: "Movie Two", character: "Hero" }];
    mockInvoke.mockResolvedValue({ data: { data: movies }, error: null });

    const { getActorMovies } = require("../../src/lib/tmdbProxy");
    const result = await getActorMovies(8);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "person_movies", personId: 8 },
    });
    expect(result).toEqual({ data: movies, error: null });
  });

  it("getStudioMovies invokes tmdb-proxy with kind: 'studio_movies' and the given page", async () => {
    const page = { page: 2, results: [{ id: 3, title: "Movie Three" }], total_pages: 5, total_results: 100 };
    mockInvoke.mockResolvedValue({ data: { data: page }, error: null });

    const { getStudioMovies } = require("../../src/lib/tmdbProxy");
    const result = await getStudioMovies(55, 2);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "studio_movies", companyId: 55, page: 2 },
    });
    expect(result).toEqual({ data: page, error: null });
  });

  it("getStudioMovies omits page from the body when not given (server defaults to 1)", async () => {
    const page = { page: 1, results: [], total_pages: 1, total_results: 0 };
    mockInvoke.mockResolvedValue({ data: { data: page }, error: null });

    const { getStudioMovies } = require("../../src/lib/tmdbProxy");
    await getStudioMovies(55);

    const calledBody = mockInvoke.mock.calls[0][1].body;
    expect(calledBody).toEqual({ kind: "studio_movies", companyId: 55 });
    expect("page" in calledBody).toBe(false);
  });

  it("getSimilarMovies invokes tmdb-proxy with kind: 'trakt_related'", async () => {
    const related = [{ title: "Related Movie", year: 2021, ids: { tmdb: 123 } }];
    mockInvoke.mockResolvedValue({ data: { data: related }, error: null });

    const { getSimilarMovies } = require("../../src/lib/tmdbProxy");
    const result = await getSimilarMovies(42);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "trakt_related", tmdbId: 42 },
    });
    expect(result).toEqual({ data: related, error: null });
  });

  it("getMovieProviders invokes tmdb-proxy with kind: 'providers' (no region param — server hardcodes DE)", async () => {
    const providers = { flatrate: [], rent: [], buy: [] };
    mockInvoke.mockResolvedValue({ data: { data: providers }, error: null });

    const { getMovieProviders } = require("../../src/lib/tmdbProxy");
    const result = await getMovieProviders(42);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "providers", tmdbId: 42 },
    });
    expect(result).toEqual({ data: providers, error: null });
  });

  it("maps a functions.invoke error with a message into { data: null, error: { message } } (never throws)", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "edge function failed" } });

    const { getCollection } = require("../../src/lib/tmdbProxy");
    const result = await getCollection(1, 2);

    expect(result).toEqual({ data: null, error: { message: "edge function failed" } });
  });

  it("falls back to String(error) when the error has no message property", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: "boom" });

    const { getSimilarMovies } = require("../../src/lib/tmdbProxy");
    const result = await getSimilarMovies(1);

    expect(result).toEqual({ data: null, error: { message: "boom" } });
  });
});
