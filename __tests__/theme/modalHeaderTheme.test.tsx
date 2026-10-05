import { render } from "@testing-library/react-native";

import { GroupThemeProvider } from "@/components/GroupThemeProvider";
import { resolveGroupTheme } from "@/lib/groupTheme";

const captured: { screenOptions?: Record<string, unknown> } = {};
jest.mock("expo-router", () => {
  const Stack = ({ children, screenOptions }: { children?: React.ReactNode; screenOptions?: Record<string, unknown> }) => {
    captured.screenOptions = screenOptions;
    return <>{children}</>;
  };
  Stack.Screen = () => null;
  return { Stack };
});

describe("(modals) stack header follows the group theme", () => {
  it("back arrow tint + title use accentLight of the red theme", async () => {
    const ModalsLayout = require("@/app/(app)/(modals)/_layout").default;
    const red = resolveGroupTheme("red").colors;
    await render(
      <GroupThemeProvider themeName="red">
        <ModalsLayout />
      </GroupThemeProvider>,
    );
    expect(captured.screenOptions?.headerTintColor).toBe(red.accentLight);
    expect((captured.screenOptions?.headerTitleStyle as { color: string }).color).toBe(red.accentLight);
  });
});
