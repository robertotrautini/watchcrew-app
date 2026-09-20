import { render } from "@testing-library/react-native";

function loadScreen() {
  return require("@/app/(app)/(modals)/settings/notifications").default;
}

/**
 * M10 — this screen is an intentionally minimal placeholder. The real
 * push-subscription UI is owned by the parallel M10 notifications task; see
 * docs/interim-decisions.md ("M10 — Settings hub") for the reconciliation
 * note.
 */
describe("SettingsNotificationsScreen (placeholder)", () => {
  it("renders a placeholder screen", async () => {
    const Screen = loadScreen();

    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("settings-notifications-placeholder")).toBeTruthy();
  });
});
