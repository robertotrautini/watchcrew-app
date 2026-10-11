import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { AppHeader, APP_HEADER_BOTTOM_GAP_CLASSNAME } from "@/components/ui/AppHeader";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockSwitchToNext = jest.fn();
let mockActiveGroupName: string | null = null;
jest.mock("@/hooks/useGroupQuickSwitch", () => ({
  useGroupQuickSwitch: () => ({
    activeGroupName: mockActiveGroupName,
    activeGroupId: mockActiveGroupName ? "g1" : undefined,
    groups: [
      { id: "g1", name: mockActiveGroupName ?? "Eins" },
      { id: "g2", name: "Zwei" },
    ],
    selectGroup: jest.fn(),
    switchToNext: mockSwitchToNext,
  }),
}));

beforeEach(() => {
  mockSwitchToNext.mockClear();
  mockActiveGroupName = null;
});

describe("bottom gap", () => {
  it("adds the shared bottom gap once on the header container", async () => {
    const { getByTestId } = await render(<AppHeader title="T" settingsTestID="s" />);
    expect(getByTestId("app-header").props.className).toContain(APP_HEADER_BOTTOM_GAP_CLASSNAME);
  });
});

describe("group switching in the header", () => {
  it("logo tap cycles to the next group", async () => {
    mockActiveGroupName = "Eins";
    const { getByTestId } = await render(<AppHeader title="T" settingsTestID="s" />);
    const button = getByTestId("app-header-brand-button");
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityLabel).toBe("Gruppe wechseln, aktuell: Eins");
    await fireEvent.press(button);
    expect(mockSwitchToNext).toHaveBeenCalledTimes(1);
  });

  it("group name is display only (dot + name, ellipsis, no tap target)", async () => {
    mockActiveGroupName = "Eins";
    const { getByTestId } = await render(<AppHeader title="T" settingsTestID="s" />);
    const title = getByTestId("app-header-title");
    expect(title.props.children).toBe("Eins");
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.ellipsizeMode).toBe("tail");
    expect(title.props.className).toContain("font-title");
    expect(getByTestId("app-header-group-dot")).toBeTruthy();
    expect(getByTestId("app-header-group").props.onPress).toBeUndefined();
    expect(getByTestId("app-header-group").props.accessibilityRole).toBeUndefined();
  });

  it("falls back to the screen title without a group", async () => {
    const { getByTestId } = await render(<AppHeader title="Tracker" settingsTestID="s" />);
    expect(getByTestId("app-header-title").props.children).toBe("Tracker");
  });
});

describe("AppHeader", () => {
  it("renders the logo and the group name (explicit prop wins)", async () => {
    const { getByTestId, getByLabelText } = await render(
      <AppHeader title="Watchlist" groupName="Filmabend" settingsTestID="s-btn" />,
    );
    expect(getByTestId("app-header-logo")).toBeTruthy();
    expect(getByLabelText("WatchCrew")).toBeTruthy();
    expect(getByTestId("app-header-title").props.children).toBe("Filmabend");
  });

  it("settings button keeps its testID + label and opens the settings hub", async () => {
    const { getByTestId } = await render(<AppHeader title="Tracker" settingsTestID="s-btn" />);
    const button = getByTestId("s-btn");
    expect(button.props.accessibilityLabel).toBe("Einstellungen");
    await fireEvent.press(button);
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("renders the actions slot only when given", async () => {
    const { queryByText, rerender } = await render(<AppHeader title="T" settingsTestID="s" />);
    expect(queryByText("act")).toBeNull();
    await rerender(<AppHeader title="T" settingsTestID="s" actions={<Text>act</Text>} />);
    expect(queryByText("act")).toBeTruthy();
  });
});

describe("settings gear shape", () => {
  it("is a true circle: equal fixed size, no stretch", async () => {
    const { getByTestId } = await render(<AppHeader title="T" settingsTestID="gear" />);
    const cls = getByTestId("gear").props.className as string;
    expect(cls).toContain("h-12");
    expect(cls).toContain("w-12");
    expect(cls).toContain("shrink-0");
    expect(cls).toContain("rounded-full");
    expect(cls).not.toContain("min-h");
  });
});
