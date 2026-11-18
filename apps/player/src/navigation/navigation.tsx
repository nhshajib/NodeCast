import BrandMark from '../BrandMark';
import { Text } from '../Typography';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, Tabs, useFocusEffect, useIsFocused, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { androidDesign, isDarkTheme, useThemeChoice } from '../theme';
import { FamilyChallengeHost } from '../FamilyControls';
import { ScreenFocusProvider, useReducedMotion } from '../NavigationMotion';
import WelcomeScreen from '../WelcomeScreen';
import Pressable from '../FocusPressable';
import { Button, Empty, Icon, IconButton, Notice, colors, u } from '../ui';
import type { IconName } from '../ui';
import LibraryScreen from './LibraryScreen';
import { isLibraryView, useNodeCast } from './NodeCastProvider';
import { setFocusedTab, tabPressed, useTabScrollToTop } from './scrollToTop';
import { isSheet, sheetDetents } from './types';
import type { FocusView, LibraryView, Page } from './types';
import { s } from './shared';

/** Shared native header styling; colours follow the selected theme. */
export function useHeaderOptions() {
  useThemeChoice();
  const reduced = useReducedMotion();
  return {
    headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.link,
    headerTitleStyle: { color: colors.text, fontFamily: 'Inter-700', fontWeight: '700' as const },
    headerBackButtonDisplayMode: 'minimal' as const, contentStyle: { backgroundColor: colors.bg },
    animation: reduced ? 'none' as const : 'default' as const,
  };
}

// ── Root ─────────────────────────────────────────────────────────────────────
export function RootNavigator() {
  const c = useNodeCast();
  const options = useHeaderOptions();
  const player = c.player;
  const blocked = !!(player.element && !player.minimized);
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <StatusBar hidden={player.fullscreen && !!player.element} barStyle={blocked || isDarkTheme() ? 'light-content' : 'dark-content'} />
    <View style={{ flex: 1 }} pointerEvents={blocked ? 'none' : 'auto'} aria-hidden={blocked} accessibilityElementsHidden={blocked} importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}>
      <Stack screenOptions={options}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="page/[type]" options={{ title: '' }} />
        <Stack.Screen name="sheet/[type]" options={({ route }) => {
          const type = (route.params as { type?: Page['type'] } | undefined)?.type;
          return { presentation: 'formSheet', headerShown: Platform.OS === 'ios', sheetGrabberVisible: true, sheetCornerRadius: 20, sheetAllowedDetents: (type && sheetDetents[type]) || [0.6, 1] };
        }} />
      </Stack>
    </View>
    {player.element && <SafeAreaView edges={player.fullscreen || player.minimized ? [] : ['top', 'bottom', 'left', 'right']} accessibilityViewIsModal={!player.minimized} style={player.minimized
      ? { position: 'absolute', right: 16, bottom: 110, width: 220, height: 124, zIndex: 100, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' }
      : { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#0D4029' }}>
      {player.element}
      {player.minimized && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}><Pressable noFeedback accessibilityRole="button" accessibilityLabel={`Return to ${player.session?.item.name}`} onPress={player.restore} style={{ flex: 1 }} /><Pressable accessibilityRole="button" accessibilityLabel="Close mini player" onPress={player.close} style={{ width: 44, height: 44, backgroundColor: '#0D4029CC', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" color="#fff" /></Pressable></View>}
    </SafeAreaView>}
    {c.welcome && !c.booting && c.family.ready && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50 }}><WelcomeScreen onStart={c.onboardStart} onDemo={c.onboardDemo} /></View>}
    {(c.booting || !c.family.ready) && <SafeAreaView style={[u.root, u.center, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 60 }]}>
      {c.booting ? <><ActivityIndicator color={colors.link} /><Text style={u.small}>Making yourself at home…</Text></> : <><Text style={u.body}>{c.family.loadFailed ? 'Could not read family protection.' : 'Loading local protection…'}</Text>{c.family.loadFailed && <Button title="Open recovery options" onPress={c.family.request} />}<Text style={u.small}>If this stays here, restart the app before changing profiles.</Text></>}
    </SafeAreaView>}
  </View>;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
type TabSpec = { name: string; title: string; sf: { default: string; selected: string }; md: string; icon: IconName; selected: IconName };
// iPhone: Home · Guide · Movies · Series · Search. Android: Home · Live · Guide · Library · Settings.
const iosTabs: TabSpec[] = [
  { name: 'home', title: 'Home', sf: { default: 'house', selected: 'house.fill' }, md: 'home', icon: 'home-outline', selected: 'home' },
  { name: 'guide', title: 'Guide', sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }, md: 'grid_view', icon: 'grid-outline', selected: 'grid' },
  { name: 'movies', title: 'Movies', sf: { default: 'film', selected: 'film.fill' }, md: 'movie', icon: 'film-outline', selected: 'film' },
  { name: 'series', title: 'Series', sf: { default: 'square.stack', selected: 'square.stack.fill' }, md: 'video_library', icon: 'albums-outline', selected: 'albums' },
  { name: 'search', title: 'Search', sf: { default: 'magnifyingglass', selected: 'magnifyingglass' }, md: 'search', icon: 'search-outline', selected: 'search' },
];
const androidTabs: TabSpec[] = [
  { name: 'home', title: 'Home', sf: { default: 'house', selected: 'house.fill' }, md: 'home', icon: 'home-outline', selected: 'home' },
  { name: 'live', title: 'Live', sf: { default: 'tv', selected: 'tv.fill' }, md: 'live_tv', icon: 'tv-outline', selected: 'tv' },
  { name: 'guide', title: 'Guide', sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }, md: 'grid_view', icon: 'grid-outline', selected: 'grid' },
  { name: 'library', title: 'Library', sf: { default: 'books.vertical', selected: 'books.vertical.fill' }, md: 'video_library', icon: 'library-outline', selected: 'library' },
  { name: 'settings', title: 'Settings', sf: { default: 'gearshape', selected: 'gearshape.fill' }, md: 'settings', icon: 'settings-outline', selected: 'settings' },
];
const tabIcons = { home: require('../../assets/icons/house.png'), live: require('../../assets/icons/tv.png'), guide: require('../../assets/icons/grid-2x2.png'), movies: require('../../assets/icons/film.png'), series: require('../../assets/icons/layers.png'), search: require('../../assets/icons/search.png'), library: require('../../assets/icons/library.png'), settings: require('../../assets/icons/settings.png') };
export const tabs = androidDesign ? androidTabs : iosTabs;
const allTabNames = ['home', 'live', 'guide', 'library', 'settings', 'movies', 'series', 'search'];

