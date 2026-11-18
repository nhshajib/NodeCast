import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { palette } from './designTokens';
import type { TextStyle, ViewStyle, ImageStyle } from 'react-native';
export type ThemeChoice = 'light' | 'dark' | 'system';
export const androidDesign = Platform.OS === 'android' || process.env.EXPO_PUBLIC_DESIGN_PLATFORM === 'android';
export const tvDesign = process.env.EXPO_PUBLIC_APP_VARIANT === 'tv' || Platform.isTV;
export const defaultTheme: ThemeChoice = androidDesign || tvDesign ? 'dark' : 'light';
const light: Record<'bg' | 'panel' | 'surface' | 'text' | 'secondary' | 'accent' | 'link' | 'mint' | 'pale' | 'line' | 'danger' | 'amber' | 'ink' | 'onAccent' | 'primary' | 'primaryText' | 'selected' | 'selectedText' | 'live' | 'featured' | 'dangerSurface', string> = { bg: palette.neutral.light, panel: palette.neutral.white, surface: palette.neutral.lightSurface, text: palette.neutral.ink, secondary: palette.neutral.muted, accent: palette.primary.action, link: palette.primary.link, mint: palette.primary.subtle, pale: palette.neutral.lightSurface, line: palette.neutral.lightBorder, danger: palette.semantic.red, amber: palette.neutral.muted, ink: palette.primary.ink, onAccent: palette.primary.ink, primary: palette.primary.action, primaryText: palette.primary.ink, selected: palette.primary.subtle, selectedText: palette.primary.ink, live: palette.semantic.red, featured: palette.primary.ink, dangerSurface: palette.semantic.lightSurface };
const dark = { ...light, bg: tvDesign ? palette.neutral.night : palette.neutral.dark, panel: palette.neutral.darkPanel, surface: palette.neutral.darkSurface, text: palette.neutral.onDark, secondary: palette.neutral.darkMuted, link: palette.primary.onDark, mint: palette.primary.darkSubtle, pale: palette.neutral.darkSurface, line: palette.neutral.darkBorder, danger: palette.semantic.onDark, amber: palette.neutral.darkMuted, onAccent: palette.primary.onDark, selected: palette.primary.darkSubtle, selectedText: palette.primary.onDark, dangerSurface: palette.semantic.darkSurface };
export const colors: typeof light = { ...(defaultTheme === 'dark' ? dark : light) };
let darkMode = defaultTheme === 'dark';
export function isDarkTheme() { return darkMode; }
const Theme = createContext<{ choice: ThemeChoice; setChoice: (value: ThemeChoice) => void }>({ choice: defaultTheme, setChoice: () => {} });
export const useThemeChoice = () => useContext(Theme);
const refreshers: Array<() => void> = [];
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(defaultTheme);
  const [system, setSystem] = useState(Appearance.getColorScheme());
  useEffect(() => { const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme)); return () => sub.remove(); }, []);
  darkMode = choice === 'dark' || choice === 'system' && system === 'dark';
  Object.assign(colors, darkMode ? dark : light);
  // Plain objects, refreshed before children render. A Proxy stylesheet is not enumerable
  // and has crashed the iOS style bridge when Fabric walks style props.
  for (const refresh of refreshers) refresh();
  return <Theme.Provider value={{ choice, setChoice }}>{children}</Theme.Provider>;
}
// Recompute sheets when the palette changes; existing components keep their style keys.
export function themedStyles<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(factory: () => T): T {
  const styles = {} as T;
  const refresh = () => {
    const next = factory();
    for (const key of Object.keys(styles)) if (!(key in next)) delete styles[key];
    Object.assign(styles, next);
  };
  refresh();
  refreshers.push(refresh);
  return styles;
}
