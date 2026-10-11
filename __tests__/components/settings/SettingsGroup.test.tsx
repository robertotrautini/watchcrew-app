import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { ListRow } from "@/components/ui/ListRow";
import { SettingsGroup } from "@/components/settings/SettingsGroup";

describe("SettingsGroup", () => {
  it("renders the heading and renders items as a plain stack (rows bring their own border)", async () => {
    const { getByText, getByTestId } = await render(
      <SettingsGroup testID="g" title="App">
        <Text>a</Text>
        <Text>b</Text>
        {null}
        <Text>c</Text>
      </SettingsGroup>,
    );
    expect(getByText("App")).toBeTruthy();
    expect(getByTestId("g-item-0")).toBeTruthy();
    expect(getByTestId("g-item-1")).toBeTruthy();
    expect(getByTestId("g-item-2")).toBeTruthy();
    expect(() => getByTestId("g-item-3")).toThrow();
  });

  it("draws ONE card chrome and hands grouped/isLast to its ListRows via context", async () => {
    const { getByTestId } = await render(
      <SettingsGroup testID="g" title="App">
        <ListRow testID="r1" label="1" />
        {null}
        <ListRow testID="r2" label="2" />
        <ListRow testID="r3" label="3" />
      </SettingsGroup>,
    );
    const chrome = getByTestId("g-card").props.className as string;
    for (const c of ["bg-field", "rounded-xl", "border-surface-border", "overflow-hidden"]) expect(chrome).toContain(c);
    expect(getByTestId("r1").props.className).toContain("border-b");
    expect(getByTestId("r2").props.className).toContain("border-b");
    expect(getByTestId("r3").props.className).not.toContain("border-b");
    expect(getByTestId("r1").props.className).not.toContain("bg-field");
  });

  it("grouped={false} stacks loose children without card chrome", async () => {
    const { queryByTestId, getByTestId } = await render(
      <SettingsGroup testID="g" title="Aktuelle Gruppe" grouped={false}>
        <Text testID="x">x</Text>
      </SettingsGroup>,
    );
    expect(queryByTestId("g-card")).toBeNull();
    expect(getByTestId("x")).toBeTruthy();
  });
});
