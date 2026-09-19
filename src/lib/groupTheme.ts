/**
 * Group-theme mapping for WatchCrew's group-dependent accent colors.
 *
 * Each Watch-Group picks one of 6 named themes ("Alle drei" / Gold is the
 * default). The theme swaps `accent` / `accentLight` / `gradientStart` /
 * `gradientEnd` / `starColor` as a set. This module is the single source of
 * truth for that mapping, both for the Tailwind/NativeWind `.theme-*`
 * class names (see tailwind.config.js + src/global.css) and for raw hex
 * values needed by native components that don't take a `className`
 * (e.g. StatusBar, a future chart lib).
 *
 * Color derivation for the 5 non-Gold themes:
 * Only `accent` is specified exactly (docs/planning-report.html). The other
 * three colors are derived algorithmically:
 *   - accentLight   = accent mixed 40% toward white, per RGB channel
 *   - gradientStart = accent with HSL lightness +8 points
 *   - gradientEnd   = accent with HSL lightness -8 points
 *   - starColor     = accent (no distinct star color was specified for the
 *                     non-Gold themes, so it falls back to the theme's own
 *                     accent rather than inventing an unrelated hue)
 * The Gold theme uses the exact spec values verbatim instead (its
 * accentLight/gradient/star values are NOT derivable from the above
 * formula — they were hand-picked in the source design).
 */

export type GroupThemeName = "gold" | "red" | "blue" | "green" | "purple" | "orange";

export interface GroupThemeColors {
  accent: string;
  accentLight: string;
  gradientStart: string;
  gradientEnd: string;
  starColor: string;
}

export interface ResolvedGroupTheme {
  name: GroupThemeName;
  /** NativeWind/Tailwind class name to apply to the theme root, e.g. via GroupThemeProvider. */
  className: string;
  colors: GroupThemeColors;
}

export const DEFAULT_GROUP_THEME: GroupThemeName = "gold";

const KNOWN_THEME_NAMES: readonly GroupThemeName[] = [
  "gold",
  "red",
  "blue",
  "green",
  "purple",
  "orange",
];

export function isGroupThemeName(value: unknown): value is GroupThemeName {
  return typeof value === "string" && (KNOWN_THEME_NAMES as readonly string[]).includes(value);
}

// --- color math (pure helpers, exported for direct unit testing/reuse) ---

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Mixes a hex color toward white by `ratio` (0..1) per RGB channel. */
export function mixWithWhite(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio]);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l * 100];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  h /= 6;

  return [h * 360, s * 100, l * 100];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360;
  const sn = s / 100;
  const ln = l / 100;

  if (sn === 0) {
    const v = ln * 255;
    return [v, v, v];
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const r = hueToRgb(p, q, hn + 1 / 3);
  const g = hueToRgb(p, q, hn);
  const b = hueToRgb(p, q, hn - 1 / 3);

  return [r * 255, g * 255, b * 255];
}

/** Adjusts a hex color's HSL lightness by `deltaPoints` (on a 0-100 scale), clamped. */
export function adjustLightness(hex: string, deltaPoints: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.max(0, Math.min(100, l + deltaPoints));
  return rgbToHex(hslToRgb(h, s, newL));
}

function deriveNonGoldColors(accent: string): GroupThemeColors {
  return {
    accent,
    accentLight: mixWithWhite(accent, 0.4),
    gradientStart: adjustLightness(accent, 8),
    gradientEnd: adjustLightness(accent, -8),
    starColor: accent,
  };
}

// --- theme table ---

const GOLD_COLORS: GroupThemeColors = {
  accent: "#c8a44e",
  accentLight: "#e8d5a3",
  gradientStart: "#d4aa4f",
  gradientEnd: "#b8903e",
  starColor: "#FFD700",
};

const NON_GOLD_BASE_ACCENTS: Record<Exclude<GroupThemeName, "gold">, string> = {
  red: "#c75050",
  blue: "#4e8ac8",
  green: "#50a870",
  purple: "#9050c7",
  orange: "#c8784e",
};

const THEME_COLORS: Record<GroupThemeName, GroupThemeColors> = {
  gold: GOLD_COLORS,
  red: deriveNonGoldColors(NON_GOLD_BASE_ACCENTS.red),
  blue: deriveNonGoldColors(NON_GOLD_BASE_ACCENTS.blue),
  green: deriveNonGoldColors(NON_GOLD_BASE_ACCENTS.green),
  purple: deriveNonGoldColors(NON_GOLD_BASE_ACCENTS.purple),
  orange: deriveNonGoldColors(NON_GOLD_BASE_ACCENTS.orange),
};

const THEME_CLASS_NAMES: Record<GroupThemeName, string> = {
  gold: "theme-gold",
  red: "theme-red",
  blue: "theme-blue",
  green: "theme-green",
  purple: "theme-purple",
  orange: "theme-orange",
};

/**
 * Resolves any input (ideally a Watch-Group's stored `themeName`) to a known
 * theme, its NativeWind class name, and its raw color values. Unknown or
 * invalid input falls back to `DEFAULT_GROUP_THEME` (Gold) rather than
 * throwing, since a group's theme should never be able to crash rendering.
 */
export function resolveGroupTheme(themeName: unknown): ResolvedGroupTheme {
  const name = isGroupThemeName(themeName) ? themeName : DEFAULT_GROUP_THEME;
  return {
    name,
    className: THEME_CLASS_NAMES[name],
    colors: THEME_COLORS[name],
  };
}
