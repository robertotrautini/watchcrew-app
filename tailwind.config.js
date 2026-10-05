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
        // Glass tokens (JS-only glassmorphism, no blur module yet): LIGHTENED
        // translucent fills + a clearly visible hairline border so surfaces
        // stand off from the dark background photo. Single source of truth;
        // a later expo-blur BlurView only needs to lower these alphas.
        "bg-card": "rgba(10,10,12,.72)",
        "bg-glass": "rgba(10,10,12,.78)",
        "bg-glass-strong": "rgba(10,10,12,.82)",
        // Sheet / bottom bars / tab bar / toast: translucent panel, dark tint
        // keeps text legible, photo still shows through.
        "bg-sheet": "rgba(12,12,14,.96)",
        "bg-tab-bar": "rgba(12,12,14,.96)",
        // Blurred variants (used on top of a real BlurView, see GlassBlur.tsx);
        // the opaque tokens above stay as the no-blur fallback.
        "bg-card-blur": "rgba(10,10,12,.62)",
        "bg-glass-strong-blur": "rgba(10,10,12,.72)",
        "bg-sheet-blur": "rgba(10,10,12,.76)",
        "bg-tab-bar-blur": "rgba(10,10,12,.72)",
        // Flat Material border (docs/style-guide.md): one uniform, subtle
        // 1px hairline for every surface (cards, buttons, inputs, sheets).
        "glass-border": "rgba(255,255,255,.10)",
        "danger-text": "#e5675a",
        "bg-autocomplete": "rgba(12,12,12,.97)",
        "text-primary": "#e8e8e8",
        "text-secondary": "#a8a8a8",
        "text-dim": "#444444",
        "border-subtle": "#1e1e1e",
        "star-empty": "#575757",
        danger: "#c0392b",
        // Success (green) counterpart of danger: fill/border vs text+icon (style-guide "Toasts").
        success: "#2e9e5b",
        "success-text": "#5fcf8a",
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
        // Translucent accent tokens (opacity modifiers don't work on var() colours).
        "accent-a15": "var(--color-accent-a15, rgba(200,164,78,.15))",
        "accent-a30": "var(--color-accent-a30, rgba(200,164,78,.3))",
        "accent-a40": "var(--color-accent-a40, rgba(200,164,78,.4))",
        "accent-a45": "var(--color-accent-a45, rgba(200,164,78,.45))",
        "accent-a55": "var(--color-accent-a55, rgba(200,164,78,.55))",
        // Near-opaque dark chip base (theme-neutral) so chips read over the photo.
        "chip-base": "rgba(14,12,8,.88)",
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
