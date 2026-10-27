import SearchScopeControl from '../src/SearchScope';
import type { SearchScope } from '../src/SearchScope';
import { resolvePlayback, setChannelPlayback } from '../src/viewingPreferences';
import type { ChannelPlayback } from '../src/viewingPreferences';
import ChannelPlaybackOptions from '../src/ChannelPlaybackOptions';
import SeriesEpisodes from '../src/SeriesEpisodes';
import RetainedList from '../src/RetainedList';
import GuideScreen from '../src/GuideScreen';
import { readCatalog, writeCatalog, clearProfileData } from '../src/libraryStore';
import TVConnection from './TVConnection';
import { followingEpisode } from '../src/episodes';
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
import { recordViewing, resumePosition, markWatched } from '../src/activity';
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
type Overlay = 'provider' | 'home-ip' | 'history' | 'external' | 'episodes' | 'channel-options' | 'guide' | null;
const labels: Record<Page, string> = { live: 'Live TV', movies: 'Movies', series: 'Series', favorites: 'Favorites', settings: 'Settings' };
function TVContent({ onReady, launchComplete }: { onReady: () => void; launchComplete: boolean }) {
  const [vault, setVault] = useState<Vault>(emptyVault());
  const vaultRef = useRef(vault); vaultRef.current = vault;
  const [preferences, setPreferences] = useState<Preferences>({ onboarded: true, player: 'internal', baseline: null });
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('live');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [edit, setEdit] = useState<Profile | undefined>();
  const [libraryData, setLibraryData] = useState<{ key: string; items: Media[] }>({ key: '', items: [] });
  const memory = useRef(new Map<string, { items: Media[]; savedAt: string }>());
  const scrollMemory = useRef(new Map<string, number>());
  const [updatedAt, setUpdatedAt] = useState('');
  const [optionItem, setOptionItem] = useState<Media | null>(null);
  const [externalItem, setExternalItem] = useState<Media | null>(null);
  const [externalPreferred, setExternalPreferred] = useState<'vlc' | 'infuse' | undefined>();
  const [browseStates, setBrowseStates] = useState<Record<string, { query: string; group: string; scope: SearchScope; hidden: boolean; focused?: string }>>({});
  const [episodes, setEpisodes] = useState<Media[]>([]);
  const seasonMemory = useRef(new Map<string, string>());
  const [episodeQueue, setEpisodeQueue] = useState<{ profileId: string; seriesId: string; items: Media[] } | null>(null);
  const [playFromStart, setPlayFromStart] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [playing, setPlaying] = useState<Media | null>(null);
  const [fullscreen, setFullscreen] = useState(true);
  const [viewing, setViewing] = useState<ViewingEntry[]>([]);
  const viewingOwner = useRef<string | null>(null);
  const viewingRef = useRef(viewing); viewingRef.current = viewing;
  const [storageError, setStorageError] = useState('');
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const writes = useRef(Promise.resolve());
  const active = vault.profiles.find(p => p.id === vault.activeId);
  const activeId = active?.id;
  const next = useMemo(() => episodeQueue && episodeQueue.profileId === activeId ? followingEpisode(episodeQueue.items, playing) : null, [episodeQueue, activeId, playing]);
  const browseKey = `${activeId || 'empty'}:${page}`;
  const browse = browseStates[browseKey] || { query: '', group: 'All', scope: 'category' as SearchScope, hidden: false };
  const { query, group } = browse;
  const changeBrowse = (patch: Partial<typeof browse>) => setBrowseStates(current => ({ ...current, [browseKey]: { ...(current[browseKey] || browse), ...patch } }));
  const setQuery = (query: string) => changeBrowse({ query });
  const setGroup = (group: string) => changeBrowse({ group, scope: 'category' });
  const items = libraryData.key === browseKey ? libraryData.items : [];
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
    memory.current.clear();
    viewingOwner.current = null; setViewing([]); setEpisodeQueue(null);
    if (!activeId) return;
    let live = true;
    void readViewing(activeId).then(entries => { if (live) { viewingOwner.current = activeId; viewingRef.current = entries; setViewing(entries); } }).catch(() => {});
    return () => { live = false; };
  }, [activeId]);
  useEffect(() => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setError(''); setUpdatedAt('');
    if (!active || page === 'settings') { setBusy(false); return; }
    const profile = active;
    const owner = browseKey;
    const sections: Section[] = profile.provider.kind === 'm3u' ? ['live'] : page === 'favorites' || browse.scope === 'all' && !!deferred.trim() ? ['live', 'movies', 'series'] : [page];
    setBusy(true);
    void (async () => {
      const saved = await Promise.all(sections.map(async section => {
        const key = `${profile.id}:${section}`;
        return memory.current.get(key) || await readCatalog(profile.id, section, profile.provider);
      }));
      if (controller.signal.aborted) return;
      const cached = saved.flatMap(row => row?.items || []);
      if (saved.some(Boolean)) { setLibraryData({ key: owner, items: cached }); setUpdatedAt(saved.map(row => row?.savedAt || '').sort()[0] || ''); setBusy(false); }
      const results = await Promise.allSettled(sections.map(async section => {
        const items = await loadLibrary(profile.provider, section, controller.signal);
        if (controller.signal.aborted) return null;
        const row = { items, savedAt: new Date().toISOString() };
        memory.current.set(`${profile.id}:${section}`, row);
        void writeCatalog(profile.id, section, items).catch(() => {});
        return row;
      }));
      if (controller.signal.aborted) return;
      const rows = results.map((result, i) => result.status === 'fulfilled' && result.value ? result.value : saved[i]);
      if (rows.some(Boolean)) { setLibraryData({ key: owner, items: rows.flatMap(row => row?.items || []) }); setUpdatedAt(rows.map(row => row?.savedAt || '').filter(Boolean).sort()[0] || ''); }
      if (results.some(result => result.status === 'rejected')) setError('Could not refresh everything. Saved titles remain available; try Refresh library.');
      setBusy(false);
    })().catch(() => { if (!controller.signal.aborted) { setError('Could not load your library. Try Refresh library.'); setBusy(false); } });
    return () => controller.abort();
  }, [activeId, active?.provider, page, revision, browse.scope, !!deferred.trim()]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) { if (overlay === 'provider' || overlay === 'episodes') { request.current?.abort(); setBusy(false); } setOverlay(null); return true; }
      if (playing) { closePlayer(); return true; }
      if (query || group !== 'All') { setQuery(''); setGroup('All'); return true; }
      if (page !== 'live') { setPage('live'); return true; }
      return false;
    }); return () => sub.remove();
  }, [overlay, playing, query, group, page]);
  const index = useMemo(() => createSearchIndex(page === 'favorites' ? items.filter(i => active?.favorites.includes(i.id)) : items.filter(i => browse.scope === 'all' && !!deferred.trim() || i.kind === page)), [items, page, active?.favorites, browse.scope, !!deferred.trim()]);
  const groups = useMemo(() => ['All', ...new Set(index.map(entry => entry.item.group).filter(group => !!group && !active?.hiddenGroups?.includes(group)))], [index, active?.hiddenGroups]);
  const filtered = useMemo(() => searchIndex(index, deferred, deferred.trim() && browse.scope !== 'category' ? 'All' : group, active?.hiddenGroups || [], page === 'favorites' || !!deferred.trim() && browse.hidden), [index, deferred, group, browse.scope, browse.hidden, page, active?.hiddenGroups]);
  async function connect(provider: Provider) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      if (storageError) throw new Error(storageError);
      const normalized = normalizeProvider(provider); await authenticate(normalized, controller.signal);
      if (controller.signal.aborted) return;
      const changed = edit && ['kind', 'address', 'username', 'password'].some(key => edit.provider[key as keyof Provider] !== normalized[key as keyof Provider]);
      if (changed && edit) {
        await clearProfileData(edit.id);
        for (const key of memory.current.keys()) if (key.startsWith(`${edit.id}:`)) memory.current.delete(key);
        setBrowseStates(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${edit.id}:`))));
      }
      const profile: Profile = { ...(edit || { id: `tv-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), favorites: [] }), provider: normalized, ...(changed ? { favorites: [], hiddenGroups: [], channelPlayback: undefined } : {}) };
      await updateVault(current => ({ ...current, activeId: profile.id, profiles: [...current.profiles.filter(p => p.id !== profile.id), profile] }));
      if (!controller.signal.aborted && alive.current) { setOverlay(null); setRevision(r => r + 1); }
    } catch (e) { if (!controller.signal.aborted && alive.current) setError((e as Error).message); }
    finally { if (!controller.signal.aborted && alive.current) setBusy(false); }
  }
  async function open(item: Media) {
    setError('');
    if (item.kind === 'series' && !item.id.startsWith('episode:')) {
      if (!active) return;
      request.current?.abort(); const controller = new AbortController(); request.current = controller;
      setOverlay('episodes'); setEpisodes([]); setEpisodeQueue(null); setBusy(true);
      try { const result = await loadEpisodes(active.provider, item, controller.signal); if (!controller.signal.aborted) { setEpisodes(result); setEpisodeQueue({ profileId: active.id, seriesId: item.id, items: result }); } }
      catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
      return;
    }
    changeBrowse({ focused: item.id });
    if (!item.url && active?.provider.kind === 'm3u') {
      const owner = active.id;
      try { const result = await loadLibrary(active.provider, 'live'); if (vaultRef.current.activeId !== owner) return; const match = result.find(row => row.id === item.id); if (!match?.url) { setError('This title is no longer in your playlist.'); return; } item = match; }
      catch { setError('Connect to your provider to open this saved title.'); return; }
    }
    if (!item.url) { setError('Refresh your playlist to open this saved title.'); return; }
    if (!item.id.startsWith('episode:')) setEpisodeQueue(null);
    const options = resolvePlayback(active, item.id, preferences.player);
    const playable = preparePlayback(item, active?.provider || null, options.format);
    if (options.player !== 'internal') { setPlaying(null); setExternalItem(playable); setExternalPreferred(options.player === 'vlc' || options.player === 'infuse' ? options.player : undefined); setOverlay('external'); return; }
    setPlayFromStart(false); setOverlay(null); setFullscreen(true); setPlaying(playable);
  }
  function closePlayer() { const wasEpisode = playing?.id.startsWith('episode:'); setPlaying(null); if (wasEpisode && episodeQueue) setOverlay('episodes'); }
  async function saveChannelOptions(item: Media, value?: ChannelPlayback) {
    if (!activeId) throw new Error('No profile');
    const owner = activeId;
    await updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === owner ? setChannelPlayback(profile, item.id, value) : profile) }));
  }
  function changeWatched(item: Media, watched: boolean) {
    if (!activeId || viewingOwner.current !== activeId) { setError('Saved history is not available yet. Try again or restart the app.'); return; }
    const entries = markWatched(viewingRef.current, item, watched); viewingRef.current = entries; setViewing(entries);
    void writeViewing(activeId, entries).catch(() => setError('Could not save watched state.'));
  }
  function favorite(item: Media) {
    if (!activeId) return;
    void updateVault(current => ({ ...current, profiles: current.profiles.map(p => p.id === activeId ? { ...p, favorites: p.favorites.includes(item.id) ? p.favorites.filter(id => id !== item.id) : [...p.favorites, item.id] } : p) })).catch(() => setError('Could not save favorites.'));
  }
  const add = () => { setEdit(undefined); setError(''); setOverlay('provider'); };
  const sheet = (title: string, body: React.ReactNode) => <View style={s.sheet}><View style={s.sheetHeader}><Button title="Back" variant="secondary" onPress={() => { if (overlay === 'provider' || overlay === 'episodes') { request.current?.abort(); setBusy(false); } setOverlay(null); }} /><Text style={u.h2}>{title}</Text></View><View style={{ flex: 1 }}>{body}</View></View>;
  if (overlay === 'provider') return sheet('Your playlist', <ProviderSheet profile={edit} busy={busy} error={error} onSave={p => { void connect(p); }} />);
  if (overlay === 'home-ip') return sheet('Home IP reference', <HomeIPSetup onSave={async baseline => { await updatePreferences({ baseline, homeIPSetup: 'saved' }); setOverlay(null); }} onSkip={async () => { await updatePreferences({ homeIPSetup: 'skipped' }); setOverlay(null); }} />);
  if (overlay === 'history') return sheet('Version history', <VersionHistory />);
  if (overlay === 'channel-options' && optionItem) return sheet('Channel playback', <ChannelPlaybackOptions key={optionItem.id} value={active?.channelPlayback?.[optionItem.id]} onSave={value => saveChannelOptions(optionItem, value)} />);
  if (overlay === 'guide' && active?.provider.kind === 'xtream') return sheet('Now & next', <GuideScreen provider={active.provider} channels={items.filter(item => item.kind === 'live' && !active.hiddenGroups?.includes(item.group))} favorites={active.favorites} onPlay={item => { void open(item); }} />);
  if (overlay === 'external' && (externalItem || playing)) return sheet('External player', <ScrollView><ExternalSheet item={(externalItem || playing)!} preferred={externalPreferred} onInternal={() => { if (externalItem) { setPlaying(externalItem); setFullscreen(true); } setExternalItem(null); setOverlay(null); }} onOpened={() => { setPlaying(null); setExternalItem(null); setOverlay(null); }} /></ScrollView>);
  if (overlay === 'episodes') return sheet('Episodes', <View style={{ flex: 1, padding: 20 }}>{busy && <ActivityIndicator />}{!!error && <Notice danger>{error}</Notice>}{!busy && <SeriesEpisodes seasonMemory={seasonMemory.current} seriesKey={`${activeId}:${episodeQueue?.seriesId}`} key={episodeQueue?.seriesId} episodes={episodes} history={viewing} onPlay={item => { void open(item); }} onWatched={changeWatched} />}</View>);
  if (playing) return <View style={{ flex: 1, backgroundColor: colors.text }}><BuiltInPlayer liveEngine={resolvePlayback(active, playing.id, preferences.player).engine} channelOptions={active?.channelPlayback?.[playing.id]} onSaveOptions={value => saveChannelOptions(playing, value)} television nextEpisode={next ? { item: next, onPress: () => { seasonMemory.current.set(`${activeId}:${episodeQueue?.seriesId}`, next.group); setPlayFromStart(true); setFullscreen(true); setPlaying(current => current?.id === playing.id ? next : current); } } : undefined} key={playing.id} item={playing} fullscreen={fullscreen} onFullscreenChange={setFullscreen} onClose={closePlayer} onExternal={() => { setExternalItem(null); setOverlay('external'); }} resumeAt={playFromStart ? 0 : resumePosition(viewing.find(v => v.item.id === playing.id))} tracks={active?.tracks} onTracks={tracks => { if (activeId) void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === activeId ? { ...profile, tracks } : profile) })).catch(() => setError('Could not save language preferences.')); }} onProgress={snapshot => {
    if (!activeId || viewingOwner.current !== activeId) return;
    const entries = recordViewing(viewingRef.current, playing, snapshot); viewingRef.current = entries; setViewing(entries);
    void writeViewing(activeId, entries).catch(() => {});
  }} /></View>;
  return <View style={s.root}><StatusBar hidden /><View style={s.sidebar}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Image source={require('../assets/brand/nodecast-mark.png')} style={{ width: 44, height: 44, borderRadius: 22 }} /><Text style={s.brand}>NodeCast<Text style={{ color: colors.accent }}> TV</Text></Text></View><Text numberOfLines={1} style={u.small}>{active?.provider.name || 'Your own TV space'}</Text>{(Object.keys(labels) as Page[]).map((p, n) => <Pressable key={p} hasTVPreferredFocus={n === 0} onPress={() => setPage(p)} style={[s.nav, page === p && { backgroundColor: colors.mint }]}><Text style={u.label}>{labels[p]}</Text></Pressable>)}<View style={{ marginTop: 'auto' }}><TVConnection baseline={preferences.baseline} onPress={() => setPage('settings')} /></View><Text style={u.small}>Free, always. · {appVersion}</Text></View><View style={s.main}>
    <View style={s.heading}><View style={{ flex: 1 }}><Text style={u.eyebrow}>YOUR EVENING, YOUR WAY</Text><Text style={u.h1}>{labels[page]}</Text></View>{active && page !== 'settings' && <Button title="Refresh library" variant="secondary" onPress={() => setRevision(r => r + 1)} />}</View>
    {!!storageError && <Notice danger>{storageError}</Notice>}
    {page === 'settings' ? <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}><Text style={u.h2}>Your profiles</Text>{vault.profiles.map(p => <View key={p.id} style={[u.card, { gap: 10 }]}><Text style={u.label}>{p.provider.name}{p.id === activeId ? ' · Active' : ''}</Text><View style={u.row}><Button title="Use profile" variant="secondary" onPress={() => { void updateVault(v => ({ ...v, activeId: p.id })).catch(() => setError('Could not switch profile.')); }} /><Button title="Edit" variant="secondary" onPress={() => { setEdit(p); setError(''); setOverlay('provider'); }} /><Button title="Remove" variant="danger" onPress={() => Alert.alert('Remove profile?', 'This removes local favorites. Your subscription stays active.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void updateVault(v => removeProfile(v, p.id)).then(() => clearProfileData(p.id)).catch(() => setError('Could not remove profile.')); } }])} /></View></View>)}<Button title="Add playlist" onPress={add} disabled={!!storageError} /><NetworkCard baseline={preferences.baseline} onBaseline={baseline => updatePreferences({ baseline })} /><Button title="Set home IP reference" variant="secondary" onPress={() => setOverlay('home-ip')} /><Button title="Version history" variant="secondary" onPress={() => setOverlay('history')} /><View style={u.card}><Text style={u.h2}>Support NodeCast</Text><Text style={u.body}>NodeCast is free. If it makes your evenings better, a little support is appreciated.</Text><Button title="Buy me a coffee" variant="mint" onPress={() => { void Linking.openURL('https://buymeacoffee.com/hexorbd').catch(() => setError('Open buymeacoffee.com/hexorbd on your phone to support NodeCast.')); }} /></View>{!!error && <Notice danger>{error}</Notice>}</ScrollView> : !active ? <View style={[u.center, { gap: 18 }]}><Text style={u.h1}>A bigger screen. All yours.</Text><Text style={u.body}>Connect your Xtream Codes server or M3U playlist.</Text><Button title="Add your playlist" onPress={add} disabled={!ready || !!storageError} /></View> : <>
      <TextInput autoCorrect={false} autoCapitalize="none" accessibilityLabel="Search channels and titles" placeholder="Search channels and titles" placeholderTextColor={colors.secondary} value={query} onChangeText={setQuery} style={s.search} />
      {!!query.trim() && <SearchScopeControl value={browse.scope} onChange={scope => changeBrowse({ scope })} includeHidden={browse.hidden} onHidden={() => changeBrowse({ hidden: !browse.hidden })} favorites={page === 'favorites'} />}
      <View style={{ height: 66 }}><ScrollView horizontal contentContainerStyle={{ gap: 10, alignItems: 'center', paddingHorizontal: 4 }} showsHorizontalScrollIndicator={false}>{groups.map(g => <Pressable key={g} onPress={() => setGroup(g)} style={[s.chip, group === g && { backgroundColor: colors.mint }]}><Text numberOfLines={1} style={u.label}>{g}</Text></Pressable>)}</ScrollView></View>
      <View style={u.between}><Text style={u.small}>{updatedAt ? `Library updated ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</Text>{page === 'live' && active.provider.kind === 'xtream' && <Button title="Now & next" variant="secondary" onPress={() => setOverlay('guide')} />}</View>
      {!!error && items.length > 0 && <Notice>{error}</Notice>}
      {busy && !items.length ? <View style={u.center}><ActivityIndicator color={colors.accent} /><Text style={u.body}>Loading your library…</Text></View> : error && !items.length ? <View style={u.center}><Notice danger>{error}</Notice><Button title="Try again" onPress={() => setRevision(r => r + 1)} /></View> : <RetainedList memory={scrollMemory.current} memoryKey={`${browseKey}:${group}:${deferred}:${browse.scope}`} key={`${browseKey}:${group}:${deferred}:${browse.scope}`} data={filtered} numColumns={3} keyExtractor={i => i.id} columnWrapperStyle={{ gap: 14 }} contentContainerStyle={{ gap: 14, padding: 5, paddingBottom: 30 }} ListEmptyComponent={<Text style={u.body}>{page === 'favorites' ? 'Save a favorite using the heart below any title.' : 'No titles match. Try another search or category.'}</Text>} renderItem={({ item }) => <View style={s.tile}><Pressable hasTVPreferredFocus={browse.focused && filtered.some(row => row.id === browse.focused) ? browse.focused === item.id : filtered[0]?.id === item.id} onFocus={() => changeBrowse({ focused: item.id })} accessibilityRole="button" accessibilityLabel={`${item.kind === 'series' ? 'Open' : 'Play'} ${item.name}`} onPress={() => { void open(item); }} style={s.tilePlay}><View style={s.art}>{item.logo ? <Image source={{ uri: item.logo }} resizeMode="contain" style={{ width: '100%', height: '100%' }} /> : <Icon name="play-circle-outline" size={32} color={colors.accent} />}</View><Text numberOfLines={2} style={u.label}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable><View style={{ flexDirection: 'row', backgroundColor: '#EEEDFB' }}>{item.kind === 'live' && <Pressable accessibilityRole="button" accessibilityLabel={`Playback options for ${item.name}`} onPress={() => { changeBrowse({ focused: item.id }); setOptionItem(item); setOverlay('channel-options'); }} style={[s.favorite, { flex: 1, minHeight: 44 }]}><Icon name="ellipsis-horizontal" color={colors.accent} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={`${active.favorites.includes(item.id) ? 'Remove' : 'Save'} favorite: ${item.name}`} onPress={() => favorite(item)} style={[s.favorite, { flex: 1, minHeight: 44 }]}><Text style={{ fontSize: 22, color: colors.accent }}>{active.favorites.includes(item.id) ? '♥' : '♡'}</Text></Pressable></View></View>} />}
    </>}
  </View></View>;
}
export default function TVApp() {
  const [fonts, fontError] = useFonts({ CrimsonText: require('../assets/fonts/CrimsonText-Regular.ttf') });
  const [ready, setReady] = useState(false); const [finished, setFinished] = useState(false);
  if (!fonts && !fontError) return <View style={{ flex: 1, backgroundColor: colors.text }} />;
  return <NavigationMotionProvider><SafeAreaProvider><StatusBar hidden /><View style={{ flex: 1 }}><View style={{ flex: 1 }} pointerEvents={finished ? 'auto' : 'none'} importantForAccessibility={finished ? 'auto' : 'no-hide-descendants'}><TVContent onReady={() => setReady(true)} launchComplete={finished} /></View>{!finished && <StartupSplash ready={ready} onFinish={() => setFinished(true)} />}</View></SafeAreaProvider></NavigationMotionProvider>;
}
const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', padding: 24, gap: 24, backgroundColor: colors.bg },
  sidebar: { width: 190, gap: 8, paddingTop: 6 }, brand: { color: colors.text, fontSize: 24, fontFamily: 'CrimsonText' },
  nav: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18 }, main: { flex: 1, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: 16 },
  search: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, fontSize: 17, color: colors.text },
  chip: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#fff', maxWidth: 240 },
  tile: { flex: 1 / 3, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden' }, tilePlay: { padding: 16, gap: 8, minHeight: 160 },
  art: { height: 70, backgroundColor: colors.pale, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 10 },
  favorite: { alignItems: 'center', padding: 7, backgroundColor: '#EEEDFB' }, episode: { padding: 20, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12 },
  sheet: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 60, paddingTop: 20 }, sheetHeader: { flexDirection: 'row', gap: 24, alignItems: 'center', paddingBottom: 14 },
});
