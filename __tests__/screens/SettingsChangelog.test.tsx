import { render, waitFor } from "@testing-library/react-native";

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
  return require("@/app/(app)/(modals)/settings/changelog").default;
}

describe("SettingsChangelogScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ lastSeenChangelogVersion: null });
  });

  it("renders every changelog entry with version, title, date and description", async () => {
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("changelog-entry-1.0.0")).toBeTruthy();
    expect(getByTestId("changelog-entry-1.0.0-title").props.children).toBe(
      "Erste Version von WatchCrew",
    );
  });

  it("marks the current version as seen immediately on open", async () => {
    const usePreferencesStore = loadPreferencesStore();
    const Screen = loadScreen();

    await render(<Screen />);

    await waitFor(() =>
      expect(usePreferencesStore.getState().lastSeenChangelogVersion).toBe("1.0.0"),
    );
  });
});
