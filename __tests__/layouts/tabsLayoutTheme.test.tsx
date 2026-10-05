import { render } from "@testing-library/react-native";

const mockTabsProps = jest.fn();
jest.mock("expo-router/js-tabs", () => {
  const actualReact = require("react");
  const Tabs = (props: { children?: unknown }) => {
    mockTabsProps(props);
    return actualReact.createElement(actualReact.Fragment, null, props.children);
  };
  Tabs.Screen = () => null;
  return { Tabs };
});
jest.mock("expo-router", () => ({
  Redirect: () => null,
  useSegments: () => [],
}));

import { GroupThemeProvider } from "@/components/GroupThemeProvider";

describe("(tabs)/_layout tab bar colors", () => {
  it("uses the active group's accent as the active tint", async () => {
    const TabsLayout = require("@/app/(app)/(tabs)/_layout").default;
    await render(
      <GroupThemeProvider themeName="blue">
        <TabsLayout />
      </GroupThemeProvider>,
    );
    expect(mockTabsProps.mock.calls[0][0].screenOptions.tabBarActiveTintColor).toBe("#4e8ac8");
  });
});
