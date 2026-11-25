import React, { useCallback, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { fontAssets } from '../Typography';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, colors, isDarkTheme } from '../theme';
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
  const fontsReady=loaded||!!error;
  return <ThemeProvider><PlayerToolsProvider><FamilyProvider><NavigationMotionProvider><SafeAreaProvider>
    <StatusBar barStyle={isDarkTheme() ? 'light-content' : 'dark-content'} />
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} aria-hidden={!launchComplete} accessibilityElementsHidden={!launchComplete} importantForAccessibility={launchComplete ? 'auto' : 'no-hide-descendants'} pointerEvents={launchComplete ? 'auto' : 'none'}>
        {fontsReady?<NodeCastProvider onReady={onReady} launchComplete={launchComplete}>{children}</NodeCastProvider>:<View style={{flex:1,backgroundColor:colors.videoBackdrop}}/>}
      </View>
      {!launchComplete && <StartupSplash ready={fontsReady&&dataReady} onFinish={onFinish} />}
    </View>
  </SafeAreaProvider></NavigationMotionProvider></FamilyProvider></PlayerToolsProvider></ThemeProvider>;
}
