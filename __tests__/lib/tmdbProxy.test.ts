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
// used by src/lib/movieDetail.ts / __tests__/lib/movieDetail.test.ts.

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

  it("getMoviesProvidersBatch invokes tmdb-proxy once with kind: 'providers_batch' and returns the id-keyed map", async () => {
    const map = { "1": { flatrate: [], rent: [], buy: [] } };
    mockInvoke.mockResolvedValue({ data: { data: map }, error: null });

    const { getMoviesProvidersBatch } = require("../../src/lib/tmdbProxy");
    const result = await getMoviesProvidersBatch([1, 2]);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "providers_batch", tmdbIds: [1, 2] },
    });
    expect(result).toEqual({ data: map, error: null });
  });

  it("getMoviesProvidersBatch splits more than 200 ids into chunks and merges the results", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { data: { "1": "a" } }, error: null })
      .mockResolvedValueOnce({ data: { data: { "250": "b" } }, error: null });
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);

    const { getMoviesProvidersBatch } = require("../../src/lib/tmdbProxy");
    const result = await getMoviesProvidersBatch(ids);

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: { "1": "a", "250": "b" }, error: null });
  });

  it("getMoviesProvidersBatch makes no call for an empty id list and surfaces the first chunk error", async () => {
    const { getMoviesProvidersBatch } = require("../../src/lib/tmdbProxy");
    expect(await getMoviesProvidersBatch([])).toEqual({ data: {}, error: null });
    expect(mockInvoke).not.toHaveBeenCalled();

    mockInvoke.mockResolvedValue({ data: null, error: { message: "boom" } });
    const failed = await getMoviesProvidersBatch([1]);
    expect(failed.data).toBeNull();
    expect(failed.error).toEqual({ message: "boom" });
  });

  it("refreshReleaseDates invokes tmdb-proxy with kind: 'refresh_release_dates', chunked, and merges the id-keyed result", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { data: { "1": "2026-12-24" } }, error: null })
      .mockResolvedValueOnce({ data: { data: { "250": null } }, error: null });
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);

    const { refreshReleaseDates } = require("../../src/lib/tmdbProxy");
    const result = await refreshReleaseDates(ids);

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke.mock.calls[0][1].body.kind).toBe("refresh_release_dates");
    expect(result).toEqual({ data: { "1": "2026-12-24", "250": null }, error: null });
  });

  it("refreshReleaseDates makes no call for an empty list and surfaces errors", async () => {
    const { refreshReleaseDates } = require("../../src/lib/tmdbProxy");
    expect(await refreshReleaseDates([])).toEqual({ data: {}, error: null });
    expect(mockInvoke).not.toHaveBeenCalled();
    mockInvoke.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await refreshReleaseDates([1])).error).toEqual({ message: "boom" });
  });

  it("getProvidersList invokes tmdb-proxy with kind: 'providers_list' and no other params", async () => {
    const providers = [{ provider_id: 8, provider_name: "Netflix" }];
    mockInvoke.mockResolvedValue({ data: { data: providers }, error: null });

    const { getProvidersList } = require("../../src/lib/tmdbProxy");
    const result = await getProvidersList();

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "providers_list" },
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

  // M7 part 2 (Add-Movie-Modal): the four remaining tmdb-proxy actions this
  // client had no wrapper for yet — `search` (Film mode), `search_person`
  // (Regisseur/Besetzung mode), `search_company` (Studio mode), and
  // `upsert_movie` (the M7 part 1 write action, now wired to a real
  // caller — see src/lib/movieDetailMutations.ts's rewired `addToWatchlist`).
  it("searchMovies invokes tmdb-proxy with kind: 'search' and the query", async () => {
    const results = [{ id: 1, title: "Le Film", original_title: "Le Film", original_language: "fr" }];
    mockInvoke.mockResolvedValue({ data: { data: results }, error: null });

    const { searchMovies } = require("../../src/lib/tmdbProxy");
    const result = await searchMovies("le film");

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "search", query: "le film" },
    });
    expect(result).toEqual({ data: results, error: null });
  });

  it("searchPerson invokes tmdb-proxy with kind: 'search_person' and the query", async () => {
    const results = [{ id: 5, name: "Jane Director" }];
    mockInvoke.mockResolvedValue({ data: { data: results }, error: null });

    const { searchPerson } = require("../../src/lib/tmdbProxy");
    const result = await searchPerson("jane");

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "search_person", query: "jane" },
    });
    expect(result).toEqual({ data: results, error: null });
  });

  it("searchCompany invokes tmdb-proxy with kind: 'search_company' and the query", async () => {
    const results = [{ id: 9, name: "Studio Nine" }];
    mockInvoke.mockResolvedValue({ data: { data: results }, error: null });

    const { searchCompany } = require("../../src/lib/tmdbProxy");
    const result = await searchCompany("studio nine");

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "search_company", query: "studio nine" },
    });
    expect(result).toEqual({ data: results, error: null });
  });

  it("upsertMovie invokes tmdb-proxy with kind: 'upsert_movie' and the tmdbId, unwrapping { movieId }", async () => {
    mockInvoke.mockResolvedValue({ data: { data: { movieId: "movie-uuid-9" } }, error: null });

    const { upsertMovie } = require("../../src/lib/tmdbProxy");
    const result = await upsertMovie(603);

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "upsert_movie", tmdbId: 603 },
    });
    expect(result).toEqual({ data: { movieId: "movie-uuid-9" }, error: null });
  });

  it("upsertMovie surfaces an edge-function error unchanged (never throws)", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "upsert failed" } });

    const { upsertMovie } = require("../../src/lib/tmdbProxy");
    const result = await upsertMovie(603);

    expect(result).toEqual({ data: null, error: { message: "upsert failed" } });
  });

  // M7 consolidation (Item 1): manualReleaseDate override, forwarded verbatim.
  it("upsertMovie forwards manualReleaseDate in the body when given", async () => {
    mockInvoke.mockResolvedValue({ data: { data: { movieId: "movie-uuid-9" } }, error: null });

    const { upsertMovie } = require("../../src/lib/tmdbProxy");
    const result = await upsertMovie(603, "2027-05-01");

    expect(mockInvoke).toHaveBeenCalledWith("tmdb-proxy", {
      body: { kind: "upsert_movie", tmdbId: 603, manualReleaseDate: "2027-05-01" },
    });
    expect(result).toEqual({ data: { movieId: "movie-uuid-9" }, error: null });
  });

  it("upsertMovie omits manualReleaseDate from the body when not given", async () => {
    mockInvoke.mockResolvedValue({ data: { data: { movieId: "movie-uuid-9" } }, error: null });

    const { upsertMovie } = require("../../src/lib/tmdbProxy");
    await upsertMovie(603);

    const calledBody = mockInvoke.mock.calls[0][1].body;
    expect(calledBody).toEqual({ kind: "upsert_movie", tmdbId: 603 });
    expect("manualReleaseDate" in calledBody).toBe(false);
  });
});
