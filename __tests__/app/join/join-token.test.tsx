import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();
let mockParams: { token?: string } = {};
jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockParams,
}));

const mockGetSession = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: (...a: unknown[]) => mockGetSession(...a) } },
}));

const mockJoin = jest.fn();
const mockIsInvalid = jest.fn();
jest.mock("@/lib/groups", () => ({
  joinWatchGroupByToken: (...a: unknown[]) => mockJoin(...a),
  isInvalidInviteTokenError: (...a: unknown[]) => mockIsInvalid(...a),
}));

import JoinTokenScreen from "../../../src/app/join/[token]";
import { usePendingInviteStore } from "../../../src/stores/usePendingInviteStore";
import { usePreferencesStore } from "../../../src/stores/usePreferencesStore";

const TOKEN = "11111111-1111-1111-1111-111111111111";

describe("join/[token] route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { token: TOKEN };
    mockIsInvalid.mockReturnValue(false);
    usePendingInviteStore.setState({ token: null });
    usePreferencesStore.setState({ activeGroupId: null });
  });

  it("logged out: stores the pending token and redirects to the root gate", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await render(<JoinTokenScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(usePendingInviteStore.getState().token).toBe(TOKEN);
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it("logged in: joins, activates the joined group, clears pending and goes to the root gate", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockJoin.mockResolvedValue({ data: { groupId: "g-new" }, error: null });
    usePendingInviteStore.setState({ token: TOKEN });

    await render(<JoinTokenScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockJoin).toHaveBeenCalledWith(TOKEN);
    expect(usePreferencesStore.getState().activeGroupId).toBe("g-new");
    expect(usePendingInviteStore.getState().token).toBeNull();
  });

  it("logged in + invalid token: shows German error, clears pending, no navigation until button", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    const error = { code: "WC003", message: "x" };
    mockJoin.mockResolvedValue({ data: null, error });
    mockIsInvalid.mockReturnValue(true);
    usePendingInviteStore.setState({ token: TOKEN });

    const { findByTestId, getByTestId } = await render(<JoinTokenScreen />);

    const msg = await findByTestId("join-token-error");
    expect(msg.props.children).toBe("Ungültiger oder deaktivierter Einladungscode.");
    expect(usePendingInviteStore.getState().token).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();

    await fireEvent.press(getByTestId("join-token-continue"));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("logged in + other error: shows generic error with message", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockJoin.mockResolvedValue({ data: null, error: { message: "boom" } });

    const { findByTestId } = await render(<JoinTokenScreen />);

    const msg = await findByTestId("join-token-error");
    expect(msg.props.children).toBe("Beitritt fehlgeschlagen: boom");
  });

  it("malformed token param: shows invalid error without calling the RPC", async () => {
    mockParams = { token: "not-a-uuid" };
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    const { findByTestId } = await render(<JoinTokenScreen />);

    const msg = await findByTestId("join-token-error");
    expect(msg.props.children).toBe("Ungültiger oder deaktivierter Einladungscode.");
    expect(mockJoin).not.toHaveBeenCalled();
  });
});
