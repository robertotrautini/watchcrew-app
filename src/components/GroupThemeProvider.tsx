import { createContext, useContext } from "react";
import { View, type ViewProps } from "react-native";

import { resolveGroupTheme, type ResolvedGroupTheme } from "@/lib/groupTheme";

const GroupThemeContext = createContext<ResolvedGroupTheme>(resolveGroupTheme(undefined));

/**
 * The resolved theme of the nearest GroupThemeProvider (Gold without one).
 * For raw hex values (tab bar tint, star color) that a className cannot reach.
 */
export function useGroupTheme(): ResolvedGroupTheme {
  return useContext(GroupThemeContext);
}

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
  const theme = resolveGroupTheme(themeName);
  const themeClassName = theme.className;
  const mergedClassName = className ? `${themeClassName} ${className}` : themeClassName;

  return (
    <GroupThemeContext.Provider value={theme}>
      <View className={mergedClassName} {...rest} />
    </GroupThemeContext.Provider>
  );
}
