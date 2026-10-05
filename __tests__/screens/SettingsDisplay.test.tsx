import { fireEvent, render } from "@testing-library/react-native";

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

function loadPreferencesStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

function loadScreen() {
  return require("@/app/(app)/(modals)/settings/display").default;
}

describe("SettingsDisplayScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ showTitlesInGrid: true });
  });

  it("renders the toggle reflecting the current showTitlesInGrid state", async () => {
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-display-titles-toggle").props.accessibilityState.checked).toBe(true);
  });

  it("toggles showTitlesInGrid off on tap", async () => {
    const Screen = loadScreen();
    const usePreferencesStore = loadPreferencesStore();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-display-titles-toggle"));

    expect(usePreferencesStore.getState().showTitlesInGrid).toBe(false);
  });

  it("toggles showTitlesInGrid back on when starting off", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ showTitlesInGrid: false });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-display-titles-toggle"));

    expect(usePreferencesStore.getState().showTitlesInGrid).toBe(true);
  });

  it("renders the Tracker aktiv toggle (default on) and toggles trackerEnabled off on tap", async () => {
    const Screen = loadScreen();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ trackerEnabled: true });
    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-display-tracker-toggle").props.accessibilityState.checked).toBe(true);

    await fireEvent.press(getByTestId("settings-display-tracker-toggle"));

    expect(usePreferencesStore.getState().trackerEnabled).toBe(false);
  });
});
