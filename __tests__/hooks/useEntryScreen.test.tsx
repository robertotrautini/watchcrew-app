import { act, renderHook } from "@testing-library/react-native";

import { mockCurrentUserId } from "../helpers/mockCurrentUser";

import {
  useEntryScreen,
  type EntryScreenStrategy,
} from "@/hooks/useEntryScreen";
import type { WatchlistEntry } from "@/lib/watchlistTypes";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

jest.mock("@/hooks/useCurrentUserId", () =>
  require("../helpers/mockCurrentUser").currentUserIdModule(),
);
jest.mock("expo-router", () =>
  require("../helpers/mockRouter").createExpoRouterMock(),
);

const mockUseActiveGroup = jest.fn();
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: (...a: unknown[]) => mockUseActiveGroup(...a),
}));
const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: (...a: unknown[]) => mockUseGroupWatchlist(...a),
}));
const mockUseGroupMembers = jest.fn();
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: (...a: unknown[]) => mockUseGroupMembers(...a),
}));
const mockUseProviders = jest.fn();
jest.mock("@/hooks/useMyStreamingProviders", () => ({
  useMyStreamingProviders: (...a: unknown[]) => mockUseProviders(...a),
}));
const mockRealtime = jest.fn();
jest.mock("@/hooks/useGroupRealtimeSync", () => ({
  useGroupRealtimeSync: (...a: unknown[]) => mockRealtime(...a),
}));
const mockRegister = jest.fn();
jest.mock("@/hooks/useRegisterFocusedGroupScreen", () => ({
  useRegisterFocusedGroupScreen: (...a: unknown[]) => mockRegister(...a),
}));

function entry(id: string, name: string, voteAverage = 5): WatchlistEntry {
  return {
    id,
    group_id: "g1",
    movie_id: `m-${id}`,
    added_at: "2026-01-01T00:00:00Z",
    added_by: "u1",
    paid_by_member_id: null,
    paid_at: null,
    ratings: [],
    movie: {
      id: `m-${id}`,
      tmdb_id: Number(id.replace(/\D/g, "")) || 1,
      name,
      release_date: null,
      poster: null,
      overview: null,
      runtime: null,
      director: null,
      director_id: null,
      vote_average: voteAverage,
      movie_genres: [],
    },
  } as WatchlistEntry;
}

const GROUP_ENTRIES = [entry("e1", "Zorro"), entry("e2", "Alien"), entry("e3", "Matrix")];
const OWN_ENTRIES = [entry("o1", "Solo")];

const filterSpy = jest.fn();
const openSpy = jest.fn();

// Test strategy: the scope picks the data source (group entries vs "own").
const STRATEGY: EntryScreenStrategy<{ tag: string }> = {
  tab: "diary",
  useSource: ({ scope, rawEntries, groupsQuery }) => ({
    entries: scope === "my_diary" ? OWN_ENTRIES : rawEntries,
    isLoading: groupsQuery.isLoading,
    isError: false,
    extra: SOURCE_EXTRA,
  }),
  activeFilters: (filters, scope) =>
    scope === "my_diary" ? { ...filters, liked: false } : filters,
  filter: (entries, filters, ctx) => {
    filterSpy(filters, ctx);
    return entries;
  },
  deriveOptions: (entries) => ({
    genreIds: [],
    years: [entries.length],
    hasNoDate: false,
  }),
  openEntry: (e, ctx) => openSpy(e.id, ctx.activeGroupId, ctx.scope),
};
const SOURCE_EXTRA = { tag: "x" };

beforeEach(() => {
  jest.clearAllMocks();
  usePreferencesStore.setState({ diaryScope: "group" });
  mockCurrentUserId.mockReturnValue("u1");
  mockUseActiveGroup.mockReturnValue({
    activeGroupId: "g1",
    groupsQuery: { isLoading: false, isError: false },
  });
  mockUseGroupWatchlist.mockReturnValue({
    data: { entries: GROUP_ENTRIES, streamingAvailability: new Map() },
    isLoading: false,
    isError: false,
  });
  mockUseGroupMembers.mockReturnValue({
    data: [{ user_id: "u1" }, { user_id: "u2" }],
    isLoading: false,
    isError: false,
  });
  mockUseProviders.mockReturnValue({ data: undefined, isLoading: false });
});

