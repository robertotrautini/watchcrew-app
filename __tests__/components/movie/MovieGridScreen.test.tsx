import { act, fireEvent, render } from "@testing-library/react-native";

import { mockRouter, resetMockRouter } from "../../helpers/mockRouter";

jest.mock("expo-router", () => require("../../helpers/mockRouter").createExpoRouterMock());
jest.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }));

const mockUseActiveGroup = jest.fn();
jest.mock("@/hooks/useActiveGroup", () => ({ useActiveGroup: (...a: unknown[]) => mockUseActiveGroup(...a) }));
const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({ useGroupWatchlist: (...a: unknown[]) => mockUseGroupWatchlist(...a) }));

import { MovieGridScreen, type MovieGridScreenProps } from "@/components/movie/MovieGridScreen";

const ITEMS = [
  { tmdbId: 1, title: "Film Eins" },
  { tmdbId: 2, title: "Film Zwei" },
];

function baseProps(overrides: Partial<MovieGridScreenProps> = {}): MovieGridScreenProps {
  return {
    testIDPrefix: "x-screen",
    items: ITEMS,
    isLoading: false,
    isError: false,
    hasValidParams: true,
    errorText: "Fehler beim Laden.",
    emptyMessage: "Nichts da",
    ...overrides,
  };
}

const WATCHED_ENTRY = {
  id: "e1",
  movie: { tmdb_id: 1 },
  ratings: [{ member_id: "u1", rating: 5, seen_at: "2026-01-01" }],
};

describe("MovieGridScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockRouter();
    mockUseActiveGroup.mockReturnValue({ activeGroupId: "g1", groupsQuery: { isLoading: false } });
    mockUseGroupWatchlist.mockReturnValue({ data: { entries: [] } });
  });

  it("renders loading while the query loads", async () => {
    const { getByTestId } = await render(<MovieGridScreen {...baseProps({ isLoading: true })} />);
    expect(getByTestId("x-screen-loading")).toBeTruthy();
  });

  it("renders loading while the group list loads, unless waitForGroups is false", async () => {
    mockUseActiveGroup.mockReturnValue({ activeGroupId: null, groupsQuery: { isLoading: true } });
    const first = await render(<MovieGridScreen {...baseProps()} />);
    expect(first.getByTestId("x-screen-loading")).toBeTruthy();
    await first.unmount();
    const second = await render(<MovieGridScreen {...baseProps({ waitForGroups: false })} />);
    expect(second.queryByTestId("x-screen-loading")).toBeNull();
    expect(second.getByTestId("x-screen-grid-item-1")).toBeTruthy();
  });

  it("renders the query error with the default and a custom testID suffix", async () => {
    const first = await render(<MovieGridScreen {...baseProps({ isError: true })} />);
    expect(first.getByTestId("x-screen-error")).toBeTruthy();
    await first.unmount();
    const second = await render(<MovieGridScreen {...baseProps({ isError: true, errorTestIDSuffix: "error-data" })} />);
    expect(second.getByTestId("x-screen-error-data")).toBeTruthy();
    expect(second.queryByTestId("x-screen-error")).toBeNull();
  });

  it("renders the invalid-params text under -error, falling back to the error text", async () => {
    const first = await render(
      <MovieGridScreen {...baseProps({ hasValidParams: false, invalidParamsText: "Ungültig." })} />,
    );
    expect(first.getByText("Ungültig.")).toBeTruthy();
    await first.unmount();
    const second = await render(<MovieGridScreen {...baseProps({ hasValidParams: false })} />);
    expect(second.getByText("Fehler beim Laden.")).toBeTruthy();
  });

  it("renders the empty message when there are no items", async () => {
    const { getByText } = await render(<MovieGridScreen {...baseProps({ items: [] })} />);
    expect(getByText("Nichts da")).toBeTruthy();
  });

  it("renders one tile per item plus the optional title line", async () => {
    const { getByTestId, getByText } = await render(<MovieGridScreen {...baseProps({ title: "Reihe" })} />);
    expect(getByTestId("x-screen-grid-item-1")).toBeTruthy();
    expect(getByTestId("x-screen-grid-item-2")).toBeTruthy();
    expect(getByText("Reihe")).toBeTruthy();
  });

  it("shows the progress header only with showProgress", async () => {
    mockUseGroupWatchlist.mockReturnValue({ data: { entries: [WATCHED_ENTRY] } });
    const first = await render(<MovieGridScreen {...baseProps({ showProgress: true })} />);
    expect(first.getByText("1 von 2 gesehen · 50%")).toBeTruthy();
    await first.unmount();
    const second = await render(<MovieGridScreen {...baseProps()} />);
    expect(second.queryByText("1 von 2 gesehen · 50%")).toBeNull();
  });

  it("shows 'Mehr laden' only when more pages exist and calls onPress", async () => {
    const onPress = jest.fn();
    const first = await render(
      <MovieGridScreen {...baseProps({ loadMore: { hasMore: true, isFetching: false, onPress } })} />,
    );
    await act(async () => {
      fireEvent.press(first.getByTestId("x-screen-load-more-button"));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    await first.unmount();
    const second = await render(
      <MovieGridScreen {...baseProps({ loadMore: { hasMore: false, isFetching: false, onPress } })} />,
    );
    expect(second.queryByTestId("x-screen-load-more-button")).toBeNull();
  });

  it("pushes the plain detail route by default", async () => {
    mockUseGroupWatchlist.mockReturnValue({ data: { entries: [WATCHED_ENTRY] } });
    const { getByTestId } = await render(<MovieGridScreen {...baseProps()} />);
    await act(async () => {
      fireEvent.press(getByTestId("x-screen-grid-item-1"));
    });
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/movie/[tmdbId]", params: { tmdbId: "1" } });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("replaces with group context for items in the library, plain otherwise", async () => {
    mockUseGroupWatchlist.mockReturnValue({ data: { entries: [WATCHED_ENTRY] } });
    const { getByTestId } = await render(<MovieGridScreen {...baseProps({ navigation: "replace" })} />);
    await act(async () => {
      fireEvent.press(getByTestId("x-screen-grid-item-1"));
    });
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "1", groupId: "g1", source: "diary", watchlistEntryId: "e1" },
    });
    await act(async () => {
      fireEvent.press(getByTestId("x-screen-grid-item-2"));
    });
    expect(mockRouter.replace).toHaveBeenLastCalledWith({ pathname: "/movie/[tmdbId]", params: { tmdbId: "2" } });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("uses a custom Grid component when given", async () => {
    const Grid = jest.fn(() => null);
    await render(<MovieGridScreen {...baseProps({ Grid })} />);
    expect(Grid).toHaveBeenCalledWith(expect.objectContaining({ items: ITEMS, testID: "x-screen-grid" }), undefined);
  });
});
