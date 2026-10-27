import SearchScopeControl from './src/SearchScope';
import type { SearchScope } from './src/SearchScope';
import ChannelPlaybackOptions from './src/ChannelPlaybackOptions';
import { resolvePlayback, setChannelPlayback } from './src/viewingPreferences';
import type { ChannelPlayback } from './src/viewingPreferences';
import SeriesEpisodes from './src/SeriesEpisodes';
import { followingEpisode } from './src/episodes';
import RetainedList from './src/RetainedList';
import { useFonts } from 'expo-font';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Media, Provider, Section } from './src/provider';
import { authenticate, loadEpisodes, loadLibrary, normalizeProvider, ProviderError } from './src/provider';
import type { Profile, Vault } from './src/vault';
import { emptyVault, removeProfile } from './src/vault';
import { loadPreferences, loadVault, savePreferences, saveVault } from './src/storage';
import type { Preferences } from './src/storage';
import type { ExternalPlayer, PlayerChoice } from './src/players';
import { players as allPlayers } from './src/players';
import { demoLibrary } from './src/demo';
import NetworkCard from './src/NetworkCard';
import HomeScreen from './src/HomeScreen';
import WelcomeScreen from './src/WelcomeScreen';
import ProviderSheet from './src/ProviderSheet';
import BuiltInPlayer from './src/BuiltInPlayer';
import { hasCompatibilityPlayer } from './src/nativePlayback';
import LibraryOptions from './src/LibraryOptions';
import GuideScreen from './src/GuideScreen';
import ExternalSheet from './src/ExternalSheet';
import { preparePlayback } from './src/livePlayback';
import { appVersion } from './src/releases';
import PlaybackSettings from './src/PlaybackSettings';
import VersionHistory from './src/VersionHistory';
import HomeIPSetup from './src/HomeIPSetup';
import StartupSplash from './src/StartupSplash';
import { NavigationMotionProvider, TabScene, MovingTabBar, PageTransition, useReducedMotion, useRetainedModal } from './src/NavigationMotion';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
void SplashScreen.preventAutoHideAsync().catch(() => {});
import { Button, Empty, Icon, IconButton, Notice, SectionHeading, colors, u } from './src/ui';
import type { IconName } from './src/ui';
import { createSearchIndex, searchIndex, hydrateMedia } from './src/catalog';
import { recordViewing, resumePosition, timeLabel, markWatched } from './src/activity';
import type { PlaybackSnapshot, ViewingEntry } from './src/activity';
import { clearProfileData, readCatalog, writeCatalog, readViewing, writeViewing } from './src/libraryStore';

