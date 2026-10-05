import { act, renderHook } from "@testing-library/react-native";

import { useGroupQuickSwitch } from "@/hooks/useGroupQuickSwitch";
import { showToast } from "@/lib/toast";

const mockSetActiveGroup = jest.fn();
let mockActive: string | undefined = "g1";
let mockGroups: Array<{ group_id: string }> = [{ group_id: "g1" }, { group_id: "g2" }];

jest.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }));
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: () => ({
    activeGroupId: mockActive,
    setActiveGroup: mockSetActiveGroup,
    groupsQuery: { data: mockGroups },
  }),
}));
jest.mock("@/hooks/useGroupDetails", () => ({
  useGroupNames: () => ({
    data: [
      { id: "g1", name: "Eins" },
      { id: "g2", name: "Zwei" },
    ],
  }),
}));
jest.mock("@/lib/toast", () => ({ showToast: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockActive = "g1";
  mockGroups = [{ group_id: "g1" }, { group_id: "g2" }];
});

describe("useGroupQuickSwitch", () => {
  it("exposes the active group name", async () => {
    const { result } = await renderHook(() => useGroupQuickSwitch());
    expect(result.current.activeGroupName).toBe("Eins");
  });

  it("switches to the next group and toasts its name", async () => {
    const { result } = await renderHook(() => useGroupQuickSwitch());
    await act(async () => result.current.switchToNext());
    expect(mockSetActiveGroup).toHaveBeenCalledWith("g2");
    expect(showToast).toHaveBeenCalledWith("Zwei", { variant: "info" });
  });

  it("wraps around from the last group", async () => {
    mockActive = "g2";
    const { result } = await renderHook(() => useGroupQuickSwitch());
    await act(async () => result.current.switchToNext());
    expect(mockSetActiveGroup).toHaveBeenCalledWith("g1");
  });

  it("single group: no switch, toast 'Nur eine Gruppe'", async () => {
    mockGroups = [{ group_id: "g1" }];
    const { result } = await renderHook(() => useGroupQuickSwitch());
    await act(async () => result.current.switchToNext());
    expect(mockSetActiveGroup).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Nur eine Gruppe", { variant: "info" });
  });
});
