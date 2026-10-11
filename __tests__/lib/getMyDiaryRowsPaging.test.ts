// Edge cases of the paging loop in getMyDiaryRows (basic paging is covered in watchlist.test.ts).
const mockRange = jest.fn();
const mockOrder = jest.fn(() => ({ range: mockRange }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("../../src/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => (mockFrom as (...a: unknown[]) => unknown)(...args) },
}));

import { MY_DIARY_PAGE_SIZE, getMyDiaryRows } from "@/lib/watchlist";

const page = (n: number, prefix = "m") =>
  Array.from({ length: n }, (_, i) => ({ movie_id: `${prefix}${i}` }));

describe("getMyDiaryRows paging edge cases", () => {
  beforeEach(() => jest.clearAllMocks());

  it("page size matches the PostgREST default cap", () => {
    expect(MY_DIARY_PAGE_SIZE).toBe(1000);
  });

  it("returns an empty result for a user without rows", async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null });
    expect(await getMyDiaryRows("u1")).toEqual({ data: [], error: null });
    expect(mockRange).toHaveBeenCalledTimes(1);
  });

  it("treats a null data page without error as empty", async () => {
    mockRange.mockResolvedValueOnce({ data: null, error: null });
    expect(await getMyDiaryRows("u1")).toEqual({ data: [], error: null });
  });

  it("fetches one more (empty) page when the first page is exactly full", async () => {
    mockRange
      .mockResolvedValueOnce({ data: page(1000), error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const result = await getMyDiaryRows("u1");
    expect(mockRange).toHaveBeenCalledTimes(2);
    expect(mockRange).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(result.data).toHaveLength(1000);
    expect(result.error).toBeNull();
  });

  it("walks three pages and keeps the page order", async () => {
    mockRange
      .mockResolvedValueOnce({ data: page(1000, "a"), error: null })
      .mockResolvedValueOnce({ data: page(1000, "b"), error: null })
      .mockResolvedValueOnce({ data: page(5, "c"), error: null });
    const result = await getMyDiaryRows("u1");
    expect(mockRange).toHaveBeenNthCalledWith(3, 2000, 2999);
    const data = result.data as { movie_id: string }[];
    expect(data).toHaveLength(2005);
    expect(data[0].movie_id).toBe("a0");
    expect(data[1000].movie_id).toBe("b0");
    expect(data[2000].movie_id).toBe("c0");
  });

  it("discards already loaded pages and stops when a later page fails", async () => {
    const error = { message: "timeout" };
    mockRange
      .mockResolvedValueOnce({ data: page(1000), error: null })
      .mockResolvedValueOnce({ data: null, error });
    const result = await getMyDiaryRows("u1");
    expect(result).toEqual({ data: null, error });
    expect(mockRange).toHaveBeenCalledTimes(2);
  });

  it("orders by movie_id ascending so pages are stable", async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null });
    await getMyDiaryRows("u1");
    expect(mockOrder).toHaveBeenCalledWith("movie_id", { ascending: true });
  });
});
