import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  Stack: { Screen: () => null },
}));

// Mutable so individual tests can swap in a "real URL" value without
// needing jest.doMock/resetModules gymnastics -- see the "legal document
// rows" describe block below, reset to the placeholder defaults in
// beforeEach like every other piece of this test file's shared mock state.
const mockExtra = {
  privacyPolicyUrl: "https://watch-crew.app/privacy",
  termsOfServiceUrl: "https://watch-crew.app/terms",
};
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { version: "1.0.0", extra: mockExtra };
    },
  },
}));

const mockOpenURL = jest.fn();
jest.mock("expo-linking", () => ({
  openURL: (...args: unknown[]) => mockOpenURL(...args),
}));

const mockUseCurrentUserId = jest.fn();
jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));

const mockUseCurrentUserEmail = jest.fn();
jest.mock("@/hooks/useCurrentUserEmail", () => ({
  useCurrentUserEmail: mockUseCurrentUserEmail,
}));

const mockUseOwnProfile = jest.fn();
jest.mock("@/hooks/useOwnProfile", () => ({
  useOwnProfile: mockUseOwnProfile,
}));

const mockSignOut = jest.fn();
jest.mock("@/lib/auth", () => ({
  signOut: mockSignOut,
}));

const mockShowToast = jest.fn();
jest.mock("@/lib/toast", () => ({
  showToast: mockShowToast,
}));

// Real usePreferencesStore (genuine Zustand + fake-MMKV store), same
// convention as __tests__/screens/Tagebuch.test.tsx — reset via setState.
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

function loadSettingsScreen() {
  return require("@/app/(app)/(modals)/settings").default;
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtra.privacyPolicyUrl = "https://watch-crew.app/privacy";
    mockExtra.termsOfServiceUrl = "https://watch-crew.app/terms";
    mockUseCurrentUserId.mockReturnValue("u1");
    mockUseCurrentUserEmail.mockReturnValue("robin@example.com");
    mockUseOwnProfile.mockReturnValue({ data: { display_name: "robin" }, isLoading: false });
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({
      selectedStreamingProviderIds: [],
      lastSeenChangelogVersion: "1.0.0",
    });
  });

  it("renders all navigable sections", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-section-streaming-services")).toBeTruthy();
    expect(getByTestId("settings-section-display")).toBeTruthy();
    expect(getByTestId("settings-section-notifications")).toBeTruthy();
    expect(getByTestId("settings-section-group-settings")).toBeTruthy();
    expect(getByTestId("settings-section-changelog")).toBeTruthy();
    expect(getByTestId("settings-section-delete-account")).toBeTruthy();
  });

  it("navigates to each section's route on tap", async () => {
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId } = await render(<SettingsScreen />);

    await fireEvent.press(getByTestId("settings-section-streaming-services"));
    expect(mockPush).toHaveBeenCalledWith("/settings/streaming-services");

    await fireEvent.press(getByTestId("settings-section-display"));
    expect(mockPush).toHaveBeenCalledWith("/settings/display");

    await fireEvent.press(getByTestId("settings-section-notifications"));
    expect(mockPush).toHaveBeenCalledWith("/settings/notifications");

    await fireEvent.press(getByTestId("settings-section-group-settings"));
    expect(mockPush).toHaveBeenCalledWith("/group-settings");

    await fireEvent.press(getByTestId("settings-section-changelog"));
    expect(mockPush).toHaveBeenCalledWith("/settings/changelog");

    await fireEvent.press(getByTestId("settings-section-delete-account"));
    expect(mockPush).toHaveBeenCalledWith("/settings/delete-account");
  });

  it("shows the user's email and display name", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-user-email").props.children).toBe("robin@example.com");
    expect(getByTestId("settings-user-display-name").props.children).toBe("robin");
  });

  it("shows the app version from expo-constants", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-app-version").props.children).toContain("1.0.0");
  });

  it("calls signOut when Abmelden is tapped", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId } = await render(<SettingsScreen />);

    await fireEvent.press(getByTestId("settings-sign-out-button"));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows a streaming-services badge with the selected provider count", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ selectedStreamingProviderIds: [8, 337, 119] });
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-streaming-badge").props.children).toBe(3);
  });

  it("omits the streaming-services badge when nothing is selected", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { queryByTestId } = await render(<SettingsScreen />);

    expect(queryByTestId("settings-streaming-badge")).toBeNull();
  });

  it("shows a 'Neu' changelog badge when lastSeenChangelogVersion differs from the current version", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ lastSeenChangelogVersion: "0.9.0" });
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-changelog-badge")).toBeTruthy();
  });

  it("omits the changelog badge when lastSeenChangelogVersion already matches", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ lastSeenChangelogVersion: "1.0.0" });
    const SettingsScreen = loadSettingsScreen();

    const { queryByTestId } = await render(<SettingsScreen />);

    expect(queryByTestId("settings-changelog-badge")).toBeNull();
  });

  it("shows the changelog badge when the version has never been seen (null)", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ lastSeenChangelogVersion: null });
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-changelog-badge")).toBeTruthy();
  });

  it("fires a 'Neue Funktionen verfügbar' toast once when the changelog is unseen", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ lastSeenChangelogVersion: "0.9.0" });
    const SettingsScreen = loadSettingsScreen();

    await render(<SettingsScreen />);

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith("Neue Funktionen verfügbar");
  });

  it("does not fire the changelog toast when the current version has already been seen", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ lastSeenChangelogVersion: "1.0.0" });
    const SettingsScreen = loadSettingsScreen();

    await render(<SettingsScreen />);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  // M11 part 2, Job 3 (ADR 0011) — legal document placeholder rows.
  describe("legal document rows", () => {
    it("renders both the privacy-policy and terms-of-service rows", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      expect(getByTestId("settings-section-privacy-policy")).toBeTruthy();
      expect(getByTestId("settings-section-terms-of-service")).toBeTruthy();
    });

    it("opens the configured URL when a real privacy-policy URL is set", async () => {
      mockExtra.privacyPolicyUrl = "https://www.iubenda.com/privacy-policy/12345678";
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      await fireEvent.press(getByTestId("settings-section-privacy-policy"));

      expect(mockOpenURL).toHaveBeenCalledWith("https://www.iubenda.com/privacy-policy/12345678");
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("shows a 'Wird bald ergänzt' toast instead of opening a URL when the config still has the placeholder value", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      await fireEvent.press(getByTestId("settings-section-privacy-policy"));

      expect(mockOpenURL).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith("Wird bald ergänzt");
    });

    it("also gates the terms-of-service row on its own placeholder value", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      await fireEvent.press(getByTestId("settings-section-terms-of-service"));

      expect(mockOpenURL).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith("Wird bald ergänzt");
    });
  });
});
