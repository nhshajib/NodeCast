import TVConnection from './TVConnection';
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Image, Linking, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Pressable from '../src/FocusPressable';
import { authenticate, loadEpisodes, loadLibrary, normalizeProvider } from '../src/provider';
import type { Media, Provider, Section } from '../src/provider';
import { emptyVault, removeProfile } from '../src/vault';
import type { Vault, Profile } from '../src/vault';
import { loadVault, saveVault, loadPreferences, savePreferences } from '../src/storage';
import type { Preferences } from '../src/storage';
import { preparePlayback } from '../src/livePlayback';
import { createSearchIndex, searchIndex } from '../src/catalog';
import { recordViewing, resumePosition } from '../src/activity';
import { readViewing, writeViewing } from '../src/libraryStore';
import type { ViewingEntry } from '../src/activity';
import ProviderSheet from '../src/ProviderSheet';
import BuiltInPlayer from '../src/BuiltInPlayer';
import ExternalSheet from '../src/ExternalSheet';
import HomeIPSetup from '../src/HomeIPSetup';
import NetworkCard from '../src/NetworkCard';
import VersionHistory from '../src/VersionHistory';
import StartupSplash from '../src/StartupSplash';
import { NavigationMotionProvider } from '../src/NavigationMotion';
import { Button, Icon, Notice, colors, u } from '../src/ui';
import { appVersion } from '../src/releases';
void SplashScreen.preventAutoHideAsync().catch(() => {});
type Page = 'live' | 'movies' | 'series' | 'favorites' | 'settings';
type Overlay = 'provider' | 'home-ip' | 'history' | 'external' | 'episodes' | null;
const labels: Record<Page, string> = { live: 'Live TV', movies: 'Movies', series: 'Series', favorites: 'Favorites', settings: 'Settings' };
function TVContent({ onReady, launchComplete }: { onReady: () => void; launchComplete: boolean }) {
  const [vault, setVault] = useState<Vault>(emptyVault());
  const vaultRef = useRef(vault); vaultRef.current = vault;
  const [preferences, setPreferences] = useState<Preferences>({ onboarded: true, player: 'internal', baseline: null });
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('live');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [edit, setEdit] = useState<Profile | undefined>();
  const [items, setItems] = useState<Media[]>([]);
  const [episodes, setEpisodes] = useState<Media[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [playing, setPlaying] = useState<Media | null>(null);
  const [fullscreen, setFullscreen] = useState(true);
  const [viewing, setViewing] = useState<ViewingEntry[]>([]);
  const viewingRef = useRef(viewing); viewingRef.current = viewing;
  const [storageError, setStorageError] = useState('');
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const writes = useRef(Promise.resolve());
  const active = vault.profiles.find(p => p.id === vault.activeId);
  const activeId = active?.id;
  const deferred = useDeferredValue(query);
  async function updateVault(change: (current: Vault) => Vault) {
    const action = writes.current.then(async () => {
      const next = change(vaultRef.current); await saveVault(next);
      if (alive.current) { vaultRef.current = next; setVault(next); }
    });
    writes.current = action.catch(() => {}); return action;
  }
  async function updatePreferences(patch: Partial<Preferences>) {
    const next = { ...preferences, ...patch }; await savePreferences(next); if (alive.current) setPreferences(next);
  }
  useEffect(() => {
    alive.current = true;
    void Promise.all([loadVault(), loadPreferences()]).then(([v, p]) => { if (alive.current) { vaultRef.current = v; setVault(v); setPreferences(p); } })
      .catch(() => { if (alive.current) setStorageError('Could not read saved profiles. Restart the app before changing profiles.'); })
      .finally(() => { if (alive.current) { setReady(true); onReady(); } });
    return () => { alive.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (ready && launchComplete && !preferences.homeIPSetup) setOverlay('home-ip');
  }, [ready, launchComplete]);
  useEffect(() => {
    setViewing([]);
    if (!activeId) return;
    let live = true;
    void readViewing(activeId).then(entries => { if (live) setViewing(entries); }).catch(() => {});
    return () => { live = false; };
  }, [activeId]);
  useEffect(() => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setItems([]); setQuery(''); setGroup('All'); setError('');
    if (!active || page === 'settings') { setBusy(false); return; }
    setBusy(true);
    const sections: Section[] = active.provider.kind === 'm3u' ? ['live'] : page === 'favorites' ? ['live', 'movies', 'series'] : [page];
    void Promise.all(sections.map(section => loadLibrary(active.provider, section, controller.signal)))
      .then(result => { if (!controller.signal.aborted) setItems(result.flat().filter(i => page === 'favorites' || i.kind === page)); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [activeId, page, revision]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) { request.current?.abort(); setBusy(false); setOverlay(null); return true; }
      if (playing) { setPlaying(null); return true; }
      if (query || group !== 'All') { setQuery(''); setGroup('All'); return true; }
      if (page !== 'live') { setPage('live'); return true; }
      return false;
    }); return () => sub.remove();
  }, [overlay, playing, query, group, page]);
  const index = useMemo(() => createSearchIndex(page === 'favorites' ? items.filter(i => active?.favorites.includes(i.id)) : items), [items, page, active?.favorites]);
  const groups = useMemo(() => ['All', ...new Set(index.map(entry => entry.item.group).filter(Boolean))], [index]);
  const filtered = useMemo(() => searchIndex(index, deferred, group), [index, deferred, group]);
  async function connect(provider: Provider) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      if (storageError) throw new Error(storageError);
      const normalized = normalizeProvider(provider); await authenticate(normalized, controller.signal);
      if (controller.signal.aborted) return;
      const profile: Profile = { ...(edit || { id: `tv-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), favorites: [] }), provider: normalized };
      await updateVault(current => ({ ...current, activeId: profile.id, profiles: [...current.profiles.filter(p => p.id !== profile.id), profile] }));
      if (!controller.signal.aborted && alive.current) { setOverlay(null); setRevision(r => r + 1); }
    } catch (e) { if (!controller.signal.aborted && alive.current) setError((e as Error).message); }
    finally { if (!controller.signal.aborted && alive.current) setBusy(false); }
  }
  async function open(item: Media) {
    setError('');
    if (item.kind === 'series') {
      if (!active) return;
      request.current?.abort(); const controller = new AbortController(); request.current = controller;
      setOverlay('episodes'); setEpisodes([]); setBusy(true);
      try { const result = await loadEpisodes(active.provider, item, controller.signal); if (!controller.signal.aborted) setEpisodes(result); }
      catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
      return;
    }
    setOverlay(null); setFullscreen(true); setPlaying(preparePlayback(item, active?.provider || null, active?.liveFormat));
  }
  function favorite(item: Media) {
    if (!activeId) return;
    void updateVault(current => ({ ...current, profiles: current.profiles.map(p => p.id === activeId ? { ...p, favorites: p.favorites.includes(item.id) ? p.favorites.filter(id => id !== item.id) : [...p.favorites, item.id] } : p) })).catch(() => setError('Could not save favorites.'));
  }
  const add = () => { setEdit(undefined); setError(''); setOverlay('provider'); };
  const sheet = (title: string, body: React.ReactNode) => <View style={s.sheet}><View style={s.sheetHeader}><Button title="Back" variant="secondary" onPress={() => { request.current?.abort(); setBusy(false); setOverlay(null); }} /><Text style={u.h2}>{title}</Text></View><View style={{ flex: 1 }}>{body}</View></View>;
  if (overlay === 'provider') return sheet('Your playlist', <ProviderSheet profile={edit} busy={busy} error={error} onSave={p => { void connect(p); }} />);
  if (overlay === 'home-ip') return sheet('Home IP reference', <HomeIPSetup onSave={async baseline => { await updatePreferences({ baseline, homeIPSetup: 'saved' }); setOverlay(null); }} onSkip={async () => { await updatePreferences({ homeIPSetup: 'skipped' }); setOverlay(null); }} />);
  if (overlay === 'history') return sheet('Version history', <VersionHistory />);
  if (overlay === 'external' && playing) return sheet('External player', <ScrollView><ExternalSheet item={playing} onInternal={() => setOverlay(null)} onOpened={() => { setPlaying(null); setOverlay(null); }} /></ScrollView>);
  if (overlay === 'episodes') return sheet('Episodes', <View style={{ flex: 1, padding: 20 }}>{busy && <ActivityIndicator />}{!!error && <Notice danger>{error}</Notice>}<FlatList data={episodes} keyExtractor={i => i.id} ListEmptyComponent={!busy ? <Text style={u.body}>No episodes returned.</Text> : undefined} renderItem={({ item }) => <Pressable onPress={() => { void open(item); }} style={s.episode}><Text style={u.label}>{item.name}</Text></Pressable>} /></View>);
  if (playing) return <View style={{ flex: 1, backgroundColor: colors.text }}><BuiltInPlayer key={playing.id} item={playing} fullscreen={fullscreen} onFullscreenChange={setFullscreen} onClose={() => setPlaying(null)} onExternal={() => setOverlay('external')} resumeAt={resumePosition(viewing.find(v => v.item.id === playing.id))} onTracks={() => {}} onProgress={snapshot => {
    if (!activeId) return;
    const entries = recordViewing(viewingRef.current, playing, snapshot); viewingRef.current = entries; setViewing(entries);
    void writeViewing(activeId, entries).catch(() => {});
  }} /></View>;
  return <View style={s.root}><StatusBar hidden /><View style={s.sidebar}><Image source={require('../assets/brand/nodecast-mark.png')} style={{ width: 66, height: 66, borderRadius: 33 }} /><Text style={s.brand}>NodeCast<Text style={{ color: colors.accent }}> TV</Text></Text><Text numberOfLines={1} style={u.small}>{active?.provider.name || 'Your own TV space'}</Text><View style={{ height: 12 }} />{(Object.keys(labels) as Page[]).map((p, n) => <Pressable key={p} hasTVPreferredFocus={n === 0} onPress={() => setPage(p)} style={[s.nav, page === p && { backgroundColor: colors.mint }]}><Text style={u.label}>{labels[p]}</Text></Pressable>)}<View style={{ marginTop: 'auto' }}><TVConnection baseline={preferences.baseline} onPress={() => setPage('settings')} /></View><Text style={u.small}>Free, always. · {appVersion}</Text></View><View style={s.main}>
    <View style={s.heading}><View style={{ flex: 1 }}><Text style={u.eyebrow}>YOUR EVENING, YOUR WAY</Text><Text style={u.h1}>{labels[page]}</Text></View>{active && page !== 'settings' && <Button title="Refresh" variant="secondary" onPress={() => setRevision(r => r + 1)} />}</View>
    {!!storageError && <Notice danger>{storageError}</Notice>}
    {page === 'settings' ? <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}><Text style={u.h2}>Your profiles</Text>{vault.profiles.map(p => <View key={p.id} style={[u.card, { gap: 10 }]}><Text style={u.label}>{p.provider.name}{p.id === activeId ? ' · Active' : ''}</Text><View style={u.row}><Button title="Use profile" variant="secondary" onPress={() => { void updateVault(v => ({ ...v, activeId: p.id })).catch(() => setError('Could not switch profile.')); }} /><Button title="Edit" variant="secondary" onPress={() => { setEdit(p); setError(''); setOverlay('provider'); }} /><Button title="Remove" variant="danger" onPress={() => Alert.alert('Remove profile?', 'This removes local favorites. Your subscription stays active.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void updateVault(v => removeProfile(v, p.id)).catch(() => setError('Could not remove profile.')); } }])} /></View></View>)}<Button title="Add playlist" onPress={add} disabled={!!storageError} /><NetworkCard baseline={preferences.baseline} onBaseline={baseline => updatePreferences({ baseline })} /><Button title="Set home IP reference" variant="secondary" onPress={() => setOverlay('home-ip')} /><Button title="Version history" variant="secondary" onPress={() => setOverlay('history')} /><View style={u.card}><Text style={u.h2}>Support NodeCast</Text><Text style={u.body}>NodeCast is free. If it makes your evenings better, a little support is appreciated.</Text><Button title="Buy me a coffee" variant="mint" onPress={() => { void Linking.openURL('https://buymeacoffee.com/hexorbd').catch(() => setError('Open buymeacoffee.com/hexorbd on your phone to support NodeCast.')); }} /></View>{!!error && <Notice danger>{error}</Notice>}</ScrollView> : !active ? <View style={[u.center, { gap: 18 }]}><Text style={u.h1}>A bigger screen. All yours.</Text><Text style={u.body}>Connect your Xtream Codes server or M3U playlist.</Text><Button title="Add your playlist" onPress={add} disabled={!ready || !!storageError} /></View> : <>
      <TextInput accessibilityLabel="Search channels and titles" placeholder="Search channels and titles" placeholderTextColor={colors.secondary} value={query} onChangeText={setQuery} style={s.search} />
      <View style={{ height: 66 }}><ScrollView horizontal contentContainerStyle={{ gap: 10, alignItems: 'center', paddingHorizontal: 4 }} showsHorizontalScrollIndicator={false}>{groups.map(g => <Pressable key={g} onPress={() => setGroup(g)} style={[s.chip, group === g && { backgroundColor: colors.mint }]}><Text numberOfLines={1} style={u.label}>{g}</Text></Pressable>)}</ScrollView></View>
      {busy ? <View style={u.center}><ActivityIndicator color={colors.accent} /><Text style={u.body}>Loading your library…</Text></View> : error ? <View style={u.center}><Notice danger>{error}</Notice><Button title="Try again" onPress={() => setRevision(r => r + 1)} /></View> : <FlatList key={page} data={filtered} numColumns={3} keyExtractor={i => i.id} columnWrapperStyle={{ gap: 14 }} contentContainerStyle={{ gap: 14, padding: 5, paddingBottom: 30 }} ListEmptyComponent={<Text style={u.body}>{page === 'favorites' ? 'Save a favorite using the heart below any title.' : 'No titles match. Try another search or category.'}</Text>} renderItem={({ item }) => <View style={s.tile}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.name}`} onPress={() => { void open(item); }} style={s.tilePlay}><View style={s.art}>{item.logo ? <Image source={{ uri: item.logo }} resizeMode="contain" style={{ width: '100%', height: '100%' }} /> : <Icon name="play-circle-outline" size={32} color={colors.accent} />}</View><Text numberOfLines={2} style={u.label}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${active.favorites.includes(item.id) ? 'Remove' : 'Save'} favorite: ${item.name}`} onPress={() => favorite(item)} style={s.favorite}><Text style={{ fontSize: 22, color: colors.accent }}>{active.favorites.includes(item.id) ? '♥' : '♡'}</Text></Pressable></View>} />}
    </>}
  </View></View>;
}
export default function TVApp() {
  const [fonts, fontError] = useFonts({ CrimsonText: require('../assets/fonts/CrimsonText-Regular.ttf') });
  const [ready, setReady] = useState(false); const [finished, setFinished] = useState(false);
  if (!fonts && !fontError) return <View style={{ flex: 1, backgroundColor: colors.text }} />;
  return <NavigationMotionProvider><SafeAreaProvider><View style={{ flex: 1 }}><View style={{ flex: 1 }} pointerEvents={finished ? 'auto' : 'none'} importantForAccessibility={finished ? 'auto' : 'no-hide-descendants'}><TVContent onReady={() => setReady(true)} launchComplete={finished} /></View>{!finished && <StartupSplash ready={ready} onFinish={() => setFinished(true)} />}</View></SafeAreaProvider></NavigationMotionProvider>;
}
const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', padding: 28, gap: 30, backgroundColor: colors.bg },
  sidebar: { width: 190, gap: 12, paddingTop: 6 }, brand: { color: colors.text, fontSize: 26, fontFamily: 'CrimsonText' },
  nav: { paddingHorizontal: 18, paddingVertical: 15, borderRadius: 18 }, main: { flex: 1, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: 16 },
  search: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, fontSize: 17, color: colors.text },
  chip: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#fff', maxWidth: 240 },
  tile: { flex: 1 / 3, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden' }, tilePlay: { padding: 16, gap: 8, minHeight: 160 },
  art: { height: 70, backgroundColor: colors.pale, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 10 },
  favorite: { alignItems: 'center', padding: 7, backgroundColor: '#EEEDFB' }, episode: { padding: 20, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12 },
  sheet: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 60, paddingTop: 20 }, sheetHeader: { flexDirection: 'row', gap: 24, alignItems: 'center', paddingBottom: 14 },
});
