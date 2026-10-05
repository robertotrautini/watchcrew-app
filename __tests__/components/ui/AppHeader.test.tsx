import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { AppHeader } from "@/components/ui/AppHeader";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockSwitchToNext = jest.fn();
let mockActiveGroupName: string | null = null;
jest.mock("@/hooks/useGroupQuickSwitch", () => ({
  useGroupQuickSwitch: () => ({
    activeGroupName: mockActiveGroupName,
    switchToNext: mockSwitchToNext,
  }),
}));

beforeEach(() => {
  mockSwitchToNext.mockClear();
  mockActiveGroupName = null;
});

describe("group quick-switch brand button", () => {
  it("press on the brand switches the group", async () => {
    mockActiveGroupName = "Eins";
    const { getByTestId } = await render(<AppHeader title="T" settingsTestID="s" />);
    const button = getByTestId("app-header-brand-button");
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityLabel).toBe("Gruppe wechseln, aktuell: Eins");
    expect(button.props.className).toContain("min-h-touch-comfortable");
    await fireEvent.press(button);
    expect(mockSwitchToNext).toHaveBeenCalledTimes(1);
  });

  it("shows the active group name from the hook, white", async () => {
    mockActiveGroupName = "Eins";
    const { getByTestId } = await render(<AppHeader title="T" settingsTestID="s" />);
    expect(getByTestId("app-header-group").props.children).toBe("Eins");
    expect(getByTestId("app-header-group").props.className).toContain("text-white");
  });
});

describe("AppHeader", () => {
  it("renders the wordmark, screen title and group name", async () => {
    const { getByTestId } = await render(
      <AppHeader title="Watchlist" groupName="Filmabend" settingsTestID="s-btn" />,
    );
    expect(getByTestId("app-header-wordmark").props.children).toBe("WATCHCREW");
    expect(getByTestId("app-header-title").props.children).toBe("Watchlist");
    expect(getByTestId("app-header-group").props.children).toBe("Filmabend");
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
    expect(cls).toContain("h-11");
    expect(cls).toContain("w-11");
    expect(cls).toContain("shrink-0");
    expect(cls).toContain("rounded-full");
    expect(cls).not.toContain("min-h");
  });
});
