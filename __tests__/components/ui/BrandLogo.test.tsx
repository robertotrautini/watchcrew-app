import { render } from "@testing-library/react-native";

import { GroupThemeProvider } from "@/components/GroupThemeProvider";
import { BrandLogo, LOGO_HORIZONTAL, LOGO_ICON } from "@/components/ui/BrandLogo";
import { GROUP_THEME_OPTIONS } from "@/lib/groupTheme";

// expo-image normalises `source` to an array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const src = (node: { props: Record<string, any> }) => [node.props.source].flat()[0];

describe("BrandLogo", () => {
  it("renders the gold horizontal logo with a11y label by default", async () => {
    const { getByLabelText } = await render(<BrandLogo />);
    const logo = getByLabelText("WatchCrew");
    expect(logo.props.accessibilityRole).toBe("image");
    expect(src(logo)).toBe(LOGO_HORIZONTAL.gold);
    expect(logo.props.contentFit).toBe("contain");
  });

  it.each(GROUP_THEME_OPTIONS)("uses the %s asset in the %s theme", async (theme) => {
    const { getByTestId, rerender } = await render(
      <GroupThemeProvider themeName={theme}>
        <BrandLogo />
      </GroupThemeProvider>,
    );
    expect(src(getByTestId("brand-logo"))).toBe(LOGO_HORIZONTAL[theme]);
    await rerender(
      <GroupThemeProvider themeName={theme}>
        <BrandLogo badgeOnly />
      </GroupThemeProvider>,
    );
    expect(src(getByTestId("brand-logo"))).toBe(LOGO_ICON[theme]);
  });

  it("themes map to distinct assets", () => {
    expect(new Set(Object.values(LOGO_HORIZONTAL)).size).toBe(GROUP_THEME_OPTIONS.length);
  });

  it("scales width from height (horizontal 260:64, badge square)", async () => {
    const { getByTestId, rerender } = await render(<BrandLogo height={64} />);
    expect(getByTestId("brand-logo").props.style).toMatchObject({ width: 260, height: 64 });
    await rerender(<BrandLogo height={40} badgeOnly />);
    expect(getByTestId("brand-logo").props.style).toMatchObject({ width: 40, height: 40 });
  });
});
