/**
 * WatchCrew design tokens as Tailwind/NativeWind theme extensions.
 * Values verbatim from docs/planning-report.html — see that doc for the
 * full design-token rationale.
 *
 * Group-theme-dependent colors (accent / accentLight / gradientStart /
 * gradientEnd / starColor) are intentionally NOT hardcoded here — they are
 * wired as CSS custom properties (see src/global.css's `.theme-*` classes)
 * so a single Watch-Group's active theme can be swapped at runtime by
 * switching a className via GroupThemeProvider, without needing a JS-level
 * re-render of consumers that just use Tailwind classes like `bg-accent`.
 * The concrete per-theme hex values (and the fallback/derivation logic) live
 * in src/lib/groupTheme.ts, which is the source of truth for anything that
 * needs a raw hex string instead of a className (e.g. native StatusBar).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Static (non-group-dependent) colors.
        "bg-primary": "#0a0a0a",
        "bg-card": "rgba(20,20,20,.62)",
        "bg-glass": "rgba(20,20,20,.7)",
        // Design-Angleichung Welle 1: no blur available (no new native
        // modules), so the translucent fills are a bit denser than the
        // legacy .5/.55 values; border = legacy --border-accent.
        "bg-glass-strong": "rgba(14,14,14,.82)",
        "bg-sheet": "rgba(12,12,12,.97)",
        "bg-tab-bar": "rgba(12,12,12,.94)",
        "glass-border": "rgba(255,255,255,.08)",
        "bg-autocomplete": "rgba(12,12,12,.97)",
        "text-primary": "#e8e8e8",
        "text-secondary": "#888888",
        "text-dim": "#444444",
        "border-subtle": "#1e1e1e",
        "star-empty": "#575757",
        danger: "#c0392b",
        // FIXED — never swapped by group theme, unlike `star-color` below.
        "like-heart": "#e05c6e",

        // Group-theme-dependent colors, sourced from CSS custom properties
        // that `.theme-gold` / `.theme-red` / `.theme-blue` / `.theme-green`
        // / `.theme-purple` / `.theme-orange` (src/global.css) redefine.
        // Falls back to the Gold/"Alle drei" values when no theme class is
        // present, matching groupTheme.ts's DEFAULT_GROUP_THEME.
        accent: "var(--color-accent, #c8a44e)",
        "accent-light": "var(--color-accent-light, #e8d5a3)",
        "accent-gradient-start": "var(--color-accent-gradient-start, #d4aa4f)",
        "accent-gradient-end": "var(--color-accent-gradient-end, #b8903e)",
        "star-color": "var(--color-star, #FFD700)",
      },
      fontFamily: {
        // Body text uses the system font stack — no entry needed here,
        // NativeWind/RN already default to the platform system font.
        // Headings/brand use Playfair Display (see
        // @expo-google-fonts/playfair-display loading in src/app/_layout.tsx).
        display: ["PlayfairDisplay_400Regular", "serif"],
        "display-bold": ["PlayfairDisplay_700Bold", "serif"],
        "display-italic": ["PlayfairDisplay_400Regular_Italic", "serif"],
        "display-bold-italic": ["PlayfairDisplay_700Bold_Italic", "serif"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        full: "50%",
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,.3)",
      },
      spacing: {
        // Minimum recommended touch target sizes (44-48px, per Apple HIG /
        // Material Design guidance referenced in the design tokens).
        "touch-min": "44px",
        "touch-comfortable": "48px",
      },
    },
  },
  plugins: [],
};
