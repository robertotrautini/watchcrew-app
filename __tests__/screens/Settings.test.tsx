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

const mockSelectGroup = jest.fn();
jest.mock("@/hooks/useGroupQuickSwitch", () => ({
  useGroupQuickSwitch: () => ({
    activeGroupId: "g1",
    activeGroupName: "Eins",
    groups: [
      { id: "g1", name: "Eins" },
      { id: "g2", name: "Zwei" },
    ],
    selectGroup: mockSelectGroup,
    switchToNext: jest.fn(),
  }),
}));

const mockSignOut = jest.fn();
jest.mock("@/lib/auth", () => ({
  signOut: mockSignOut,
}));

const mockDeleteOwnAccount = jest.fn();
jest.mock("@/lib/deleteAccount", () => ({
  deleteOwnAccount: mockDeleteOwnAccount,
}));

const mockImpactAsync = jest.fn();
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
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

  it("switches the active group via the dropdown next to the current user", async () => {
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId } = await render(<SettingsScreen />);
    const select = getByTestId("settings-active-group-select");
    expect(select.props.accessibilityLabel).toBe("Aktuelle Gruppe");
    await fireEvent.press(select);
    await fireEvent.press(getByTestId("settings-active-group-select-option-g2"));
    expect(mockSelectGroup).toHaveBeenCalledWith("g2");
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

    // "Konto löschen" opens a dialog instead of a route.
    await fireEvent.press(getByTestId("settings-section-delete-account"));
    expect(mockRouter.push).not.toHaveBeenCalledWith("/settings/delete-account");
  });

  describe("Konto löschen dialog", () => {
    async function openDialog() {
      const SettingsScreen = loadSettingsScreen();
      const utils = await render(<SettingsScreen />);
      await fireEvent.press(utils.getByTestId("settings-section-delete-account"));
      return utils;
    }

    it("opens the ConfirmDialog (flyout) when 'Konto löschen' is tapped", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId, queryByTestId } = await render(<SettingsScreen />);
      expect(queryByTestId("delete-account-dialog")).toBeNull();
      await fireEvent.press(getByTestId("settings-section-delete-account"));
      expect(getByTestId("delete-account-dialog")).toBeTruthy();
      expect(getByTestId("delete-account-confirm-input")).toBeTruthy();
    });

    it("keeps confirm disabled until the exact phrase 'LÖSCHEN' is typed", async () => {
      const { getByTestId } = await openDialog();
      const disabled = () => getByTestId("delete-account-confirm-button").props.accessibilityState.disabled;
      expect(disabled()).toBe(true);
      await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "loeschen");
      expect(disabled()).toBe(true);
      await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "LÖSCHEN");
      expect(disabled()).toBe(false);
    });

    it("does not delete when confirm is pressed while still disabled", async () => {
      const { getByTestId } = await openDialog();
      await fireEvent.press(getByTestId("delete-account-confirm-button"));
      expect(mockDeleteOwnAccount).not.toHaveBeenCalled();
      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it("cancel closes the dialog without deleting", async () => {
      const { getByTestId, queryByTestId } = await openDialog();
      await fireEvent.press(getByTestId("delete-account-cancel-button"));
      expect(queryByTestId("delete-account-dialog")).toBeNull();
      expect(mockDeleteOwnAccount).not.toHaveBeenCalled();
    });

    it("on success: deletes, navigates to login, then signs out", async () => {
      mockDeleteOwnAccount.mockResolvedValue({ error: null });
      mockSignOut.mockResolvedValue({ error: null });
      const { getByTestId } = await openDialog();
      await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "LÖSCHEN");
      await fireEvent.press(getByTestId("delete-account-confirm-button"));

      expect(mockImpactAsync).toHaveBeenCalledWith("medium");
      await waitFor(() => expect(mockDeleteOwnAccount).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
      expect(mockDeleteOwnAccount.mock.invocationCallOrder[0]).toBeLessThan(
        mockRouter.replace.mock.invocationCallOrder[0],
      );
      expect(mockRouter.replace.mock.invocationCallOrder[0]).toBeLessThan(
        mockSignOut.mock.invocationCallOrder[0],
      );
    });

    it("on failure: shows the error and neither signs out nor navigates", async () => {
      mockDeleteOwnAccount.mockResolvedValue({ error: { message: "server error" } });
      const { getByTestId } = await openDialog();
      await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "LÖSCHEN");
      await fireEvent.press(getByTestId("delete-account-confirm-button"));

      await waitFor(() => expect(getByTestId("delete-account-error")).toBeTruthy());
      expect(mockSignOut).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  it("shows the user's email and display name as a row with label, value and edit button", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByTestId, getByText } = await render(<SettingsScreen />);

    expect(getByTestId("settings-user-email").props.children).toBe("robin@example.com");
    expect(getByText("Anzeigename")).toBeTruthy();
    expect(getByTestId("settings-current-user").props.children).toBe("robin");
    const edit = getByTestId("settings-display-name-edit-button");
    expect(edit.props.className).toContain("rounded-full");
    expect(edit.props.accessibilityLabel).toBe("Anzeigename bearbeiten");
    expect(edit.props.accessibilityRole).toBe("button");
    const row = getByTestId("settings-display-name-row");
    expect(row.props.className).toContain("items-center");
    expect(row.props.className).toContain("h-14");
    expect(edit.props.className).not.toMatch(/\bm[tb]-/);
  });

  describe("display name sheet", () => {
    async function openSheet() {
      const SettingsScreen = loadSettingsScreen();
      const utils = await render(<SettingsScreen />);
      await fireEvent.press(utils.getByTestId("settings-display-name-edit-button"));
      return utils;
    }

    it("is closed initially and there is no inline input", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { queryByTestId } = await render(<SettingsScreen />);
      expect(queryByTestId("settings-display-name-sheet")).toBeNull();
      expect(queryByTestId("settings-display-name-input")).toBeNull();
      expect(queryByTestId("settings-display-name-save")).toBeNull();
    });

    it("opens with the current name prefilled and Abbrechen / Speichern buttons", async () => {
      const { getByTestId, getByText } = await openSheet();
      expect(getByTestId("settings-display-name-sheet")).toBeTruthy();
      expect(getByTestId("settings-display-name-input").props.value).toBe("robin");
      expect(getByText("Abbrechen")).toBeTruthy();
      expect(getByText("Speichern")).toBeTruthy();
    });

    it("discards the draft on Abbrechen and reopens with the stored name", async () => {
      const { getByTestId, queryByTestId } = await openSheet();
      await fireEvent.changeText(getByTestId("settings-display-name-input"), "robin2");
      await fireEvent.press(getByTestId("settings-display-name-cancel-button"));
      expect(queryByTestId("settings-display-name-sheet")).toBeNull();
      expect(mockMutateAsync).not.toHaveBeenCalled();
      await fireEvent.press(getByTestId("settings-display-name-edit-button"));
      expect(getByTestId("settings-display-name-input").props.value).toBe("robin");
    });

    it("disables Speichern while unchanged or blank", async () => {
      const { getByTestId } = await openSheet();
      const disabled = () => getByTestId("settings-display-name-confirm-button").props.accessibilityState.disabled;
      expect(disabled()).toBe(true);
      await fireEvent.changeText(getByTestId("settings-display-name-input"), "robin2");
      expect(disabled()).toBe(false);
      await fireEvent.changeText(getByTestId("settings-display-name-input"), "   ");
      expect(disabled()).toBe(true);
    });

    it("shows a spinner while saving", async () => {
      mockUpdateIsPending = true;
      const { getByTestId } = await openSheet();
      expect(getByTestId("settings-display-name-confirm-button-loading-indicator")).toBeTruthy();
    });

    it("saves the trimmed name, shows a success toast and closes", async () => {
      mockMutateAsync.mockResolvedValue(null);
      const { getByTestId, queryByTestId } = await openSheet();
      await act(async () => {
        fireEvent.changeText(getByTestId("settings-display-name-input"), "  Robin T ");
      });
      await act(async () => {
        fireEvent.press(getByTestId("settings-display-name-confirm-button"));
      });
      expect(mockMutateAsync).toHaveBeenCalledWith("Robin T");
      expect(mockShowToast).toHaveBeenCalledWith("Anzeigename gespeichert", { variant: "success" });
      expect(queryByTestId("settings-display-name-sheet")).toBeNull();
    });

    it("does not save a blank name", async () => {
      const { getByTestId } = await openSheet();
      await act(async () => {
        fireEvent.changeText(getByTestId("settings-display-name-input"), "   ");
      });
      await act(async () => {
        fireEvent.press(getByTestId("settings-display-name-confirm-button"));
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it("shows an error toast and stays open when saving fails", async () => {
      mockMutateAsync.mockRejectedValue(new Error("boom"));
      const { getByTestId } = await openSheet();
      await act(async () => {
        fireEvent.changeText(getByTestId("settings-display-name-input"), "Neu");
      });
      await act(async () => {
        fireEvent.press(getByTestId("settings-display-name-confirm-button"));
      });
      expect(getByTestId("settings-display-name-error")).toBeTruthy();
      expect(getByTestId("settings-display-name-sheet")).toBeTruthy();
      expect(mockShowToast).toHaveBeenCalledWith("Anzeigename konnte nicht gespeichert werden.", { variant: "error" });
    });
  });

  it("places Abmelden first and Konto löschen (danger) last at the page end, no 'Konto' section", async () => {
    const SettingsScreen = loadSettingsScreen();
    const { getByTestId, queryByText } = await render(<SettingsScreen />);
    expect(queryByText("Konto")).toBeNull();
    const del = getByTestId("settings-section-delete-account");
    expect(del.props.className).toContain("bg-btn-danger");
    const ids: string[] = [];
    (function walk(node: any) {
      if (!node) return;
      const id = node.props?.testID;
      if (id === "settings-sign-out-button" || id === "settings-section-delete-account" || id === "settings-app-version") ids.push(id);
      (node.children ?? []).forEach((c: any) => typeof c !== "string" && walk(c));
    })(require("@testing-library/react-native").screen.toJSON());
    expect(ids).toEqual([
      "settings-sign-out-button",
      "settings-section-delete-account",
      "settings-app-version",
    ]);
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

  it("groups rows under Gruppe / App / Rechtliches headings with 'Profil' on top", async () => {
    const SettingsScreen = loadSettingsScreen();

    const { getByText, getByTestId } = await render(<SettingsScreen />);

    for (const heading of ["Gruppe", "App", "Rechtliches", "Datenquellen", "Profil"]) {
      expect(getByText(heading)).toBeTruthy();
    }
    expect(getByTestId("settings-current-user").props.children).toBe("robin");
    expect(getByTestId("settings-current-user").props.className).not.toContain("text-accent");
    expect(getByTestId("settings-current-user").props.className).not.toContain("text-xl");
    // Every row is its own ListRow tile (fixed control height, own border).
    expect(getByTestId("settings-section-display").props.className).toContain("h-14");
    expect(getByTestId("settings-section-display").props.className).toContain("border-surface-border");
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

    it("does nothing (no URL, no toast) when the config still has the placeholder value", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      await fireEvent.press(getByTestId("settings-section-privacy-policy"));

      expect(mockOpenURL).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("also gates the terms-of-service row on its own placeholder value", async () => {
      const SettingsScreen = loadSettingsScreen();
      const { getByTestId } = await render(<SettingsScreen />);

      await fireEvent.press(getByTestId("settings-section-terms-of-service"));

      expect(mockOpenURL).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
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
