import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";

// --- Router mock (push/replace) + no-op Stack.Screen, same convention as
// __tests__/screens/MovieDetail.test.tsx.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  Stack: { Screen: () => null },
}));

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const mockUseCurrentUserId = jest.fn();
jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));

const mockUseActiveGroup = jest.fn();
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
}));

const mockUseGroupDetails = jest.fn();
const mockUseGroupNames = jest.fn();
jest.mock("@/hooks/useGroupDetails", () => ({
  useGroupDetails: mockUseGroupDetails,
  useGroupNames: mockUseGroupNames,
}));

const mockUseGroupMembers = jest.fn();
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: mockUseGroupMembers,
}));

const mockRenameMutate = jest.fn();
const mockSetInviteEnabledMutate = jest.fn();
const mockRegenerateMutate = jest.fn();
const mockRemoveMemberMutate = jest.fn();
const mockLeaveGroupMutate = jest.fn();
let mockRenameIsPending = false;
let mockRenameIsError = false;
let mockRegenerateIsPending = false;
let mockRemoveMemberIsPending = false;
let mockLeaveGroupIsPending = false;

jest.mock("@/hooks/useGroupSettings", () => ({
  useRenameGroup: () => ({
    mutate: mockRenameMutate,
    isPending: mockRenameIsPending,
    isError: mockRenameIsError,
    error: mockRenameIsError ? { message: "rls denied" } : null,
  }),
  useSetInviteEnabled: () => ({ mutate: mockSetInviteEnabledMutate, isPending: false }),
  useRegenerateInviteToken: () => ({ mutate: mockRegenerateMutate, isPending: mockRegenerateIsPending }),
  useRemoveMember: () => ({ mutate: mockRemoveMemberMutate, isPending: mockRemoveMemberIsPending }),
  useLeaveGroup: () => ({ mutate: mockLeaveGroupMutate, isPending: mockLeaveGroupIsPending }),
}));

// Lazily required, same Babel CJS-hoisting reason as every other screen test
// in this repo (see __tests__/screens/Login.test.tsx).
function loadGroupSettingsScreen() {
  return require("@/app/(app)/(modals)/group-settings").default;
}

const OWNER = {
  group_id: "g1",
  user_id: "owner-1",
  role: "owner",
  joined_at: "2026-01-01",
  profiles: { display_name: "Robin" },
};
const MEMBER = {
  group_id: "g1",
  user_id: "member-1",
  role: "member",
  joined_at: "2026-01-02",
  profiles: { display_name: "Alex" },
};