export function TabsNavigator() {
  useThemeChoice();
  const visible = new Set(tabs.map(tab => tab.name));
  // Only this platform's tabs are visible; the other platform's routes stay hidden and unreachable.
  const ordered = [...tabs.map(tab => tab.name), ...allTabNames.filter(name => !visible.has(name))];
  // The browser preview has no native tab bar; it uses Expo Router's bottom tabs with the same routes.
  if (Platform.OS === 'web') return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.link, tabBarInactiveTintColor: colors.secondary, tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line }, tabBarLabelStyle: { fontFamily: 'Inter-600', fontSize: 11 } }}>
    {ordered.map(name => {
      const spec = tabs.find(tab => tab.name === name);
      return <Tabs.Screen key={name} name={name} listeners={{ tabPress: () => tabPressed(name) }} options={spec ? { title: spec.title, tabBarButtonTestID: `navigation-tab-${name}`, tabBarIcon: ({ focused, color }) => <Icon name={focused ? spec.selected : spec.icon} color={String(color)} size={22} /> } : { href: null }} />;
    })}
  </Tabs>;
  // Android must keep content and its touch area above the native bottom bar.
  return <NativeTabs {...(Platform.OS === 'android' ? { labelVisibilityMode: 'labeled' as const } : {})} backBehavior="initialRoute" tintColor={colors.link} iconColor={{ default: colors.secondary, selected: colors.link }} indicatorColor={colors.selected} backgroundColor={colors.bg}
    labelStyle={{ default: { color: colors.secondary }, selected: { color: colors.link } }}>
    {ordered.map(name => {
      const spec = tabs.find(tab => tab.name === name);
      return <NativeTabs.Trigger key={name} name={name} hidden={!spec} testID={`navigation-tab-${name}`} disableAutomaticContentInsets={Platform.OS !== 'android'} listeners={{ tabPress: () => tabPressed(name) }}>
        {spec && <NativeTabs.Trigger.Label>{spec.title}</NativeTabs.Trigger.Label>}
        {spec && <NativeTabs.Trigger.Icon src={tabIcons[spec.name as keyof typeof tabIcons]} renderingMode="template" />}
      </NativeTabs.Trigger>;
    })}
  </NativeTabs>;
}

/** Each tab is its own native stack, so it has a system header. Pages push on the root stack. */
export function TabStack({ tab }: { tab: string }) {
  const c = useNodeCast();
  const options = useHeaderOptions();
  const spec = tabs.find(item => item.name === tab);
  const headerRight = () => <View style={{ flexDirection: 'row', gap: 8, paddingRight: Platform.OS === 'web' ? 12 : 0 }}>
    {androidDesign && <IconButton name="search-outline" label="Search" onPress={c.openSearch} />}
    {androidDesign ? <IconButton name="person-circle-outline" label="Your playlists" onPress={c.openProfiles} />
      : <><IconButton name="heart-outline" label="Favorites" onPress={c.openFavorites} /><IconButton name="settings-outline" label="Settings" onPress={c.openSettings} /></>}
    <IconButton name="add" label="Add playlist" onPress={() => c.addProfile()} />
  </View>;
  const brand = () => <Pressable accessibilityRole="button" accessibilityLabel="GlowTV home" onPress={c.goHome} style={[u.row, { minHeight: 44, gap: 8, paddingLeft: Platform.OS === 'web' ? 4 : 0 }]}><BrandMark size={33} /><Text style={{ fontSize: 20, color: colors.text, letterSpacing: -1, fontWeight: '800' }}>GlowTV</Text></Pressable>;
  return <Stack screenOptions={options}>
    <Stack.Screen name="index" options={{ title: spec?.title || '', headerTitle: tab === 'home' ? brand : undefined, headerTitleAlign: 'left', headerRight }} />
  </Stack>;
}

