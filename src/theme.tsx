import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import type { TextStyle, ViewStyle, ImageStyle } from 'react-native';
export type ThemeChoice = 'light' | 'dark' | 'system';
export const androidDesign = Platform.OS === 'android' || process.env.EXPO_PUBLIC_DESIGN_PLATFORM === 'android';
export const tvDesign = process.env.EXPO_PUBLIC_APP_VARIANT === 'tv' || Platform.isTV;
export const defaultTheme: ThemeChoice = androidDesign || tvDesign ? 'dark' : 'light';
const light = { bg: '#F7F6F1', panel: '#FFFFFF', surface: '#EEEEE7', text: '#111613', secondary: '#646B67', accent: '#1EC677', link: '#0B7A47', mint: '#DDF4E7', pale: '#EEEEE7', line: '#E6E3DA', danger: '#B42320', amber: '#775315', ink: '#0D4029', onAccent: '#0D4029', primary: '#1EC677', primaryText: '#0D4029', selected: '#DDF4E7', selectedText: '#0D4029', live: '#DD3027', featured: '#0D4029' };
const dark = { ...light, bg: tvDesign ? '#0A0E0C' : '#0F1412', panel: '#1B2420', surface: '#18201C', text: '#E8EEEA', secondary: '#A3ADA7', link: '#C9F5DD', mint: '#1F4A36', pale: '#18201C', line: '#3D4B43', danger: '#FFB4AC', amber: '#F0D28E', onAccent: '#C9F5DD', selected: '#1F4A36', selectedText: '#C9F5DD' };
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
