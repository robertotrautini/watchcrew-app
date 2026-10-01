import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { TabBarButton } from "@/components/ui/TabBarButton";

describe("TabBarButton", () => {
  it("shows the gold indicator only when selected", async () => {
    const sel = await render(
      <TabBarButton accessibilityState={{ selected: true }}>
        <Text>x</Text>
      </TabBarButton>,
    );
    expect(sel.queryByTestId("tab-active-indicator")).toBeTruthy();
    const unsel = await render(
      <TabBarButton accessibilityState={{ selected: false }}>
        <Text>x</Text>
      </TabBarButton>,
    );
    expect(unsel.queryByTestId("tab-active-indicator")).toBeNull();
  });
});
