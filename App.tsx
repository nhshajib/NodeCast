import { useFonts } from 'expo-font';
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Media, Provider, Section } from './src/provider';
import { authenticate, loadEpisodes, loadLibrary, normalizeProvider, ProviderError } from './src/provider';
import type { Profile, Vault } from './src/vault';
import { emptyVault, removeProfile } from './src/vault';
import { loadPreferences, loadVault, savePreferences, saveVault } from './src/storage';
import type { Preferences } from './src/storage';
import type { ExternalPlayer, PlayerChoice } from './src/players';
import { players } from './src/players';
import { demoLibrary } from './src/demo';
import NetworkCard from './src/NetworkCard';
import HomeScreen from './src/HomeScreen';
import WelcomeScreen from './src/WelcomeScreen';
import ProviderSheet from './src/ProviderSheet';
import Player from './src/Player';
import LibraryOptions from './src/LibraryOptions';
import GuideScreen from './src/GuideScreen';
import ExternalSheet from './src/ExternalSheet';
import { preparePlayback, liveFormats } from './src/livePlayback';
import { appVersion, releases } from './src/releases';
import { Button, Empty, Icon, IconButton, Notice, SectionHeading, colors, u } from './src/ui';
import type { IconName } from './src/ui';
import { createSearchIndex, searchIndex, hydrateMedia } from './src/catalog';
import { recordViewing, resumePosition, timeLabel } from './src/activity';
import type { PlaybackSnapshot, ViewingEntry } from './src/activity';
import { clearProfileData, readCatalog, writeCatalog, readViewing, writeViewing } from './src/libraryStore';

type Tab = 'home' | 'watch' | 'saved' | 'you';
type Sheet = { type: 'provider'; profile?: Profile } | { type: 'profiles' } | { type: 'players' } |
  { type: 'delete'; profile: Profile } | { type: 'series'; item: Media } | { type: 'details'; item: Media } | { type: 'player'; item: Media; resumeAt?: number } |
  { type: 'external'; item: Media; preferred?: ExternalPlayer } | { type: 'privacy' } | { type: 'organize' } | { type: 'guide' } | { type: 'history' };
