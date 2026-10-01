import { Linking } from "react-native";
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

const mockUseUserGroups = jest.fn();
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: mockUseUserGroups,
}));

const mockUseGroupNames = jest.fn();
jest.mock("@/hooks/useGroupDetails", () => ({
  useGroupNames: mockUseGroupNames,
}));

const mockUseGroupPushSubscription = jest.fn();
jest.mock("@/hooks/useGroupPushSubscription", () => ({
  useGroupPushSubscription: mockUseGroupPushSubscription,
}));

const mockUsePushPermissionStatus = jest.fn();
jest.mock("@/hooks/usePushPermissionStatus", () => ({
  usePushPermissionStatus: mockUsePushPermissionStatus,
}));

const mockOpenSettings = jest.fn();
jest.spyOn(Linking, "openSettings").mockImplementation((...a: unknown[]) => mockOpenSettings(...a));

function loadScreen() {
  return require("@/app/(app)/(modals)/settings/notifications").default;
}

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

type SubState = { isSubscribed?: boolean; isLoading?: boolean; isMutating?: boolean };
function setUpHook(byGroup: Record<string, SubState> = {}) {
  mockUseGroupPushSubscription.mockImplementation((groupId: string) => {
    const { isSubscribed = false, isLoading = false, isMutating = false } = byGroup[groupId] ?? {};
    return {
      isSubscribed,
      isLoading,
      isMutating,
      subscribe: () => mockSubscribe(groupId),
      unsubscribe: () => mockUnsubscribe(groupId),
    };
  });
}

describe("SettingsNotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [{ group_id: "g1" }, { group_id: "g2" }] });
    mockUseGroupNames.mockReturnValue({
      data: [
        { id: "g1", name: "Filmabend" },
        { id: "g2", name: "Kino-Crew" },
      ],
    });
    mockUsePushPermissionStatus.mockReturnValue("granted");
    setUpHook();
  });

  it("renders explanatory copy about what triggers a notification", async () => {
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    expect(getByTestId("settings-notifications-copy")).toBeTruthy();
  });

  it("renders one toggle per group with the group name, each bound to its own group id", async () => {
    const Screen = loadScreen();
    const { getByTestId, getByText } = await render(<Screen />);

    expect(getByTestId("settings-notifications-toggle-g1")).toBeTruthy();
    expect(getByTestId("settings-notifications-toggle-g2")).toBeTruthy();
    expect(getByText("Filmabend")).toBeTruthy();
    expect(getByText("Kino-Crew")).toBeTruthy();
    expect(mockUseGroupPushSubscription).toHaveBeenCalledWith("g1", "u1");
    expect(mockUseGroupPushSubscription).toHaveBeenCalledWith("g2", "u1");
  });

  it("falls back to a uuid-prefix label when the group name is unknown", async () => {
    mockUseGroupNames.mockReturnValue({ data: undefined });
    const Screen = loadScreen();
    const { getByText } = await render(<Screen />);
    expect(getByText("Gruppe g1")).toBeTruthy();
  });

  it("shows a loading indicator in a row while that group's state loads", async () => {
    setUpHook({ g1: { isLoading: true } });
    const Screen = loadScreen();
    const { getByTestId, queryByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-loading-g1")).toBeTruthy();
    expect(queryByTestId("settings-notifications-toggle-g1")).toBeNull();
    expect(getByTestId("settings-notifications-toggle-g2")).toBeTruthy();
  });

  it("reflects isSubscribed per group", async () => {
    setUpHook({ g1: { isSubscribed: true }, g2: { isSubscribed: false } });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-toggle-g1").props.accessibilityState.checked).toBe(true);
    expect(getByTestId("settings-notifications-toggle-g2").props.accessibilityState.checked).toBe(false);
  });

  it("tapping a toggle subscribes/unsubscribes only that group", async () => {
    setUpHook({ g1: { isSubscribed: true } });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-notifications-toggle-g1"));
    expect(mockUnsubscribe).toHaveBeenCalledWith("g1");

    await fireEvent.press(getByTestId("settings-notifications-toggle-g2"));
    expect(mockSubscribe).toHaveBeenCalledWith("g2");
    expect(mockSubscribe).not.toHaveBeenCalledWith("g1");
  });

  it("disables only the mutating group's toggle", async () => {
    setUpHook({ g1: { isMutating: true } });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-toggle-g1").props.accessibilityState.disabled).toBe(true);
    expect(getByTestId("settings-notifications-toggle-g2").props.accessibilityState.disabled).toBe(false);
  });

  it("shows no permission hint when notifications are allowed", async () => {
    const Screen = loadScreen();
    const { queryByTestId } = await render(<Screen />);
    expect(queryByTestId("settings-notifications-permission-hint")).toBeNull();
  });

  it("shows the German permission hint with a settings button when the OS permission is denied", async () => {
    mockUsePushPermissionStatus.mockReturnValue("denied");
    const Screen = loadScreen();
    const { getByTestId, getByText } = await render(<Screen />);

    expect(getByTestId("settings-notifications-permission-hint")).toBeTruthy();
    expect(getByText(/Benachrichtigungen sind in den Systemeinstellungen deaktiviert/)).toBeTruthy();

    await fireEvent.press(getByTestId("settings-notifications-open-settings"));
    expect(mockOpenSettings).toHaveBeenCalled();
  });
});
