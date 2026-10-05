import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { mockRouter } from "../helpers/mockRouter";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

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

let mockUpdateIsPending = false;
jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());

const mockUseCurrentUserEmail = jest.fn();
jest.mock("@/hooks/useCurrentUserEmail", () => ({
  useCurrentUserEmail: mockUseCurrentUserEmail,
}));

const mockUseOwnProfile = jest.fn();
jest.mock("@/hooks/useOwnProfile", () => ({
  useOwnProfile: mockUseOwnProfile,
}));

const mockMutateAsync = jest.fn();
jest.mock("@/hooks/useUpdateDisplayName", () => ({
  useUpdateDisplayName: () => ({ mutateAsync: mockMutateAsync, isPending: mockUpdateIsPending }),
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
function loadPreferencesStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

function loadSettingsScreen() {
  return require("@/app/(app)/(modals)/settings").default;
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    mockUpdateIsPending = false;
    jest.clearAllMocks();
    mockExtra.privacyPolicyUrl = "https://watch-crew.app/privacy";
    mockExtra.termsOfServiceUrl = "https://watch-crew.app/terms";
    mockCurrentUserId.mockReturnValue("u1");
    mockUseCurrentUserEmail.mockReturnValue("robin@example.com");
    mockUseOwnProfile.mockReturnValue({ data: { display_name: "robin" }, isLoading: false });
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({
      selectedStreamingProviderIds: [],
    });
  });

  it("renders all navigable sections", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-section-streaming-services")).toBeTruthy();
    expect(getByTestId("settings-section-display")).toBeTruthy();
    expect(getByTestId("settings-section-notifications")).toBeTruthy();
    expect(getByTestId("settings-section-group-settings")).toBeTruthy();
    expect(getByTestId("settings-section-delete-account")).toBeTruthy();
  });

  it("navigates to each section's route on tap", async () => {
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId } = await render(<SettingsScreen />);

    await fireEvent.press(getByTestId("settings-section-streaming-services"));
    expect(mockRouter.push).toHaveBeenCalledWith("/settings/streaming-services");

    await fireEvent.press(getByTestId("settings-section-display"));
    expect(mockRouter.push).toHaveBeenCalledWith("/settings/display");

    await fireEvent.press(getByTestId("settings-section-notifications"));
    expect(mockRouter.push).toHaveBeenCalledWith("/settings/notifications");

    await fireEvent.press(getByTestId("settings-section-group-settings"));
    expect(mockRouter.push).toHaveBeenCalledWith("/group-settings");

    await fireEvent.press(getByTestId("settings-section-delete-account"));
    expect(mockRouter.push).toHaveBeenCalledWith("/settings/delete-account");
  });

  it("shows the user's email and display name", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId } = await render(<SettingsScreen />);

    expect(getByTestId("settings-user-email").props.children).toBe("robin@example.com");
    expect(getByTestId("settings-user-display-name").props.value).toBe("robin");
  });

  describe("display name save button", () => {
    it("is a round icon-only button on the same row as the input", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId, queryByText } = await render(<SettingsScreen />);

      const save = getByTestId("settings-display-name-save");
      expect(save.props.className).toContain("rounded-full");
      expect(save.props.className).toContain("w-12");
      expect(save.props.accessibilityLabel).toBe("Anzeigename speichern");
      expect(save.props.accessibilityRole).toBe("button");
      expect(queryByText("Speichern")).toBeNull();
      const row = getByTestId("settings-display-name-row");
      expect(row.props.className).toContain("flex-row");
      expect(row.props.children.map((c: { props: { testID: string } }) => c.props.testID)).toEqual([
        "settings-user-display-name",
        "settings-display-name-save",
      ]);
    });

    it("is disabled while the name is unchanged and enabled after an edit", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      expect(getByTestId("settings-display-name-save").props.accessibilityState.disabled).toBe(true);
      await fireEvent.changeText(getByTestId("settings-user-display-name"), "robin2");
      expect(getByTestId("settings-display-name-save").props.accessibilityState.disabled).toBe(false);
      await fireEvent.changeText(getByTestId("settings-user-display-name"), "   ");
      expect(getByTestId("settings-display-name-save").props.accessibilityState.disabled).toBe(true);
    });

    it("shows a spinner while saving", async () => {
      mockUpdateIsPending = true;
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      expect(getByTestId("settings-display-name-save-loading-indicator")).toBeTruthy();
    });
  });

  it("saves an edited display name via the mutation and shows a toast", async () => {
    mockMutateAsync.mockResolvedValue(null);
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId } = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId("settings-user-display-name"), "  Robin T ");
    });
    await act(async () => {
      fireEvent.press(getByTestId("settings-display-name-save"));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith("Robin T");
    expect(mockShowToast).toHaveBeenCalledWith("Anzeigename gespeichert", { variant: "success" });
  });

  it("does not save an empty display name", async () => {
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId } = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId("settings-user-display-name"), "   ");
    });
    await act(async () => {
      fireEvent.press(getByTestId("settings-display-name-save"));
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("shows an error when saving fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("boom"));
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId } = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId("settings-user-display-name"), "Neu");
    });
    await act(async () => {
      fireEvent.press(getByTestId("settings-display-name-save"));
    });

    expect(getByTestId("settings-display-name-error")).toBeTruthy();
    expect(mockShowToast).toHaveBeenCalledWith("Anzeigename konnte nicht gespeichert werden.", { variant: "error" });
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
    expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
    // Navigation must happen BEFORE the session/cache/theme reset (Android
    // ScreenStackFragment crash, docs/interim-decisions.md).
    expect(mockRouter.replace.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    );
  });

  it("shows 'N ausgewählt' on the streaming-services row", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ selectedStreamingProviderIds: [8, 337, 119] });
    const SettingsScreen = loadSettingsScreen();

    const { getByText } = await render(<SettingsScreen />);

    expect(getByText("3 ausgewählt")).toBeTruthy();
  });

  it("omits the 'ausgewählt' value when nothing is selected", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { queryByText } = await render(<SettingsScreen />);

    expect(queryByText(/ausgewählt/)).toBeNull();
  });

  it("groups rows under Konto / Gruppe / App / Rechtliches headings with 'Aktueller Nutzer' on top", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByText, getByTestId } = await render(<SettingsScreen />);

    for (const heading of ["Konto", "Gruppe", "App", "Rechtliches", "Datenquellen", "Aktueller Nutzer"]) {
      expect(getByText(heading)).toBeTruthy();
    }
    expect(getByTestId("settings-current-user").props.children).toBe("robin");
    // Last row of a group has no separator below; later rows have one above.
    expect(getByTestId("settings-sections-item-0").props.className ?? "").not.toContain("border-t");
    expect(getByTestId("settings-sections-item-2").props.className).toContain("border-t");
  });

  it("has no changelog row or 'Neue Funktionen' toast (removed; updates go through the store listings)", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { queryByTestId } = await render(<SettingsScreen />);

    expect(queryByTestId("settings-section-changelog")).toBeNull();
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
  // Inventory 2.7 — data-source attributions: TMDB + Trakt with logos (JustWatch credit inside the TMDB text).
  describe("Datenquellen attributions", () => {
    it("renders TMDB and Trakt with logos and one-line disclaimers (no JustWatch row, no KinoCheck)", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId, queryByTestId, queryByText } = await render(<SettingsScreen />);

      expect(getByTestId("settings-attributions")).toBeTruthy();
      expect(getByTestId("settings-attribution-tmdb-logo")).toBeTruthy();
      expect(getByTestId("settings-attribution-trakt-logo")).toBeTruthy();
      expect(getByTestId("settings-attribution-tmdb-text").props.children).toBe(
        "Dieses Produkt verwendet die TMDB API, wird aber nicht von TMDB unterstützt oder zertifiziert. Streaming-Daten: JustWatch.",
      );
      expect(getByTestId("settings-attribution-trakt-text").props.children).toBe(
        "Ähnliche Filme via Trakt API.",
      );
      expect(queryByTestId("settings-attribution-justwatch")).toBeNull();
      expect(queryByText(/KinoCheck/)).toBeNull();
    });

    it.each([
      ["tmdb", "https://www.themoviedb.org"],
      ["trakt", "https://trakt.tv"],
    ])("opens the %s site on press", async (key, url) => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      await fireEvent.press(getByTestId(`settings-attribution-${key}`));

      expect(mockOpenURL).toHaveBeenCalledWith(url);
    });
  });
});
