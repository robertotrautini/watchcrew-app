import { fireEvent, render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
}));

jest.mock("react-native-mmkv", () => {
  const map = new Map<string, string>();
  return {
    createMMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => map.get(key),
      set: (key: string, value: string) => {
        map.set(key, value);
      },
      remove: (key: string) => {
        map.delete(key);
      },
    })),
  };
});

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
});
