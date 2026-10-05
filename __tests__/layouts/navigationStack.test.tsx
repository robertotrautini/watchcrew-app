import { render } from "@testing-library/react-native";

import { navigateToMovieDetail, navigateToSimilarMovies } from "@/lib/movieDetailNavigation";

const mockScreens: Array<{ name: string; options?: Record<string, unknown> }> = [];

jest.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "user-1" }));
jest.mock("@/hooks/usePushRegistration", () => ({ usePushRegistration: jest.fn() }));
jest.mock("@/hooks/usePushNotificationRouting", () => ({ usePushNotificationRouting: jest.fn() }));
jest.mock("@/components/ActiveGroupThemeProvider", () => ({
  ActiveGroupThemeProvider: ({ children }: { children?: unknown }) => children,
}));
jest.mock("@/components/GroupThemeProvider", () => ({
  useGroupTheme: () => ({ colors: { accent: "#fff", accentLight: "#fff" } }),
}));
jest.mock("expo-router", () => {
  const actualReact = require("react");
  return {
    DarkTheme: { colors: {} },
    ThemeProvider: ({ children }: { children?: unknown }) => children,
    Stack: Object.assign(({ children }: { children?: unknown }) => actualReact.createElement(actualReact.Fragment, null, children), {
      Screen: (props: { name: string; options?: Record<string, unknown> }) => {
        mockScreens.push(props);
        return null;
      },
    }),
  };
});

describe("(app) stack", () => {
  it("presents (modals) as a normal pushed card, not a modal (back swipe pops one level, also on iOS)", async () => {
    mockScreens.length = 0;
    const AppLayout = require("@/app/(app)/_layout").default;
    await render(<AppLayout />);
    const modals = mockScreens.find((s) => s.name === "(modals)");
    expect(modals).toBeDefined();
    expect(modals?.options?.presentation).toBeUndefined();
  });
});

describe("chained movie detail navigation", () => {
  it("opens similar movies and detail by push (origin stays on the stack)", () => {
    const router = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
    navigateToSimilarMovies(router as never, 157336);
    navigateToMovieDetail(router as never, {
      tmdbId: 603,
      groupId: "g1",
      source: "watchlist",
      watchlistEntryId: "w1",
    });
    expect(router.push).toHaveBeenNthCalledWith(1, { pathname: "/similar/[tmdbId]", params: { tmdbId: "157336" } });
    expect(router.push).toHaveBeenNthCalledWith(2, expect.objectContaining({ pathname: "/movie/[tmdbId]" }));
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
