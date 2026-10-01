import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { AppHeader } from "@/components/ui/AppHeader";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

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
