import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

const mockUseProvidersList = jest.fn();
jest.mock("@/hooks/useProvidersList", () => ({
  useProvidersList: mockUseProvidersList,
}));

function loadPreferencesStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

function loadScreen() {
  return require("@/app/(app)/(modals)/settings/streaming-services").default;
}

const PROVIDERS = [
  { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg" },
  { provider_id: 337, provider_name: "Disney Plus" },
  { provider_id: 119, provider_name: "Amazon Prime Video" },
];

describe("SettingsStreamingServicesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ selectedStreamingProviderIds: [] });
    mockUseProvidersList.mockReturnValue({ data: PROVIDERS, isLoading: false, isError: false });
  });

  it("renders the provider logo (w92) next to the name, none when logo_path is missing", async () => {
    const Screen = loadScreen();

    const { getByTestId, queryByTestId } = await render(<Screen />);

    expect(getByTestId("settings-streaming-provider-logo-8").props.source).toEqual([
      { uri: "https://image.tmdb.org/t/p/w92/netflix.jpg" },
    ]);
    expect(queryByTestId("settings-streaming-provider-logo-337")).toBeNull();
  });

  it("shows a loading indicator while providers are loading", async () => {
    mockUseProvidersList.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-streaming-loading")).toBeTruthy();
  });

  it("shows an error state when the providers query fails", async () => {
    mockUseProvidersList.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-streaming-error")).toBeTruthy();
  });

  it("renders every provider as a selectable tile", async () => {
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-streaming-provider-8")).toBeTruthy();
    expect(getByTestId("settings-streaming-provider-337")).toBeTruthy();
    expect(getByTestId("settings-streaming-provider-119")).toBeTruthy();
  });

  it("filters providers via the search field", async () => {
    const Screen = loadScreen();
    const { getByTestId, queryByTestId } = await render(<Screen />);

    fireEvent.changeText(getByTestId("settings-streaming-search-input"), "net");

    await waitFor(() => expect(queryByTestId("settings-streaming-provider-337")).toBeNull());
    expect(getByTestId("settings-streaming-provider-8")).toBeTruthy();
  });

  it("toggles a provider on tap, persisting into selectedStreamingProviderIds", async () => {
    const Screen = loadScreen();
    const usePreferencesStore = loadPreferencesStore();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-streaming-provider-8"));

    expect(usePreferencesStore.getState().selectedStreamingProviderIds).toEqual([8]);
  });

  it("deselects an already-selected provider on a second tap", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ selectedStreamingProviderIds: [8, 337] });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("settings-streaming-provider-8"));

    expect(usePreferencesStore.getState().selectedStreamingProviderIds).toEqual([337]);
  });

  it("reflects the currently-selected providers as checked", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ selectedStreamingProviderIds: [337] });
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-streaming-provider-337").props.accessibilityState.checked).toBe(true);
    expect(getByTestId("settings-streaming-provider-8").props.accessibilityState.checked).toBe(false);
  });
});
