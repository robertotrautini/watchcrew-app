import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { Movie, Rating, WatchlistEntry } from "@/lib/watchlistTypes";

// Same Ionicons mocking rationale as __tests__/StarRating.test.tsx.
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

// Real usePreferencesStore (a genuine Zustand store, not a mock), but its
// MMKV backing needs the same fake as __tests__/usePreferencesStore.test.ts
// (a plain Map-backed fake, since the real native module isn't available
// under Jest). State is reset via `usePreferencesStore.setState(...)` in
// beforeEach below rather than jest.resetModules(), since (unlike that
// store's own test file) nothing here depends on hydration-at-module-load
// timing — a plain module-singleton reset between tests is enough.
jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn().mockImplementation(() => {
    const map = new Map<string, string>();
    return {
      getString: (key: string) => map.get(key),
      set: (key: string, value: string) => map.set(key, value),
      remove: (key: string) => map.delete(key),
    };
  }),
}));

const mockUseCurrentUserId = jest.fn();
jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));

const mockUseActiveGroup = jest.fn();
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
}));

const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));

const mockUseGroupMembers = jest.fn();
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: mockUseGroupMembers,
}));

// M10 (Realtime foreground sync, ADR 0006): this screen now calls
// `useFocusEffect` (via src/hooks/useRegisterFocusedGroupScreen.ts) --
// mocked as "run the effect once on mount, cleanup once on unmount", same
// convention as __tests__/useRegisterFocusedGroupScreen.test.tsx -- and its
// own realtime/focus wiring is mocked as a no-op here, same as
// __tests__/screens/Watchlist.test.tsx, so this file keeps testing only its
// own concerns without needing a real Supabase client.
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => callback(), []);
  },
}));

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
    id: `rating-${overrides.member_id}-${Math.random()}`,
    watchlist_entry_id: "entry",
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

function mockHappyPath(entries: WatchlistEntry[], groupMembers?: Record<string, unknown>[]) {
  mockUseCurrentUserId.mockReturnValue(CURRENT_USER);
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

describe("TagebuchScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ diaryViewMode: "cards" });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
  });

  describe("loading / error / empty states", () => {
    it("shows a loading indicator while the current user id is not yet known", async () => {
      mockUseCurrentUserId.mockReturnValue(undefined);
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
      mockUseCurrentUserId.mockReturnValue(CURRENT_USER);
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
      mockUseCurrentUserId.mockReturnValue(CURRENT_USER);
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
      mockHappyPath([entry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getAllByTestId } = await render(<TagebuchScreen />);

      const rows = getAllByTestId("member-rating-row");
      expect(rows).toHaveLength(3); // u1, u2, u3

      const values = getAllByTestId("member-rating-value").map((node) => node.props.children);
      expect(values).toEqual(["4.0", "–", "5.0"]);
    });

    it("shows the real profile display_name (joined via useGroupMembers) for a member row, falling back to the uuid-prefix placeholder when a profile is missing", async () => {
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

  describe("sort dropdown", () => {
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

    async function openSortSheetAndSelect(getByTestId: any, optionValue: string) {
      await fireEvent.press(getByTestId("tagebuch-sort-button"));
      await fireEvent.press(getByTestId(`tagebuch-sort-option-${optionValue}`));
    }

    it("'Von allen bewertet' shows only entries where every group member has a non-null rating", async () => {
      mockHappyPath([fullyRated, missingSome]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await openSortSheetAndSelect(getByTestId, "all_rated");

      expect(getByTestId(`tagebuch-entry-${fullyRated.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${missingSome.id}`)).toBeNull();
    });

    it("'Fehlende Bewertungen' shows only entries where at least one group member is missing a rating", async () => {
      mockHappyPath([fullyRated, missingSome]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await openSortSheetAndSelect(getByTestId, "missing");

      expect(getByTestId(`tagebuch-entry-${missingSome.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${fullyRated.id}`)).toBeNull();
    });

    it("'Mag ich ♥' shows only entries the current user has liked", async () => {
      mockHappyPath([likedEntry, notLikedEntry]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await openSortSheetAndSelect(getByTestId, "liked");

      expect(getByTestId(`tagebuch-entry-${likedEntry.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${notLikedEntry.id}`)).toBeNull();
    });
  });

  describe("genre/year pills", () => {
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
      await fireEvent.press(getByTestId("tagebuch-sort-button"));
      await fireEvent.press(getByTestId("tagebuch-sort-option-genre"));

      expect(getByText("Action")).toBeTruthy();
    });

    it("shows genre pills only when 'Nach Genre' is the active sort option", async () => {
      mockHappyPath([entryWithGenre]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      expect(queryByTestId("tagebuch-genre-pills")).toBeNull();

      await fireEvent.press(getByTestId("tagebuch-sort-button"));
      await fireEvent.press(getByTestId("tagebuch-sort-option-genre"));

      expect(getByTestId("tagebuch-genre-pills")).toBeTruthy();
      expect(queryByTestId("tagebuch-year-pills")).toBeNull();
    });

    it("shows year pills only when 'Nach Jahr' is the active sort option, with a 'Kein Datum' pill when applicable", async () => {
      const entryNoDate = makeEntry({
        id: "e2",
        movie: makeMovie({ tmdb_id: 2, name: "Beta" }),
        ratings: [makeRating({ member_id: "u1", rating: 3, seen_at: null })],
      });
      mockHappyPath([entryWithGenre, entryNoDate]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await fireEvent.press(getByTestId("tagebuch-sort-button"));
      await fireEvent.press(getByTestId("tagebuch-sort-option-year"));

      expect(getByTestId("tagebuch-year-pills")).toBeTruthy();
      expect(getByTestId("tagebuch-year-pill-2026")).toBeTruthy();
      expect(getByTestId("tagebuch-year-pill-no_date")).toBeTruthy();
      expect(queryByTestId("tagebuch-genre-pills")).toBeNull();
    });

    it("selecting a genre pill filters the visible entries via filterByGenre semantics", async () => {
      const entryOtherGenre = makeEntry({
        id: "e3",
        movie: makeMovie({ tmdb_id: 3, name: "Gamma", movie_genres: [{ genre_id: "genre-drama" }] }),
        ratings: [makeRating({ member_id: "u1", rating: 4 })],
      });
      mockHappyPath([entryWithGenre, entryOtherGenre]);
      const TagebuchScreen = loadTagebuchScreen();

      const { getByTestId, queryByTestId } = await render(<TagebuchScreen />);
      await fireEvent.press(getByTestId("tagebuch-sort-button"));
      await fireEvent.press(getByTestId("tagebuch-sort-option-genre"));
      await fireEvent.press(getByTestId("tagebuch-genre-pill-genre-action"));

      expect(getByTestId(`tagebuch-entry-${entryWithGenre.id}`)).toBeTruthy();
      expect(queryByTestId(`tagebuch-entry-${entryOtherGenre.id}`)).toBeNull();
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
});
