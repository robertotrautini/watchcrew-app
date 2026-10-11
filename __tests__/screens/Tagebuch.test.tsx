import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { mockRouter } from "../helpers/mockRouter";
import { StyleSheet } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { Movie, Rating, WatchlistEntry } from "@/lib/watchlistTypes";

// Same MaterialIcons mocking rationale as __tests__/components/ui/StarRating.test.tsx.
jest.mock("@/hooks/useGroupQuickSwitch", () => ({
  useGroupQuickSwitch: () => ({
    activeGroupName: null,
    activeGroupId: undefined,
    groupCount: 1,
    switchToNext: jest.fn(),
  }),
}));

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());

const mockUseActiveGroup = jest.fn();
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
}));

const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));

const mockUseMyStreamingProviders = jest.fn();
jest.mock("@/hooks/useMyStreamingProviders", () => ({
  useMyStreamingProviders: (...args: unknown[]) => mockUseMyStreamingProviders(...args),
}));

// Phase 5: "Mein Tagebuch" comes from useMyDiary (all groups), the own profile name from useOwnProfile.
const mockUseMyDiary = jest.fn();
jest.mock("@/hooks/useMyDiary", () => ({
  useMyDiary: (...args: unknown[]) => mockUseMyDiary(...args),
}));
jest.mock("@/hooks/useOwnProfile", () => ({
  useOwnProfile: () => ({ data: { display_name: "Robin" } }),
}));

const mockUseGroupMembers = jest.fn();
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: mockUseGroupMembers,
}));

// M10 (Realtime foreground sync, ADR 0006): this screen now calls
// `useFocusEffect` (via src/hooks/useRegisterFocusedGroupScreen.ts) --
// mocked as "run the effect once on mount, cleanup once on unmount", same
// convention as __tests__/hooks/useRegisterFocusedGroupScreen.test.tsx -- and its
// own realtime/focus wiring is mocked as a no-op here, same as
// __tests__/screens/Watchlist.test.tsx, so this file keeps testing only its
// own concerns without needing a real Supabase client.
jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

const mockUseGroupRealtimeSync = jest.fn();
jest.mock("@/hooks/useGroupRealtimeSync", () => ({
  useGroupRealtimeSync: mockUseGroupRealtimeSync,
}));

const mockUseRegisterFocusedGroupScreen = jest.fn();
jest.mock("@/hooks/useRegisterFocusedGroupScreen", () => ({
  useRegisterFocusedGroupScreen: mockUseRegisterFocusedGroupScreen,
}));

// Lazily required — same Babel CJS-hoisting reason as
// __tests__/screens/Login.test.tsx for the screen under test.
function loadTagebuchScreen() {
  return require("@/app/(app)/(tabs)/tagebuch").default;
}

function loadPreferencesStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

const CURRENT_USER = "u1";

function makeMovie(overrides: Partial<Movie> & Pick<Movie, "tmdb_id" | "name">): Movie {
  return {
    id: `movie-${overrides.tmdb_id}`,
    release_date: null,
    poster: null,
    overview: null,
    runtime: null,
    director: null,
    director_id: null,
    vote_average: null,
    movie_genres: [],
    ...overrides,
  };
}

