import {MiniPlayerLayoutProvider,MiniPlayerSafeFrame,useMeasuredMiniPlayerBottom} from './MiniPlayerLayout';
import {libraryTabView,shouldResetNavigation} from '../uiPolicy';
import {detailRoute} from '../detailRoute';
import {LibrarySkeleton} from '../Skeletons';
import { Text } from '../Typography';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StatusBar, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import {SafeAreaView as NativeScreenSafeAreaView} from 'react-native-screens/experimental';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, Tabs, useFocusEffect, useIsFocused, useLocalSearchParams, usePreventRemove, useNavigation, usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { androidDesign, isDarkTheme, useThemeChoice } from '../theme';
import { FamilyChallengeHost } from '../FamilyControls';
import { ScreenFocusProvider, useReducedMotion } from '../NavigationMotion';
import WelcomeScreen from '../WelcomeScreen';
import Pressable from '../FocusPressable';
import { NativeHeaderTitle, Button, Empty, Icon, IconButton, Notice, colors, u } from '../ui';
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
    headerTitleStyle: { color: colors.text, fontFamily: 'Sans-600', fontSize:androidDesign?20:18,fontWeight: '600' as const },
    headerBackButtonDisplayMode: 'minimal' as const, contentStyle: { backgroundColor: colors.bg },
    animation: reduced ? 'none' as const : 'default' as const,
  };
}

// ── Root ─────────────────────────────────────────────────────────────────────
export function RootNavigator(){return <MiniPlayerLayoutProvider><RootNavigatorContent/></MiniPlayerLayoutProvider>;}
function RootNavigatorContent() {
  const c = useNodeCast();
  const pathname=usePathname();
  const [handledRevision,setHandledRevision]=useState(0);
  const requestedRevision=useRef(0);
  const goHome=useRef(c.goHome);goHome.current=c.goHome;
  const resetPending=c.family.revision>handledRevision;
  // Restore reloads the provider tree, while Expo Router retains its stack.
  // Wait for the new vault/protection state, then leave the expired route once.
  // Keep it covered until Home is actually active; never redirect cold links.
  useEffect(()=>{
    const revision=c.family.revision;
    if(!shouldResetNavigation({revision,handledRevision,booting:c.booting,ready:c.family.ready}))return;
    if(pathname==='/home'||pathname==='/'){setHandledRevision(revision);return;}
    if(requestedRevision.current===revision)return;
    requestedRevision.current=revision;goHome.current();
  },[c.family.revision,c.family.ready,c.booting,handledRevision,pathname]);
  const options = useHeaderOptions();
  const player = c.player;
  const insets=useSafeAreaInsets();
  const miniLayout=useMeasuredMiniPlayerBottom();
  const blocked = !!(player.element && !player.minimized);
  const navigationBlocked=blocked||resetPending;
  return <View ref={miniLayout.root} onLayout={miniLayout.measure} style={{ flex: 1, backgroundColor: colors.bg }}>
    <StatusBar hidden={player.fullscreen && !!player.element} barStyle={blocked || isDarkTheme() ? 'light-content' : 'dark-content'} />
    <View style={{ flex: 1 }} pointerEvents={navigationBlocked ? 'none' : 'auto'} aria-hidden={navigationBlocked} accessibilityElementsHidden={navigationBlocked} importantForAccessibility={navigationBlocked ? 'no-hide-descendants' : 'auto'}>
      <Stack screenOptions={options}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="page/[type]" options={({route})=>({title:(route.params as {title?:string}|undefined)?.title||''})} />
        <Stack.Screen name="sheet/[type]" options={({ route }) => {
          const type = (route.params as { type?: Page['type'] } | undefined)?.type;
          return { presentation: 'formSheet', headerShown: true, sheetGrabberVisible: true, sheetCornerRadius: 20, sheetAllowedDetents: (type && sheetDetents[type]) || [0.6, 1] };
        }} />
      </Stack>
    </View>
    {player.element && <SafeAreaView edges={player.fullscreen || player.minimized ? [] : ['top', 'bottom', 'left', 'right']} accessibilityViewIsModal={!player.minimized} style={player.minimized
      ? { position: 'absolute', right: 16, bottom: miniLayout.bottom(insets.bottom), width: 220, height: 124, zIndex: 100, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.videoBlack }
      : { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: colors.featured }}>
      {player.element}
      {player.minimized && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}><Pressable noFeedback accessibilityRole="button" accessibilityLabel={`Return to ${player.session?.item.name}`} onPress={player.restore} style={{ flex: 1 }} /><Pressable accessibilityRole="button" accessibilityLabel="Close mini player" onPress={player.close} style={{ width: 44, height: 44, backgroundColor: colors.videoControl, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" color={colors.onVideo} /></Pressable></View>}
    </SafeAreaView>}
    <MessageBanner />
    {c.welcome && !c.booting && c.family.ready && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50 }}><WelcomeScreen onStart={c.onboardStart} onDemo={c.onboardDemo} /></View>}
    {(c.booting || !c.family.ready || resetPending) && <SafeAreaView style={[u.root, u.center, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 60 }]}>
      {c.booting || (resetPending&&c.family.ready) ? <><ActivityIndicator color={colors.link} /><Text style={u.small}>{c.booting?'Making yourself at home…':'Loading your restored library…'}</Text></> : <><Text style={u.body}>{c.family.loadFailed ? 'Could not read family protection.' : 'Loading local protection…'}</Text>{c.family.loadFailed && <Button title="Open recovery options" onPress={c.family.request} />}<Text style={u.small}>If this stays here, restart the app before changing profiles.</Text></>}
    </SafeAreaView>}
  </View>;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
