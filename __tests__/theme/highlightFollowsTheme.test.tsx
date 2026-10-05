// Asserts the real icon glyph colour (style), so it opts out of the global @expo/vector-icons mock.
jest.unmock("@expo/vector-icons");

import { render } from "@testing-library/react-native";

import { GroupThemeProvider } from "@/components/GroupThemeProvider";
import { Brand } from "@/components/ui/Brand";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { Chip, ChipTag } from "@/components/ui/Chip";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { SortButton } from "@/components/ui/SortButton";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import { MovieGrid, type MovieGridBadge } from "@/components/movie/MovieGrid";
import { resolveGroupTheme } from "@/lib/groupTheme";
import { navThemeColors } from "@/lib/navTheme";

jest.mock("@/hooks/useGroupQuickSwitch", () => ({
  useGroupQuickSwitch: () => ({
    activeGroupName: null,
    activeGroupId: undefined,
    groupCount: 1,
    switchToNext: jest.fn(),
  }),
}));

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const red = resolveGroupTheme("red").colors;
const gold = resolveGroupTheme("gold").colors;

function styleOf(node: { props: { style?: unknown } }): string {
  return JSON.stringify(node.props.style);
}

describe("highlight colour follows the group theme (red)", () => {
  it("Brand reel icon is white in every theme (not accent)", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <Brand />
      </GroupThemeProvider>,
    );
    expect(styleOf(getByTestId("brand-icon"))).toContain("#ffffff");
    expect(styleOf(getByTestId("brand-icon"))).not.toContain(red.accentLight);
  });

  it("AppHeader reel icon, wordmark and group name are white in every theme", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <AppHeader title="T" settingsTestID="s" groupName="G" />
      </GroupThemeProvider>,
    );
    expect(styleOf(getByTestId("app-header-icon"))).toContain("#ffffff");
    expect(styleOf(getByTestId("app-header-icon"))).not.toContain(red.accentLight);
    expect(getByTestId("app-header-wordmark").props.className).toContain("text-white");
    expect(getByTestId("app-header-wordmark").props.className).not.toContain("accent");
    expect(getByTestId("app-header-group").props.className).toContain("text-white");
  });

  it("SettingsRow chevron uses the theme accent (not gold)", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <SettingsRow testID="row" icon="group" label="G" onPress={() => {}} />
      </GroupThemeProvider>,
    );
    expect(styleOf(getByTestId("row-chevron"))).toContain(red.accent);
    expect(styleOf(getByTestId("row-chevron"))).not.toContain(gold.accent);
  });

  it("MovieGrid watchlist bookmark uses the theme accent", async () => {
    const getBadge = (): MovieGridBadge => "watchlist";
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <MovieGrid
          items={[{ tmdbId: 1, title: "A" }]}
          onPressItem={jest.fn()}
          testID="grid"
          getBadge={getBadge}
        />
      </GroupThemeProvider>,
    );
    expect(styleOf(getByTestId("grid-badge-icon-1"))).toContain(red.accent);
  });

  it("navigation theme primary takes the accent", () => {
    expect(navThemeColors(red.accent).primary).toBe(red.accent);
  });
});

describe("class-token components resolve through theme variables (no static colours)", () => {
  it("Button primary / secondary", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <Button testID="p" label="P" onPress={() => {}} />
        <Button testID="s" label="S" variant="secondary" onPress={() => {}} />
      </GroupThemeProvider>,
    );
    expect(getByTestId("p").props.className).toContain("bg-accent");
    expect(getByTestId("p").props.className).toContain("active:bg-accent-light");
    expect(getByTestId("s").props.className).not.toMatch(/yellow|amber|c8a44e/);
  });

  it("Chip + ChipTag use accent tokens", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <Chip testID="c" label="x" />
        <Chip testID="a" label="x" active />
        <ChipTag testID="t" label="x" />
      </GroupThemeProvider>,
    );
    expect(getByTestId("c").props.className).toContain("border-accent-a55");
    expect(getByTestId("c-tint").props.className).toContain("bg-accent-a15");
    expect(getByTestId("a").props.className).toContain("bg-accent");
    expect(getByTestId("t-tint").props.className).toContain("bg-accent-a15");
  });

  it("ViewModeToggle active segment uses bg-accent", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <ViewModeToggle value="grid" onChange={() => {}} testID="v" buttonTestID={(m) => `v-${m}`} />
      </GroupThemeProvider>,
    );
    expect(getByTestId("v-grid-segment").props.className).toContain("bg-accent");
  });

  it("SortButton has no static accent colour", async () => {
    const { getByTestId } = await render(
      <GroupThemeProvider themeName="red">
        <SortButton testID="sb" shortLabel="a" fullLabel="b" onPress={() => {}} />
      </GroupThemeProvider>,
    );
    expect(getByTestId("sb").props.className).not.toMatch(/yellow|amber|c8a44e/);
  });

  it("star colour is the fixed yellow in every theme (css + ts)", () => {
    const css = require("fs").readFileSync("src/global.css", "utf8") as string;
    for (const theme of ["gold", "red", "blue", "green", "purple", "orange"]) {
      const block = css.match(new RegExp(`\\.theme-${theme}\\s*\\{[^}]*\\}`))?.[0] ?? "";
      expect(block).toMatch(/--color-star:\s*#ffd700/i);
      expect(resolveGroupTheme(theme).colors.starColor).toBe("#FFD700");
    }
  });

  it("global.css defines every accent variable for every theme", () => {
    const css = require("fs").readFileSync("src/global.css", "utf8") as string;
    for (const theme of ["gold", "red", "blue", "green", "purple", "orange"]) {
      const block = css.match(new RegExp(`\\.theme-${theme}\\s*\\{[^}]*\\}`))?.[0] ?? "";
      for (const v of ["accent", "accent-a15", "accent-a30", "accent-a40", "accent-a45", "accent-a55", "accent-light", "accent-gradient-start", "accent-gradient-end", "star"]) {
        expect(block).toContain(`--color-${v}:`);
      }
    }
  });
});