function names(list: WatchlistEntry[]) {
  return list.map((e) => e.movie.name);
}

describe("useEntryScreen", () => {
  it("wires realtime sync and focused-screen registration for the active group", async () => {
    await renderHook(() => useEntryScreen(STRATEGY));
    expect(mockRealtime).toHaveBeenCalledWith("g1");
    expect(mockRegister).toHaveBeenCalledWith("g1");
  });

  it("runs the pipeline source -> filter -> search -> sort", async () => {
    const { result } = await renderHook(() => useEntryScreen(STRATEGY));
    await act(async () => {
      result.current.filters.setSort({ field: "title", direction: "asc" });
    });
    expect(names(result.current.visibleEntries)).toEqual([
      "Alien",
      "Matrix",
      "Zorro",
    ]);
    await act(async () => {
      result.current.filters.setSort({ field: "title", direction: "desc" });
    });
    expect(names(result.current.visibleEntries)).toEqual([
      "Zorro",
      "Matrix",
      "Alien",
    ]);
    await act(async () => {
      result.current.filters.setSearchQuery("alien");
    });
    expect(names(result.current.visibleEntries)).toEqual(["Alien"]);
    // Search runs on the filter output; the filter saw all base entries.
    expect(filterSpy.mock.calls.at(-1)?.[1].extra).toBe(SOURCE_EXTRA);
  });

  it("switches the data source with the scope and applies the active-filters rule", async () => {
    const { result } = await renderHook(() => useEntryScreen(STRATEGY));
    expect(result.current.baseEntries).toBe(GROUP_ENTRIES);
    usePreferencesStore.setState({
      diaryScope: "my_diary",
      listFilters: {
        ...usePreferencesStore.getState().listFilters,
        diary: {
          ...(usePreferencesStore.getState().listFilters.diary ?? {
            sort: { field: "title", direction: "asc" },
          }),
          filters: {
            ...(usePreferencesStore.getState().listFilters.diary?.filters ?? {}),
            liked: true,
          },
        },
      } as never,
    });
    await act(async () => {});
    expect(names(result.current.visibleEntries)).toEqual(["Solo"]);
    expect(result.current.options.years).toEqual([1]);
    expect(result.current.filters.filters.liked).toBe(true);
    expect(result.current.activeFilters.liked).toBe(false);
  });

  it("derives the view mode from the tab preference", async () => {
    usePreferencesStore.setState({ diaryViewMode: "grid" });
    const { result } = await renderHook(() => useEntryScreen(STRATEGY));
    expect(result.current.viewMode).toBe("grid");
    await act(async () => {
      result.current.setViewMode("list");
    });
    expect(usePreferencesStore.getState().diaryViewMode).toBe("list");
  });

  it("loads providers only while the streaming filter is active", async () => {
    await renderHook(() => useEntryScreen(STRATEGY));
    expect(mockUseProviders).toHaveBeenLastCalledWith(
      GROUP_ENTRIES.map((e) => e.movie.tmdb_id),
      false,
    );
  });

  it("delegates openEntry to the strategy with group and scope context", async () => {
    const { result } = await renderHook(() => useEntryScreen(STRATEGY));
    await act(async () => {
      result.current.openEntry(GROUP_ENTRIES[0]);
    });
    expect(openSpy).toHaveBeenCalledWith("e1", "g1", "group");
  });

  it("takes loading state from the source", async () => {
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "g1",
      groupsQuery: { isLoading: true, isError: false },
    });
    const { result } = await renderHook(() => useEntryScreen(STRATEGY));
    expect(result.current.isLoading).toBe(true);
  });
});
