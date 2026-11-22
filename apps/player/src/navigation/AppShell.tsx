import React, { useCallback, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { fontAssets } from '../Typography';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, isDarkTheme } from '../theme';
import { FamilyProvider } from '../FamilyControls';
import { PlayerToolsProvider } from '../PlayerToolsContext';
import { NavigationMotionProvider } from '../NavigationMotion';
import StartupSplash from '../StartupSplash';
import { NodeCastProvider } from './NodeCastProvider';
void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Fonts, providers and the launch splash around the phone navigator (iPhone, Android phone, web). */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [loaded, error] = useFonts(fontAssets);
  const [dataReady, setDataReady] = useState(false);
  const [launchComplete, setLaunchComplete] = useState(false);
  const onReady = useCallback(() => setDataReady(true), []);
  const onFinish = useCallback(() => setLaunchComplete(true), []);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: '#0D4029' }} />;
  return <ThemeProvider><PlayerToolsProvider><FamilyProvider><NavigationMotionProvider><SafeAreaProvider>
    <StatusBar barStyle={isDarkTheme() ? 'light-content' : 'dark-content'} />
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} aria-hidden={!launchComplete} accessibilityElementsHidden={!launchComplete} importantForAccessibility={launchComplete ? 'auto' : 'no-hide-descendants'} pointerEvents={launchComplete ? 'auto' : 'none'}>
        <NodeCastProvider onReady={onReady} launchComplete={launchComplete}>{children}</NodeCastProvider>
      </View>
      {!launchComplete && <StartupSplash ready={dataReady} onFinish={onFinish} />}
    </View>
  </SafeAreaProvider></NavigationMotionProvider></FamilyProvider></PlayerToolsProvider></ThemeProvider>;
}
