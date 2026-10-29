import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import type { TextStyle, ViewStyle, ImageStyle } from 'react-native';
export type ThemeChoice = 'light' | 'dark' | 'system';
const light = { bg: '#F5F5F8', panel: '#ffffff', text: '#090124', secondary: '#676271', accent: '#6655AC', mint: '#B9B4F2', pale: '#EEEDFB', line: '#EAE9EE', danger: '#ae3743', amber: '#916316', ink: '#090124', onAccent: '#090124', primary: '#090124', primaryText: '#ffffff' };
const dark = { ...light, bg: '#100D1B', panel: '#211A30', text: '#F8F5FC', secondary: '#C3BDCF', accent: '#C3B5FF', pale: '#302742', line: '#493F59', danger: '#FFADB8', amber: '#F3D49A', primary: '#B9B4F2', primaryText: '#090124' };
export const colors: typeof light = { ...light };
let darkMode = false;
export function isDarkTheme() { return darkMode; }
const Theme = createContext<{ choice: ThemeChoice; setChoice: (value: ThemeChoice) => void }>({ choice: 'light', setChoice: () => {} });
export const useThemeChoice = () => useContext(Theme);
const refreshers: Array<() => void> = [];
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>('light');
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
