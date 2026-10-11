import { StyleSheet } from "react-native";
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

  it("grid column segments default to 4 (diary/watchlist) and 3 (movies) and set the store", async () => {
    const Screen = loadScreen();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ gridColumnsDiaryWatchlist: 4, gridColumnsMovies: 3 });
    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-grid-columns-diary-watchlist-4").props.accessibilityState.selected).toBe(true);
    expect(getByTestId("settings-grid-columns-diary-watchlist-3").props.accessibilityState.selected).toBe(false);
    expect(getByTestId("settings-grid-columns-movies-3").props.accessibilityState.selected).toBe(true);

    await fireEvent.press(getByTestId("settings-grid-columns-diary-watchlist-3"));
    await fireEvent.press(getByTestId("settings-grid-columns-movies-4"));

    expect(usePreferencesStore.getState().gridColumnsDiaryWatchlist).toBe(3);
    expect(usePreferencesStore.getState().gridColumnsMovies).toBe(4);
  });

  it("active column segment keeps radius + accent fill explicitly after a state change", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ gridColumnsDiaryWatchlist: 4 });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-grid-columns-diary-watchlist-3"));

    const active = StyleSheet.flatten(getByTestId("settings-grid-columns-diary-watchlist-3-segment").props.style);
    const inactive = StyleSheet.flatten(getByTestId("settings-grid-columns-diary-watchlist-4-segment").props.style);
    expect(active.borderRadius).toBe(8);
    expect(active.backgroundColor).not.toBe("transparent");
    expect(inactive.borderRadius).toBe(8);
    expect(inactive.backgroundColor).toBe("transparent");
  });
});
