import { fireEvent, render, waitFor } from "@testing-library/react-native";

// Same convention as __tests__/StarRating.test.tsx: mock the native Ionicons
// implementation as a plain View that spreads its props through, so
// testID/name/color assertions on the rendered node work under RNTL.
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockCreateWatchGroup = jest.fn();
const mockJoinWatchGroupByToken = jest.fn();
const mockIsInvalidInviteTokenError = jest.fn();
jest.mock("@/lib/groups", () => ({
  createWatchGroup: (...args: unknown[]) => mockCreateWatchGroup(...args),
  joinWatchGroupByToken: (...args: unknown[]) => mockJoinWatchGroupByToken(...args),
  isInvalidInviteTokenError: (...args: unknown[]) => mockIsInvalidInviteTokenError(...args),
}));

// Required lazily inside each test (module-level jest.mock factories above
// reference plain jest.fn()s declared in this same scope, and this
// component itself has no problematic top-of-file mock-hoisting concerns —
// but importing it after the mocks are declared, in the same pattern as
// __tests__/useAuthGate.test.tsx, keeps the mock/import ordering obviously
// correct regardless of Babel's hoisting behavior for the `jest.mock` calls
// above).
import CreateOrJoinGroupScreen from "../../../src/app/(onboarding)/create-or-join-group";

const THEME_NAMES = ["gold", "red", "blue", "green", "purple", "orange"];