const players = allPlayers.filter(player => Platform.OS !== 'android' || player.id !== 'infuse');
const emptyIds: string[] = [];
// Web's full-screen portal shares window insets; measuring inside its slide animation gives stale offsets.
const ModalSafeAreaProvider = Platform.OS === 'web' ? View : SafeAreaProvider;
type Tab = 'home' | 'watch' | 'saved' | 'you';
type Sheet = { type: 'provider'; profile?: Profile } | { type: 'profiles' } | { type: 'players' } |
  { type: 'delete'; profile: Profile } | { type: 'series'; item: Media } | { type: 'details'; item: Media } | { type: 'player'; item: Media; resumeAt?: number } |
  { type: 'external'; item: Media; preferred?: ExternalPlayer } | { type: 'channel-options'; item: Media } | { type: 'privacy' } | { type: 'organize' } | { type: 'guide' } | { type: 'history' } | { type: 'home-ip' };
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
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [s.settingsRow, pressed && { backgroundColor: '#F5F2FC' }]}><View style={s.rowIcon}><Icon name={icon} size={21} /></View><View style={{ flex: 1, gap: 4 }}><Text style={u.label}>{title}</Text>{subtitle && <Text style={u.small}>{subtitle}</Text>}</View>{trailing && <Text style={u.small}>{trailing}</Text>}<Icon name="chevron-forward" size={16} color={colors.secondary} /></Pressable>;
}
function NodeCast({ onReady, launchComplete }: { onReady: () => void; launchComplete: boolean }) {
  const insets = useSafeAreaInsets();
  const compatibilityAvailable = hasCompatibilityPlayer();
  const [vault, setVault] = useState<Vault>(emptyVault());
  const vaultRef = useRef(vault);
  const mutations = useRef(Promise.resolve());
  const [preferences, setPreferences] = useState<Preferences>({ onboarded: false, player: 'internal', baseline: null });
  const prefsRef = useRef(preferences);
  const preferenceMutations = useRef(Promise.resolve());
  const homeIPNext = useRef(false);
  const [playerFullscreen, setPlayerFullscreen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [storageFailed, setStorageFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [navigation, setNavigation] = useState<{ active: Tab; previous: Tab | null }>({ active: 'home', previous: null });
  const tab = navigation.active;
  const setTab = useCallback((next: Tab) => { Keyboard.dismiss(); setNavigation(current => current.active === next ? current : { active: next, previous: current.active }); }, []);
  const settleTab = useCallback((name: string) => setNavigation(current => current.active === name && current.previous ? { ...current, previous: null } : current), []);
  const reducedMotion = useReducedMotion();
  const [section, setSection] = useState<Section>('live');
  const [demo, setDemo] = useState(false);
  const [demoFavorites, setDemoFavorites] = useState<string[]>([]);
  const [demoHidden, setDemoHidden] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const modal = useRetainedModal(sheet);
  const modalSheet = modal.displayed;
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [cache, setCache] = useState<Partial<Record<Section, Media[]>>>({});
  const cacheRef = useRef(cache); cacheRef.current = cache;
  const cacheOwner = useRef<string | null>(null);
  const fetchedAt = useRef<Partial<Record<Section, number>>>({});
  const forceFetch = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [libraryNotice, setLibraryNotice] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('category');
  const [includeHiddenSearch, setIncludeHiddenSearch] = useState(false);
  const scrollMemory = useRef(new Map<string, number>());
  const browseMemory = useRef(new Map<string, { libraryState: typeof libraryState; section: Section; scope: SearchScope; hidden: boolean }>());
  const browseOwner = useRef('');
  const [updatedAt, setUpdatedAt] = useState<Partial<Record<Section, string>>>({});
  const [activity, setActivity] = useState<{ profile: string; entries: ViewingEntry[] }>({ profile: '', entries: [] });
  const activityRef = useRef(activity); activityRef.current = activity;
  const [demoActivity, setDemoActivity] = useState<ViewingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [revision, setRevision] = useState(0);
  const [libraryState, setLibraryState] = useState({ watch: { search: '', category: 'All' }, saved: { search: '', category: 'All' } });
  const libraryTab = tab === 'saved' ? 'saved' : 'watch';
  const { search, category } = libraryState[libraryTab];
  const setSearch = (search: string) => setLibraryState(current => ({ ...current, [libraryTab]: { ...current[libraryTab], search } }));
  const setCategory = (category: string) => setLibraryState(current => ({ ...current, [libraryTab]: { ...current[libraryTab], category } }));
  const deferredWatchSearch = useDeferredValue(libraryState.watch.search);
  const deferredSavedSearch = useDeferredValue(libraryState.saved.search);
  const deferredSearch = libraryTab === 'watch' ? deferredWatchSearch : deferredSavedSearch;
  const seasonMemory = useRef(new Map<string, string>());
  const [episodeQueue, setEpisodeQueue] = useState<{ profile: string; series: Media; items: Media[] } | null>(null);
  const [episodes, setEpisodes] = useState<Media[]>([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeError, setEpisodeError] = useState('');
  const [sheetError, setSheetError] = useState('');
  const connection = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const active = demo ? null : vault.profiles.find(p => p.id === vault.activeId) || null;
  const provider = active?.provider || null;
  const favorites = demo ? demoFavorites : active?.favorites || emptyIds;
  const hiddenGroups = demo ? demoHidden : active?.hiddenGroups || emptyIds;
  const favoriteRef = useRef(favorites); favoriteRef.current = favorites;
  const allItems = useMemo(() => demo ? demoLibrary : cacheOwner.current === active?.id ? Object.values(cache).flatMap(items => items || []) : [], [demo, cache, active?.id]);
  const mediaById = useMemo(() => new Map(allItems.map(item => [item.id, item])), [allItems]);
  const saved = useMemo(() => favorites.flatMap(id => { const item = mediaById.get(id); return item ? [item] : []; }), [favorites, mediaById]);
  const viewing = demo ? demoActivity : activity.profile === active?.id ? activity.entries : [];
  const continueWatching = viewing.filter(entry => resumePosition(entry) > 0).slice(0, 12);
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
  useEffect(() => { if (!booting) onReady(); }, [booting, onReady]);
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
  function updatePreferences(update: Partial<Preferences>): Promise<void> {
    const operation = preferenceMutations.current.then(async () => {
      const next = { ...prefsRef.current, ...update };
      await savePreferences(next);
      prefsRef.current = next;
      if (alive.current) setPreferences(next);
    });
    preferenceMutations.current = operation.catch(() => {});
    return operation;
  }
  async function finishHomeIP(baseline?: NonNullable<Preferences['baseline']>) {
    await updatePreferences(baseline ? { baseline, homeIPSetup: 'saved' } : { homeIPSetup: 'skipped' });
    setSheet(null);
    if (homeIPNext.current) { homeIPNext.current = false; addProfile(); }
  }
  useEffect(() => {
    if (launchComplete && !booting && !storageFailed && preferences.onboarded && !preferences.baseline && !preferences.homeIPSetup && !sheet && !demo) setSheet({ type: 'home-ip' });
  }, [launchComplete, booting, storageFailed, preferences.onboarded, preferences.baseline, preferences.homeIPSetup, sheet, demo]);
  useEffect(() => {
    if (sheet?.type !== 'player') {
      setPlayerFullscreen(false);
      if (Platform.OS !== 'web') void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, [sheet?.type]);
  useEffect(() => {
    const owner = demo ? 'demo' : active?.id || 'empty';
    const stored = browseMemory.current.get(owner);
    browseOwner.current = owner;
    setLibraryState(stored?.libraryState || { watch: { search: '', category: 'All' }, saved: { search: '', category: 'All' } });
    setSection(stored?.section || 'live'); setSearchScope(stored?.scope || 'category'); setIncludeHiddenSearch(stored?.hidden || false);
    setUpdatedAt({}); setEpisodeQueue(null);
  }, [active?.id, demo]);
  useEffect(() => {
    const owner = demo ? 'demo' : active?.id || 'empty';
    if (owner === browseOwner.current) browseMemory.current.set(owner, { libraryState, section, scope: searchScope, hidden: includeHiddenSearch });
  }, [libraryState, section, searchScope, includeHiddenSearch]);
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
      : tab === 'home' ? ['live'] : searchScope === 'all' && deferredSearch.trim() ? ['live', 'movies', 'series'] : [section];
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
            setUpdatedAt(current => ({ ...current, [id]: saved.savedAt }));
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
        commit(id, items); fetchedAt.current[id] = Date.now(); setUpdatedAt(current => ({ ...current, [id]: new Date().toISOString() }));
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
    if (episodeQueue?.profile === active?.id && episodeQueue?.series.id === currentSeries.id) { setEpisodes(episodeQueue.items); setEpisodeLoading(false); return; }
    const controller = new AbortController();
    setEpisodeLoading(true); setEpisodeError(''); setEpisodes([]);
    loadEpisodes(provider, currentSeries, controller.signal).then(items => { if (!controller.signal.aborted) { setEpisodes(items); setEpisodeQueue({ profile: active!.id, series: currentSeries, items }); } })
      .catch(error => { if (!controller.signal.aborted) setEpisodeError(error instanceof ProviderError ? error.message : 'Could not load episodes.'); })
      .finally(() => { if (!controller.signal.aborted) setEpisodeLoading(false); });
    return () => controller.abort();
  }, [currentSeries, provider]);

  async function saveChannelOptions(item: Media, value?: ChannelPlayback) {
    const owner = active?.id; if (!owner) throw new Error('Add a profile to save playback options.');
    await updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === owner ? setChannelPlayback(profile, item.id, value) : profile) }));
  }
  function changeWatched(item: Media, watched: boolean) {
    if (demo) { setDemoActivity(entries => markWatched(entries, item, watched)); return; }
    if (!active) return;
    if (activityRef.current.profile !== active.id) { setMessage('Saved history is not available yet. Please try again or restart the app.'); return; }
    const entries = markWatched(activityRef.current.entries, item, watched);
    const next = { profile: active.id, entries }; activityRef.current = next; setActivity(next);
    void writeViewing(active.id, entries).catch(() => setMessage('Could not save watched state.'));
  }
  const playingSeriesId = sheet?.type === 'player' ? sheet.item.seriesId : undefined;
  useEffect(() => {
    if (!playingSeriesId || !active || !provider || episodeQueue?.profile === active.id && episodeQueue.series.id === playingSeriesId) return;
    const controller = new AbortController();
    const series: Media = { id: playingSeriesId, streamId: playingSeriesId.split(':').slice(1).join(':'), kind: 'series', group: 'Series', name: 'Your series' };
    void loadEpisodes(provider, series, controller.signal).then(items => { if (!controller.signal.aborted) setEpisodeQueue({ profile: active.id, series, items }); }).catch(() => {});
    return () => controller.abort();
  }, [playingSeriesId, active?.id, provider]);
  function addProfile(profile?: Profile) { if (storageFailed) { setMessage('Saved profiles could not be read. Restart the app before adding or editing profiles to protect existing data.'); return; } setConnectError(''); setSheetError(''); setSheet({ type: 'provider', profile }); }
  function closeSheet() { if (!connecting && sheet?.type === 'player' && sheet.item.seriesId && episodeQueue?.series.id === sheet.item.seriesId) { setPlayerFullscreen(false); setSheet({ type: 'series', item: episodeQueue.series }); return; } if (!connecting) { if (sheet?.type === 'home-ip') { void finishHomeIP().catch(() => setMessage('Could not save your preference. Try again.')); return; } setPlayerFullscreen(false); setSheet(null); setSheetError(''); } }
  function browse(id: Section) { setLibraryState(current => ({ ...current, watch: { search: '', category: 'All' } })); setSection(id); setTab('watch'); }
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
        provider: normalized, createdAt: existing?.createdAt || new Date().toISOString(), favorites: sameProvider ? existing.favorites : [], hiddenGroups: sameProvider ? existing.hiddenGroups : [], tracks: existing?.tracks, channelPlayback: sameProvider ? existing.channelPlayback : undefined, liveFormat: sameProvider ? existing.liveFormat : 'auto', liveEngine: existing?.liveEngine };
      if (existing && !sameProvider) { await clearProfileData(existing.id); browseMemory.current.delete(existing.id); }
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
      .catch(() => setMessage('Could not save your favorite on this device. Please try again.'));
  }
  function saveProgress(item: Media, snapshot: PlaybackSnapshot) {
    if (demo) { setDemoActivity(entries => recordViewing(entries, item, snapshot)); return; }
    if (!active) return;
    const profileId = active.id;
    if (activityRef.current.profile !== profileId) return; // Never overwrite unread history.
    const previous = activityRef.current.entries;
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
    const options = resolvePlayback(active, item.id, preferences.player);
    playable = preparePlayback(playable, provider, options.format);
    const progress = viewing.find(entry => entry.item.id === item.id);
    if (destination === 'internal' || (destination === 'default' && options.player === 'internal')) setSheet({ type: 'player', item: playable, resumeAt: startOver ? 0 : resumePosition(progress) });
    else setSheet({ type: 'external', item: playable, preferred: options.player === 'vlc' || options.player === 'infuse' ? options.player : undefined });
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
  const allMediaSearch = searchScope === 'all' && !!libraryState.watch.search.trim();
  const includeHidden = includeHiddenSearch && !!libraryState.watch.search.trim();
  const watchLibrary = useMemo(() => allMediaSearch ? allItems : allItems.filter(item => item.kind === section), [allMediaSearch, allItems, section]);
  const savedTab = tab === 'saved';
  const watchGroups = useMemo(() => ['All', ...Array.from(new Set(watchLibrary.filter(item => !hiddenGroups.includes(item.group)).map(item => item.group))).sort()], [watchLibrary, hiddenGroups]);
  const savedGroups = useMemo(() => ['All', ...Array.from(new Set(saved.filter(item => !hiddenGroups.includes(item.group)).map(item => item.group))).sort()], [saved, hiddenGroups]);
  const groups = savedTab ? savedGroups : watchGroups;
  const watchIndex = useMemo(() => createSearchIndex(watchLibrary), [watchLibrary]);
  const savedIndex = useMemo(() => createSearchIndex(saved), [saved]);
  const watchFiltered = useMemo(() => searchIndex(watchIndex, deferredWatchSearch, deferredWatchSearch.trim() && searchScope !== 'category' ? 'All' : libraryState.watch.category, hiddenGroups, includeHidden), [watchIndex, deferredWatchSearch, libraryState.watch.category, hiddenGroups, includeHidden, searchScope]);
  const savedFiltered = useMemo(() => searchIndex(savedIndex, deferredSavedSearch, deferredSavedSearch.trim() && searchScope !== 'category' ? 'All' : libraryState.saved.category, hiddenGroups, true), [savedIndex, deferredSavedSearch, libraryState.saved.category, hiddenGroups, searchScope]);
  const filtered = savedTab ? savedFiltered : watchFiltered;
  const preview = saved.length ? saved.slice(0, 6) : demo ? [...demoLibrary.filter(i => i.kind === 'movies'), ...demoLibrary.filter(i => i.kind === 'live')].slice(0, 6) : allItems.slice(0, 6);
  const connected = !!provider || demo;
  const posterLayout = tab === 'watch' && section !== 'live' && !allMediaSearch;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const sheetTitle = !modalSheet ? '' : modalSheet.type === 'provider' ? modalSheet.profile ? 'Edit profile' : 'Add a profile' : modalSheet.type === 'profiles' ? 'Your profiles' : modalSheet.type === 'players' ? 'Playback' : modalSheet.type === 'delete' ? 'Remove profile' : modalSheet.type === 'series' || modalSheet.type === 'details' ? modalSheet.item.name : modalSheet.type === 'player' ? modalSheet.item.name : modalSheet.type === 'external' ? 'Choose your player' : modalSheet.type === 'channel-options' ? 'Channel playback' : modalSheet.type === 'guide' ? 'TV guide' : modalSheet.type === 'organize' ? 'Library options' : modalSheet.type === 'home-ip' ? 'Home IP setup' : modalSheet.type === 'history' ? 'Version history' : 'Privacy & storage';
  const darkSheet = modalSheet?.type === 'player';
  const homePage = <HomeScreen active={active} demo={demo} profileCount={vault.profiles.length} loading={loading} liveCount={demo ? demoLibrary.filter(i => i.kind === 'live').length : cache.live?.length}
      preview={preview} savedCount={saved.length} playerName={playerName} error={libraryError}
      onAdd={() => addProfile()} onDemo={startDemo} onProfiles={() => { setSheetError(''); setSheet({ type: 'profiles' }); }}
      continueWatching={continueWatching} recentChannels={recentChannels.map(entry => allItems.find(item => item.id === entry.item.id) || (provider ? hydrateMedia(entry.item, provider) : entry.item))} onResume={entry => { void launch(allItems.find(item => item.id === entry.item.id) || entry.item, false, 'internal'); }} onRemove={id => removeViewing(id)}
      onBrowse={browse} onSaved={() => setTab('saved')} onPlay={play} onPlayers={() => setSheet({ type: 'players' })}
      network={<NetworkCard baseline={preferences.baseline} onBaseline={value => updatePreferences({ baseline: value, homeIPSetup: value ? 'saved' : 'skipped' })} />}
    />;
  const settingsPage = <ScrollView contentContainerStyle={u.content} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 8 }}><Text style={u.h1}>Settings</Text><Text style={u.body}>Your players, playlists, and preferences.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Manage active profile" onPress={() => { setSheetError(''); setSheet({ type: 'profiles' }); }} style={[u.card, { backgroundColor: colors.pale, borderColor: '#E1DCEF', gap: 12 }]}><View style={u.row}><View style={[s.avatar, { backgroundColor: '#FAE7C8', width: 46, height: 46, borderRadius: 16 }]}><Icon name="layers-outline" size={23} /></View><View style={{ flex: 1, gap: 5 }}><Text style={u.eyebrow}>{demo ? 'EXPLORING NODECAST' : active ? 'ACTIVE PROFILE' : 'YOUR LIBRARY'}</Text><Text numberOfLines={2} style={u.label}>{demo ? 'Demo library' : active?.provider.name || 'Make it your own'}</Text><Text style={u.small}>{vault.profiles.length} saved {vault.profiles.length === 1 ? 'profile' : 'profiles'} · {Platform.OS === 'web' ? 'Preview session' : 'Stored on this device'}</Text></View><Icon name="chevron-forward" size={17} color={colors.accent} /></View></Pressable>
      <View style={s.settingsGroup}><SettingsRow icon="people-outline" title="Saved profiles" subtitle="Servers, playlists, and favorites" trailing={String(vault.profiles.length)} onPress={() => { setSheetError(''); setSheet({ type: 'profiles' }); }} /><View style={u.divider} /><SettingsRow icon="play-circle-outline" title="Default player" subtitle={playerName} onPress={() => setSheet({ type: 'players' })} /><View style={u.divider} /><SettingsRow icon="options-outline" title="Library organization" subtitle="Categories, search, and favorites order" onPress={() => setSheet({ type: 'organize' })} /><View style={u.divider} /><SettingsRow icon="home-outline" title="Home IP & connection" subtitle="Save or update your home connection" onPress={() => { homeIPNext.current = false; setSheet({ type: 'home-ip' }); }} /><View style={u.divider} /><SettingsRow icon="lock-closed-outline" title="Privacy & storage" subtitle="What stays on your device" onPress={() => setSheet({ type: 'privacy' })} /><View style={u.divider} /><SettingsRow icon="time-outline" title="Version history" subtitle={`What’s new · ${appVersion}`} onPress={() => setSheet({ type: 'history' })} /></View>
      <View style={{ gap: 10 }}><Text style={u.eyebrow}>SUPPORT NODECAST</Text><Pressable accessibilityRole="link" accessibilityLabel="Buy me a coffee" accessibilityHint="Opens the optional support website in your browser" onPress={() => { void Linking.openURL('https://buymeacoffee.com/hexorbd').catch(() => setMessage('Couldn’t open the support page. You can visit buymeacoffee.com/hexorbd in your browser.')); }} style={({ pressed }) => [u.card, { backgroundColor: '#FAE7C8', borderColor: '#EED9B7', opacity: pressed ? .8 : 1 }]}><View style={u.row}><View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFF7E9', alignItems: 'center', justifyContent: 'center' }}><Icon name="cafe-outline" size={23} /></View><View style={{ flex: 1, gap: 5 }}><Text style={u.label}>Buy me a coffee</Text><Text style={[u.small, { color: '#65523E' }]}>NodeCast is free. Your optional support is appreciated and helps us keep improving it.</Text></View><Icon name="open-outline" size={18} color="#65523E" /></View></Pressable></View>
      {demo && <Button title="Leave demo" variant="secondary" onPress={() => { setDemo(false); setCache({}); setTab('home'); }} />}
      <View style={{ gap: 8, paddingHorizontal: 4 }}><Text style={u.small}>Made for the content you bring. No channels or subscriptions are included.</Text><Text style={u.small}>{`NodeCast ${appVersion} · GPL-3.0-only`}</Text></View>
    </ScrollView>;
  const libraryPage = <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 7 }}><Text style={u.body}>{tab === 'saved' ? 'Your personal collection' : demo ? 'Demo library' : active?.provider.name || 'Your playlists, beautifully organized'}</Text><Text style={u.h1}>{tab === 'saved' ? 'Favorites' : 'Library'}</Text></View>
      {!connected ? <Empty icon={tab === 'saved' ? 'heart-outline' : 'tv-outline'} title={tab === 'saved' ? 'Keep the good ones close' : 'Your library starts here'} message="Add a provider or explore the demo to start watching."><Button title="Connect my provider" onPress={() => addProfile()} /><Button title="Explore demo" variant="secondary" onPress={startDemo} /></Empty> : <>
        {tab === 'watch' && <View style={s.segment}>{sections.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: section === item.id }} onPress={() => { setSearch(''); setCategory('All'); setSection(item.id); }} style={[s.segmentItem, section === item.id && { backgroundColor: '#B9B4F2', shadowOpacity: 0 }]}><Text style={{ color: colors.text, fontWeight: section === item.id ? '700' : '500', fontSize: 14 }}>{item.title}</Text></Pressable>)}</View>}
        <View style={s.search}><Icon name="search-outline" size={19} color={colors.secondary} /><TextInput value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} autoCapitalize="none" placeholder={tab === 'saved' ? 'Search your favorites' : 'Search your library'} accessibilityLabel="Search library" placeholderTextColor={colors.secondary} style={{ flex: 1, paddingVertical: 14, color: colors.text, fontSize: 16, minHeight: 52 }} autoCorrect={false} />{!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}><Icon name="close-circle" size={19} color={colors.secondary} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Library options" onPress={() => { setSheetError(''); setSheet({ type: 'organize' }); }} style={{ padding: 8 }}><Icon name="options-outline" size={20} color={colors.secondary} /></Pressable></View>
        {!!search.trim() && <SearchScopeControl value={searchScope} onChange={setSearchScope} includeHidden={includeHiddenSearch} onHidden={() => setIncludeHiddenSearch(value => !value)} favorites={savedTab} />}
        {!search.trim() && <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>{groups.map(group => <Pressable key={group} accessibilityRole="button" onPress={() => { setCategory(group); setSearchScope('category'); }} style={[s.category, category === group && { backgroundColor: colors.accent }]}><Text numberOfLines={1} style={{ color: category === group ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>{group}</Text></Pressable>)}</ScrollView></View>}
        {!!search.trim() && <Text accessibilityLiveRegion="polite" style={[u.small, { paddingHorizontal: 20, paddingVertical: 10 }]}>{filtered.length} {filtered.length === 1 ? 'result' : 'results'} · {tab === 'saved' ? 'Your favorites' : `${allMediaSearch ? 'All media' : sections.find(item => item.id === section)?.title}${searchScope === 'category' && category !== 'All' ? ` · ${category}` : ''}${includeHidden ? ' · Including hidden' : ''}`}</Text>}
        <View style={[u.between, { paddingHorizontal: 20, paddingBottom: 10 }]}>{provider?.kind === 'xtream' && section === 'live' && tab === 'watch' && <Pressable accessibilityRole="button" accessibilityLabel="Open TV guide" onPress={() => setSheet({ type: 'guide' })} style={[u.row, { gap: 5 }]}><Icon name="calendar-outline" size={15} color={colors.accent} /><Text style={u.link}>Now & next</Text></Pressable>}<Text style={[u.small, { flex: 1 }]}>{refreshing ? 'Updating library…' : libraryNotice || (updatedAt[section] ? `Updated ${new Date(updatedAt[section]!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '')}</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh library" disabled={refreshing} onPress={refreshLibrary} hitSlop={10} style={{ padding: 5 }}>{refreshing ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="refresh-outline" size={17} color={colors.secondary} />}</Pressable></View>
        {loading ? <View style={u.center}><ActivityIndicator color={colors.accent} /><Text style={u.small}>Bringing your library together…</Text></View> : libraryError ? <Empty icon="cloud-offline-outline" title="A little trouble connecting" message={libraryError}><Button title="Try again" onPress={refreshLibrary} /></Empty> : <RetainedList memory={scrollMemory.current} memoryKey={`${demo ? 'demo' : active?.id}:${libraryTab}:${section}:${category}:${deferredSearch}:${searchScope}:${includeHidden}`} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" key={`${libraryTab}:${section}:${category}:${deferredSearch}:${searchScope}:${includeHidden}:${posterLayout}`} numColumns={posterLayout ? 2 : 1} columnWrapperStyle={posterLayout ? { gap: 14 } : undefined} data={filtered} keyExtractor={item => item.id} initialNumToRender={12} windowSize={7} contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 114 }, !filtered.length && { flex: 1 }]}
          ListHeaderComponent={filtered.length ? <View style={[u.between, { paddingBottom: 5 }]}><Text style={u.eyebrow}>{tab === 'saved' ? 'SAVED FOR YOU' : 'YOUR LIBRARY'}</Text><Text style={u.small}>{filtered.length.toLocaleString()} {section === 'live' && tab !== 'saved' ? 'channels' : 'titles'}</Text></View> : undefined}
          ListEmptyComponent={<Empty icon={tab === 'saved' ? 'heart-outline' : 'search-outline'} title={deferredSearch.trim() ? 'No matching titles' : tab === 'saved' ? 'Your favorites belong here' : 'Nothing here just yet'} message={deferredSearch.trim() ? 'Try another name, or reset your search to see the library again.' : tab === 'saved' ? 'Tap the heart beside a channel, movie, or series. We’ll keep it here for this profile.' : section === 'series' && (demo || provider?.kind === 'm3u') ? 'Use an Xtream Codes profile for a structured series and episode library.' : 'Try another search or category, or check the library supplied by your provider.'}>{deferredSearch.trim() ? <Button title="Reset search" variant="secondary" onPress={() => { setSearch(''); setCategory('All'); }} /> : tab === 'saved' ? <Button title="Browse your library" onPress={() => browse('live')} /> : null}</Empty>}
          renderItem={({ item }) => posterLayout ? <View style={{ flex: 1, maxWidth: '50%', marginBottom: 20, gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={() => play(item)} style={{ gap: 10 }}><View style={{ aspectRatio: 0.73, width: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: '#E5E1F5' }}><Artwork item={item} poster /></View><Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${favorites.includes(item.id) ? 'Remove' : 'Add'} ${item.name} ${favorites.includes(item.id) ? 'from' : 'to'} favorites`} onPress={() => toggleFavorite(item)} style={{ position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFFEE', alignItems: 'center', justifyContent: 'center' }}><Icon name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={17} color={colors.accent} /></Pressable></View> : <View style={s.mediaRow}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={() => play(item)} style={[u.row, { flex: 1, gap: 14 }]}><Artwork item={item} /><View style={{ flex: 1, gap: 6 }}><Text numberOfLines={2} style={[u.label, { fontSize: 14, lineHeight: 20 }]}>{item.name}</Text><View style={[u.row, { gap: 7 }]}>{item.kind === 'live' && <View style={s.liveTag}><Text style={{ color: colors.accent, fontSize: 8, fontWeight: '800', letterSpacing: .5 }}>LIVE</Text></View>}<Text numberOfLines={1} style={[u.small, { flex: 1 }]}>{demo ? 'Public sample' : item.group}</Text></View></View></Pressable>{item.kind === 'live' && <Pressable accessibilityRole="button" accessibilityLabel={`Playback options for ${item.name}`} onPress={() => setSheet({ type: 'channel-options', item })} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Icon name="ellipsis-horizontal" size={20} color={colors.secondary} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={`${favorites.includes(item.id) ? 'Remove' : 'Add'} ${item.name} ${favorites.includes(item.id) ? 'from' : 'to'} favorites`} onPress={() => toggleFavorite(item)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={21} color={favorites.includes(item.id) ? colors.accent : '#9894A3'} /></Pressable></View>}
        />}
      </>}
    </View>;
  if (booting) return <SafeAreaView style={[u.root, u.center]}><ActivityIndicator color={colors.accent} /><Text style={u.small}>Making yourself at home…</Text></SafeAreaView>;
  if (!preferences.onboarded && !active && !demo && !sheet) return <WelcomeScreen onStart={() => { void updatePreferences({ onboarded: true }).then(() => { homeIPNext.current = true; setSheet({ type: 'home-ip' }); }).catch(() => setMessage('Could not save preferences. Try again.')); }} onDemo={() => { void updatePreferences({ onboarded: true }).catch(() => setMessage('Could not save preferences.')); startDemo(); }} />;
  return <SafeAreaView style={u.root} edges={playerFullscreen && darkSheet ? [] : ['top', 'bottom', 'left', 'right']}><StatusBar hidden={playerFullscreen && darkSheet} barStyle="dark-content" />
    <View style={s.header}><IconButton name="options-outline" label="Settings" onPress={() => setTab('you')} /><Pressable accessibilityRole="button" accessibilityLabel="NodeCast home" onPress={() => setTab('home')}><Text style={s.wordmark}>nodecast<Text style={{ color: colors.accent }}>.</Text></Text></Pressable><IconButton name="add" label="Add playlist" onPress={() => addProfile()} /></View>
    {!!message && <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}><Notice danger>{message}</Notice><Pressable onPress={() => setMessage('')} accessibilityRole="button" style={{ alignSelf: 'flex-end', padding: 8 }}><Text style={u.link}>Dismiss</Text></Pressable></View>}
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <TabScene key={`${demo ? 'demo' : active?.id || 'empty'}:home`} name="home" onSettled={settleTab} previous={navigation.previous === 'home'} active={tab === 'home'}>{homePage}</TabScene>
      <TabScene key={`${demo ? 'demo' : active?.id || 'empty'}:watch`} name="watch" onSettled={settleTab} previous={navigation.previous === 'watch'} active={tab === 'watch'}>{libraryPage}</TabScene>
      <TabScene key={`${demo ? 'demo' : active?.id || 'empty'}:saved`} name="saved" onSettled={settleTab} previous={navigation.previous === 'saved'} active={tab === 'saved'}>{libraryPage}</TabScene>
      <TabScene key={`${demo ? 'demo' : active?.id || 'empty'}:you`} name="you" onSettled={settleTab} previous={navigation.previous === 'you'} active={tab === 'you'}>{settingsPage}</TabScene>
    </View>
    <MovingTabBar tabs={tabs} active={tab} bottom={Math.max(insets.bottom, 12)} onChange={setTab} />
    <Modal visible={sheet !== null} animationType={reducedMotion ? 'none' : 'slide'} onDismiss={modal.onDismiss} presentationStyle="fullScreen" supportedOrientations={darkSheet ? ['portrait', 'landscape'] : ['portrait']} onRequestClose={() => { if (playerFullscreen) { setPlayerFullscreen(false); void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); } else closeSheet(); }}>
      <ModalSafeAreaProvider style={{ flex: 1 }}><SafeAreaView pointerEvents={sheet ? 'auto' : 'none'} aria-hidden={!sheet} accessibilityElementsHidden={!sheet} style={[u.root, darkSheet && { backgroundColor: '#090124' }]} edges={playerFullscreen && darkSheet ? [] : ['top', 'bottom', 'left', 'right']}><StatusBar hidden={playerFullscreen && darkSheet} barStyle={darkSheet ? 'light-content' : 'dark-content'} />{!playerFullscreen && <View style={[u.modalHeader, { paddingHorizontal: 20, gap: 10, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: darkSheet ? '#302840' : colors.line }]}><Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={connecting} onPress={closeSheet} hitSlop={8} style={[u.row, { minHeight: 44, gap: 3 }]}><Icon name="chevron-back" color={darkSheet ? '#fff' : colors.text} size={21} /><Text style={{ color: darkSheet ? '#fff' : colors.text, fontSize: 15, fontWeight: '600' }}>Back</Text></Pressable><Text numberOfLines={2} style={[u.label, { flex: 1, textAlign: 'center', fontSize: 14 }, darkSheet && { color: '#fff' }]}>{sheetTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel={modalSheet?.type === 'player' ? 'Close player' : modalSheet?.type === 'series' ? 'Close episodes' : 'Close sheet'} disabled={connecting} onPress={closeSheet} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: darkSheet ? '#B9B4F2' : colors.accent, fontSize: 15, fontWeight: '600' }}>Close</Text></Pressable></View>}
        <PageTransition pageKey={modalSheet?.type || ''} disabled={darkSheet}>
        {modalSheet?.type === 'history' && <VersionHistory />}
        {modalSheet?.type === 'home-ip' && <HomeIPSetup onSave={finishHomeIP} onSkip={() => finishHomeIP()} />}
        {modalSheet?.type === 'guide' && provider?.kind === 'xtream' && <GuideScreen provider={provider} channels={allItems.filter(item => item.kind === 'live' && !hiddenGroups.includes(item.group))} favorites={favorites} onPlay={item => { void launch(item); }} />}
        {modalSheet?.type === 'organize' && <><LibraryOptions scope={searchScope} onScope={value => { setSearchScope(value); setCategory('All'); }} groups={Array.from(new Set(allItems.map(item => item.group))).sort()} hidden={hiddenGroups} favorites={saved} onToggle={group => { if (demo) { setDemoHidden(current => current.includes(group) ? current.filter(item => item !== group) : [...current, group]); return; } if (!active) return; void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, hiddenGroups: profile.hiddenGroups?.includes(group) ? profile.hiddenGroups.filter(item => item !== group) : [...(profile.hiddenGroups || []), group] } : profile) })).catch(() => setSheetError('Could not save category preferences.')); }} onMove={(id, direction) => { if (demo) { setDemoFavorites(current => { const next = [...current], index = next.indexOf(id), target = index + direction; if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]; return next; }); return; } if (!active) return; void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => { if (profile.id !== active.id) return profile; const next = [...profile.favorites], index = next.indexOf(id), target = index + direction; if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]; return { ...profile, favorites: next }; }) })).catch(() => setSheetError('Could not save favorites order.')); }} />{!!sheetError && <Notice danger>{sheetError}</Notice>}</>}
        {modalSheet?.type === 'provider' && <ProviderSheet key={modalSheet.profile?.id || 'new'} profile={modalSheet.profile} busy={connecting} error={connectError} onSave={(raw, profile) => { void connect(raw, profile); }} />}
        {modalSheet?.type === 'profiles' && <ScrollView contentContainerStyle={u.content}><View style={{ gap: 9 }}><Text style={u.h1}>{'Your playlists'}</Text><Text style={u.body}>Switch profiles or add a new provider. Your favorites stay separate.</Text></View>{vault.profiles.map(profile => <View key={profile.id} style={[u.card, { borderWidth: 0, padding: 18 }]}><View style={u.between}><View style={{ flex: 1, gap: 6 }}><Text style={u.h2}>{profile.provider.name}</Text><Text style={u.small}>{profile.provider.kind === 'xtream' ? 'Xtream Codes' : 'M3U playlist'}{active?.id === profile.id ? ' · Active' : ''}</Text></View><Icon name="server-outline" color={colors.accent} /></View><Button title={active?.id === profile.id ? 'Reconnect profile' : 'Use this profile'} busy={connecting} onPress={() => { void connect(profile.provider, undefined, profile); }} /><View style={u.between}><Pressable accessibilityRole="button" disabled={connecting} onPress={() => addProfile(profile)}><Text style={u.link}>Edit details</Text></Pressable><Pressable accessibilityRole="button" disabled={connecting} onPress={() => { setSheetError(''); setSheet({ type: 'delete', profile }); }}><Text style={[u.link, { color: colors.danger }]}>Remove</Text></Pressable></View></View>)}{!!sheetError && <Notice danger>{sheetError}</Notice>}{!vault.profiles.length && <Notice>No saved profiles yet. Add your first provider to make this space yours.</Notice>}<Button title="Add a profile" icon="add" disabled={connecting || vault.profiles.length >= 30} onPress={() => addProfile()} /><Text style={u.small}>{Platform.OS === 'web' ? 'Browser preview keeps profiles only for this running session. Use Expo Go for device persistence.' : 'Protected by iOS secure storage on this device. No account, password to remember, or cloud backup.'}</Text></ScrollView>}
        {modalSheet?.type === 'players' && <PlaybackSettings choice={preferences.player} profile={active} compatibilityAvailable={compatibilityAvailable} error={sheetError} onPlayer={player => { void updatePreferences({ player }).catch(() => setSheetError('Could not save your player preference.')); }} onEngine={liveEngine => { if (active) void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, liveEngine } : profile) })).catch(() => setSheetError('Could not save the playback engine.')); }} onFormat={liveFormat => { if (active) void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, liveFormat } : profile) })).catch(() => setSheetError('Could not save the live format.')); }} />}
        {modalSheet?.type === 'delete' && <View style={u.content}><Text style={u.h1}>Remove this profile?</Text><Text style={u.body}>{modalSheet.profile.provider.name} and its saved favorites will be removed from this device. This does not cancel your IPTV subscription.</Text>{!!sheetError && <Notice danger>{sheetError}</Notice>}<Button title="Remove profile" variant="danger" busy={connecting} onPress={() => { void deleteSavedProfile(modalSheet.profile); }} /><Button title="Keep profile" variant="secondary" disabled={connecting} onPress={() => setSheet({ type: 'profiles' })} /></View>}
        {modalSheet?.type === 'privacy' && <ScrollView contentContainerStyle={u.content}><Text style={u.h1}>{'Private by design.\nSimple by choice.'}</Text><Button title="Clear this profile’s viewing history" variant="secondary" disabled={!viewing.length} onPress={() => removeViewing()} /><View style={u.card}><Text style={u.h2}>On this device</Text><Text style={u.body}>Server details, passwords, playlist links, and profile favorites use the device’s secure storage. Player preferences, viewing history, and your optional reference IP use local app storage. The browsing cache stores only titles and metadata, without provider passwords or stream URLs. There is no account or cloud sync.</Text></View><View style={u.card}><Text style={u.h2}>When you connect</Text><Text style={u.body}>Your provider receives the details needed to load and play its content. Artwork loads from URLs supplied by your provider. Prefer HTTPS; HTTP is unencrypted.</Text></View><View style={u.card}><Text style={u.h2}>The IP check</Text><Text style={u.body}>ipwho.is sees your public IP when you open Home or refresh. We show approximate city/country information, not GPS location. Neither an IP change nor an IP match verifies whether a VPN is on. No IPTV credentials are sent with IP lookups.</Text></View><View style={u.card}><Text style={u.h2}>External players</Text><Text style={u.body}>Opening VLC or Infuse sends it the complete stream URL, which may include your provider credentials. Only choose apps you trust.</Text></View><Text style={u.small}>Browser preview keeps provider details in memory. Local profiles do not sync to other devices. There is no in-app cloud backup or account recovery. Secure storage availability and uninstall behavior depend on the platform and app build; do not rely on this app as your only copy of provider details. Secure storage does not protect data already visible on an unlocked device.</Text></ScrollView>}
        {modalSheet?.type === 'channel-options' && <ChannelPlaybackOptions key={modalSheet.item.id} value={active?.channelPlayback?.[modalSheet.item.id]} onSave={value => saveChannelOptions(modalSheet.item, value)} />}
        {modalSheet?.type === 'series' && (episodeLoading ? <View style={u.center}><ActivityIndicator color={colors.accent} /><Text style={u.small}>Finding your episodes…</Text></View> : episodeError ? <Empty icon="alert-circle-outline" title="Couldn’t load episodes" message={episodeError} /> : <SeriesEpisodes seasonMemory={seasonMemory.current} seriesKey={`${active?.id}:${modalSheet.item.id}`} key={modalSheet.item.id} episodes={episodes} history={viewing} onPlay={item => { void launch(item); }} onWatched={changeWatched} />)}
        {modalSheet?.type === 'details' && <ScrollView contentContainerStyle={u.content}><View style={{ alignItems: 'center', backgroundColor: '#EEEDFB', borderRadius: 28, paddingVertical: 24 }}><View style={{ width: 168, height: 232, borderRadius: 21, overflow: 'hidden', shadowColor: '#090124', shadowOpacity: .15, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } }}><Artwork item={modalSheet.item} poster /></View></View><View style={{ gap: 10 }}><Text style={u.h1}>{modalSheet.item.name}</Text><View style={u.between}><Text style={u.body}>{modalSheet.item.group}{modalSheet.item.rating ? ` · ${modalSheet.item.rating}` : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Save movie to favorites" onPress={() => toggleFavorite(modalSheet.item)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name={favorites.includes(modalSheet.item.id) ? 'heart' : 'heart-outline'} color={colors.accent} /></Pressable></View></View><Button title={resumePosition(viewing.find(entry => entry.item.id === modalSheet.item.id)) ? `Resume in NodeCast · ${timeLabel(resumePosition(viewing.find(entry => entry.item.id === modalSheet.item.id)))}` : 'Play movie'} icon="play" onPress={() => { void launch(modalSheet.item, false, resumePosition(viewing.find(entry => entry.item.id === modalSheet.item.id)) ? 'internal' : 'default'); }} />{resumePosition(viewing.find(entry => entry.item.id === modalSheet.item.id)) > 0 && <Pressable accessibilityRole="button" onPress={() => { void launch(modalSheet.item, true); }} style={{ alignItems: 'center', padding: 8 }}><Text style={u.link}>Start over</Text></Pressable>}<Button title="Choose another player" variant="secondary" onPress={() => { void launch(modalSheet.item, false, 'external'); }} /><View style={{ gap: 10 }}><Text style={u.label}>About this title</Text><Text style={u.body}>{modalSheet.item.description || 'No description was provided by this playlist.'}</Text></View><Text style={u.small}>{demo ? 'Public sample film · Demo library' : `From ${active?.provider.name || 'your playlist'}`}</Text></ScrollView>}
        {modalSheet?.type === 'player' && <BuiltInPlayer nextEpisode={episodeQueue && episodeQueue.profile === active?.id && followingEpisode(episodeQueue.items, modalSheet.item) ? { item: followingEpisode(episodeQueue.items, modalSheet.item)!, onPress: () => { const next = followingEpisode(episodeQueue.items, modalSheet.item); if (next) { seasonMemory.current.set(`${active?.id}:${episodeQueue.series.id}`, next.group); void launch(next, true, 'internal'); } } } : undefined} channelOptions={active?.channelPlayback?.[modalSheet.item.id]} onSaveOptions={active ? value => saveChannelOptions(modalSheet.item, value) : undefined} fullscreen={playerFullscreen} onFullscreenChange={setPlayerFullscreen} liveEngine={resolvePlayback(active, modalSheet.item.id, preferences.player).engine} onClose={closeSheet} key={modalSheet.item.id} item={modalSheet.item} resumeAt={modalSheet.resumeAt} tracks={active?.tracks} onProgress={snapshot => saveProgress(modalSheet.item, snapshot)} onTracks={tracks => { if (active) void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, tracks } : profile) })).catch(() => setMessage('Could not save language preferences.')); }} onExternal={() => setSheet({ type: 'external', item: modalSheet.item })} />}
        {modalSheet?.type === 'external' && <ScrollView><ExternalSheet key={modalSheet.item.id} item={modalSheet.item} preferred={modalSheet.preferred} onInternal={() => setSheet({ type: 'player', item: modalSheet.item, resumeAt: resumePosition(viewing.find(entry => entry.item.id === modalSheet.item.id)) })} onOpened={() => setSheet(null)} /></ScrollView>}
        </PageTransition>
      </SafeAreaView></ModalSafeAreaProvider>
    </Modal>
  </SafeAreaView>;
}
export default function App() {
  const [loaded, error] = useFonts({ CrimsonText: require('./assets/fonts/CrimsonText-Regular.ttf') });
  const [dataReady, setDataReady] = useState(false);
  const [launchComplete, setLaunchComplete] = useState(false);
  const onReady = useCallback(() => setDataReady(true), []);
  const onFinish = useCallback(() => setLaunchComplete(true), []);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: '#090124' }} />;
  return <NavigationMotionProvider><SafeAreaProvider><StatusBar barStyle="dark-content" /><View style={{ flex: 1 }}><View style={{ flex: 1 }} aria-hidden={!launchComplete} accessibilityElementsHidden={!launchComplete} importantForAccessibility={launchComplete ? 'auto' : 'no-hide-descendants'} pointerEvents={launchComplete ? 'auto' : 'none'}><NodeCast onReady={onReady} launchComplete={launchComplete} /></View>{!launchComplete && <StartupSplash ready={dataReady} onFinish={onFinish} />}</View></SafeAreaProvider></NavigationMotionProvider>;
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  wordmark: { fontSize: 23, color: colors.text, letterSpacing: -1, fontWeight: '700' }, brandIcon: { width: 33, height: 33, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEEDFB', borderColor: '#EAE9EE', borderWidth: 1 },
  shortcut: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 21, backgroundColor: '#fff' },
  artwork: { width: 58, height: 62, borderRadius: 16, backgroundColor: '#EEEDFB', alignItems: 'center', justifyContent: 'center', padding: 7, overflow: 'hidden' },
  poster: { width: '100%', height: '100%', borderRadius: 20, padding: 0, gap: 16 },
  settingsGroup: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: '#fff', overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 17, minHeight: 78, gap: 12 }, rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  segment: { marginHorizontal: 20, flexDirection: 'row', padding: 5, borderRadius: 16, backgroundColor: '#EAE9EE' }, segmentItem: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center', paddingVertical: 10, borderRadius: 12, shadowOpacity: 0 },
  search: { marginHorizontal: 20, marginTop: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 9 },
  categories: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 }, category: { backgroundColor: '#FFFFFF', maxWidth: 220, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 86, padding: 14, marginBottom: 10, borderRadius: 22, backgroundColor: '#FFFFFF' }, liveTag: { backgroundColor: '#EEEDFB', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
});