function makeRating(overrides: Partial<Rating> & Pick<Rating, "member_id">): Rating {
  return {
    rating: null,
    liked: false,
    seen_at: null,
    rated_at: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WatchlistEntry> & Pick<WatchlistEntry, "id" | "movie">): WatchlistEntry {
  return {
    group_id: "g1",
    movie_id: overrides.movie.id,
    added_at: "2026-01-01T00:00:00Z",
    added_by: CURRENT_USER,
    paid_by_member_id: null,
    paid_at: null,
    ratings: [],
    ...overrides,
  };
}

/** Per-member rows and "Alle bewertet"/"Fehlt noch" belong to the group scope. */
function useGroupScope() {
  loadPreferencesStore().setState({ diaryScope: "group" });
}

function mockHappyPath(
  entries: WatchlistEntry[],
  groupMembers?: Record<string, unknown>[],
  myDiaryEntries?: WatchlistEntry[],
) {
  mockCurrentUserId.mockReturnValue(CURRENT_USER);
  // Default "Mein Tagebuch" = the group's entries I rated (same ids), unless given explicitly.
  mockUseMyDiary.mockReturnValue({
    data:
      myDiaryEntries ??
      entries.filter((e) => e.ratings.some((r) => r.member_id === CURRENT_USER && (r.rating ?? 0) > 0)),
    isLoading: false,
    isError: false,
  });
  mockUseActiveGroup.mockReturnValue({
    activeGroupId: "g1",
    setActiveGroup: jest.fn(),
    groupsQuery: {
      data: [{ group_id: "g1", user_id: CURRENT_USER, role: "owner", joined_at: "2026-01-01" }],
      isLoading: false,
      isError: false,
    },
  });
  mockUseGroupWatchlist.mockReturnValue({
    data: { entries, streamingAvailability: new Map() },
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseGroupMembers.mockReturnValue({
    data: groupMembers ?? [],
    isLoading: false,
    isError: false,
    error: null,
  });
}

async function selectSortField(getByTestId: any, field: string) {
  await fireEvent.press(getByTestId("tagebuch-sort-field"));
  await fireEvent.press(getByTestId(`tagebuch-sort-field-option-${field}`));
}

/** Opens the "+ Filter" flyout, runs `pick` on the draft, applies. */
async function applyFilters(getByTestId: any, pick: () => Promise<void>) {
  await fireEvent.press(getByTestId("tagebuch-filter-add"));
  await pick();
  await fireEvent.press(getByTestId("tagebuch-filter-apply"));
}

describe("TagebuchScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({
      diaryViewMode: "cards",
      // Most tests were written for "Mein Tagebuch"; the app default ("group") has its own test.
      diaryScope: "my_diary",
      listFilters: {},
      selectedStreamingProviderIds: [],
      filterPanelOpen: { watchlist: false, diary: true },
    });
    mockUseMyStreamingProviders.mockReturnValue({ data: undefined, isLoading: false });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseMyDiary.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  describe("loading / error / empty states", () => {
    it("shows a loading indicator while the current user id is not yet known", async () => {
      mockCurrentUserId.mockReturnValue(undefined);
      mockUseActiveGroup.mockReturnValue({
        activeGroupId: undefined,
        setActiveGroup: jest.fn(),
        groupsQuery: { data: undefined, isLoading: false, isError: false },
      });
      mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-loading")).toBeTruthy();
    });

    it("shows a loading indicator while the group watchlist query is loading", async () => {
      mockCurrentUserId.mockReturnValue(CURRENT_USER);
      mockUseActiveGroup.mockReturnValue({
        activeGroupId: "g1",
        setActiveGroup: jest.fn(),
        groupsQuery: {
          data: [{ group_id: "g1", user_id: CURRENT_USER, role: "owner", joined_at: "2026-01-01" }],
          isLoading: false,
          isError: false,
        },
      });
      mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-loading")).toBeTruthy();
    });

    it("shows an error state when the group watchlist query fails", async () => {
      mockCurrentUserId.mockReturnValue(CURRENT_USER);
      mockUseActiveGroup.mockReturnValue({
        activeGroupId: "g1",
        setActiveGroup: jest.fn(),
        groupsQuery: {
          data: [{ group_id: "g1", user_id: CURRENT_USER, role: "owner", joined_at: "2026-01-01" }],
          isLoading: false,
          isError: false,
        },
      });
      mockUseGroupWatchlist.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { message: "network error" },
      });
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-error")).toBeTruthy();
    });

    it("shows the empty state when the current user has no diary entries", async () => {
      mockHappyPath([]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-empty")).toBeTruthy();
    });

    it("shows the empty state when entries exist but none are rated by the current user (all Watchlist, not Diary)", async () => {
      mockHappyPath([
        makeEntry({ id: "e1", movie: makeMovie({ tmdb_id: 1, name: "Unrated" }), ratings: [] }),
      ]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-empty")).toBeTruthy();
    });
  });

  describe("card mode rendering (default)", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({
        tmdb_id: 1,
        name: "Alpha",
        poster: "https://example.com/alpha.jpg",
        vote_average: 7.5,
      }),
      ratings: [
        makeRating({ member_id: "u1", rating: 4, liked: true, seen_at: "2026-01-10" }),
        makeRating({ member_id: "u2", rating: null }),
        makeRating({ member_id: "u3", rating: 5 }),
      ],
    });

    it("renders the entry with a per-member rating row for every group member, including '–' for a member with no real rating", async () => {
      useGroupScope();
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getAllByTestId } = await render(<TagebuchScreen />);

      const rows = getAllByTestId("member-rating-row");
      expect(rows).toHaveLength(3); // u1, u2, u3

      const values = getAllByTestId("member-rating-value").map((node) => node.props.children);
      expect(values).toEqual(["4.0", "–", "5.0"]);
    });

    it("renders a '–' row for a real group member who has no rating row at all", async () => {
      useGroupScope();
      mockHappyPath(
        [entry],
        [
          { user_id: "u1", profiles: { display_name: "Robin" } },
          { user_id: "u2", profiles: { display_name: "Sam" } },
          { user_id: "u3", profiles: { display_name: "Alex" } },
          { user_id: "u4", profiles: { display_name: "Kim" } },
        ],
      );
      const TagebuchScreen = loadTagebuchScreen();

      const { getAllByTestId } = await render(<TagebuchScreen />);

      const names = getAllByTestId("member-rating-name").map((node) => node.props.children);
      const values = getAllByTestId("member-rating-value").map((node) => node.props.children);
      expect(names).toEqual(["Robin", "Sam", "Alex", "Kim"]);
      expect(values).toEqual(["4.0", "–", "5.0", "–"]);
    });

    it("shows the real profile display_name (joined via useGroupMembers) for a member row, falling back to the uuid-prefix placeholder when a profile is missing", async () => {
      useGroupScope();
      mockHappyPath(
        [entry],
        [
          { user_id: "u1", profiles: { display_name: "Robin" } },
          { user_id: "u2", profiles: null },
          { user_id: "u3", profiles: { display_name: "Alex" } },
        ],
      );
      const TagebuchScreen = loadTagebuchScreen();

      const { getAllByTestId } = await render(<TagebuchScreen />);

      const names = getAllByTestId("member-rating-name").map((node) => node.props.children);
      expect(names).toEqual(["Robin", "Mitglied u2", "Alex"]);
    });

    it("expands a bare stored TMDB poster path into a full image URL for the tile", async () => {
      mockHappyPath([
        makeEntry({
          id: "e9",
          movie: makeMovie({ tmdb_id: 9, name: "Bare", poster: "/bare.jpg" }),
          ratings: [makeRating({ member_id: "u1", rating: 4 })],
        }),
      ]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("poster-card-image").props.source).toEqual([
        { uri: "https://image.tmdb.org/t/p/w342/bare.jpg" },
      ]);
    });

    it("computes and displays the average-rating badge from the non-null ratings only", async () => {
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      // (4 + 5) / 2 = 4.5 — u2's null rating is excluded.
      expect(getByTestId("poster-card-average-value").props.children).toBe("4.5");
    });

    it("shows the like-heart badge (fixed color) because the current user has liked this entry", async () => {
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      const heartIcon = getByTestId("poster-card-like-icon");
      expect(heartIcon.props.color).toBe("#e05c6e");
    });

    it("does not show the like-heart badge when the current user has not liked the entry", async () => {
      const unliked = makeEntry({
        id: "e2",
        movie: makeMovie({ tmdb_id: 2, name: "Beta" }),
        ratings: [makeRating({ member_id: "u1", rating: 3, liked: false })],
      });
      mockHappyPath([unliked]);
      const TagebuchScreen = loadTagebuchScreen();

      const { queryByTestId } = await render(<TagebuchScreen />);

      expect(queryByTestId("poster-card-like-badge")).toBeNull();
    });

    it("shows the TMDB score badge from the movie's vote_average", async () => {
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("poster-card-tmdb-value").props.children).toBe("7.5");
    });

    it("shows 'Gesehen am DD.MM.YYYY' using the CURRENT user's own seen_at", async () => {
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId(`tagebuch-entry-seen-date-${entry.id}`).props.children).toBe(
        "Gesehen am 10.01.2026",
      );
    });

    it("shows 'Kein Datum' when the CURRENT user's own seen_at is null, even if other members have a seen_at", async () => {
      const entryNoOwnDate = makeEntry({
        id: "e3",
        movie: makeMovie({ tmdb_id: 3, name: "Gamma" }),
        ratings: [
          makeRating({ member_id: "u1", rating: 2, seen_at: null }),
          makeRating({ member_id: "u2", rating: 3, seen_at: "2026-02-02" }),
        ],
      });
      mockHappyPath([entryNoOwnDate]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId(`tagebuch-entry-seen-date-${entryNoOwnDate.id}`).props.children).toBe(
        "Kein Datum",
      );
    });
  });

  it("navigates to the Settings hub when the gear button is tapped (lock-out guard)", async () => {
    mockHappyPath([]);
    const TagebuchScreen = loadTagebuchScreen();
    const { getByTestId } = await render(<TagebuchScreen />);

    await fireEvent.press(getByTestId("tagebuch-settings-button"));

    expect(mockRouter.push).toHaveBeenCalledWith("/settings");
  });

  describe("tapping an entry opens the movie detail overlay", () => {
    const diaryEntry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 1, name: "Alpha" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-01-10" })],
    });
    const EXPECTED = {
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "1", groupId: "g1", source: "diary", watchlistEntryId: "e1" },
    };

    it.each(["cards", "grid", "list"] as const)("in %s mode", async (mode) => {
      loadPreferencesStore().setState({ diaryViewMode: mode });
      mockHappyPath([diaryEntry]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      const target = mode === "list" ? "tagebuch-entry-e1" : "tagebuch-entry-press-e1";
      await fireEvent.press(getByTestId(target));

      expect(mockRouter.push).toHaveBeenCalledWith(EXPECTED);
    });
  });

  it("virtualizes the list: only a window of a long diary is mounted, in every view mode", async () => {
    const many = Array.from({ length: 120 }, (_, i) =>
      makeEntry({
        id: `v${i}`,
        movie: makeMovie({ tmdb_id: 1000 + i, name: `Film ${i}` }),
        ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-01-10" })],
      }),
    );
    for (const mode of ["cards", "grid", "list"] as const) {
      loadPreferencesStore().setState({ diaryViewMode: mode });
      mockHappyPath(many);
      const TagebuchScreen = loadTagebuchScreen();
      const { getAllByTestId, getByTestId, queryByTestId, unmount } = await render(<TagebuchScreen />);
      expect(getByTestId("tagebuch-entry-list")).toBeTruthy();
      expect(getByTestId("tagebuch-entry-v0")).toBeTruthy();
      expect(queryByTestId("tagebuch-entry-v119")).toBeNull();
      expect(getAllByTestId(/^tagebuch-entry-v\d+$/).length).toBeLessThan(60);
      await unmount();
    }
  });

  it("list mode: separator only between rows, none after the last", async () => {
    loadPreferencesStore().setState({ diaryViewMode: "list" });
    const a = makeEntry({
      id: "la",
      movie: makeMovie({ tmdb_id: 11, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-01-10" })],
    });
    const b = makeEntry({
      id: "lb",
      movie: makeMovie({ tmdb_id: 12, name: "B" }),
      ratings: [makeRating({ member_id: "u1", rating: 3, seen_at: "2026-01-05" })],
    });
    mockHappyPath([a, b]);
    const TagebuchScreen = loadTagebuchScreen();
    const { getAllByTestId } = await render(<TagebuchScreen />);

    const rows = getAllByTestId(/^tagebuch-entry-l[ab]$/);
    expect(rows).toHaveLength(2);
    expect(rows[0].props.className ?? "").toContain("border-b");
    expect(rows[1].props.className ?? "").not.toContain("border-b");
  });

  describe("view-mode toggle active state", () => {
    it("marks only the current mode button with the active (primary) styling, like Watchlist", async () => {
      loadPreferencesStore().setState({ diaryViewMode: "grid" });
      mockHappyPath([]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      const fill = (id: string) =>
        StyleSheet.flatten(getByTestId(`tagebuch-view-mode-${id}-segment`).props.style).backgroundColor;
      expect(fill("grid")).not.toBe("transparent");
      expect(fill("cards")).toBe("transparent");
      expect(fill("list")).toBe("transparent");
    });
  });

  describe("collapsible filter panel", () => {
    it("is closed by default, toggle opens it and persists; dot not shown for non-default sort", async () => {
      mockHappyPath([]);
      loadPreferencesStore().setState({ filterPanelOpen: { watchlist: false, diary: false } });
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-search-input")).toBeTruthy();
      expect(queryByTestId("tagebuch-filter-panel")).toBeNull();
      expect(queryByTestId("tagebuch-sort-field")).toBeNull();
      expect(queryByTestId("tagebuch-filter-active-dot")).toBeNull();

      await fireEvent.press(getByTestId("tagebuch-filter-toggle"));
      expect(getByTestId("tagebuch-filter-panel")).toBeTruthy();
      expect(getByTestId("tagebuch-view-mode-toggle")).toBeTruthy();
      expect(loadPreferencesStore().getState().filterPanelOpen.diary).toBe(true);

      expect(getByTestId("tagebuch-sort-field")).toBeTruthy();
      expect(getByTestId("tagebuch-filter-add")).toBeTruthy();
      await fireEvent.press(getByTestId("tagebuch-sort-direction"));
      await fireEvent.press(getByTestId("tagebuch-filter-toggle"));
      expect(queryByTestId("tagebuch-filter-panel")).toBeNull();
      expect(queryByTestId("tagebuch-filter-active-dot")).toBeNull();
    });

    it("shows the dot once a filter is applied", async () => {
      mockHappyPath([]);
      loadPreferencesStore().setState({ filterPanelOpen: { watchlist: false, diary: true } });
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      expect(queryByTestId("tagebuch-filter-active-dot")).toBeNull();
      await applyFilters(getByTestId, async () => {
        await fireEvent.press(getByTestId("tagebuch-filter-liked"));
      });
      expect(getByTestId("tagebuch-filter-active-dot")).toBeTruthy();
    });
  });

  describe("view-mode toggle", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 1, name: "Alpha", vote_average: 7 }),
      ratings: [makeRating({ member_id: "u1", rating: 4 })],
    });

    it("defaults to card mode and switches to grid/list on toggle, hiding per-member rows outside card mode", async () => {
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryAllByTestId } = await render(<TagebuchScreen />);
      expect(queryAllByTestId("member-rating-row").length).toBeGreaterThan(0);

      await fireEvent.press(getByTestId("tagebuch-view-mode-grid"));
      expect(queryAllByTestId("member-rating-row")).toHaveLength(0);
      expect(getByTestId("poster-card-average-value")).toBeTruthy();

      await fireEvent.press(getByTestId("tagebuch-view-mode-list"));
      expect(getByTestId(`tagebuch-list-title-${entry.id}`).props.children).toBe("Alpha");
      expect(getByTestId("tagebuch-table-header-like").props.accessibilityLabel).toBe("Favorit");
      expect(getByTestId("tagebuch-table-header-average").props.accessibilityLabel).toContain("Durchschnitt");
      expect(getByTestId("tagebuch-table-header-tmdb").props.accessibilityLabel).toBe("TMDB");
      expect(queryAllByTestId(`tagebuch-list-year-${entry.id}`)).toHaveLength(0);
      expect(queryAllByTestId(`tagebuch-list-like-${entry.id}`)).toHaveLength(0);
    });

    it("persists the selected view mode via usePreferencesStore", async () => {
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();
      const usePreferencesStore = loadPreferencesStore();

      const { getByTestId } = await render(<TagebuchScreen />);
      await fireEvent.press(getByTestId("tagebuch-view-mode-list"));

      expect(usePreferencesStore.getState().diaryViewMode).toBe("list");
    });

    it("shows a title under each grid tile when showTitlesInGrid is true (M10 Darstellung toggle)", async () => {
      mockHappyPath([entry]);
      const usePreferencesStore = loadPreferencesStore();
      usePreferencesStore.setState({ diaryViewMode: "grid", showTitlesInGrid: true });
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId(`tagebuch-grid-title-${entry.id}`).props.children).toBe("Alpha");
    });

    it("hides the title under each grid tile when showTitlesInGrid is false (M10 Darstellung toggle)", async () => {
      mockHappyPath([entry]);
      const usePreferencesStore = loadPreferencesStore();
      usePreferencesStore.setState({ diaryViewMode: "grid", showTitlesInGrid: false });
      const TagebuchScreen = loadTagebuchScreen();

      const { queryByTestId } = await render(<TagebuchScreen />);

      expect(queryByTestId(`tagebuch-grid-title-${entry.id}`)).toBeNull();
    });
  });

  describe("filter flyout (rating state, liked)", () => {
    const memberIds = ["u1", "u2", "u3"];

    const fullyRated = makeEntry({
      id: "e-full",
      movie: makeMovie({ tmdb_id: 1, name: "FullyRated" }),
      ratings: memberIds.map((id) => makeRating({ member_id: id, rating: 4 })),
    });
    const missingSome = makeEntry({
      id: "e-missing",
      movie: makeMovie({ tmdb_id: 2, name: "MissingSome" }),
      ratings: [makeRating({ member_id: "u1", rating: 5 }), makeRating({ member_id: "u2", rating: null })],
    });
    const likedEntry = makeEntry({
      id: "e-liked",
      movie: makeMovie({ tmdb_id: 3, name: "LikedOne" }),
      ratings: [makeRating({ member_id: "u1", rating: 3, liked: true })],
    });
    const notLikedEntry = makeEntry({
      id: "e-notliked",
      movie: makeMovie({ tmdb_id: 4, name: "NotLiked" }),
      ratings: [makeRating({ member_id: "u1", rating: 3, liked: false })],
    });

    async function applyFlag(getByTestId: any, flag: string) {
      await applyFilters(getByTestId, async () => {
        await fireEvent.press(getByTestId(`tagebuch-filter-${flag}`));
      });
    }

    it("'Alle bewertet' shows only entries where every group member has a non-null rating", async () => {
      useGroupScope();
      mockHappyPath([fullyRated, missingSome]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await applyFlag(getByTestId, "all_rated");

      expect(getByTestId(`tagebuch-entry-${fullyRated.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${missingSome.id}`)).toBeNull();
    });

    it("'Fehlt noch' shows only entries where at least one group member is missing a rating", async () => {
      useGroupScope();
      mockHappyPath([fullyRated, missingSome]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await applyFlag(getByTestId, "missing");

      expect(getByTestId(`tagebuch-entry-${missingSome.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${fullyRated.id}`)).toBeNull();
    });

    it("'Mag ich' filter shows only entries the current user has liked", async () => {
      mockHappyPath([likedEntry, notLikedEntry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await applyFlag(getByTestId, "liked");

      expect(getByTestId(`tagebuch-entry-${likedEntry.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${notLikedEntry.id}`)).toBeNull();
    });
  
    it("a flag chip appears after applying and removes the filter again when tapped", async () => {
      mockHappyPath([likedEntry, notLikedEntry]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await applyFlag(getByTestId, "liked");
      expect(queryByTestId(`tagebuch-entry-${notLikedEntry.id}`)).toBeNull();

      await fireEvent.press(getByTestId("tagebuch-filter-chip-liked"));

      expect(queryByTestId("tagebuch-filter-chip-liked")).toBeNull();
      expect(getByTestId(`tagebuch-entry-${notLikedEntry.id}`)).toBeTruthy();
    });

    it("the flyout works on a draft: closing without 'Anwenden' changes nothing, 'Zurücksetzen' clears the draft", async () => {
      mockHappyPath([likedEntry, notLikedEntry]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);

      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      await fireEvent.press(getByTestId("tagebuch-filter-liked"));
      await fireEvent.press(getByTestId("sheet-close-button"));
      expect(getByTestId(`tagebuch-entry-${notLikedEntry.id}`)).toBeTruthy();
      expect(queryByTestId("tagebuch-filter-chip-liked")).toBeNull();

      await applyFlag(getByTestId, "liked");
      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      await fireEvent.press(getByTestId("tagebuch-filter-reset"));
      await fireEvent.press(getByTestId("tagebuch-filter-apply"));
      expect(queryByTestId("tagebuch-filter-chip-liked")).toBeNull();
      expect(getByTestId(`tagebuch-entry-${notLikedEntry.id}`)).toBeTruthy();
    });

    it("'Alle bewertet' and 'Fehlt noch' exclude each other in the flyout", async () => {
      useGroupScope();
      mockHappyPath([fullyRated, missingSome]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);
      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      await fireEvent.press(getByTestId("tagebuch-filter-all_rated"));
      await fireEvent.press(getByTestId("tagebuch-filter-missing"));
      await fireEvent.press(getByTestId("tagebuch-filter-apply"));
      expect(getByTestId("tagebuch-filter-chip-missing")).toBeTruthy();
      expect(() => getByTestId("tagebuch-filter-chip-all_rated")).toThrow();
    });
  });

  describe("genre/year in the filter flyout", () => {
    const entryWithGenre = makeEntry({
      id: "e1",
      movie: makeMovie({
        tmdb_id: 1,
        name: "Alpha",
        movie_genres: [{ genre_id: "genre-action" }],
      }),
      ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-05-01" })],
    });

    it("shows the real genre name (joined via movie_genres(genres(name))) on a genre pill, falling back to the placeholder when missing", async () => {
      const entryNamedGenre = makeEntry({
        id: "e-named",
        movie: makeMovie({
          tmdb_id: 9,
          name: "Named",
          movie_genres: [{ genre_id: "genre-action", genres: { name: "Action" } }],
        }),
        ratings: [makeRating({ member_id: "u1", rating: 4 })],
      });
      mockHappyPath([entryNamedGenre]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, getByText } = await render(<TagebuchScreen />);
      await fireEvent.press(getByTestId("tagebuch-filter-add"));

      expect(getByText("Action")).toBeTruthy();
    });

    it("shows genre and year pills inside the flyout, independent of the sort field", async () => {
      mockHappyPath([entryWithGenre]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      expect(queryByTestId("tagebuch-genre-pills")).toBeNull();

      await fireEvent.press(getByTestId("tagebuch-filter-add"));

      expect(getByTestId("tagebuch-genre-pills")).toBeTruthy();
      expect(getByTestId("tagebuch-year-pills")).toBeTruthy();
    });

    it("offers a 'Kein Datum' year pill when an entry has no own seen date", async () => {
      const entryNoDate = makeEntry({
        id: "e2",
        movie: makeMovie({ tmdb_id: 2, name: "Beta" }),
        ratings: [makeRating({ member_id: "u1", rating: 3, seen_at: null })],
      });
      mockHappyPath([entryWithGenre, entryNoDate]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);
      await fireEvent.press(getByTestId("tagebuch-filter-add"));

      expect(getByTestId("tagebuch-year-pill-2026")).toBeTruthy();
      expect(getByTestId("tagebuch-year-pill-no_date")).toBeTruthy();
    });

    it("applying a genre pill filters the visible entries and shows a removable chip", async () => {
      const entryOtherGenre = makeEntry({
        id: "e3",
        movie: makeMovie({ tmdb_id: 3, name: "Gamma", movie_genres: [{ genre_id: "genre-drama" }] }),
        ratings: [makeRating({ member_id: "u1", rating: 4 })],
      });
      mockHappyPath([entryWithGenre, entryOtherGenre]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await applyFilters(getByTestId, async () => {
        await fireEvent.press(getByTestId("tagebuch-genre-pill-genre-action"));
      });

      expect(getByTestId(`tagebuch-entry-${entryWithGenre.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${entryOtherGenre.id}`)).toBeNull();
      expect(getByTestId("tagebuch-filter-chip-genre-genre-action")).toBeTruthy();
    });

    it("Genre filter combines with a descending rating sort (filter and sort are independent)", async () => {
      const horrorLow = makeEntry({
        id: "h-low",
        movie: makeMovie({ tmdb_id: 31, name: "HorrorLow", movie_genres: [{ genre_id: "genre-horror" }] }),
        ratings: [makeRating({ member_id: "u1", rating: 2 })],
      });
      const horrorHigh = makeEntry({
        id: "h-high",
        movie: makeMovie({ tmdb_id: 32, name: "HorrorHigh", movie_genres: [{ genre_id: "genre-horror" }] }),
        ratings: [makeRating({ member_id: "u1", rating: 5 })],
      });
      const dramaTop = makeEntry({
        id: "d-top",
        movie: makeMovie({ tmdb_id: 33, name: "DramaTop", movie_genres: [{ genre_id: "genre-drama" }] }),
        ratings: [makeRating({ member_id: "u1", rating: 5 })],
      });
      loadPreferencesStore().setState({ diaryViewMode: "list" });
      mockHappyPath([horrorLow, dramaTop, horrorHigh]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, getAllByTestId, queryByTestId } = await render(<TagebuchScreen />);

      await applyFilters(getByTestId, async () => {
        await fireEvent.press(getByTestId("tagebuch-genre-pill-genre-horror"));
      });

      expect(queryByTestId("tagebuch-entry-d-top")).toBeNull();
      expect(getAllByTestId(/^tagebuch-entry-(h|d)-/).map((n) => n.props.testID)).toEqual([
        "tagebuch-entry-h-high",
        "tagebuch-entry-h-low",
      ]);
      await fireEvent.press(getByTestId("tagebuch-sort-direction"));
      expect(getAllByTestId(/^tagebuch-entry-(h|d)-/).map((n) => n.props.testID)).toEqual([
        "tagebuch-entry-h-low",
        "tagebuch-entry-h-high",
      ]);
    });
  });

  describe("search", () => {
    const alpha = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 1, name: "Alpha Movie" }),
      ratings: [makeRating({ member_id: "u1", rating: 4 })],
    });
    const beta = makeEntry({
      id: "e2",
      movie: makeMovie({ tmdb_id: 2, name: "Beta Movie" }),
      ratings: [makeRating({ member_id: "u1", rating: 3 })],
    });

    it("filters the displayed list once the query has 2+ characters", async () => {
      mockHappyPath([alpha, beta]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await fireEvent.changeText(getByTestId("tagebuch-search-input"), "Alpha");

      expect(getByTestId(`tagebuch-entry-${alpha.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${beta.id}`)).toBeNull();
    });

    it("does not filter with fewer than 2 characters", async () => {
      mockHappyPath([alpha, beta]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId } = await render(<TagebuchScreen />);
      await fireEvent.changeText(getByTestId("tagebuch-search-input"), "A");

      expect(getByTestId(`tagebuch-entry-${alpha.id}`)).toBeTruthy();
      expect(getByTestId(`tagebuch-entry-${beta.id}`)).toBeTruthy();
    });
  });

  describe("persisted per-group sort/filter, 'Meine Streaming-Dienste', empty texts", () => {
    const alpha = makeEntry({
      id: "p1",
      movie: makeMovie({ tmdb_id: 11, name: "Alpha Movie", vote_average: 3 }),
      ratings: [makeRating({ member_id: "u1", rating: 4 })],
    });
    const beta = makeEntry({
      id: "p2",
      movie: makeMovie({ tmdb_id: 12, name: "Beta Movie", vote_average: 9 }),
      ratings: [makeRating({ member_id: "u1", rating: 3 })],
    });

    it("persists the chosen sort field + direction per group and restores them on mount", async () => {
      mockHappyPath([alpha, beta]);
      const TagebuchScreen = loadTagebuchScreen();
      const first = await render(<TagebuchScreen />);

      await selectSortField(first.getByTestId, "tmdb");
      await fireEvent.press(first.getByTestId("tagebuch-sort-direction"));

      expect(loadPreferencesStore().getState().listFilters["diary"].sort).toEqual({
        field: "tmdb",
        direction: "asc",
      });
      await first.unmount();

      const second = await render(<TagebuchScreen />);
      expect(second.getByTestId("tagebuch-sort-field").props.accessibilityLabel).toBe("Sortieren nach TMDB");
      expect(second.getByTestId("tagebuch-sort-direction").props.accessibilityLabel).toMatch(/aufsteigend/);
    });

    it("persists filters (genre/year) per tab and the global scope, but not the search text", async () => {
      mockHappyPath([alpha, beta]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      await fireEvent.changeText(getByTestId("tagebuch-search-input"), "Alpha");
      await fireEvent.press(getByTestId("tagebuch-scope-group"));
      await applyFilters(getByTestId, async () => {
        await fireEvent.press(getByTestId("tagebuch-year-pill-no_date"));
      });

      const stored = loadPreferencesStore().getState().listFilters;
      expect(stored["diary"].filters.year).toBe("no_date");
      expect(loadPreferencesStore().getState().diaryScope).toBe("group");
      expect(JSON.stringify(stored)).not.toContain("Alpha");
    });

    it("'Meine Dienste': filters to own services per category pill (min. 1 active); providers load only while active", async () => {
      mockHappyPath([alpha, beta]);
      loadPreferencesStore().setState({ selectedStreamingProviderIds: [8] });
      mockUseMyStreamingProviders.mockImplementation((_ids: number[], enabled: boolean) => ({
        data: enabled
          ? new Map([
              [11, { flatrate: [{ provider_id: 8, provider_name: "N" }], rent: [], buy: [] }],
              [12, { flatrate: [], rent: [{ provider_id: 8, provider_name: "N" }], buy: [] }],
            ])
          : undefined,
        isLoading: false,
      }));
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);

      expect(mockUseMyStreamingProviders).toHaveBeenLastCalledWith([11, 12], false);
      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      expect(queryByTestId("tagebuch-provider-categories")).toBeNull();
      await fireEvent.press(getByTestId("tagebuch-streaming-mine"));
      await fireEvent.press(getByTestId("tagebuch-filter-apply"));

      expect(mockUseMyStreamingProviders).toHaveBeenLastCalledWith([11, 12], true);
      expect(getByTestId("tagebuch-entry-p1")).toBeTruthy();
      expect(queryByTestId("tagebuch-entry-p2")).toBeNull();

      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      await fireEvent.press(getByTestId("tagebuch-provider-category-rent"));
      await fireEvent.press(getByTestId("tagebuch-filter-apply"));
      expect(getByTestId("tagebuch-entry-p2")).toBeTruthy();

      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      await fireEvent.press(getByTestId("tagebuch-provider-category-flatrate"));
      await fireEvent.press(getByTestId("tagebuch-provider-category-rent"));
      await fireEvent.press(getByTestId("tagebuch-filter-apply"));
      expect(loadPreferencesStore().getState().listFilters["diary"].filters.providerCategories).toEqual(["rent"]);
    });

    it("shows a search-specific text when a search matches nothing (distinct from the empty-diary text)", async () => {
      mockHappyPath([alpha, beta]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, getByText, queryByTestId } = await render(<TagebuchScreen />);

      await fireEvent.changeText(getByTestId("tagebuch-search-input"), "zzzzzz");

      expect(getByTestId("tagebuch-no-results")).toBeTruthy();
      expect(getByText("Keine Treffer für „zzzzzz“.")).toBeTruthy();
      expect(queryByTestId("tagebuch-empty")).toBeNull();
    });
  });

  describe("default sort and column-header sort", () => {
    const low = makeEntry({
      id: "d-low",
      movie: makeMovie({ tmdb_id: 21, name: "Beta", vote_average: 5 }),
      ratings: [makeRating({ member_id: "u1", rating: 2, seen_at: "2026-03-01" })],
    });
    const high = makeEntry({
      id: "d-high",
      movie: makeMovie({ tmdb_id: 22, name: "Alpha", vote_average: 8 }),
      ratings: [makeRating({ member_id: "u1", rating: 5, seen_at: "2026-01-01" })],
    });
    const mid = makeEntry({
      id: "d-mid",
      movie: makeMovie({ tmdb_id: 23, name: "Gamma", vote_average: null }),
      ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-02-01", liked: true })],
    });
    const order = (nodes: { props: { testID?: string } }[]) =>
      nodes.map((n) => n.props.testID);

    it("defaults to average rating descending without filters; the panel shows field and direction", async () => {
      loadPreferencesStore().setState({ diaryViewMode: "list" });
      mockHappyPath([low, high, mid]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getAllByTestId, getByTestId } = await render(<TagebuchScreen />);
      expect(order(getAllByTestId(/^tagebuch-entry-d-/))).toEqual([
        "tagebuch-entry-d-high",
        "tagebuch-entry-d-mid",
        "tagebuch-entry-d-low",
      ]);
      expect(getByTestId("tagebuch-sort-field").props.accessibilityLabel).toBe("Sortieren nach Bewertung Ø");
      expect(getByTestId("tagebuch-sort-direction").props.accessibilityLabel).toMatch(/absteigend/);
    });

    it("panel sort row sorts the list; table header is static (no buttons, no sort indicator)", async () => {
      loadPreferencesStore().setState({ diaryViewMode: "list" });
      mockHappyPath([low, high, mid]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getAllByTestId, getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      const rows = () => order(getAllByTestId(/^tagebuch-entry-d-/));
      for (const id of ["title", "like", "average", "tmdb"]) {
        expect(getByTestId(`tagebuch-table-header-${id}`).props.accessibilityRole).not.toBe("button");
      }

      await selectSortField(getByTestId, "seen_at");
      // own seen_at desc: low (03-01), mid (02-01), high (01-01)
      expect(rows()).toEqual(["tagebuch-entry-d-low", "tagebuch-entry-d-mid", "tagebuch-entry-d-high"]);

      await selectSortField(getByTestId, "title");
      await fireEvent.press(getByTestId("tagebuch-sort-direction"));
      expect(rows()).toEqual(["tagebuch-entry-d-high", "tagebuch-entry-d-low", "tagebuch-entry-d-mid"]);
      expect(queryByTestId("tagebuch-table-header-title-sort-asc")).toBeNull();
    });

    it("all view modes use the same persisted sort", async () => {
      mockHappyPath([low, high, mid]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getAllByTestId, getByTestId } = await render(<TagebuchScreen />);
      await selectSortField(getByTestId, "title");
      await fireEvent.press(getByTestId("tagebuch-sort-direction"));
      for (const mode of ["cards", "grid", "list"]) {
        await fireEvent.press(getByTestId(`tagebuch-view-mode-${mode}`));
        expect(order(getAllByTestId(/^tagebuch-entry-d-/))).toEqual([
          "tagebuch-entry-d-high",
          "tagebuch-entry-d-low",
          "tagebuch-entry-d-mid",
        ]);
      }
    });
  });

  describe("scope switch (Mein Tagebuch | Gruppe)", () => {
    const mine = makeEntry({
      id: "s-mine",
      movie: makeMovie({ tmdb_id: 41, name: "Mine" }),
      ratings: [makeRating({ member_id: "u1", rating: 4 })],
    });
    const others = makeEntry({
      id: "s-others",
      movie: makeMovie({ tmdb_id: 42, name: "Others" }),
      ratings: [makeRating({ member_id: "u2", rating: 5 })],
    });

    it("defaults to 'Gruppe' (app default), not 'Mein Tagebuch'", async () => {
      loadPreferencesStore().setState({ diaryScope: "group" });
      mockHappyPath([mine, others]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-scope-group").props.accessibilityState).toMatchObject({ selected: true });
      expect(getByTestId("tagebuch-entry-s-others")).toBeTruthy();
    });

    it("a chosen scope stays when the active group changes", async () => {
      mockHappyPath([mine, others]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, rerender } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-scope-my_diary").props.accessibilityState).toMatchObject({ selected: true });
      mockUseActiveGroup.mockReturnValue({ activeGroupId: "g2", groupsQuery: { isLoading: false, isError: false } });
      await rerender(<TagebuchScreen />);
      expect(getByTestId("tagebuch-scope-my_diary").props.accessibilityState).toMatchObject({ selected: true });

      await fireEvent.press(getByTestId("tagebuch-scope-group"));
      mockUseActiveGroup.mockReturnValue({ activeGroupId: "g1", groupsQuery: { isLoading: false, isError: false } });
      await rerender(<TagebuchScreen />);
      expect(getByTestId("tagebuch-scope-group").props.accessibilityState).toMatchObject({ selected: true });
    });

    it("starts on 'Mein Tagebuch' when chosen; 'Gruppe' also lists movies only other members rated, sort/filters stay", async () => {
      mockHappyPath([mine, others]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-scope-my_diary").props.accessibilityState).toMatchObject({ selected: true });
      expect(queryByTestId("tagebuch-entry-s-others")).toBeNull();

      await fireEvent.press(getByTestId("tagebuch-scope-group"));

      expect(getByTestId("tagebuch-entry-s-others")).toBeTruthy();
      expect(getByTestId("tagebuch-entry-s-mine")).toBeTruthy();
      expect(getByTestId("tagebuch-sort-field").props.accessibilityLabel).toBe("Sortieren nach Bewertung Ø");
      expect(loadPreferencesStore().getState().diaryScope).toBe("group");
    });
  });

  describe("global sort/filter across group switches", () => {
    const rated = (id: string, tmdb: number, groupId: string, liked: boolean) =>
      makeEntry({
        id,
        group_id: groupId,
        movie: makeMovie({ tmdb_id: tmdb, name: id }),
        ratings: [makeRating({ member_id: "u1", rating: 4, liked })],
      });
    const g1Liked = rated("g1-liked", 61, "g1", true);
    const g1Plain = rated("g1-plain", 62, "g1", false);
    const g2Liked = rated("g2-liked", 63, "g2", true);
    const g2Plain = rated("g2-plain", 64, "g2", false);

    function useGroup(groupId: string) {
      mockUseActiveGroup.mockReturnValue({
        activeGroupId: groupId,
        setActiveGroup: jest.fn(),
        groupsQuery: { data: [], isLoading: false, isError: false },
      });
    }

    it("applies sort 'Likes' + filter 'Mag ich' to the data of the NEW group after a switch", async () => {
      loadPreferencesStore().setState({ diaryScope: "group" });
      mockHappyPath([g1Liked, g1Plain]);
      mockUseGroupWatchlist.mockImplementation((groupId: string) => ({
        data: {
          entries: groupId === "g2" ? [g2Liked, g2Plain] : [g1Liked, g1Plain],
          streamingAvailability: new Map(),
        },
        isLoading: false,
        isError: false,
        error: null,
      }));
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId, rerender } = await render(<TagebuchScreen />);

      await selectSortField(getByTestId, "likes");
      await applyFilters(getByTestId, async () => {
        await fireEvent.press(getByTestId("tagebuch-filter-liked"));
      });
      expect(getByTestId("tagebuch-entry-g1-liked")).toBeTruthy();
      expect(queryByTestId("tagebuch-entry-g1-plain")).toBeNull();

      useGroup("g2");
      await rerender(<TagebuchScreen />);

      expect(getByTestId("tagebuch-entry-g2-liked")).toBeTruthy();
      expect(queryByTestId("tagebuch-entry-g2-plain")).toBeNull();
      expect(getByTestId("tagebuch-sort-field").props.accessibilityLabel).toBe("Sortieren nach Likes");
      expect(getByTestId("tagebuch-filter-chip-liked")).toBeTruthy();
      expect(Object.keys(loadPreferencesStore().getState().listFilters)).toEqual(["diary"]);
    });

    it("sort 'Likes' alone only reorders, it does not hide entries without a heart", async () => {
      loadPreferencesStore().setState({
        diaryScope: "group",
        listFilters: { diary: { sort: { field: "likes", direction: "desc" }, filters: require("@/lib/listFilters").DEFAULT_ENTRY_FILTERS } },
      });
      mockHappyPath([g1Plain, g1Liked]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-entry-g1-liked")).toBeTruthy();
      expect(getByTestId("tagebuch-entry-g1-plain")).toBeTruthy();
    });
  });

  describe("Mein Tagebuch across all groups (ADR 0014, Phase 5)", () => {
    const inGroup = makeEntry({
      id: "g-in",
      movie: makeMovie({ tmdb_id: 51, name: "InGroup" }),
      ratings: [makeRating({ member_id: "u1", rating: 3, seen_at: "2025-05-05" })],
    });
    const noGroupMovie = makeMovie({ tmdb_id: 52, name: "Elsewhere" });
    const elsewhere = makeEntry({
      id: "my-movie-52",
      group_id: "",
      added_by: null,
      movie: noGroupMovie,
      ratings: [makeRating({ member_id: "u1", rating: 5, seen_at: "2024-04-04" })],
    });

    it("lists movies from my diary that lie in no group of the active group, next to the group ones", async () => {
      mockHappyPath([inGroup], [], [inGroup, elsewhere]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-entry-g-in")).toBeTruthy();
      expect(getByTestId("tagebuch-entry-my-movie-52")).toBeTruthy();
    });

    it("shows a loading state while my diary loads", async () => {
      mockHappyPath([inGroup]);
      mockUseMyDiary.mockReturnValue({ data: undefined, isLoading: true, isError: false });
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-loading")).toBeTruthy();
    });

    it("hides the group-only 'Bewertungsstand' flags in 'Mein Tagebuch' but offers them in 'Gruppe'", async () => {
      mockHappyPath([inGroup], [], [inGroup, elsewhere]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);

      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      expect(queryByTestId("tagebuch-section-rating-state")).toBeNull();
      expect(queryByTestId("tagebuch-filter-all_rated")).toBeNull();
      await fireEvent.press(getByTestId("tagebuch-filter-apply"));

      await fireEvent.press(getByTestId("tagebuch-scope-group"));
      await fireEvent.press(getByTestId("tagebuch-filter-add"));
      expect(getByTestId("tagebuch-section-rating-state")).toBeTruthy();
      expect(getByTestId("tagebuch-filter-all_rated")).toBeTruthy();
    });

    it("ignores a stored 'Alle bewertet' filter in 'Mein Tagebuch' (no chip, nothing hidden)", async () => {
      loadPreferencesStore().setState({
        diaryScope: "my_diary",
        listFilters: { "diary": { sort: null, filters: { ...require("@/lib/listFilters").DEFAULT_ENTRY_FILTERS, allRated: true } } },
      });
      mockHappyPath([inGroup], [], [inGroup, elsewhere]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);

      expect(getByTestId("tagebuch-entry-my-movie-52")).toBeTruthy();
      expect(queryByTestId("tagebuch-filter-chip-all_rated")).toBeNull();
    });

    it("opens a movie of the active group in its group context", async () => {
      mockHappyPath([inGroup], [], [inGroup]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      await fireEvent.press(getByTestId("tagebuch-entry-press-g-in"));

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/movie/[tmdbId]",
        params: { tmdbId: "51", groupId: "g1", source: "diary", watchlistEntryId: "g-in" },
      });
    });

    it("opens a movie that is not in the active group WITHOUT group params (detail works without a group entry)", async () => {
      mockHappyPath([inGroup], [], [inGroup, elsewhere]);
      const TagebuchScreen = loadTagebuchScreen();
      const { getByTestId } = await render(<TagebuchScreen />);

      await fireEvent.press(getByTestId("tagebuch-entry-press-my-movie-52"));

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/movie/[tmdbId]",
        params: { tmdbId: "52", movieJson: encodeURIComponent(JSON.stringify(noGroupMovie)) },
      });
    });
  });

  describe("grid layout", () => {
    it("tiles fill equal cells (flex-1, no fixed width), constant gap, symmetric padding, last row padded", async () => {
      loadPreferencesStore().setState({ diaryViewMode: "grid" });
      const entries = [1, 2, 3, 4, 5].map((n) =>
        makeEntry({
          id: `gr${n}`,
          movie: makeMovie({ tmdb_id: 50 + n, name: `G${n}` }),
          ratings: [makeRating({ member_id: "u1", rating: 3 })],
        }),
      );
      mockHappyPath(entries);
      const TagebuchScreen = loadTagebuchScreen();
      const { getAllByTestId, getByTestId } = await render(<TagebuchScreen />);

      const tiles = getAllByTestId(/^tagebuch-entry-gr\d$/);
      expect(tiles).toHaveLength(5);
      for (const tile of tiles) {
        expect(tile.props.className).toContain("flex-1");
        expect(tile.props.className).not.toMatch(/w-\[/);
      }
      const list = getByTestId("tagebuch-entry-list");
      expect(list.props.contentContainerClassName).toContain("px-4");
      // 5 entries + 3 invisible placeholders = 2 full rows of 4
      expect(list.props.data).toHaveLength(8);
    });
  });
});
