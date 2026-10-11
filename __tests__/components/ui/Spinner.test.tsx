import { render } from "@testing-library/react-native";

import { GroupThemeProvider } from "@/components/GroupThemeProvider";
import { Spinner } from "@/components/ui/Spinner";
import { resolveGroupTheme } from "@/lib/groupTheme";

describe("Spinner", () => {
  it("uses the default (gold) accent colour", async () => {
    const { getByTestId } = await render(<Spinner testID="s" />);
    expect(getByTestId("s").props.color).toBe(
      resolveGroupTheme("gold").colors.accent,
    );
  });

  it("follows the group theme accent", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <Spinner testID="s" />
      </GroupThemeProvider>,
    );
    expect(getByTestId("s").props.color).toBe(
      resolveGroupTheme("red").colors.accent,
    );
  });

  it("allows a contrast colour override and forwards props", async () => {
    const { getByTestId } = await render(
      <Spinner testID="s" size="large" color="#0a0a0a" />,
    );
    const props = getByTestId("s").props;
    expect(props.color).toBe("#0a0a0a");
    expect(props.size).toBe("large");
    expect(props.testID).toBe("s");
  });
});