const tabs: { id: Tab; title: string; icon: IconName; selected: IconName }[] = [
  { id: 'home', title: 'Home', icon: 'home-outline', selected: 'home' },
  { id: 'watch', title: 'Library', icon: 'play-circle-outline', selected: 'play-circle' },
  { id: 'saved', title: 'Favorites', icon: 'heart-outline', selected: 'heart' },
  { id: 'you', title: 'Settings', icon: 'person-circle-outline', selected: 'person-circle' },
];
const sections: { id: Section; title: string; icon: IconName }[] = [
  { id: 'live', title: 'Live TV', icon: 'tv-outline' }, { id: 'movies', title: 'Movies', icon: 'film-outline' }, { id: 'series', title: 'Series', icon: 'albums-outline' },
];
function Artwork({ item, poster = false }: { item: Media; poster?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.logo]);
  return <View style={[s.artwork, poster && s.poster]}>{(item.logo || item.artwork) && !failed ? <Image source={item.artwork || { uri: item.logo }} onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} resizeMode={poster ? 'cover' : 'contain'} /> : <><Icon name={item.kind === 'live' ? 'radio-outline' : 'film-outline'} size={poster ? 35 : 26} color={colors.accent} />{poster && <Text numberOfLines={3} style={{ fontSize: 16, lineHeight: 21, fontWeight: '600', color: colors.text, textAlign: 'center' }}>{item.name}</Text>}</>}</View>;
}
function SettingsRow({ icon, title, subtitle, onPress, trailing }: { icon: IconName; title: string; subtitle?: string; onPress: () => void; trailing?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.settingsRow}><View style={s.rowIcon}><Icon name={icon} size={21} /></View><View style={{ flex: 1, gap: 4 }}><Text style={u.label}>{title}</Text>{subtitle && <Text style={u.small}>{subtitle}</Text>}</View>{trailing && <Text style={u.small}>{trailing}</Text>}<Icon name="chevron-forward" size={16} color={colors.secondary} /></Pressable>;
}
function NodeCast() {
  const insets = useSafeAreaInsets();
  const [vault, setVault] = useState<Vault>(emptyVault());
  const vaultRef = useRef(vault);
  const mutations = useRef(Promise.resolve());
  const [preferences, setPreferences] = useState<Preferences>({ onboarded: false, player: 'internal', baseline: null });
  const prefsRef = useRef(preferences);
  const [booting, setBooting] = useState(true);
  const [storageFailed, setStorageFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [section, setSection] = useState<Section>('live');
  const [demo, setDemo] = useState(false);
  const [demoFavorites, setDemoFavorites] = useState<string[]>([]);
  const [demoHidden, setDemoHidden] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [cache, setCache] = useState<Partial<Record<Section, Media[]>>>({});
  const cacheRef = useRef(cache); cacheRef.current = cache;
  const cacheOwner = useRef<string | null>(null);
  const fetchedAt = useRef<Partial<Record<Section, number>>>({});
  const forceFetch = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [libraryNotice, setLibraryNotice] = useState('');
  const [searchScope, setSearchScope] = useState<'section' | 'all'>('section');
  const [activity, setActivity] = useState<{ profile: string; entries: ViewingEntry[] }>({ profile: '', entries: [] });
  const activityRef = useRef(activity); activityRef.current = activity;
  const [demoActivity, setDemoActivity] = useState<ViewingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [category, setCategory] = useState('All');
  const [episodes, setEpisodes] = useState<Media[]>([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeError, setEpisodeError] = useState('');
  const [sheetError, setSheetError] = useState('');
  const connection = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const active = demo ? null : vault.profiles.find(p => p.id === vault.activeId) || null;
  const provider = active?.provider || null;
  const favorites = demo ? demoFavorites : active?.favorites || [];
  const hiddenGroups = demo ? demoHidden : active?.hiddenGroups || [];
  const favoriteRef = useRef(favorites); favoriteRef.current = favorites;
  const allItems = useMemo(() => demo ? demoLibrary : cacheOwner.current === active?.id ? Object.values(cache).flatMap(items => items || []) : [], [demo, cache, active?.id]);
  const mediaById = useMemo(() => new Map(allItems.map(item => [item.id, item])), [allItems]);
  const saved = useMemo(() => favorites.flatMap(id => { const item = mediaById.get(id); return item ? [item] : []; }), [favorites, mediaById]);
  const viewing = demo ? demoActivity : activity.profile === active?.id ? activity.entries : [];
  const continueWatching = viewing.filter(entry => resumePosition(entry) > 0);
  const recentChannels = viewing.filter(entry => entry.item.kind === 'live').slice(0, 8);
  const playerName = players.find(p => p.id === preferences.player)?.name || 'NodeCast player';

  useEffect(() => {
    alive.current = true;
    Promise.all([loadVault(), loadPreferences().catch(() => ({ onboarded: false, player: 'internal' as const, baseline: null }))]).then(([loaded, prefs]) => {
      if (!alive.current) return;
      vaultRef.current = loaded; setVault(loaded); prefsRef.current = prefs; setPreferences(prefs);
    }).catch(() => { if (alive.current) { setStorageFailed(true); setMessage('Could not read saved settings. Your existing secure storage has not been cleared. Please restart the app before adding new profiles.'); } })
      .finally(() => { if (alive.current) setBooting(false); });
    return () => { alive.current = false; connection.current?.abort(); };
  }, []);
  function updateVault(update: (current: Vault) => Vault): Promise<void> {
    const operation = mutations.current.then(async () => {
      const next = update(vaultRef.current);
      await saveVault(next);
      vaultRef.current = next;
      if (alive.current) setVault(next);
    });
    mutations.current = operation.catch(() => {});
    return operation;
  }
  async function updatePreferences(update: Partial<Preferences>) {
    const next = { ...prefsRef.current, ...update };
    await savePreferences(next);
    prefsRef.current = next; setPreferences(next);
  }
  useEffect(() => { setSearch(''); setCategory('All'); }, [tab, section, active?.id, demo]);
  function refreshLibrary() { forceFetch.current = true; setRevision(value => value + 1); }
  useEffect(() => {
    if (!active || demo) return;
    let cancelled = false;
    const id = active.id;
    void readViewing(id).then(entries => { if (!cancelled) { const next = { profile: id, entries }; activityRef.current = next; setActivity(next); } })
      .catch(() => { if (!cancelled) setMessage('Saved viewing history could not be read. Your profiles are still available.'); });
    return () => { cancelled = true; };
  }, [active?.id, demo]);
  useEffect(() => {
    if (!provider || !active || demo || (tab === 'you' && sheet?.type !== 'organize')) { setLoading(false); setRefreshing(false); return; }
    const controller = new AbortController();
    const profileId = active.id;
    const forced = forceFetch.current; forceFetch.current = false;
    const needed: Section[] = provider.kind === 'm3u' ? ['live'] : tab === 'saved' || sheet?.type === 'organize'
      ? sections.map(s => s.id).filter(id => favoriteRef.current.some(key => key.startsWith(`${id}:`)))
      : searchScope === 'all' && deferredSearch.trim() ? ['live', 'movies', 'series'] : [tab === 'home' ? 'live' : section];
    setLibraryError(''); setLibraryNotice('');
    const memory = cacheOwner.current === profileId ? { ...cacheRef.current } : {};
    const updates = needed.filter(id => forced || memory[id] === undefined || Date.now() - (fetchedAt.current[id] || 0) > 30 * 60 * 1000);
    if (!updates.length) { setLoading(false); setRefreshing(false); return; }
    const hasMemory = needed.some(id => memory[id] !== undefined);
    setLoading(!hasMemory); setRefreshing(hasMemory); setLibraryError(''); setLibraryNotice('');
    const commit = (id: Section, items: Media[]) => {
      if (controller.signal.aborted || vaultRef.current.activeId !== profileId) return;
      const current = { ...memory, ...(cacheOwner.current === profileId ? cacheRef.current : {}) };
      cacheOwner.current = profileId;
      if (provider.kind === 'm3u') { current.live = items.filter(item => item.kind === 'live'); current.movies = items.filter(item => item.kind === 'movies'); current.series = []; }
      else current[id] = items;
      Object.assign(memory, current); cacheRef.current = current; setCache(current);
    };
    void (async () => {
      for (const id of updates) {
        if (controller.signal.aborted) return;
        if (memory[id] === undefined) {
          const saved = await readCatalog(profileId, id, provider);
          if (controller.signal.aborted) return;
          if (saved) {
            // M3U metadata can be browsed offline; its credential-bearing URLs must be reloaded before play.
            if (provider.kind === 'm3u') { memory[id] = saved.items; commit(id, saved.items); }
            else commit(id, saved.items);
            setLoading(false); setRefreshing(true); setLibraryNotice('Showing saved library while checking for updates.');
          }
        }
      }
      const results = await Promise.allSettled(updates.map(async id => {
        const items = await loadLibrary(provider, id, controller.signal);
        if (controller.signal.aborted) return;
        commit(id, items); fetchedAt.current[id] = Date.now();
        void writeCatalog(profileId, id, items).catch(() => { if (!controller.signal.aborted) setLibraryNotice('Library loaded. Offline browsing could not be saved on this device.'); });
      }));
      if (controller.signal.aborted) return;
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length) {
        if (needed.some(id => memory[id] !== undefined)) setLibraryNotice('Could not refresh everything. Available saved titles are still shown.');
        else {
          const result = failures[0] as PromiseRejectedResult;
          setLibraryError(result.reason instanceof ProviderError ? result.reason.message : 'Could not load your library. Try again.');
        }
      } else setLibraryNotice('');
      setLoading(false); setRefreshing(false);
    })();
    return () => controller.abort();
  }, [provider, active?.id, demo, tab, section, revision, searchScope, !!deferredSearch.trim(), sheet?.type === 'organize']);
  const currentSeries = sheet?.type === 'series' ? sheet.item : null;
  useEffect(() => {
    if (!currentSeries || !provider) return;
    const controller = new AbortController();
    setEpisodeLoading(true); setEpisodeError(''); setEpisodes([]);
    loadEpisodes(provider, currentSeries, controller.signal).then(items => { if (!controller.signal.aborted) setEpisodes(items); })
      .catch(error => { if (!controller.signal.aborted) setEpisodeError(error instanceof ProviderError ? error.message : 'Could not load episodes.'); })
      .finally(() => { if (!controller.signal.aborted) setEpisodeLoading(false); });
    return () => controller.abort();
  }, [currentSeries, provider]);

  function addProfile(profile?: Profile) { if (storageFailed) { setMessage('Saved profiles could not be read. Restart the app before adding or editing profiles to protect existing data.'); return; } setConnectError(''); setSheetError(''); setSheet({ type: 'provider', profile }); }
  function closeSheet() { if (!connecting) { setSheet(null); setSheetError(''); } }
  function browse(id: Section) { setCategory('All'); setSearch(''); setSection(id); setTab('watch'); }
  function startDemo() { connection.current?.abort(); setDemo(true); setCache({}); setTab('home'); setSheet(null); setDemoFavorites([]); setDemoHidden([]); setDemoActivity([]); setLibraryError(''); }
  async function connect(raw: Provider, editing?: Profile, selecting?: Profile) {
    connection.current?.abort();
    const controller = new AbortController(); connection.current = controller;
    setConnecting(true); setConnectError(''); setSheetError('');
    try {
      const normalized = normalizeProvider(raw);
      await authenticate(normalized, controller.signal);
      const items = await loadLibrary(normalized, 'live', controller.signal);
      if (controller.signal.aborted) return;
      const existing = editing || selecting;
      const sameProvider = existing && ['kind', 'address', 'username', 'password'].every(key => existing.provider[key as keyof Provider] === normalized[key as keyof Provider]);
      const nextProfile: Profile = { id: existing?.id || `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        provider: normalized, createdAt: existing?.createdAt || new Date().toISOString(), favorites: sameProvider ? existing.favorites : [], hiddenGroups: sameProvider ? existing.hiddenGroups : [], tracks: existing?.tracks, liveFormat: sameProvider ? existing.liveFormat : 'auto' };
      if (existing && !sameProvider) await clearProfileData(existing.id);
      await updateVault(current => {
        if (controller.signal.aborted) throw new Error('Cancelled');
        if (!existing && current.profiles.length >= 30) throw new Error('Profile limit');
        return { ...current, activeId: nextProfile.id, profiles: [...current.profiles.filter(p => p.id !== nextProfile.id), nextProfile] };
      });
      if (controller.signal.aborted || !alive.current) return;
      cacheOwner.current = nextProfile.id; fetchedAt.current = { live: Date.now() };
      setCache(normalized.kind === 'm3u' ? { live: items.filter(i => i.kind === 'live'), movies: items.filter(i => i.kind === 'movies'), series: [] } : { live: items });
      if (!sameProvider) { const empty = { profile: nextProfile.id, entries: [] as ViewingEntry[] }; activityRef.current = empty; setActivity(empty); }
      void writeCatalog(nextProfile.id, 'live', items).catch(() => {});
      setDemo(false); setSection('live'); setSheet(null); setTab('home'); setLibraryError('');
    } catch (error) {
      if (!controller.signal.aborted) {
        const text = error instanceof ProviderError ? error.message : 'Could not connect or save this profile securely. Check your details and try again. Up to 30 profiles can be saved.';
        setConnectError(text); setSheetError(text);
      }
    } finally { if (!controller.signal.aborted && alive.current) setConnecting(false); }
  }
  function toggleFavorite(item: Media) {
    if (demo) { setDemoFavorites(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]); return; }
    if (!active) return;
    const id = active.id;
    void updateVault(current => ({ ...current, profiles: current.profiles.map(p => p.id !== id ? p : { ...p, favorites: p.favorites.includes(item.id) ? p.favorites.filter(key => key !== item.id) : [...p.favorites, item.id] }) }))
      .catch(() => setMessage('Could not save your favorite on this iPhone. Please try again.'));
  }
  function saveProgress(item: Media, snapshot: PlaybackSnapshot) {
    if (demo) { setDemoActivity(entries => recordViewing(entries, item, snapshot)); return; }
    if (!active) return;
    const profileId = active.id;
    const previous = activityRef.current.profile === profileId ? activityRef.current.entries : [];
    const entries = recordViewing(previous, item, snapshot);
    const next = { profile: profileId, entries }; activityRef.current = next; setActivity(next);
    void writeViewing(profileId, entries).catch(() => setMessage('Viewing progress could not be saved on this device.'));
  }
  function removeViewing(id?: string) {
    if (demo) { setDemoActivity(entries => id ? entries.filter(entry => entry.item.id !== id) : []); return; }
    if (!active) return;
    const entries = id ? viewing.filter(entry => entry.item.id !== id) : [];
    const next = { profile: active.id, entries }; activityRef.current = next; setActivity(next);
    void writeViewing(active.id, entries).catch(() => setMessage('Could not update viewing history.'));
  }
  async function launch(item: Media, startOver = false, destination: 'default' | 'internal' | 'external' = 'default') {
    let playable = item;
    if (!item.url && provider) {
      playable = hydrateMedia(item, provider);
      if (!playable.url && provider.kind === 'm3u') {
        setMessage('Refreshing your playlist to open this saved title…');
        const owner = active?.id;
        try {
          const items = await loadLibrary(provider, 'live');
          if (vaultRef.current.activeId !== owner) return;
          const match = items.find(candidate => candidate.id === item.id);
          if (!match?.url) { setMessage('This title is no longer available in the provider’s playlist.'); return; }
          playable = match; setMessage('');
        } catch { setMessage('Connect to your provider to play a title from the saved library.'); return; }
      }
    }
    if (!playable.url) { setMessage('This title has no playable stream. Refresh the playlist and try again.'); return; }
    playable = preparePlayback(playable, provider, active?.liveFormat || 'auto');
    const progress = viewing.find(entry => entry.item.id === item.id);
    if (destination === 'internal' || (destination === 'default' && preferences.player === 'internal')) setSheet({ type: 'player', item: playable, resumeAt: startOver ? 0 : resumePosition(progress) });
    else setSheet({ type: 'external', item: playable, preferred: preferences.player === 'vlc' || preferences.player === 'infuse' ? preferences.player : undefined });
  }
  function play(item: Media) {
    setSheetError('');
    if (item.kind === 'series' && !item.url) { setSheet({ type: 'series', item }); return; }
    if (item.kind === 'movies') { setSheet({ type: 'details', item }); return; }
    void launch(item);
  }
  async function deleteSavedProfile(profile: Profile) {
    setConnecting(true); setSheetError('');
    try {
      await updateVault(current => removeProfile(current, profile.id));
      await clearProfileData(profile.id);
      if (active?.id === profile.id) { setCache({}); setDemo(false); }
      setSheet({ type: 'profiles' });
    } catch { setSheetError('Could not delete this profile. Try again.'); }
    finally { setConnecting(false); }
  }
  const includeHidden = searchScope === 'all' && !!deferredSearch.trim();
  const library = useMemo(() => tab === 'saved' ? saved : includeHidden ? allItems : allItems.filter(item => item.kind === section), [tab, saved, includeHidden, allItems, section]);
  const groups = ['All', ...Array.from(new Set(library.filter(item => !hiddenGroups.includes(item.group)).map(item => item.group))).sort()];
  const index = useMemo(() => createSearchIndex(library), [library]);
  const filtered = useMemo(() => searchIndex(index, deferredSearch, deferredSearch.trim() ? 'All' : category, hiddenGroups, includeHidden || tab === 'saved'), [index, deferredSearch, category, hiddenGroups, includeHidden, tab]);
  const preview = saved.length ? saved.slice(0, 6) : demo ? [...demoLibrary.filter(i => i.kind === 'movies'), ...demoLibrary.filter(i => i.kind === 'live')].slice(0, 6) : allItems.slice(0, 6);
  const connected = !!provider || demo;
  const posterLayout = tab === 'watch' && section !== 'live' && !includeHidden;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const sheetTitle = !sheet ? '' : sheet.type === 'provider' ? sheet.profile ? 'Edit profile' : 'Add a profile' : sheet.type === 'profiles' ? 'Your profiles' : sheet.type === 'players' ? 'Playback preferences' : sheet.type === 'delete' ? 'Remove profile' : sheet.type === 'series' || sheet.type === 'details' ? sheet.item.name : sheet.type === 'player' ? sheet.item.name : sheet.type === 'external' ? 'Choose your player' : sheet.type === 'guide' ? 'TV guide' : sheet.type === 'organize' ? 'Library options' : sheet.type === 'history' ? 'Version history' : 'Privacy & storage';
  const darkSheet = sheet?.type === 'player';
  if (booting) return <SafeAreaView style={[u.root, u.center]}><ActivityIndicator color={colors.accent} /><Text style={u.small}>Making yourself at home…</Text></SafeAreaView>;
  if (!preferences.onboarded && !active && !demo && !sheet) return <WelcomeScreen onStart={() => { void updatePreferences({ onboarded: true }).then(() => addProfile()).catch(() => setMessage('Could not save preferences. Try again.')); }} onDemo={() => { void updatePreferences({ onboarded: true }).catch(() => setMessage('Could not save preferences.')); startDemo(); }} />;
  return <SafeAreaView style={u.root} edges={['top', 'bottom', 'left', 'right']}><StatusBar barStyle="dark-content" />
    <View style={s.header}><IconButton name="options-outline" label="Settings" onPress={() => setTab('you')} /><Pressable accessibilityRole="button" accessibilityLabel="NodeCast home" onPress={() => setTab('home')}><Text style={s.wordmark}>nodecast<Text style={{ color: colors.accent }}>.</Text></Text></Pressable><IconButton name="add" label="Add playlist" onPress={() => addProfile()} /></View>
    {!!message && <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}><Notice danger>{message}</Notice><Pressable onPress={() => setMessage('')} accessibilityRole="button" style={{ alignSelf: 'flex-end', padding: 8 }}><Text style={u.link}>Dismiss</Text></Pressable></View>}
    {tab === 'home' ? <HomeScreen active={active} demo={demo} profileCount={vault.profiles.length} loading={loading} liveCount={demo ? demoLibrary.filter(i => i.kind === 'live').length : cache.live?.length}
      preview={preview} savedCount={saved.length} playerName={playerName} error={libraryError}
      onAdd={() => addProfile()} onDemo={startDemo} onProfiles={() => { setSheetError(''); setSheet({ type: 'profiles' }); }}
      continueWatching={continueWatching} recentChannels={recentChannels.map(entry => allItems.find(item => item.id === entry.item.id) || (provider ? hydrateMedia(entry.item, provider) : entry.item))} onResume={entry => { void launch(allItems.find(item => item.id === entry.item.id) || entry.item, false, 'internal'); }} onRemove={id => removeViewing(id)}
      onBrowse={browse} onSaved={() => setTab('saved')} onPlay={play} onPlayers={() => setSheet({ type: 'players' })}
      network={<NetworkCard baseline={preferences.baseline} onBaseline={value => updatePreferences({ baseline: value })} />}
    /> : tab === 'you' ? <ScrollView contentContainerStyle={u.content} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 7, paddingTop: 13 }}><Text style={u.small}>Make NodeCast yours</Text><Text style={u.h1}>Settings</Text></View>
      <View style={[u.card, { backgroundColor: '#fff' }]}><View style={u.row}><View style={[s.avatar, { backgroundColor: '#EEEDFB', width: 54, height: 54 }]}><Icon name="person-outline" size={26} /></View><View style={{ flex: 1, gap: 5 }}><Text style={u.h2}>Your personal library</Text><Text style={u.small}>{vault.profiles.length} saved {vault.profiles.length === 1 ? 'profile' : 'profiles'} · No account required</Text></View></View><Text style={u.body}>Saved locally. Ready when you are.</Text></View>
      <View style={s.settingsGroup}><SettingsRow icon="people-outline" title="Saved profiles" subtitle="Servers, playlists, and favorites" trailing={String(vault.profiles.length)} onPress={() => { setSheetError(''); setSheet({ type: 'profiles' }); }} /><View style={u.divider} /><SettingsRow icon="play-circle-outline" title="Default player" subtitle={playerName} onPress={() => setSheet({ type: 'players' })} /><View style={u.divider} /><SettingsRow icon="options-outline" title="Library organization" subtitle="Categories, search, and favorites order" onPress={() => setSheet({ type: 'organize' })} /><View style={u.divider} /><SettingsRow icon="lock-closed-outline" title="Privacy & storage" subtitle="What stays on your device" onPress={() => setSheet({ type: 'privacy' })} /><View style={u.divider} /><SettingsRow icon="time-outline" title="Version history" subtitle={`What’s new · ${appVersion}`} onPress={() => setSheet({ type: 'history' })} /></View>
      {demo && <Button title="Leave demo" variant="secondary" onPress={() => { setDemo(false); setCache({}); setTab('home'); }} />}
      <View style={{ gap: 9 }}><Text style={u.eyebrow}>MADE FOR YOUR LIBRARY</Text><Text style={u.body}>NodeCast is a player for content you provide. It doesn’t supply IPTV channels or subscriptions.</Text><Text style={u.small}>{`NodeCast ${appVersion} · GPL-3.0-only\nIndependent iOS-style design. Chime is not affiliated with this app.`}</Text></View>
    </ScrollView> : <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 13, paddingBottom: 20, gap: 7 }}><Text style={u.body}>{tab === 'saved' ? 'Your personal collection' : demo ? 'Demo library' : active?.provider.name || 'Your playlists, beautifully organized'}</Text><Text style={u.h1}>{tab === 'saved' ? 'Favorites' : 'Library'}</Text></View>
      {!connected ? <Empty icon={tab === 'saved' ? 'heart-outline' : 'tv-outline'} title={tab === 'saved' ? 'Keep the good ones close' : 'Your library starts here'} message="Add a provider or explore the demo to start watching."><Button title="Connect my provider" onPress={() => addProfile()} /><Button title="Explore demo" variant="secondary" onPress={startDemo} /></Empty> : <>
        {tab === 'watch' && <View style={s.segment}>{sections.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: section === item.id }} onPress={() => { setCategory('All'); setSection(item.id); }} style={[s.segmentItem, section === item.id && { backgroundColor: '#B9B4F2', shadowOpacity: 0 }]}><Text style={{ color: colors.text, fontWeight: section === item.id ? '700' : '500', fontSize: 13 }}>{item.title}</Text></Pressable>)}</View>}
        <View style={s.search}><Icon name="search-outline" size={19} color={colors.secondary} /><TextInput value={search} onChangeText={value => { setSearch(value); setCategory('All'); }} returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} autoCapitalize="none" placeholder={tab === 'saved' ? 'Search your favorites' : 'Search your library'} accessibilityLabel="Search library" placeholderTextColor={colors.secondary} style={{ flex: 1, paddingVertical: 14, color: colors.text, fontSize: 14 }} autoCorrect={false} />{!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}><Icon name="close-circle" size={19} color={colors.secondary} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Library options" onPress={() => { setSheetError(''); setSheet({ type: 'organize' }); }} style={{ padding: 8 }}><Icon name="options-outline" size={20} color={colors.secondary} /></Pressable></View>
        {!search.trim() && <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>{groups.map(group => <Pressable key={group} accessibilityRole="button" onPress={() => setCategory(group)} style={[s.category, category === group && { backgroundColor: colors.accent }]}><Text style={{ color: category === group ? '#fff' : colors.secondary, fontSize: 12, fontWeight: '600' }}>{group}</Text></Pressable>)}</ScrollView></View>}
        {!!search.trim() && <Text accessibilityLiveRegion="polite" style={[u.small, { paddingHorizontal: 20, paddingVertical: 10 }]}>{filtered.length} results · {tab === 'saved' ? 'Your favorites' : includeHidden ? 'All media, including hidden groups' : `${sections.find(item => item.id === section)?.title} · All visible categories`}</Text>}
        <View style={[u.between, { paddingHorizontal: 20, paddingBottom: 10 }]}>{provider?.kind === 'xtream' && section === 'live' && tab === 'watch' && <Pressable accessibilityRole="button" accessibilityLabel="Open TV guide" onPress={() => setSheet({ type: 'guide' })} style={[u.row, { gap: 5 }]}><Icon name="calendar-outline" size={15} color={colors.accent} /><Text style={u.link}>Now & next</Text></Pressable>}<Text style={[u.small, { flex: 1 }]}>{refreshing ? 'Updating library…' : libraryNotice || (includeHidden ? 'Searching all media, including hidden groups' : '')}</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh library" disabled={refreshing} onPress={refreshLibrary} hitSlop={10} style={{ padding: 5 }}>{refreshing ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="refresh-outline" size={17} color={colors.secondary} />}</Pressable></View>
        {loading ? <View style={u.center}><ActivityIndicator color={colors.accent} /><Text style={u.small}>Bringing your library together…</Text></View> : libraryError ? <Empty icon="cloud-offline-outline" title="A little trouble connecting" message={libraryError}><Button title="Try again" onPress={refreshLibrary} /></Empty> : <FlatList keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" key={posterLayout ? 'posters' : 'rows'} numColumns={posterLayout ? 2 : 1} columnWrapperStyle={posterLayout ? { gap: 14 } : undefined} data={filtered} keyExtractor={item => item.id} initialNumToRender={12} windowSize={7} contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 114 }, !filtered.length && { flex: 1 }]}
          ListHeaderComponent={filtered.length ? <View style={[u.between, { paddingBottom: 5 }]}><Text style={u.eyebrow}>{tab === 'saved' ? 'SAVED FOR YOU' : 'YOUR LIBRARY'}</Text><Text style={u.small}>{filtered.length.toLocaleString()} {section === 'live' && tab !== 'saved' ? 'channels' : 'titles'}</Text></View> : undefined}
          ListEmptyComponent={<Empty icon={tab === 'saved' ? 'heart-outline' : 'search-outline'} title={tab === 'saved' ? 'Your favorites belong here' : 'Nothing here just yet'} message={tab === 'saved' ? 'Tap the heart beside a channel, movie, or series. We’ll keep it here for this profile.' : section === 'series' && (demo || provider?.kind === 'm3u') ? 'Use an Xtream Codes profile for a structured series and episode library.' : 'Try another search or category, or check the library supplied by your provider.'} />}
          renderItem={({ item }) => posterLayout ? <View style={{ flex: 1, maxWidth: '50%', marginBottom: 20, gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={() => play(item)} style={{ gap: 10 }}><View style={{ aspectRatio: 0.73, width: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: '#E5E1F5' }}><Artwork item={item} poster /></View><Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${favorites.includes(item.id) ? 'Remove' : 'Add'} ${item.name} ${favorites.includes(item.id) ? 'from' : 'to'} favorites`} onPress={() => toggleFavorite(item)} style={{ position: 'absolute', right: 10, top: 10, width: 31, height: 31, borderRadius: 18, backgroundColor: '#FFFFFFEE', alignItems: 'center', justifyContent: 'center' }}><Icon name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={17} color={colors.accent} /></Pressable></View> : <View style={s.mediaRow}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={() => play(item)} style={[u.row, { flex: 1, gap: 14 }]}><Artwork item={item} /><View style={{ flex: 1, gap: 6 }}><Text numberOfLines={2} style={[u.label, { fontSize: 14, lineHeight: 20 }]}>{item.name}</Text><View style={[u.row, { gap: 7 }]}>{item.kind === 'live' && <View style={s.liveTag}><Text style={{ color: colors.accent, fontSize: 8, fontWeight: '800', letterSpacing: .5 }}>LIVE</Text></View>}<Text numberOfLines={1} style={[u.small, { flex: 1 }]}>{demo ? 'Public sample' : item.group}</Text></View></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${favorites.includes(item.id) ? 'Remove' : 'Add'} ${item.name} ${favorites.includes(item.id) ? 'from' : 'to'} favorites`} onPress={() => toggleFavorite(item)} style={{ padding: 10 }}><Icon name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={21} color={favorites.includes(item.id) ? colors.accent : '#9894A3'} /></Pressable></View>}
        />}
      </>}
    </View>}
    <View style={[s.tabBar, { bottom: Math.max(insets.bottom, 12) }]}>{tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{ selected: tab === item.id }} onPress={() => setTab(item.id)} style={s.tab}><View style={[s.tabIcon, tab === item.id && { backgroundColor: '#B9B4F2' }]}><Icon name={tab === item.id ? item.selected : item.icon} size={22} color={tab === item.id ? '#FFFFFF' : '#C7C3D0'} /></View><Text style={{ color: tab === item.id ? '#FFFFFF' : '#C7C3D0', fontSize: 10, fontWeight: tab === item.id ? '700' : '500' }}>{item.title}</Text></Pressable>)}</View>
    <Modal visible={sheet !== null} animationType="slide" presentationStyle="fullScreen" supportedOrientations={darkSheet ? ['portrait', 'landscape'] : ['portrait']} onRequestClose={closeSheet}>
      <SafeAreaProvider><SafeAreaView style={[u.root, darkSheet && { backgroundColor: '#090124' }]} edges={['top', 'bottom', 'left', 'right']}><StatusBar barStyle={darkSheet ? 'light-content' : 'dark-content'} /><View style={[u.modalHeader, { paddingHorizontal: 16, gap: 10, minHeight: 64 }]}><Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={connecting} onPress={closeSheet} hitSlop={8} style={[u.row, { minHeight: 44, gap: 3 }]}><Icon name="chevron-back" color={darkSheet ? '#fff' : colors.text} size={21} /><Text style={{ color: darkSheet ? '#fff' : colors.text, fontSize: 15, fontWeight: '600' }}>Back</Text></Pressable><Text numberOfLines={1} style={[u.label, { flex: 1, textAlign: 'center', fontSize: 14 }, darkSheet && { color: '#fff' }]}>{sheetTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel={sheet?.type === 'player' ? 'Close player' : sheet?.type === 'series' ? 'Close episodes' : 'Close sheet'} disabled={connecting} onPress={closeSheet} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: darkSheet ? '#B9B4F2' : colors.accent, fontSize: 15, fontWeight: '600' }}>Close</Text></Pressable></View>
        {sheet?.type === 'history' && <ScrollView contentContainerStyle={u.content}><View style={{ gap: 10 }}><Text style={u.h1}>Getting better, together.</Text><Text style={u.body}>What changed in each version of NodeCast.</Text></View>{releases.map((release, index) => <View key={release.version} style={[u.card, index === 0 && { backgroundColor: colors.pale }]}><Text style={u.eyebrow}>{release.version}{index === 0 ? ' · CURRENT' : ''} · {release.date}</Text><Text style={u.h2}>{release.title}</Text>{release.changes.map(change => <View key={change} style={[u.row, { alignItems: 'flex-start', gap: 10 }]}><Text style={{ color: colors.accent }}>•</Text><Text style={[u.body, { flex: 1 }]}>{change}</Text></View>)}</View>)}</ScrollView>}
        {sheet?.type === 'guide' && provider?.kind === 'xtream' && <GuideScreen provider={provider} channels={allItems.filter(item => item.kind === 'live')} favorites={favorites} onPlay={item => { void launch(item); }} />}
        {sheet?.type === 'organize' && <><LibraryOptions scope={searchScope} onScope={value => { setSearchScope(value); setCategory('All'); }} groups={Array.from(new Set(allItems.map(item => item.group))).sort()} hidden={hiddenGroups} favorites={saved} onToggle={group => { if (demo) { setDemoHidden(current => current.includes(group) ? current.filter(item => item !== group) : [...current, group]); return; } if (!active) return; void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, hiddenGroups: profile.hiddenGroups?.includes(group) ? profile.hiddenGroups.filter(item => item !== group) : [...(profile.hiddenGroups || []), group] } : profile) })).catch(() => setSheetError('Could not save category preferences.')); }} onMove={(id, direction) => { if (demo) { setDemoFavorites(current => { const next = [...current], index = next.indexOf(id), target = index + direction; if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]; return next; }); return; } if (!active) return; void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => { if (profile.id !== active.id) return profile; const next = [...profile.favorites], index = next.indexOf(id), target = index + direction; if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]; return { ...profile, favorites: next }; }) })).catch(() => setSheetError('Could not save favorites order.')); }} />{!!sheetError && <Notice danger>{sheetError}</Notice>}</>}
        {sheet?.type === 'provider' && <ProviderSheet key={sheet.profile?.id || 'new'} profile={sheet.profile} busy={connecting} error={connectError} onSave={(raw, profile) => { void connect(raw, profile); }} />}
        {sheet?.type === 'profiles' && <ScrollView contentContainerStyle={u.content}><View style={{ gap: 9 }}><Text style={u.h1}>{'Your playlists'}</Text><Text style={u.body}>Switch profiles or add a new provider. Your favorites stay separate.</Text></View>{vault.profiles.map(profile => <View key={profile.id} style={[u.card, { borderWidth: 0, padding: 18 }]}><View style={u.between}><View style={{ flex: 1, gap: 6 }}><Text style={u.h2}>{profile.provider.name}</Text><Text style={u.small}>{profile.provider.kind === 'xtream' ? 'Xtream Codes' : 'M3U playlist'}{active?.id === profile.id ? ' · Active' : ''}</Text></View><Icon name="server-outline" color={colors.accent} /></View><Button title={active?.id === profile.id ? 'Reconnect profile' : 'Use this profile'} busy={connecting} onPress={() => { void connect(profile.provider, undefined, profile); }} /><View style={u.between}><Pressable accessibilityRole="button" disabled={connecting} onPress={() => addProfile(profile)}><Text style={u.link}>Edit details</Text></Pressable><Pressable accessibilityRole="button" disabled={connecting} onPress={() => { setSheetError(''); setSheet({ type: 'delete', profile }); }}><Text style={[u.link, { color: colors.danger }]}>Remove</Text></Pressable></View></View>)}{!!sheetError && <Notice danger>{sheetError}</Notice>}{!vault.profiles.length && <Notice>No saved profiles yet. Add your first provider to make this space yours.</Notice>}<Button title="Add a profile" icon="add" disabled={connecting || vault.profiles.length >= 30} onPress={() => addProfile()} /><Text style={u.small}>{Platform.OS === 'web' ? 'Browser preview keeps profiles only for this running session. Use Expo Go for device persistence.' : 'Protected by iOS secure storage on this device. No account, password to remember, or cloud backup.'}</Text></ScrollView>}
        {sheet?.type === 'players' && <ScrollView contentContainerStyle={u.content}><View style={{ gap: 10 }}><Text style={u.h1}>Playback</Text><Text style={u.body}>Choose your default. You can use the built-in player or open streams in an app you already love.</Text></View><View style={s.settingsGroup}>{players.map((player, index) => <React.Fragment key={player.id}>{index > 0 && <View style={u.divider} />}<Pressable accessibilityRole="radio" accessibilityState={{ checked: preferences.player === player.id }} onPress={() => { void updatePreferences({ player: player.id }).catch(() => setSheetError('Could not save your player preference.')); }} style={s.settingsRow}><View style={[s.rowIcon, { backgroundColor: preferences.player === player.id ? colors.mint : colors.pale }]}><Icon name={player.id === 'internal' ? 'play-circle-outline' : player.id === 'ask' ? 'options-outline' : 'open-outline'} /></View><View style={{ flex: 1, gap: 5 }}><Text style={u.label}>{player.name}</Text><Text style={u.small}>{player.detail}</Text></View><Icon name={preferences.player === player.id ? 'checkmark-circle' : 'ellipse-outline'} color={preferences.player === player.id ? colors.accent : '#D2CFDF'} /></Pressable></React.Fragment>)}</View>{provider?.kind === 'xtream' && active && <View style={u.card}><Text style={u.h2}>Live TV format</Text><Text style={u.small}>Applies to {active.provider.name}. Movies keep their original format. MPEG-TS may require VLC; it is not supported by every iPhone stream.</Text>{liveFormats.map(format => <Pressable key={format.id} accessibilityRole="radio" accessibilityLabel={format.title} aria-checked={(active.liveFormat || 'auto') === format.id} accessibilityState={{ checked: (active.liveFormat || 'auto') === format.id }} onPress={() => { void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, liveFormat: format.id } : profile) })).catch(() => setSheetError('Could not save the live format.')); }} style={[u.row, { paddingVertical: 10 }]}><Icon name={(active.liveFormat || 'auto') === format.id ? 'radio-button-on' : 'radio-button-off'} color={colors.accent} /><View style={{ flex: 1, gap: 4 }}><Text style={u.label}>{format.title}</Text><Text style={u.small}>{format.detail}</Text></View></Pressable>)}</View>}<Notice>External apps must be installed separately. Before opening one, you’ll see a reminder that the stream URL may contain provider credentials.</Notice>{!!sheetError && <Notice danger>{sheetError}</Notice>}<Text style={u.small}>VLC and Infuse are independent apps. Some handoffs or formats may not work in Expo Go and require an independently built app. Your choice is saved on this device.</Text></ScrollView>}
        {sheet?.type === 'delete' && <View style={u.content}><Text style={u.h1}>Remove this profile?</Text><Text style={u.body}>{sheet.profile.provider.name} and its saved favorites will be removed from this iPhone. This does not cancel your IPTV subscription.</Text>{!!sheetError && <Notice danger>{sheetError}</Notice>}<Button title="Remove profile" variant="danger" busy={connecting} onPress={() => { void deleteSavedProfile(sheet.profile); }} /><Button title="Keep profile" variant="secondary" disabled={connecting} onPress={() => setSheet({ type: 'profiles' })} /></View>}
        {sheet?.type === 'privacy' && <ScrollView contentContainerStyle={u.content}><Text style={u.h1}>{'Private by design.\nSimple by choice.'}</Text><Button title="Clear this profile’s viewing history" variant="secondary" disabled={!viewing.length} onPress={() => removeViewing()} /><View style={u.card}><Text style={u.h2}>On this iPhone</Text><Text style={u.body}>Server details, passwords, playlist links, and profile favorites use iOS secure storage. Player preferences, viewing history, and your optional reference IP use local app storage. The browsing cache stores only titles and metadata, without provider passwords or stream URLs. There is no account or cloud sync.</Text></View><View style={u.card}><Text style={u.h2}>When you connect</Text><Text style={u.body}>Your provider receives the details needed to load and play its content. Artwork loads from URLs supplied by your provider. Prefer HTTPS; HTTP is unencrypted.</Text></View><View style={u.card}><Text style={u.h2}>The IP check</Text><Text style={u.body}>ipwho.is sees your public IP when you open Home or refresh. We show approximate city/country information, not GPS location. Neither an IP change nor an IP match verifies whether a VPN is on. No IPTV credentials are sent with IP lookups.</Text></View><View style={u.card}><Text style={u.h2}>External players</Text><Text style={u.body}>Opening VLC or Infuse sends it the complete stream URL, which may include your provider credentials. Only choose apps you trust.</Text></View><Text style={u.small}>Browser preview keeps provider details in memory. Local profiles do not sync to other devices. There is no in-app cloud backup or account recovery. Secure storage availability and uninstall behavior follow iOS and Expo Go; do not rely on this app as your only copy of provider details. Secure storage does not protect data already visible on an unlocked device.</Text></ScrollView>}
        {sheet?.type === 'series' && (episodeLoading ? <View style={u.center}><ActivityIndicator color={colors.accent} /><Text style={u.small}>Finding your episodes…</Text></View> : episodeError ? <Empty icon="alert-circle-outline" title="Couldn’t load episodes" message={episodeError} /> : <FlatList data={episodes} keyExtractor={i => i.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 114 }} ListEmptyComponent={<Empty icon="albums-outline" title="No episodes just yet" message="Your provider hasn’t returned any episodes for this series." />} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => play(item)} style={s.mediaRow}><Icon name="play-circle-outline" size={30} color={colors.accent} /><View style={{ flex: 1, gap: 5 }}><Text style={u.label}>{item.name}</Text><Text style={u.small}>{item.group}</Text></View><Icon name="chevron-forward" size={16} /></Pressable>} />)}
        {sheet?.type === 'details' && <ScrollView contentContainerStyle={u.content}><View style={{ alignItems: 'center', backgroundColor: '#EEEDFB', borderRadius: 28, paddingVertical: 24 }}><View style={{ width: 168, height: 232, borderRadius: 21, overflow: 'hidden', shadowColor: '#090124', shadowOpacity: .15, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } }}><Artwork item={sheet.item} poster /></View></View><View style={{ gap: 10 }}><Text style={u.h1}>{sheet.item.name}</Text><View style={u.between}><Text style={u.body}>{sheet.item.group}{sheet.item.rating ? ` · ${sheet.item.rating}` : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Save movie to favorites" onPress={() => toggleFavorite(sheet.item)} style={{ padding: 6 }}><Icon name={favorites.includes(sheet.item.id) ? 'heart' : 'heart-outline'} color={colors.accent} /></Pressable></View></View><Button title={resumePosition(viewing.find(entry => entry.item.id === sheet.item.id)) ? `Resume in NodeCast · ${timeLabel(resumePosition(viewing.find(entry => entry.item.id === sheet.item.id)))}` : 'Play movie'} icon="play" onPress={() => { void launch(sheet.item, false, resumePosition(viewing.find(entry => entry.item.id === sheet.item.id)) ? 'internal' : 'default'); }} />{resumePosition(viewing.find(entry => entry.item.id === sheet.item.id)) > 0 && <Pressable accessibilityRole="button" onPress={() => { void launch(sheet.item, true); }} style={{ alignItems: 'center', padding: 8 }}><Text style={u.link}>Start over</Text></Pressable>}<Button title="Choose another player" variant="secondary" onPress={() => { void launch(sheet.item, false, 'external'); }} /><View style={{ gap: 10 }}><Text style={u.label}>About this title</Text><Text style={u.body}>{sheet.item.description || 'No description was provided by this playlist.'}</Text></View><Text style={u.small}>{demo ? 'Public sample film · Demo library' : `From ${active?.provider.name || 'your playlist'}`}</Text></ScrollView>}
        {sheet?.type === 'player' && <Player onClose={closeSheet} key={sheet.item.id} item={sheet.item} resumeAt={sheet.resumeAt} tracks={active?.tracks} onProgress={snapshot => saveProgress(sheet.item, snapshot)} onTracks={tracks => { if (active) void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, tracks } : profile) })).catch(() => setMessage('Could not save language preferences.')); }} onExternal={() => setSheet({ type: 'external', item: sheet.item })} />}
        {sheet?.type === 'external' && <ScrollView><ExternalSheet key={sheet.item.id} item={sheet.item} preferred={sheet.preferred} onInternal={() => setSheet({ type: 'player', item: sheet.item, resumeAt: resumePosition(viewing.find(entry => entry.item.id === sheet.item.id)) })} onOpened={() => setSheet(null)} /></ScrollView>}
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </SafeAreaView>;
}
export default function App() { const [loaded, error] = useFonts({ CrimsonText: require('./assets/fonts/CrimsonText-Regular.ttf') }); if (!loaded && !error) return <View style={[u.root, u.center]}><ActivityIndicator color={colors.accent} /></View>; return <SafeAreaProvider><NodeCast /></SafeAreaProvider>; }
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  wordmark: { fontSize: 25, color: colors.text, letterSpacing: -1.3, fontWeight: '800' }, brandIcon: { width: 33, height: 33, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEEDFB', borderColor: '#EAE9EE', borderWidth: 1 },
  shortcut: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 21, backgroundColor: '#fff' },
  artwork: { width: 58, height: 62, borderRadius: 16, backgroundColor: '#EEEDFB', alignItems: 'center', justifyContent: 'center', padding: 7, overflow: 'hidden' },
  poster: { width: '100%', height: '100%', borderRadius: 20, padding: 0, gap: 16 },
  settingsGroup: { borderRadius: 24, borderWidth: 0, borderColor: colors.line, backgroundColor: '#fff', overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 13 }, rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  tabBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', backgroundColor: '#111111', borderRadius: 38, paddingTop: 9, paddingBottom: 8, paddingHorizontal: 7, shadowColor: '#090124', shadowOpacity: .13, shadowRadius: 18, shadowOffset: { width: 0, height: 7 } }, tab: { flex: 1, alignItems: 'center', gap: 4 }, tabIcon: { width: 48, height: 32, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  segment: { marginHorizontal: 20, flexDirection: 'row', padding: 5, borderRadius: 17, backgroundColor: '#EAE9EE' }, segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 13, shadowOpacity: 0 },
  search: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 9 },
  categories: { paddingHorizontal: 20, paddingVertical: 18, gap: 8 }, category: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22 },
  mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 13, marginBottom: 9, borderRadius: 21, backgroundColor: '#FFFFFF' }, liveTag: { backgroundColor: '#EEEDFB', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
});