describe("CreateOrJoinGroupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInvalidInviteTokenError.mockReturnValue(false);
  });

  it("renders the two initial options and no form yet", async () => {
    const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

    expect(getByTestId("option-create-group")).toBeTruthy();
    expect(getByTestId("option-join-group")).toBeTruthy();
    expect(queryByTestId("mode-create")).toBeNull();
    expect(queryByTestId("mode-join")).toBeNull();
  });

  describe("create flow", () => {
    it("shows the create form (name input + 6 theme swatches) and a back button when selected", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-create-group"));

      expect(getByTestId("mode-create")).toBeTruthy();
      expect(getByTestId("create-group-name-input")).toBeTruthy();
      expect(getByTestId("create-group-back")).toBeTruthy();
      THEME_NAMES.forEach((name) => {
        expect(getByTestId(`theme-swatch-${name}`)).toBeTruthy();
      });
      expect(queryByTestId("mode-select")).toBeNull();
    });

    it("returns to the initial two-option state via back, and re-selecting create works again", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-create-group"));
      await fireEvent.press(getByTestId("create-group-back"));

      expect(getByTestId("option-create-group")).toBeTruthy();
      expect(queryByTestId("mode-create")).toBeNull();

      await fireEvent.press(getByTestId("option-create-group"));
      expect(getByTestId("mode-create")).toBeTruthy();
    });

    it("disables submit when the group name is empty, enables once non-empty", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      expect(getByTestId("create-group-submit").props.accessibilityState.disabled).toBe(true);

      await fireEvent.changeText(getByTestId("create-group-name-input"), "Filmfreunde");

      expect(getByTestId("create-group-submit").props.accessibilityState.disabled).toBe(false);
    });

    it("calls createWatchGroup with the trimmed name and selected theme, then navigates into the app on success", async () => {
      mockCreateWatchGroup.mockResolvedValue({ data: { groupId: "g1" }, error: null });
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));
      await fireEvent.changeText(getByTestId("create-group-name-input"), "  Filmfreunde  ");
      await fireEvent.press(getByTestId("theme-swatch-blue"));

      await fireEvent.press(getByTestId("create-group-submit"));

      await waitFor(() => expect(mockCreateWatchGroup).toHaveBeenCalledWith("Filmfreunde", "blue"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/tracker"));
    });

    it("shows a loading state on the submit button while the RPC call is in flight", async () => {
      let resolveCall: (value: { data: unknown; error: null }) => void = () => {};
      mockCreateWatchGroup.mockReturnValue(
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
      );
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));
      await fireEvent.changeText(getByTestId("create-group-name-input"), "Filmfreunde");

      await fireEvent.press(getByTestId("create-group-submit"));

      expect(queryByTestId("create-group-submit-loading-indicator")).toBeTruthy();
      expect(getByTestId("create-group-submit").props.accessibilityState.disabled).toBe(true);

      resolveCall({ data: { groupId: "g1" }, error: null });
      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    });

    it("shows a generic failure message and does not navigate when the RPC returns a non-token error", async () => {
      mockCreateWatchGroup.mockResolvedValue({
        data: null,
        error: { message: "network error", code: null },
      });
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));
      await fireEvent.changeText(getByTestId("create-group-name-input"), "Filmfreunde");

      await fireEvent.press(getByTestId("create-group-submit"));

      await waitFor(() =>
        expect(getByTestId("create-group-error").props.children).toBe(
          "Erstellen fehlgeschlagen: network error",
        ),
      );
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("does not call the RPC while the submit button is disabled (empty name)", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      await fireEvent.press(getByTestId("create-group-submit"));

      expect(mockCreateWatchGroup).not.toHaveBeenCalled();
    });

    it("round-trips a group name containing an apostrophe without any client-side escaping", async () => {
      mockCreateWatchGroup.mockResolvedValue({ data: { groupId: "g1" }, error: null });
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));
      await fireEvent.changeText(getByTestId("create-group-name-input"), "Filmfreunde O'Brien");

      await fireEvent.press(getByTestId("create-group-submit"));

      await waitFor(() =>
        expect(mockCreateWatchGroup).toHaveBeenCalledWith("Filmfreunde O'Brien", "gold"),
      );
    });

    it("renders all 6 theme swatches with visually distinct accent colors", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      const colors = THEME_NAMES.map((name) => getByTestId(`theme-swatch-icon-${name}`).props.color);

      expect(new Set(colors).size).toBe(6);
    });

    it("marks the Gold swatch selected by default and moves the selection on tap", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      expect(getByTestId("theme-swatch-gold").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("theme-swatch-blue").props.accessibilityState.selected).toBe(false);

      await fireEvent.press(getByTestId("theme-swatch-blue"));

      expect(getByTestId("theme-swatch-blue").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("theme-swatch-gold").props.accessibilityState.selected).toBe(false);
    });
  });

  describe("join flow", () => {
    it("shows the join form (group-id input) and a back button when selected", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-join-group"));

      expect(getByTestId("mode-join")).toBeTruthy();
      expect(getByTestId("join-group-code-input")).toBeTruthy();
      expect(getByTestId("join-group-back")).toBeTruthy();
      expect(queryByTestId("mode-select")).toBeNull();
    });

    it("returns to the initial two-option state via back", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.press(getByTestId("join-group-back"));

      expect(getByTestId("option-join-group")).toBeTruthy();
      expect(queryByTestId("mode-join")).toBeNull();
    });

    it("disables submit when the group code is empty, enables once non-empty", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));

      expect(getByTestId("join-group-submit").props.accessibilityState.disabled).toBe(true);

      await fireEvent.changeText(getByTestId("join-group-code-input"), "abc-123-def");

      expect(getByTestId("join-group-submit").props.accessibilityState.disabled).toBe(false);
    });

    it("extracts a bare invite-token UUID from the input and calls joinWatchGroupByToken with it, then navigates on success", async () => {
      mockJoinWatchGroupByToken.mockResolvedValue({ data: { groupId: "g1" }, error: null });
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.changeText(
        getByTestId("join-group-code-input"),
        "11111111-1111-1111-1111-111111111111",
      );

      await fireEvent.press(getByTestId("join-group-submit"));

      await waitFor(() =>
        expect(mockJoinWatchGroupByToken).toHaveBeenCalledWith(
          "11111111-1111-1111-1111-111111111111",
        ),
      );
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/tracker"));
    });

    it("extracts the invite token embedded in a full deep-link URL pasted into the field", async () => {
      mockJoinWatchGroupByToken.mockResolvedValue({ data: { groupId: "g1" }, error: null });
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.changeText(
        getByTestId("join-group-code-input"),
        "https://watchcrew.app/join/11111111-1111-1111-1111-111111111111",
      );

      await fireEvent.press(getByTestId("join-group-submit"));

      await waitFor(() =>
        expect(mockJoinWatchGroupByToken).toHaveBeenCalledWith(
          "11111111-1111-1111-1111-111111111111",
        ),
      );
    });

    it("shows the invalid-token message and does not navigate when the input has no UUID-shaped substring at all", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.changeText(getByTestId("join-group-code-input"), "not-a-real-code");

      await fireEvent.press(getByTestId("join-group-submit"));

      await waitFor(() =>
        expect(getByTestId("join-group-error").props.children).toBe(
          "Ungültiger oder deaktivierter Einladungscode.",
        ),
      );
      expect(mockJoinWatchGroupByToken).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("shows the invalid-token message when the RPC itself reports an invalid/disabled token", async () => {
      mockJoinWatchGroupByToken.mockResolvedValue({
        data: null,
        error: { message: "invalid or disabled invite token", code: "WC003" },
      });
      mockIsInvalidInviteTokenError.mockReturnValue(true);
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.changeText(
        getByTestId("join-group-code-input"),
        "11111111-1111-1111-1111-111111111111",
      );

      await fireEvent.press(getByTestId("join-group-submit"));

      await waitFor(() =>
        expect(getByTestId("join-group-error").props.children).toBe(
          "Ungültiger oder deaktivierter Einladungscode.",
        ),
      );
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("shows a generic failure message for a non-token RPC error", async () => {
      mockJoinWatchGroupByToken.mockResolvedValue({
        data: null,
        error: { message: "network error", code: null },
      });
      mockIsInvalidInviteTokenError.mockReturnValue(false);
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.changeText(
        getByTestId("join-group-code-input"),
        "11111111-1111-1111-1111-111111111111",
      );

      await fireEvent.press(getByTestId("join-group-submit"));

      await waitFor(() =>
        expect(getByTestId("join-group-error").props.children).toBe(
          "Beitritt fehlgeschlagen: network error",
        ),
      );
    });

    it("shows a loading state on the submit button while the RPC call is in flight", async () => {
      let resolveCall: (value: { data: unknown; error: null }) => void = () => {};
      mockJoinWatchGroupByToken.mockReturnValue(
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
      );
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.changeText(
        getByTestId("join-group-code-input"),
        "11111111-1111-1111-1111-111111111111",
      );

      await fireEvent.press(getByTestId("join-group-submit"));

      expect(queryByTestId("join-group-submit-loading-indicator")).toBeTruthy();
      expect(getByTestId("join-group-submit").props.accessibilityState.disabled).toBe(true);

      resolveCall({ data: { groupId: "g1" }, error: null });
      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    });

    it("does not call the RPC while the submit button is disabled (empty code)", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));

      await fireEvent.press(getByTestId("join-group-submit"));

      expect(mockJoinWatchGroupByToken).not.toHaveBeenCalled();
    });
  });
});