type TabSpec = { name: string; title: string; sf: { default: string; selected: string }; md: string; icon: IconName; selected: IconName };
// iPhone: Home · Guide · Movies · Series · Search. Android: Home · Live · Guide · Library · Settings.
const iosTabs: TabSpec[] = [
 {name:'home',title:'Home',sf:{default:'house',selected:'house.fill'},md:'home',icon:'home-outline',selected:'home'},
 {name:'live',title:'Live',sf:{default:'tv',selected:'tv.fill'},md:'live_tv',icon:'tv-outline',selected:'tv'},
 {name:'guide',title:'Guide',sf:{default:'square.grid.2x2',selected:'square.grid.2x2.fill'},md:'grid_view',icon:'grid-outline',selected:'grid'},
 {name:'library',title:'Library',sf:{default:'books.vertical',selected:'books.vertical.fill'},md:'video_library',icon:'library-outline',selected:'library'},
 {name:'search',title:'Search',sf:{default:'magnifyingglass',selected:'magnifyingglass'},md:'search',icon:'search-outline',selected:'search'},
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
  if (Platform.OS === 'web') return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.link, tabBarInactiveTintColor: colors.secondary, tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height:72, paddingBottom:8, paddingTop:8 }, tabBarLabelStyle: { fontFamily: 'Sans-600', fontSize: 11 } }}>
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
  // One way to each place. Android has a Settings tab, so no gear; iPhone and iPad reach Settings from Home.
  const headerRight=tab==='home'?()=><View style={[u.row,{gap:0}]}><IconButton name="add" label="Add playlist" onPress={()=>c.addProfile()}/>{!androidDesign&&<IconButton name="settings-outline" label="Settings" onPress={c.openSettings}/>}</View>:undefined;
  return <Stack screenOptions={options}>
    <Stack.Screen name="index" options={{ title: tab === 'home' ? 'Watch' : spec?.title || '', headerTitleAlign: 'left', headerRight,  ...(Platform.OS==='ios'&&['live','library','search'].includes(tab)?{headerSearchBarOptions:{placeholder:'Search your library',hideWhenScrolling:false,onChangeText:(event:{nativeEvent:{text:string}})=>c.setView(libraryTabView(tab,androidDesign)!,{search:event.nativeEvent.text})}}:{}) }} />
  </Stack>;
}

function MessageBanner() {
  const c = useNodeCast();const insets=useSafeAreaInsets();
  if (!c.message) return null;
  const banner=<View pointerEvents="box-none" style={{position:'absolute',top:insets.top,left:0,right:0,zIndex:300,paddingHorizontal:16}}><View style={[u.card,{maxWidth:720,width:'100%',alignSelf:'center'}]}><Notice danger={c.message.tone==='error'}>{c.message.text}</Notice><Pressable onPress={() => c.setMessage(null)} accessibilityRole="button" accessibilityLabel="Dismiss message" style={[s.textAction,{alignSelf:'flex-end'}]}><Text style={u.link}>Dismiss</Text></Pressable></View></View>;
  return Platform.OS==='ios'?<FullWindowOverlay>{banner}</FullWindowOverlay>:banner;
}

/** Reports focus so the library loads what is on screen, and so off-screen work can pause. */
function useReportFocus(view: FocusView | null, tab?: string) {
  const c = useNodeCast();
  const setFocused = c.setFocused;
  useFocusEffect(useCallback(() => { if (view) setFocused(view); if (tab) setFocusedTab(tab); }, [view, tab, setFocused]));
}

const tabViews: Record<string, FocusView> = { home: 'home', live: libraryTabView('live',androidDesign)!, guide: 'guide', library: 'library', settings: 'settings', movies: 'movies', series: 'series', search: 'search' };
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
    : isLibraryView(view) ? <LibraryScreen nativeSearch={Platform.OS==='ios'&&['live','library','search'].includes(tab)} view={view} tab={tab} /> : null;
  const body=<View style={{ flex: 1, backgroundColor: colors.bg }}><NativeHeaderTitle.Provider value={tab==='guide'}>{content}</NativeHeaderTitle.Provider><MiniPlayerSafeFrame owner={tab} focused={focused}/></View>;
  // Native search headers are translucent: inset their fixed filter siblings.
  // Ordinary stack headers already position Home/Guide below the bar; adding
  // another top inset there creates a second header-sized blank area.
  return <ScreenFocusProvider value={focused}>{Platform.OS==='ios'?<NativeScreenSafeAreaView edges={{top:isLibraryView(view),bottom:true,left:true,right:true}} style={{backgroundColor:colors.bg}}>{body}</NativeScreenSafeAreaView>:body}</ScreenFocusProvider>;
}

