const mockGetRows = jest.fn();
const mockBatch = jest.fn();

jest.mock("../../src/lib/watchlist", () => ({
  getStreamingAvailabilityForTmdbIds: (...args: unknown[]) => mockGetRows(...args),
}));
jest.mock("../../src/lib/tmdbProxy", () => ({
  getMoviesProvidersBatch: (...args: unknown[]) => mockBatch(...args),
}));

import {
  findIdsNeedingProviders,
  loadStreamingRows,
  rowsToProvidersMap,
} from "../../src/lib/streamingAvailability";

const NOW = new Date("2026-10-01T12:00:00Z");
const FRESH = "2026-10-01T06:00:00Z";
const STALE = "2026-09-29T06:00:00Z";
const EMPTY = { flatrate: [], rent: [], buy: [] };

function row(tmdb_id: number, last_fetched_at: string, data: unknown = EMPTY) {
  return { tmdb_id, region: "DE", data, last_fetched_at };
}

describe("findIdsNeedingProviders", () => {
  it("returns ids with no row or a row older than 24h", () => {
    const ids = findIdsNeedingProviders([1, 2, 3], [row(1, FRESH), row(2, STALE)], NOW);
    expect(ids).toEqual([2, 3]);
  });
});

describe("rowsToProvidersMap", () => {
  it("maps valid rows and skips rows without the {flatrate,rent,buy} shape", () => {
    const map = rowsToProvidersMap([row(1, FRESH), row(2, FRESH, {}), row(3, FRESH, null)]);
    expect([...map.keys()]).toEqual([1]);
  });
});

describe("loadStreamingRows", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads the cache once and calls the batch action only for missing/stale fetch ids", async () => {
    mockGetRows.mockResolvedValue({ data: [row(1, FRESH), row(2, STALE)], error: null });
    mockBatch.mockResolvedValue({ data: { "2": { flatrate: [{ provider_id: 8 }], rent: [], buy: [] } }, error: null });

    const { data, error } = await loadStreamingRows([1, 2, 3], [2], NOW);

    expect(error).toBeNull();
    expect(mockGetRows).toHaveBeenCalledWith([1, 2, 3]);
    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch).toHaveBeenCalledWith([2]);
    const updated = data!.find((r) => r.tmdb_id === 2)!;
    expect(updated.data).toEqual({ flatrate: [{ provider_id: 8 }], rent: [], buy: [] });
    expect(data!.find((r) => r.tmdb_id === 1)).toBeTruthy();
  });

  it("makes no batch call when everything to fetch is already fresh", async () => {
    mockGetRows.mockResolvedValue({ data: [row(1, FRESH)], error: null });
    await loadStreamingRows([1], [1], NOW);
    expect(mockBatch).not.toHaveBeenCalled();
  });

  it("is best effort: a failing batch call still resolves the cached rows", async () => {
    mockGetRows.mockResolvedValue({ data: [row(1, FRESH)], error: null });
    mockBatch.mockResolvedValue({ data: null, error: { message: "down" } });
    const { data, error } = await loadStreamingRows([1, 2], [2], NOW);
    expect(error).toBeNull();
    expect(data!.map((r) => r.tmdb_id)).toEqual([1]);
  });

  it("surfaces a cache read error", async () => {
    const readError = { message: "rls" };
    mockGetRows.mockResolvedValue({ data: null, error: readError });
    const result = await loadStreamingRows([1], [1], NOW);
    expect(result.error).toEqual(readError);
    expect(mockBatch).not.toHaveBeenCalled();
  });
});
