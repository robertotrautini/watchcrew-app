/**
 * Colour overrides for the React Navigation chrome (merged over `DarkTheme.colors`).
 * `primary` is the highlight accent, so it must follow the group theme: the root
 * layout uses the Gold default, `(app)/_layout.tsx` re-provides it with the active
 * group's accent.
 */
export function navThemeColors(accent: string) {
  return {
    background: "transparent",
    card: "#0a0a0a",
    text: "#e8e8e8",
    border: "rgba(255,255,255,0.08)",
    primary: accent,
  };
}