function setUpHappyPath(options: {
  currentUserId?: string;
  members?: Record<string, unknown>[];
  memberships?: Record<string, unknown>[];
  groupNames?: Record<string, unknown>[];
  inviteEnabled?: boolean;
} = {}) {
  const {
    currentUserId = "owner-1",
    members = [OWNER, MEMBER],
    memberships = [
      { group_id: "g1", user_id: currentUserId, role: "owner", joined_at: "2026-01-01" },
      { group_id: "g2", user_id: currentUserId, role: "member", joined_at: "2026-01-05" },
    ],
    groupNames = [
      { id: "g1", name: "Filmfreunde", color_theme: "gold", invite_token: "tok-1", invite_enabled: true },
      { id: "g2", name: "Kinoclub", color_theme: "blue", invite_token: "tok-2", invite_enabled: true },
    ],
    inviteEnabled = true,
  } = options;

  mockUseCurrentUserId.mockReturnValue(currentUserId);
  mockUseActiveGroup.mockReturnValue({
    activeGroupId: "g1",
    setActiveGroup: mockSetActiveGroup,
    groupsQuery: { data: memberships, isLoading: false, isError: false, error: null },
  });
  mockUseGroupDetails.mockReturnValue({
    data: {
      id: "g1",
      name: "Filmfreunde",
      color_theme: "gold",
      invite_token: "tok-1",
      invite_enabled: inviteEnabled,
    },
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseGroupNames.mockReturnValue({ data: groupNames, isLoading: false, isError: false, error: null });
  mockUseGroupMembers.mockReturnValue({ data: members, isLoading: false, isError: false, error: null });
}

const mockSetActiveGroup = jest.fn();

describe("GroupSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenameIsPending = false;
    mockRenameIsError = false;
    mockRegenerateIsPending = false;
    mockRemoveMemberIsPending = false;
    mockLeaveGroupIsPending = false;
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  });

  it("renders a loading state while any underlying query is loading", async () => {
    mockUseCurrentUserId.mockReturnValue("owner-1");
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "g1",
      setActiveGroup: mockSetActiveGroup,
      groupsQuery: { data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null },
    });
    mockUseGroupDetails.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
    mockUseGroupNames.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });

    const GroupSettingsScreen = loadGroupSettingsScreen();
    const { getByTestId } = await render(<GroupSettingsScreen />);

    expect(getByTestId("group-settings-loading")).toBeTruthy();
  });

  it("renders an error state when a query fails", async () => {
    mockUseCurrentUserId.mockReturnValue("owner-1");
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "g1",
      setActiveGroup: mockSetActiveGroup,
      groupsQuery: { data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null },
    });
    mockUseGroupDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "network error" },
    });
    mockUseGroupNames.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });

    const GroupSettingsScreen = loadGroupSettingsScreen();
    const { getByTestId } = await render(<GroupSettingsScreen />);

    expect(getByTestId("group-settings-error")).toBeTruthy();
  });

  it("renders a defensive 'no group' state when there is no active group at all", async () => {
    mockUseCurrentUserId.mockReturnValue("owner-1");
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: undefined,
      setActiveGroup: mockSetActiveGroup,
      groupsQuery: { data: [], isLoading: false, isError: false, error: null },
    });
    mockUseGroupDetails.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseGroupNames.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });

    const GroupSettingsScreen = loadGroupSettingsScreen();
    const { getByTestId } = await render(<GroupSettingsScreen />);

    expect(getByTestId("group-settings-no-group")).toBeTruthy();
  });

  describe("header + switcher", () => {
    it("shows the active group's name and theme swatch", async () => {
      setUpHappyPath();
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      expect(getByTestId("group-settings-name")).toHaveTextContent("Filmfreunde");
      expect(getByTestId("group-settings-theme-swatch")).toBeTruthy();
    });

    it("lists every one of the user's groups by real name, marking the active one selected", async () => {
      setUpHappyPath();
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      expect(getByTestId("group-settings-switch-g1").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("group-settings-switch-g2").props.accessibilityState.selected).toBe(false);
    });

    it("falls back to a placeholder label for a group whose name hasn't loaded yet", async () => {
      setUpHappyPath({ groupNames: [] });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByText } = await render(<GroupSettingsScreen />);

      expect(getByText("Gruppe g2")).toBeTruthy();
    });

    it("switching to another group calls setActiveGroup with its id", async () => {
      setUpHappyPath();
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-switch-g2"));

      expect(mockSetActiveGroup).toHaveBeenCalledWith("g2");
    });
  });

  describe("owner-only rename", () => {
    it("shows the rename field + save button for the owner", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      expect(getByTestId("group-settings-rename-section")).toBeTruthy();
      expect(getByTestId("group-settings-name-input").props.value).toBe("Filmfreunde");
    });

    it("does NOT show the rename section for a non-owner member", async () => {
      setUpHappyPath({ currentUserId: "member-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { queryByTestId } = await render(<GroupSettingsScreen />);

      expect(queryByTestId("group-settings-rename-section")).toBeNull();
    });

    it("Speichern calls useRenameGroup with the edited name", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.changeText(getByTestId("group-settings-name-input"), "Neuer Name");
      await fireEvent.press(getByTestId("group-settings-rename-save-button"));

      expect(mockRenameMutate).toHaveBeenCalledWith({ groupId: "g1", newName: "Neuer Name" });
    });

    it("disables Speichern when the name field is emptied out", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.changeText(getByTestId("group-settings-name-input"), "   ");

      expect(getByTestId("group-settings-rename-save-button").props.accessibilityState.disabled).toBe(true);
    });

    it("shows a rename error message when the mutation fails", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      mockRenameIsError = true;
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      expect(getByTestId("group-settings-rename-error")).toBeTruthy();
    });
  });

  describe("owner-only invite link", () => {
    it("shows the invite link, Teilen, Neu generieren, and the enabled toggle for the owner", async () => {
      setUpHappyPath({ currentUserId: "owner-1", inviteEnabled: true });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId, getByText } = await render(<GroupSettingsScreen />);

      expect(getByTestId("group-settings-invite-link")).toHaveTextContent("watchcrew://join/tok-1");
      expect(getByText("Einladungen aktiv")).toBeTruthy();
    });

    it("shows the deactivated label when invite_enabled is false", async () => {
      setUpHappyPath({ currentUserId: "owner-1", inviteEnabled: false });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByText } = await render(<GroupSettingsScreen />);

      expect(getByText("Einladungen deaktiviert")).toBeTruthy();
    });

    it("does NOT show the invite section for a non-owner member", async () => {
      setUpHappyPath({ currentUserId: "member-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { queryByTestId } = await render(<GroupSettingsScreen />);

      expect(queryByTestId("group-settings-invite-section")).toBeNull();
    });

    it("Teilen shares the invite link via React Native's Share API", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-invite-share-button"));

      expect(Share.share).toHaveBeenCalledWith({ message: "watchcrew://join/tok-1" });
    });

    it("Neu generieren calls useRegenerateInviteToken for the active group", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-invite-regenerate-button"));

      expect(mockRegenerateMutate).toHaveBeenCalledWith({ groupId: "g1" });
    });

    it("the toggle calls useSetInviteEnabled with the flipped value", async () => {
      setUpHappyPath({ currentUserId: "owner-1", inviteEnabled: true });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-invite-toggle"));

      expect(mockSetInviteEnabledMutate).toHaveBeenCalledWith({ groupId: "g1", enabled: false });
    });
  });

  describe("member list", () => {
    it("shows every member's display name and role badge", async () => {
      setUpHappyPath();
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByText, getByTestId } = await render(<GroupSettingsScreen />);

      expect(getByText("Robin")).toBeTruthy();
      expect(getByText("Alex")).toBeTruthy();
      expect(getByTestId("group-settings-member-role-owner-1")).toHaveTextContent("Owner");
      expect(getByTestId("group-settings-member-role-member-1")).toHaveTextContent("Mitglied");
    });

    it("the owner sees an Entfernen button for every OTHER member, but not for themselves", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId, queryByTestId } = await render(<GroupSettingsScreen />);

      expect(getByTestId("group-settings-member-member-1-remove-button")).toBeTruthy();
      expect(queryByTestId("group-settings-member-owner-1-remove-button")).toBeNull();
    });

    it("a non-owner member sees no Entfernen buttons at all", async () => {
      setUpHappyPath({ currentUserId: "member-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { queryByTestId } = await render(<GroupSettingsScreen />);

      expect(queryByTestId("group-settings-member-owner-1-remove-button")).toBeNull();
      expect(queryByTestId("group-settings-member-member-1-remove-button")).toBeNull();
    });

    it("Entfernen shows an inline confirmation before actually removing the member", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-member-member-1-remove-button"));

      expect(getByTestId("group-settings-member-member-1-remove-confirm")).toBeTruthy();
      expect(mockRemoveMemberMutate).not.toHaveBeenCalled();
    });

    it("confirming removal calls useRemoveMember for that member", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-member-member-1-remove-button"));
      await fireEvent.press(getByTestId("group-settings-member-member-1-remove-confirm-button"));

      expect(mockRemoveMemberMutate).toHaveBeenCalledWith(
        { groupId: "g1", userId: "member-1" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("cancelling the removal confirmation does not call useRemoveMember", async () => {
      setUpHappyPath({ currentUserId: "owner-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId, queryByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-member-member-1-remove-button"));
      await fireEvent.press(getByTestId("group-settings-member-member-1-remove-cancel-button"));

      expect(queryByTestId("group-settings-member-member-1-remove-confirm")).toBeNull();
      expect(mockRemoveMemberMutate).not.toHaveBeenCalled();
    });
  });

  describe("leave group", () => {
    it("shows the plain member leave copy for a non-owner in a multi-member group", async () => {
      setUpHappyPath({ currentUserId: "member-1", members: [OWNER, MEMBER] });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId, getByText } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-leave-button"));

      expect(getByText("Möchtest du die Gruppe wirklich verlassen?")).toBeTruthy();
    });

    it("shows the owner-succession leave copy for the owner in a multi-member group", async () => {
      setUpHappyPath({ currentUserId: "owner-1", members: [OWNER, MEMBER] });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId, getByText } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-leave-button"));

      expect(
        getByText(
          "Möchtest du die Gruppe wirklich verlassen? Die Owner-Rolle geht automatisch an ein anderes Mitglied über.",
        ),
      ).toBeTruthy();
    });

    it("shows the last-member retention warning when the current user is the only member, regardless of role", async () => {
      setUpHappyPath({ currentUserId: "owner-1", members: [OWNER] });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId, getByText } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-leave-button"));

      expect(
        getByText(
          "Du bist das letzte Mitglied. Die Gruppe wird für 2 Wochen aufbewahrt, danach endgültig gelöscht. Du kannst über die Gruppen-ID wieder beitreten.",
        ),
      ).toBeTruthy();
    });

    it("cancelling the leave confirmation does not call useLeaveGroup", async () => {
      setUpHappyPath({ currentUserId: "member-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId, queryByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-leave-button"));
      await fireEvent.press(getByTestId("group-settings-leave-cancel-button"));

      expect(queryByTestId("group-settings-leave-confirm")).toBeNull();
      expect(mockLeaveGroupMutate).not.toHaveBeenCalled();
    });

    it("confirming leave calls useLeaveGroup with the active group and current user", async () => {
      setUpHappyPath({ currentUserId: "member-1" });
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-leave-button"));
      await fireEvent.press(getByTestId("group-settings-leave-confirm-button"));

      expect(mockLeaveGroupMutate).toHaveBeenCalledWith(
        { groupId: "g1", userId: "member-1" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("on successful leave with other groups remaining, switches the active group to one of them (no onboarding redirect)", async () => {
      setUpHappyPath({ currentUserId: "member-1" });
      mockLeaveGroupMutate.mockImplementation((_vars, opts) => opts.onSuccess());
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-leave-button"));
      await fireEvent.press(getByTestId("group-settings-leave-confirm-button"));

      expect(mockSetActiveGroup).toHaveBeenCalledWith("g2");
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("on successful leave with NO other groups left, navigates to the onboarding create-or-join-group screen", async () => {
      setUpHappyPath({
        currentUserId: "member-1",
        memberships: [{ group_id: "g1", user_id: "member-1", role: "member", joined_at: "2026-01-01" }],
      });
      mockLeaveGroupMutate.mockImplementation((_vars, opts) => opts.onSuccess());
      const GroupSettingsScreen = loadGroupSettingsScreen();
      const { getByTestId } = await render(<GroupSettingsScreen />);

      await fireEvent.press(getByTestId("group-settings-leave-button"));
      await fireEvent.press(getByTestId("group-settings-leave-confirm-button"));

      expect(mockReplace).toHaveBeenCalledWith("/(onboarding)/create-or-join-group");
      expect(mockSetActiveGroup).not.toHaveBeenCalled();
    });
  });
});
