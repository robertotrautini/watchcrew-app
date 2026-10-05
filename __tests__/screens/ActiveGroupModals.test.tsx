import { render } from "@testing-library/react-native";

// Regression: modal screens must target the PERSISTED active group (see
// src/hooks/useActiveGroup.ts), not blindly the first group of the user.

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: (props: Record<string, unknown>) => <View {...props} /> };
});

const mockParams = jest.fn();
jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock({ useLocalSearchParams: () => mockParams() }));
jest.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }));
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: () => ({
    data: [
      { group_id: "g1", user_id: "u1" },
      { group_id: "g2", user_id: "u1" },
    ],
    isLoading: false,
    isError: false,
  }),
}));
const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: (...args: unknown[]) => mockUseGroupWatchlist(...args),
}));

const mockQueryResult = { data: [], isLoading: false, isError: false };
const mockInfiniteResult = {
  data: { pages: [], pageParams: [] },
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isLoading: false,
  isError: false,
};
jest.mock("@/hooks/useSimilarMovies", () => ({ useSimilarMovies: () => mockQueryResult }));
jest.mock("@/hooks/useCollection", () => ({ useCollection: () => mockQueryResult }));
jest.mock("@/hooks/useMoviesProviders", () => ({
  useMoviesProviders: () => ({ providersByTmdbId: new Map(), isLoading: false }),
}));
jest.mock("@/hooks/useDirectorFilmography", () => ({ useDirectorFilmography: () => mockQueryResult }));
jest.mock("@/hooks/useActorFilmography", () => ({ useActorFilmography: () => mockQueryResult }));
jest.mock("@/hooks/useStudioFilmography", () => ({ useStudioFilmography: () => mockInfiniteResult }));
jest.mock("@/hooks/useMovieSearch", () => ({ useMovieSearch: () => mockQueryResult }));
jest.mock("@/hooks/usePersonSearch", () => ({ usePersonSearch: () => mockQueryResult }));
jest.mock("@/hooks/useCompanySearch", () => ({ useCompanySearch: () => mockQueryResult }));
jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useAddToWatchlist: () => ({ mutate: jest.fn(), isPending: false }),
}));

const SCREENS: Array<[string, string]> = [
  ["add-movie", "@/app/(app)/(modals)/add-movie"],
  ["similar", "@/app/(app)/(modals)/similar/[tmdbId]"],
  ["collection", "@/app/(app)/(modals)/collection/[collectionId]"],
  ["actor", "@/app/(app)/(modals)/filmography/actor/[personId]"],
  ["director", "@/app/(app)/(modals)/filmography/director/[personId]"],
  ["studio", "@/app/(app)/(modals)/filmography/studio/[companyId]"],
];

describe("modal screens use the persisted active group", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ tmdbId: "1", collectionId: "1", personId: "1", companyId: "1" });
    mockUseGroupWatchlist.mockReturnValue({
      data: { entries: [], streamingAvailability: new Map() },
      isLoading: false,
      isError: false,
    });
    const { usePreferencesStore } = require("@/stores/usePreferencesStore");
    usePreferencesStore.setState({ activeGroupId: "g2" });
  });

  it.each(SCREENS)("%s", async (_name, path) => {
    const Screen = require(path).default;
    await render(<Screen />);
    expect(mockUseGroupWatchlist).toHaveBeenCalled();
    for (const call of mockUseGroupWatchlist.mock.calls) {
      expect(call[0]).toBe("g2");
    }
  });
});