function MessageBanner() {
  const c = useNodeCast();
  if (!c.message) return null;
  return <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}><Notice danger>{c.message}</Notice><Pressable onPress={() => c.setMessage('')} accessibilityRole="button" style={[s.textAction, { alignSelf: 'flex-end' }]}><Text style={u.link}>Dismiss</Text></Pressable></View>;
}

/** Reports focus so the library loads what is on screen, and so off-screen work can pause. */
function useReportFocus(view: FocusView | null, tab?: string) {
  const c = useNodeCast();
  const setFocused = c.setFocused;
  useFocusEffect(useCallback(() => { if (view) setFocused(view); if (tab) setFocusedTab(tab); }, [view, tab, setFocused]));
}

const tabViews: Record<string, FocusView> = { home: 'home', live: 'watch', guide: 'guide', library: 'library', settings: 'settings', movies: 'movies', series: 'series', search: 'search' };
export function TabScreen({ tab }: { tab: string }) {
  useThemeChoice();
  const c = useNodeCast();
  const view = tabViews[tab];
  const focused = useIsFocused();
  const scroll = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  useReportFocus(view, tab);
  useTabScrollToTop(isLibraryView(view) ? undefined : tab, scroll);
  const guideList = useRef<{ scrollToOffset: (options: { offset: number; animated?: boolean }) => void } | null>(null);
  useTabScrollToTop(tab === 'guide' ? `${tab}` : undefined, guideList);
  const content = view === 'home' ? c.renderHome(scroll) : view === 'settings' ? c.renderSettings(scroll) : view === 'guide' ? <View style={{ flex: 1 }}>{c.renderGuide(guideList)}</View>
    : isLibraryView(view) ? <LibraryScreen view={view} tab={tab} /> : null;
  return <ScreenFocusProvider value={focused}><View style={{ flex: 1, backgroundColor: colors.bg }}><MessageBanner />{content}</View></ScreenFocusProvider>;
}

// ── Pages and sheets ─────────────────────────────────────────────────────────
const busyTypes: Page['type'][] = ['provider', 'delete', 'profiles', 'backup'];
function usePage() {
  const c = useNodeCast();
  const { key } = useLocalSearchParams<{ key?: string }>();
  const entry = key ? c.pages.find(item => item.key === key) || c.getPage(key) : null;
  const retain = c.retain, release = c.release;
  useEffect(() => { if (!key) return; retain(key); return () => release(key); }, [key, retain, release]);
  const busy = !!entry && c.connecting && busyTypes.includes(entry.page.type);
  // While a profile is connecting or being removed, Back waits for the operation to finish.
  usePreventRemove(busy, () => {});
  return { c, entry, busy };
}
function Missing() {
  const c = useNodeCast();
  return <Empty icon="albums-outline" title="This page has closed" message="Return to GlowTV to continue."><Button title="Back to Home" onPress={c.goHome} /></Empty>;
}

export function PageScreen() {
  useThemeChoice();
  const { c, entry, busy } = usePage();
  const page = entry?.page;
  const view: LibraryView | null = page?.type === 'browse' ? page.view : null;
  useReportFocus(view ?? (page?.type === 'settings' ? 'settings' : null));
  const focused = useIsFocused();
  return <ScreenFocusProvider value={focused}><View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Stack.Screen options={{ title: page ? c.pageTitle(page) : '', gestureEnabled: !busy, headerBackVisible: !busy }} />
    {!entry ? <Missing /> : page?.type === 'browse' ? <LibraryScreen view={page.view} /> : c.renderPage(entry, view => <LibraryScreen view={view} />)}
  </View></ScreenFocusProvider>;
}

export function SheetScreen() {
  useThemeChoice();
  const { c, entry, busy } = usePage();
  const page = entry?.page;
  const close = <Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} onPress={c.back} style={s.textAction}><Text style={[u.link, { fontSize: 15 }]}>{page?.type === 'delete' ? 'Cancel' : 'Done'}</Text></Pressable>;
  const content = !entry ? <Missing /> : c.renderPage(entry, view => <LibraryScreen view={view} />);
  return <FamilyChallengeHost active>
    <Stack.Screen options={{ gestureEnabled: !busy, ...(Platform.OS === 'ios' ? {
      title: page ? c.pageTitle(page) : '', headerBackVisible: false, headerRight: () => close,
    } : {}) }} />
    {/* UIKit owns the sheet header and its hit testing. Keep scrolling content
        separate so the native sheet never coerces it over the Done control. */}
    {Platform.OS === 'ios' ? content : <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[u.between, { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }]}>
        <Text accessibilityRole="header" numberOfLines={2} style={[u.h2, { flex: 1 }]}>{page ? c.pageTitle(page) : ''}</Text>
        {close}
      </View>
      {content}
    </View>}
  </FamilyChallengeHost>;
}

export { isSheet };
