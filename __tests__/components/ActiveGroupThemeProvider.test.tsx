import { render } from "@testing-library/react-native";
import { Text } from "react-native";

const mockUseCurrentUserId = jest.fn();
jest.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: mockUseCurrentUserId }));
const mockUseActiveGroup = jest.fn();
jest.mock("@/hooks/useActiveGroup", () => ({ useActiveGroup: mockUseActiveGroup }));
const mockUseGroupDetails = jest.fn();
jest.mock("@/hooks/useGroupDetails", () => ({ useGroupDetails: mockUseGroupDetails }));

import { useGroupTheme } from "@/components/GroupThemeProvider";

function load() {
  return require("@/components/ActiveGroupThemeProvider").ActiveGroupThemeProvider;
}

function Probe() {
  return <Text testID="probe">{useGroupTheme().name}</Text>;
}

describe("ActiveGroupThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUserId.mockReturnValue("u1");
    mockUseActiveGroup.mockReturnValue({ activeGroupId: "g1" });
  });

  it("themes children with the ACTIVE group's color_theme and follows live changes", async () => {
    mockUseGroupDetails.mockReturnValue({ data: { color_theme: "blue" } });
    const Provider = load();
    const { getByTestId, rerender } = await render(
      <Provider>
        <Probe />
      </Provider>,
    );
    expect(mockUseGroupDetails).toHaveBeenCalledWith("g1");
    expect(getByTestId("probe").props.children).toBe("blue");

    mockUseGroupDetails.mockReturnValue({ data: { color_theme: "red" } });
    await rerender(
      <Provider>
        <Probe />
      </Provider>,
    );
    expect(getByTestId("probe").props.children).toBe("red");
  });

  it("falls back to gold while the group details are not available (offline/loading)", async () => {
    mockUseGroupDetails.mockReturnValue({ data: undefined });
    const Provider = load();
    const { getByTestId } = await render(
      <Provider>
        <Probe />
      </Provider>,
    );
    expect(getByTestId("probe").props.children).toBe("gold");
  });
});
