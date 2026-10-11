import { createQueryWrapper } from "../helpers/renderWithProviders";
import { renderHook, waitFor } from "@testing-library/react-native";

const mockGetMyDiaryRows = jest.fn();
jest.mock("@/lib/watchlist", () => ({
  getMyDiaryRows: (...args: unknown[]) => mockGetMyDiaryRows(...args),
}));

function loadHook() {
  return require("@/hooks/useMyDiary").useMyDiary;
}

const movie = { id: "m1", tmdb_id: 1, name: "Film", movie_genres: [] };

describe("useMyDiary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads the user's rows (also movies in no group) and maps them to entries", async () => {
    mockGetMyDiaryRows.mockResolvedValue({
      data: [
        { user_id: "u1", movie_id: "m1", rating: 4.5, liked: true, seen_at: "2026-02-02", rated_at: null, movie },
        { user_id: "u1", movie_id: "m2", rating: null, liked: true, seen_at: null, rated_at: null, movie: { ...movie, id: "m2" } },
      ],
      error: null,
    });
    const useMyDiary = loadHook();

    const { result } = await renderHook(() => useMyDiary("u1"), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetMyDiaryRows).toHaveBeenCalledWith("u1");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({ movie_id: "m1", group_id: "", ratings: [{ member_id: "u1", rating: 4.5 }] });
  });

  it("surfaces a query error through React Query", async () => {
    mockGetMyDiaryRows.mockResolvedValue({ data: null, error: new Error("boom") });
    const useMyDiary = loadHook();

    const { result } = await renderHook(() => useMyDiary("u1"), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("stays disabled without a user id", async () => {
    const useMyDiary = loadHook();

    const { result } = await renderHook(() => useMyDiary(undefined), { wrapper: createQueryWrapper() });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetMyDiaryRows).not.toHaveBeenCalled();
  });
});
