import { render } from "@testing-library/react-native";

import { SettingsRow } from "@/components/ui/SettingsRow";

describe("SettingsRow", () => {
  it("danger row uses the shared danger look (red tint + readable red label)", async () => {
    const { getByTestId, getByText } = await render(
      <SettingsRow testID="row" icon="delete" label="Konto löschen" danger onPress={() => {}} />,
    );
    expect(getByTestId("row").props.className).toContain("bg-danger/15");
    expect(getByText("Konto löschen").props.className).toContain("text-danger-text");
  });

  it("normal row has no danger tint", async () => {
    const { getByTestId, getByText } = await render(
      <SettingsRow testID="row" icon="group" label="Gruppe" onPress={() => {}} />,
    );
    expect(getByTestId("row").props.className).not.toContain("bg-danger");
    expect(getByText("Gruppe").props.className).toContain("text-text-primary");
  });
});
