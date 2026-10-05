import { mockCurrentUserId } from "../helpers/mockCurrentUser";
// M10 (part): confirms `(app)/_layout.tsx` actually mounts the two push
// hooks (registration + notification-tap routing) -- both hooks have their
// own dedicated behavior tests (usePushRegistration.test.tsx,
// usePushNotificationRouting.test.tsx); this is just the "are they actually
// wired into the screen" integration check, same spirit as
// __tests__/app/routeIndex.test.tsx's mock-and-assert-called style.

import { render } from "@testing-library/react-native";

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());

const mockUsePushRegistration = jest.fn();
jest.mock("@/hooks/usePushRegistration", () => ({
  usePushRegistration: mockUsePushRegistration,
}));

const mockUsePushNotificationRouting = jest.fn();
jest.mock("@/hooks/usePushNotificationRouting", () => ({
  usePushNotificationRouting: mockUsePushNotificationRouting,
}));

// Theme wiring has its own test (ActiveGroupThemeProvider.test.tsx); here a
// passthrough keeps this test free of a QueryClient.
jest.mock("@/components/ActiveGroupThemeProvider", () => ({
  ActiveGroupThemeProvider: ({ children }: { children?: unknown }) => children,
}));

jest.mock("expo-router", () => {
  const actualReact = require("react");
  return {
    DarkTheme: { colors: {} },
    ThemeProvider: ({ children }: { children?: unknown }) => children,
    Stack: Object.assign(
      ({ children }: { children?: unknown }) => actualReact.createElement(actualReact.Fragment, null, children),
      { Screen: () => null },
    ),
  };
});

function loadAppLayout() {
  return require("@/app/(app)/_layout").default;
}

describe("(app)/_layout.tsx push-hook wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUserId.mockReturnValue("user-1");
  });

  it("calls usePushRegistration with the current user id", async () => {
    const AppLayout = loadAppLayout();

    await render(<AppLayout />);

    expect(mockUsePushRegistration).toHaveBeenCalledWith("user-1");
  });

  it("calls usePushNotificationRouting", async () => {
    const AppLayout = loadAppLayout();

    await render(<AppLayout />);

    expect(mockUsePushNotificationRouting).toHaveBeenCalled();
  });
});
