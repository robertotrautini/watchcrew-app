import {
  DEFAULT_GROUP_THEME,
  resolveGroupTheme,
  type GroupThemeName,
} from "../../src/lib/groupTheme";

// Gold ("Alle drei") values are given verbatim in docs/planning-report.html —
// asserted as exact literals, not re-derived.
const GOLD = {
  accent: "#c8a44e",
  accentLight: "#e8d5a3",
  gradientStart: "#d4aa4f",
  gradientEnd: "#b8903e",
  starColor: "#FFD700",
};

// The 5 non-Gold themes only have an exact `accent` hex from the source doc.
// accentLight/gradientStart/gradientEnd below are pre-computed independently
// (Python script, not the implementation under test) using the documented
// derivation formula:
//   accentLight    = accent mixed 40% toward white per RGB channel
//   gradientStart  = accent with HSL lightness +8 points
//   gradientEnd    = accent with HSL lightness -8 points
//   starColor      = accent (no distinct star color specified for non-Gold themes)
const DERIVED_NON_GOLD: Record<
  Exclude<GroupThemeName, "gold">,
  { accent: string; accentLight: string; gradientStart: string; gradientEnd: string }
> = {
  red: {
    accent: "#c75050",
    accentLight: "#dd9696",
    gradientStart: "#d16f6f",
    gradientEnd: "#b43a3a",
  },
  blue: {
    accent: "#4e8ac8",
    accentLight: "#95b9de",
    gradientStart: "#6d9fd2",
    gradientEnd: "#3876b5",
  },
  green: {
    accent: "#50a870",
    accentLight: "#96cba9",
    gradientStart: "#69b886",
    gradientEnd: "#438c5e",
  },
  purple: {
    accent: "#9050c7",
    accentLight: "#bc96dd",
    gradientStart: "#a46fd1",
    gradientEnd: "#7c3ab4",
  },
  orange: {
    accent: "#c8784e",
    accentLight: "#deae95",
    gradientStart: "#d2906d",
    gradientEnd: "#b56338",
  },
};

const EXPECTED_CLASS_NAMES: Record<GroupThemeName, string> = {
  gold: "theme-gold",
  red: "theme-red",
  blue: "theme-blue",
  green: "theme-green",
  purple: "theme-purple",
  orange: "theme-orange",
};

describe("resolveGroupTheme", () => {
  it("defaults to gold", () => {
    expect(DEFAULT_GROUP_THEME).toBe("gold");
  });

  it("maps the Gold/'Alle drei' theme to its exact spec colors and class name", () => {
    const resolved = resolveGroupTheme("gold");

    expect(resolved.name).toBe("gold");
    expect(resolved.className).toBe(EXPECTED_CLASS_NAMES.gold);
    expect(resolved.colors).toEqual(GOLD);
  });

  it.each(Object.keys(DERIVED_NON_GOLD) as Array<Exclude<GroupThemeName, "gold">>)(
    "maps the %s theme to its exact accent and correctly derived light/gradient colors",
    (themeName) => {
      const expected = DERIVED_NON_GOLD[themeName];
      const resolved = resolveGroupTheme(themeName);

      expect(resolved.name).toBe(themeName);
      expect(resolved.className).toBe(EXPECTED_CLASS_NAMES[themeName]);
      expect(resolved.colors.accent).toBe(expected.accent);
      expect(resolved.colors.accentLight).toBe(expected.accentLight);
      expect(resolved.colors.gradientStart).toBe(expected.gradientStart);
      expect(resolved.colors.gradientEnd).toBe(expected.gradientEnd);
      // Stars are always yellow, independent of the theme accent.
      expect(resolved.colors.starColor).toBe("#FFD700");
    },
  );

  it.each(["gold", "red", "blue", "green", "purple", "orange"] as GroupThemeName[])(
    "gives the %s theme a distinct, well-formed hex color for every color key",
    (themeName) => {
      const { colors } = resolveGroupTheme(themeName);

      for (const value of Object.values(colors)) {
        expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    },
  );

  it("falls back to the Gold/default theme for an unknown theme name instead of crashing", () => {
    const resolved = resolveGroupTheme("not-a-real-theme");

    expect(resolved.name).toBe(DEFAULT_GROUP_THEME);
    expect(resolved.className).toBe(EXPECTED_CLASS_NAMES.gold);
    expect(resolved.colors).toEqual(GOLD);
  });

  it.each([undefined, null, "", 42, {}, []])(
    "falls back to the Gold/default theme for invalid input %p instead of crashing",
    (invalidInput) => {
      expect(() => resolveGroupTheme(invalidInput)).not.toThrow();
      const resolved = resolveGroupTheme(invalidInput);
      expect(resolved.name).toBe(DEFAULT_GROUP_THEME);
    },
  );
});
