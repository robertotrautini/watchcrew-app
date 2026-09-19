import { View, type ViewProps } from "react-native";

import { resolveGroupTheme } from "@/lib/groupTheme";

export interface GroupThemeProviderProps extends ViewProps {
  /**
   * The active Watch-Group's stored theme identifier. Anything other than
   * one of the 6 known theme names (see src/lib/groupTheme.ts) falls back
   * to the Gold/"Alle drei" default rather than crashing.
   */
  themeName: unknown;
}

/**
 * Applies the Watch-Group's active theme as a `.theme-<name>` class (see
 * src/global.css) to a root View, so any NativeWind `className` using the
 * `accent` / `accent-light` / `accent-gradient-*` / `star-color` tokens
 * resolves to that group's colors for everything rendered inside.
 *
 * Only `className` switching is used here — no inline styles, per project
 * convention.
 */
export function GroupThemeProvider({ themeName, className, ...rest }: GroupThemeProviderProps) {
  const { className: themeClassName } = resolveGroupTheme(themeName);
  const mergedClassName = className ? `${themeClassName} ${className}` : themeClassName;

  return <View className={mergedClassName} {...rest} />;
}