// ── Pages and sheets ─────────────────────────────────────────────────────────
const busyTypes: Page['type'][] = ['provider', 'delete', 'profiles', 'backup'];
function usePage() {
  const c = useNodeCast();
  const params=useLocalSearchParams<{key?:string;type?:string;id?:string;section?:string}>();
  const descriptor=detailRoute(params.type,params.id,params.section);
  const key=params.key||(descriptor?`detail:${descriptor.type}:${descriptor.id}`:undefined);
  const entry=key?c.pages.find(item=>item.key===key)||c.getPage(key):null;
  const [resolving,setResolving]=useState(!!descriptor);
  const restore=c.restoreDetail,remember=c.rememberDetail;
  useEffect(()=>{if(entry||!key||!descriptor||c.booting)return;let alive=true;setResolving(true);void restore(descriptor.type,descriptor.id,descriptor.section,key).then(found=>{if(!alive)return;if(found)remember(found)}).catch(()=>{}).finally(()=>{if(alive)setResolving(false)});return()=>{alive=false}},[key,params.id,params.section,params.type,entry,c.booting,restore,remember]);
  const retain = c.retain, release = c.release;
  useEffect(() => { if (!key) return; retain(key); return () => release(key); }, [key, retain, release]);
  const busy = !!entry && c.connecting && busyTypes.includes(entry.page.type);
  // While a profile is connecting or being removed, Back waits for the operation to finish.
  const navigation=useNavigation();
  const dirty=entry?.page.type==='provider'&&c.providerDirty;
  usePreventRemove(busy||dirty,({data})=>{if(c.providerCloseAllowed.current){navigation.dispatch(data.action);return;}if(busy)return;Alert.alert('Discard playlist changes?','Your unsaved entries will be lost.',[{text:'Keep editing',style:'cancel'},{text:'Discard changes',style:'destructive',onPress:()=>{c.providerCloseAllowed.current=true;c.setProviderDirty(false);navigation.dispatch(data.action)}}])});
  return { c, entry, busy, resolving,restorable:!!descriptor };
}
function Missing() {
  const c = useNodeCast();
  return <Empty icon="albums-outline" title="This page has closed" message="Return to GlowTV to continue."><Button title="Back to Home" onPress={c.goHome} /></Empty>;
}

export function PageScreen() {
  useThemeChoice();
  const { c, entry, busy, resolving,restorable } = usePage();
  const page = entry?.page;
  const view: LibraryView | null = page?.type === 'browse' ? page.view : null;
  useReportFocus(view ?? (page?.type === 'settings' ? 'settings' : page?.type==='guide-settings'?'guide':null));
  const focused = useIsFocused();
  return <ScreenFocusProvider value={focused}><View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Stack.Screen options={{ title: page ? c.pageTitle(page) : '', gestureEnabled: !busy, headerBackVisible: !busy }} />
    {!entry ? resolving||c.booting?<LibrarySkeleton label="Opening saved title"/>:restorable?<Empty icon="albums-outline" title="This title is not available in the saved library" message={c.connected?'Refresh the matching playlist and open the title again.':'Connect the playlist that contains this title.'}><Button title="Back to Home" onPress={c.goHome}/>{!c.connected&&<Button title="Add playlist" onPress={()=>c.addProfile()}/>}</Empty>:<Missing /> : page?.type === 'browse' ? <LibraryScreen view={page.view} /> : <NativeHeaderTitle.Provider value>{c.renderPage(entry, view => <LibraryScreen view={view} />)}</NativeHeaderTitle.Provider>}
  </View></ScreenFocusProvider>;
}

export function SheetScreen() {
  useThemeChoice();
  const { c, entry, busy, resolving,restorable } = usePage();
  const page = entry?.page;
  const close = <Pressable accessibilityRole="button" accessibilityLabel={page?.type==='delete'||page?.type==='provider'?'Cancel':'Done'} disabled={busy} onPress={c.back} style={s.textAction}><Text style={[u.link, { fontSize: 16, fontWeight: page?.type==='delete'||page?.type==='provider'?'500':'600' }]}>{page?.type==='delete'||page?.type==='provider'?'Cancel':'Done'}</Text></Pressable>;
  const content = !entry ? <Missing /> : c.renderPage(entry, view => <LibraryScreen view={view} />);
  return <FamilyChallengeHost active>
    <Stack.Screen options={{ gestureEnabled: !busy, ...({
      title: page ? c.pageTitle(page) : '', headerBackVisible: false, ...(page?.type==='provider'?{headerLeft:()=>close,headerRight:undefined}:{headerRight:()=>close}),
    }) }} />
    {/* UIKit owns the sheet header and its hit testing. Keep scrolling content
        separate so the native sheet never coerces it over the Done control. */}
    {/* Android form sheets do not draw the UIKit-style stack title. Keep the
        task's content heading there; UIKit and web already show a header. */}
    <NativeHeaderTitle.Provider value={Platform.OS!=='android'}>{content}</NativeHeaderTitle.Provider>
  </FamilyChallengeHost>;
}

export { isSheet };
