import { fireEvent, render } from "@testing-library/react-native";

// M10 — real notifications screen, replacing the M10 Settings-hub task's
// placeholder (see docs/interim-decisions.md, "M10 — 'Benachrichtigungen'-
// Zeile verlinkt einen Platzhalter-Screen"). Same mock-the-hooks-directly
// convention as __tests__/screens/GroupSettings.test.tsx -- no
// QueryClientProvider needed since useGroupPushSubscription itself is
// mocked at the module boundary.

const mockUseCurrentUserId = jest.fn();
jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));

const mockUseActiveGroup = jest.fn();
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
}));

const mockUseGroupPushSubscription = jest.fn();
jest.mock("@/hooks/useGroupPushSubscription", () => ({
  useGroupPushSubscription: mockUseGroupPushSubscription,
}));

function loadScreen() {
  return require("@/app/(app)/(modals)/settings/notifications").default;
}

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

function setUpHook(overrides: {
  isSubscribed?: boolean;
  isLoading?: boolean;
  isMutating?: boolean;
} = {}) {
  const { isSubscribed = false, isLoading = false, isMutating = false } = overrides;
  mockUseGroupPushSubscription.mockReturnValue({
    isSubscribed,
    isLoading,
    isMutating,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  });
}

describe("SettingsNotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUserId.mockReturnValue("u1");
    mockUseActiveGroup.mockReturnValue({ activeGroupId: "g1", setActiveGroup: jest.fn() });
  });

  it("passes the active group id and current user id to useGroupPushSubscription", async () => {
    setUpHook();
    const Screen = loadScreen();

    await render(<Screen />);

    expect(mockUseGroupPushSubscription).toHaveBeenCalledWith("g1", "u1");
  });

  it("renders explanatory copy about what triggers a notification", async () => {
    setUpHook();
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-copy")).toBeTruthy();
  });

  it("renders a loading indicator instead of the toggle while isLoading", async () => {
    setUpHook({ isLoading: true });
    const Screen = loadScreen();

    const { getByTestId, queryByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-loading")).toBeTruthy();
    expect(queryByTestId("settings-notifications-toggle")).toBeNull();
  });

  it("renders the toggle reflecting isSubscribed: true", async () => {
    setUpHook({ isSubscribed: true });
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-toggle").props.accessibilityState.checked).toBe(true);
  });

  it("renders the toggle reflecting isSubscribed: false", async () => {
    setUpHook({ isSubscribed: false });
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-toggle").props.accessibilityState.checked).toBe(false);
  });

  it("tapping the toggle while unsubscribed calls subscribe()", async () => {
    setUpHook({ isSubscribed: false });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-notifications-toggle"));

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it("tapping the toggle while subscribed calls unsubscribe()", async () => {
    setUpHook({ isSubscribed: true });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-notifications-toggle"));

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("disables the toggle while isMutating", async () => {
    setUpHook({ isMutating: true });
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-toggle").props.accessibilityState.disabled).toBe(true);
  });

  it("does not disable the toggle when neither loading nor mutating", async () => {
    setUpHook();
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-toggle").props.accessibilityState.disabled).toBe(false);
  });
});
