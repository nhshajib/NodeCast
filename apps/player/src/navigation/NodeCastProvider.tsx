import {H2,H1} from '../ui';
import { confirmDestructive } from '../confirmDestructive';
import { messageLifetime, type AppMessage } from '../uiPolicy';
import { LibrarySkeleton } from '../Skeletons';
import { Text } from '../Typography';
import BackupSettings from '../BackupSettings';
import { defaultTheme, androidDesign, useThemeChoice } from '../theme';
import { useFamily } from '../FamilyControls';
import FamilySettings from '../FamilyControls';
import { contentAllowed } from '../familyPolicy';
import { useSleepTimer } from '../PlayerToolsContext';
import AppearanceSettings from '../appearanceSettings';
import StorageSettings from '../StorageSettings';
import FullGuide from '../FullGuide';
import ChannelPlaybackOptions from '../ChannelPlaybackOptions';
import { resolvePlayback, setChannelPlayback } from '../viewingPreferences';
import type { ChannelPlayback } from '../viewingPreferences';
import SeriesEpisodes from '../SeriesEpisodes';
import { followingEpisode } from '../episodes';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Linking, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import type { Media, Provider, Section } from '../provider';
import { authenticate, loadEpisodes, loadLibrary, normalizeProvider, ProviderError } from '../provider';
import type { Profile, Vault } from '../vault';
import { emptyVault, removeProfile } from '../vault';
import { loadPreferences, loadVault, savePreferences, saveVault } from '../storage';
import type { Preferences } from '../storage';
import { players as allPlayers } from '../players';
import { demoLibrary } from '../demo';
import NetworkCard from '../NetworkCard';
import HomeScreen from '../HomeScreen';
import ProviderSheet from '../ProviderSheet';
import BuiltInPlayer from '../BuiltInPlayer';
import { hasCompatibilityPlayer } from '../nativePlayback';
import LibraryOptions from '../LibraryOptions';
import ExternalSheet from '../ExternalSheet';
import { preparePlayback } from '../livePlayback';
import { appVersion } from '../releases';
import PlaybackSettings from '../PlaybackSettings';
import VersionHistory from '../VersionHistory';
import HomeIPSetup from '../HomeIPSetup';
import ProgrammeSheet from '../ProgrammeSheet';
import { restoreOrientation } from '../restoreOrientation';
import Pressable from '../FocusPressable';
import { Button, Empty, Icon, Notice, colors, u } from '../ui';
import type { IconName } from '../ui';
import { hydrateMedia } from '../catalog';
import { clearRecents as hideRecents, recordViewing, resumePosition, timeLabel, markWatched } from '../activity';
import type { PlaybackSnapshot, ViewingEntry } from '../activity';
import { clearProfileData, readCatalog, writeCatalog, readViewing, writeViewing } from '../libraryStore';
import { haptic } from '../haptics';
import { Artwork, SettingsRow, s } from './shared';
import { isSheet } from './types';
import type { FocusView, LibraryView, Page, PageEntry, PlayerSession, ViewState } from './types';

const players = allPlayers.filter(player => Platform.OS !== 'android' || player.id !== 'infuse');
const emptyIds: string[] = [];
export const sections: { id: Section; title: string; icon: IconName }[] = [
  { id: 'live', title: 'Live TV', icon: 'tv-outline' }, { id: 'movies', title: 'Movies', icon: 'film-outline' }, { id: 'series', title: 'Series', icon: 'albums-outline' },
];
const libraryViews: LibraryView[] = ['watch', 'live', 'movies', 'series', 'search', 'saved', 'library'];
export const isLibraryView = (view: string): view is LibraryView => (libraryViews as string[]).includes(view);
const base = (section: Section): ViewState => ({ search: '', category: 'All', section, scope: 'category', hidden: false, source: 'saved' });
const initialViews = (): Record<LibraryView, ViewState> => ({
  watch: base('live'), live: base('live'), movies: base('movies'), series: base('series'),
  search: { ...base('live'), scope: 'all' }, saved: base('live'), library: { ...base('movies'), source: 'saved' },
});
export const favoritesMode = (view: LibraryView, state: ViewState) => view === 'saved' || view === 'library' && state.source === 'saved';
export function sectionOf(view: LibraryView, state: ViewState): Section {
  if (view === 'live' || view === 'movies' || view === 'series') return view;
  if (view === 'library') return state.source === 'series' ? 'series' : 'movies';
  return state.section;
}
let pageCounter = 0;

function useNodeCastState(launchComplete: boolean, onReady: () => void) {
  const theme = useThemeChoice();
  const family = useFamily();
  const sleepTimer = useSleepTimer();
  const playerOwner = useRef<string>('');
  const playerStop = useRef<(() => Promise<void>) | null>(null);
  const launchGeneration = useRef(0);
  const compatibilityAvailable = hasCompatibilityPlayer();
  const [vault, setVault] = useState<Vault>(emptyVault());
  const vaultRef = useRef(vault);
  const mutations = useRef(Promise.resolve());
  const [preferences, setPreferences] = useState<Preferences>({ onboarded: false, player: 'internal', baseline: null });
  const prefsRef = useRef(preferences);
  const preferenceMutations = useRef(Promise.resolve());
  const homeIPNext = useRef(false);
  const homeIPFinished = useRef(true);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [playerFullscreen, setPlayerFullscreen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [storageFailed, setStorageFailed] = useState(false);
  const providerCloseAllowed=useRef(false);
  const [providerDirty,setProviderDirty]=useState(false);
  const [message, setMessage] = useState<AppMessage | null>(null);
  useEffect(()=>{const delay=messageLifetime(message);if(delay===null)return;const timer=setTimeout(()=>setMessage(null),delay);return()=>clearTimeout(timer)},[message]);
  const [focused, setFocused] = useState<FocusView>('home');
  const [demo, setDemo] = useState(false);
  const [demoFavorites, setDemoFavorites] = useState<string[]>([]);
  const [demoHidden, setDemoHidden] = useState<string[]>([]);
  // Native stack pages. Routes hold only a key; payloads stay in memory, never in a URL.
  const [pages, setPages] = useState<PageEntry[]>([]);
  const pagesRef = useRef(pages); pagesRef.current = pages;
  const releases = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [cache, setCache] = useState<Partial<Record<Section, Media[]>>>({});
  const cacheRef = useRef(cache); cacheRef.current = cache;
  const cacheOwner = useRef<string | null>(null);
  const fetchedAt = useRef<Partial<Record<Section, number>>>({});
  const forceFetch = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [libraryNotice, setLibraryNotice] = useState('');
  const scrollMemory = useRef(new Map<string, number>());
  const [views, setViews] = useState(initialViews);
  const browseMemory = useRef(new Map<string, Record<LibraryView, ViewState>>());
  const browseOwner = useRef('');
  const [updatedAt, setUpdatedAt] = useState<Partial<Record<Section, string>>>({});
  const [activity, setActivity] = useState<{ profile: string; entries: ViewingEntry[] }>({ profile: '', entries: [] });
  const activityRef = useRef(activity); activityRef.current = activity;
  const [demoActivity, setDemoActivity] = useState<ViewingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [revision, setRevision] = useState(0);
  const seasonMemory = useRef(new Map<string, string>());
  const [episodeQueue, setEpisodeQueue] = useState<{ profile: string; series: Media; items: Media[] } | null>(null);
  const [episodes, setEpisodes] = useState<Media[]>([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeRetry,setEpisodeRetry]=useState(0);
  const [episodeError, setEpisodeError] = useState('');
  const [sheetError, setSheetError] = useState('');
  const connection = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const active = demo ? null : vault.profiles.find(p => p.id === vault.activeId) || null;
  const provider = active?.provider || null;
  const favorites = demo ? demoFavorites : active?.favorites || emptyIds;
  const hiddenGroups = demo ? demoHidden : active?.hiddenGroups || emptyIds;
  const favoriteRef = useRef(favorites); favoriteRef.current = favorites;
  const rawItems = useMemo(() => demo ? demoLibrary : cacheOwner.current === active?.id ? Object.values(cache).flatMap(items => items || []) : [], [demo, cache, active?.id]);
  const allItems = useMemo(() => rawItems.filter(item => contentAllowed(active, item, !family.enabled || family.unlocked)), [rawItems, active?.restrictedGroups, family.enabled, family.unlocked]);
  const mediaById = useMemo(() => new Map(allItems.map(item => [item.id, item])), [allItems]);
  const saved = useMemo(() => favorites.flatMap(id => { const item = mediaById.get(id); return item ? [item] : []; }), [favorites, mediaById]);
  const viewing = (demo ? demoActivity : activity.profile === active?.id ? activity.entries : []).filter(entry => contentAllowed(active, entry.item, !family.enabled || family.unlocked));
  const continueWatching = viewing.filter(entry => resumePosition(entry) > 0).slice(0, 12);
  const recentChannels = viewing.filter(entry => entry.item.kind === 'live' && !entry.hiddenFromRecents).slice(0, 8);
  const playerName = players.find(p => p.id === preferences.player)?.name || 'GlowTV player';
  const organizeOpen = pages.some(entry => entry.page.type === 'organize');
  const focusedState = isLibraryView(focused) ? views[focused] : null;
  const deferredSearch = useDeferredValue(focusedState?.search || '');

  // ── Navigation ────────────────────────────────────────────────────────────
  const open = useCallback((page: Page) => {
    const key = `p${++pageCounter}`;
    setPages(current => [...current, { key, page }]);
    pagesRef.current = [...pagesRef.current, { key, page }];
    router.push({ pathname: isSheet(page.type) ? '/sheet/[type]' : '/page/[type]', params: { type: page.type, key, title:pageTitle(page) } });
  }, []);
  const back = useCallback(() => { if (router.canGoBack()) router.back(); }, []);
  const closeAll = useCallback(() => { if (pagesRef.current.length && router.canDismiss()) router.dismissAll(); }, []);
  /** A route screen holds its page while mounted. Release waits a tick so a remount keeps it. */
  const retain = useCallback((key: string) => { const timer = releases.current.get(key); if (timer) { clearTimeout(timer); releases.current.delete(key); } }, []);
  const release = useCallback((key: string) => {
    releases.current.set(key, setTimeout(() => {
      releases.current.delete(key);
      const entry = pagesRef.current.find(item => item.key === key);
      if (!entry) return;
      pagesRef.current = pagesRef.current.filter(item => item.key !== key);
      setPages(pagesRef.current);
      released.current(entry.page);
    }, 0));
  }, []);
  // Latest closure, so a page removed by a native gesture sees current state.
  const released = useRef<(page: Page) => void>(() => {});
  released.current = page => {
    if (page.type === 'home-ip' && !homeIPFinished.current) void finishHomeIP(undefined, false).catch(() => setMessage({text:'Could not save your preference. Try again.',tone:'error'}));
    if (page.type === 'provider') { connection.current?.abort(); setConnecting(false); }
    setSheetError('');
  };
  const getPage = useCallback((key: string) => pagesRef.current.find(entry => entry.key === key) || null, []);
  const goTab = useCallback((tab: string) => { closeAll(); router.navigate(`/${tab}` as never); }, [closeAll]);
  const setView = useCallback((view: LibraryView, patch: Partial<ViewState>) => setViews(current => ({ ...current, [view]: { ...current[view], ...patch } })), []);

  useEffect(() => {
    alive.current = true;
    Promise.all([loadVault(), loadPreferences().catch(() => ({ onboarded: false, player: 'internal' as const, baseline: null, theme: 'light' as const }))]).then(([loaded, prefs]) => {
      if (!alive.current) return;
      vaultRef.current = loaded; setVault(loaded); prefsRef.current = prefs; setPreferences(prefs); theme.setChoice(prefs.theme || defaultTheme);
    }).catch(() => { if (alive.current) { setStorageFailed(true); setMessage({text:'Could not read saved settings. Your existing secure storage has not been cleared. Please restart the app before adding new profiles.',tone:'error'}); } })
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
      if (alive.current) { setPreferences(next); if (update.theme) theme.setChoice(update.theme); }
    });
    preferenceMutations.current = operation.catch(() => {});
    return operation;
  }
  async function finishHomeIP(baseline?: NonNullable<Preferences['baseline']>, close = true) {
    homeIPFinished.current = true;
    await updatePreferences(baseline ? { baseline, homeIPSetup: 'saved' } : { homeIPSetup: 'skipped' });
    if (close && pagesRef.current.at(-1)?.page.type === 'home-ip') back();
    if (homeIPNext.current) { homeIPNext.current = false; addProfile(); }
  }
  function openHomeIP(next: boolean) { homeIPNext.current = next; homeIPFinished.current = false; open({ type: 'home-ip' }); }
  useEffect(() => {
    if (launchComplete && !booting && !storageFailed && preferences.onboarded && !preferences.baseline && !preferences.homeIPSetup && !pages.length && !demo) openHomeIP(false);
  }, [launchComplete, booting, storageFailed, preferences.onboarded, preferences.baseline, preferences.homeIPSetup, pages.length, demo]);
  useEffect(() => {
    if (!playerSession || minimized) {
      setPlayerFullscreen(false);
      if (Platform.OS !== 'web') void restoreOrientation().catch(() => {});
    }
  }, [playerSession?.item.id, minimized]);
  useEffect(() => {
    const owner = demo ? 'demo' : active?.id || 'empty';
    browseOwner.current = owner;
    setViews(browseMemory.current.get(owner) || initialViews());
    setUpdatedAt({}); setEpisodeQueue(null);
  }, [active?.id, demo]);
  useEffect(() => {
    const owner = demo ? 'demo' : active?.id || 'empty';
    if (owner === browseOwner.current) browseMemory.current.set(owner, views);
  }, [views]);
  useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state === 'active') setRevision(value => value + 1); }); return () => sub.remove(); }, []);
  function refreshLibrary() { forceFetch.current = true; setRevision(value => value + 1); }
  useEffect(() => {
    if (!active || demo) return;
    let cancelled = false;
    const id = active.id;
    void readViewing(id).then(entries => { if (!cancelled) { const next = { profile: id, entries }; activityRef.current = next; setActivity(next); } })
      .catch(() => { if (!cancelled) setMessage({text:'Saved viewing history could not be read. Your profiles are still available.',tone:'error'}); });
    return () => { cancelled = true; };
  }, [active?.id, demo]);
  const focusedSection: Section = focusedState && isLibraryView(focused) ? sectionOf(focused, focusedState) : 'live';
  const focusedFavorites = !!focusedState && isLibraryView(focused) && favoritesMode(focused, focusedState);
  const focusedAll = !!focusedState && focusedState.scope === 'all' && !!deferredSearch.trim();
  useEffect(() => {
    if (!provider || !active || demo || (focused === 'settings' && !organizeOpen)) { setLoading(false); setRefreshing(false); return; }
    const controller = new AbortController();
    const profileId = active.id;
    const forced = forceFetch.current; forceFetch.current = false;
    const needed: Section[] = provider.kind === 'm3u' ? ['live'] : focusedFavorites || organizeOpen
      ? sections.map(s => s.id).filter(id => favoriteRef.current.some(key => key.startsWith(`${id}:`)))
      : focused === 'home' || focused === 'guide' ? ['live'] : focusedAll ? ['live', 'movies', 'series'] : [focusedSection];
    setLibraryError(''); setLibraryNotice('');
    const memory = cacheOwner.current === profileId ? { ...cacheRef.current } : {};
    const updates = needed.filter(id => forced || memory[id] === undefined || Date.now() - (fetchedAt.current[id] || 0) > (active.library?.refreshMinutes || 30) * 60 * 1000);
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
          const stored = await readCatalog(profileId, id, provider);
          if (controller.signal.aborted) return;
          if (stored) {
            setUpdatedAt(current => ({ ...current, [id]: stored.savedAt }));
            // M3U metadata can be browsed offline; its credential-bearing URLs must be reloaded before play.
            if (provider.kind === 'm3u') { memory[id] = stored.items; commit(id, stored.items); }
            else commit(id, stored.items);
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
  }, [provider, active?.id, demo, focused, focusedSection, focusedFavorites, revision, focusedAll, organizeOpen]);
  const seriesPage = [...pages].reverse().find(entry => entry.page.type === 'series');
  const currentSeries = seriesPage?.page.type === 'series' ? seriesPage.page.item : null;
  useEffect(() => {
    if (!currentSeries || !provider) return;
    if (episodeQueue?.profile === active?.id && episodeQueue?.series.id === currentSeries.id) { setEpisodes(episodeQueue.items); setEpisodeLoading(false); return; }
    const controller = new AbortController();
    setEpisodeLoading(true); setEpisodeError(''); setEpisodes([]);
    loadEpisodes(provider, currentSeries, controller.signal).then(items => { if (!controller.signal.aborted) { setEpisodes(items); setEpisodeQueue({ profile: active!.id, series: currentSeries, items }); } })
      .catch(error => { if (!controller.signal.aborted) setEpisodeError(error instanceof ProviderError ? error.message : 'Could not load episodes.'); })
      .finally(() => { if (!controller.signal.aborted) setEpisodeLoading(false); });
    return () => controller.abort();
  }, [currentSeries, provider, episodeRetry]);

  async function saveChannelOptions(item: Media, value?: ChannelPlayback) {
    const owner = active?.id; if (!owner) throw new Error('Add a profile to save playback options.');
    await updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === owner ? setChannelPlayback(profile, item.id, value) : profile) }));
  }
  function changeWatched(item: Media, watched: boolean) {
    haptic('selection');
    if (demo) { setDemoActivity(entries => markWatched(entries, item, watched)); return; }
    if (!active) return;
    if (activityRef.current.profile !== active.id) { setMessage({text:'Saved history is not available yet. Please try again or restart the app.',tone:'error'}); return; }
    const entries = markWatched(activityRef.current.entries, item, watched);
    const next = { profile: active.id, entries }; activityRef.current = next; setActivity(next);
    void writeViewing(active.id, entries).catch(() => setMessage({text:'Could not save watched state.',tone:'error'}));
  }
  const playingSeriesId = playerSession?.item.seriesId;
  useEffect(() => {
    if (!playingSeriesId || !active || !provider || episodeQueue?.profile === active.id && episodeQueue.series.id === playingSeriesId) return;
    const controller = new AbortController();
    const series: Media = { id: playingSeriesId, streamId: playingSeriesId.split(':').slice(1).join(':'), kind: 'series', group: 'Series', name: 'Your series' };
    void loadEpisodes(provider, series, controller.signal).then(items => { if (!controller.signal.aborted) setEpisodeQueue({ profile: active.id, series, items }); }).catch(() => {});
    return () => controller.abort();
  }, [playingSeriesId, active?.id, provider]);
  function addProfile(profile?: Profile) { providerCloseAllowed.current=false;setProviderDirty(false); if (!family.ready) return; if (family.enabled && !family.unlocked) { family.request(); return; } if (storageFailed) { setMessage({text:'Saved profiles could not be read. Restart the app before adding or editing profiles to protect existing data.',tone:'error'}); return; } setConnectError(''); setSheetError(''); open({ type: 'provider', profile }); }
  function closePlayer() { sleepTimer.clear(); launchGeneration.current++; setPlayerSession(null); setMinimized(false); setPlayerFullscreen(false); }
  function startPlayer(session: PlayerSession) {
    playerOwner.current = active?.id || 'demo'; setPlayerSession(session); setMinimized(false);
    // Pages stay underneath so closing the player returns to them; a form sheet is finished.
    const top = pagesRef.current.at(-1);
    if (top && isSheet(top.page.type)) back();
  }
  useEffect(() => {
    if (playerSession && !contentAllowed(active, playerSession.item, !family.enabled || family.unlocked)) closePlayer();
    if (family.enabled && !family.unlocked && pagesRef.current.some(entry => ['profiles', 'guide', 'external', 'details', 'series'].includes(entry.page.type))) closeAll();
  }, [family.unlocked, family.enabled, active?.id]);
  useEffect(() => { closePlayer(); }, [active?.id, demo]);
  // The native stack owns Back for pages; the player sits above it and handles Back first.
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!playerSession || minimized) return false;
      if (playerFullscreen) { setPlayerFullscreen(false); if (Platform.OS !== 'web') void restoreOrientation().catch(() => {}); }
      else closePlayer();
      return true;
    });
    return () => listener.remove();
  }, [playerSession, playerFullscreen, minimized]);
  function browse(section: Section, category = 'All') {
    const reset = { search: '', category, scope: 'category' as const };
    if(section==='live'){setView(androidDesign?'watch':'live',{...reset,section:'live'});goTab('live');}
    else {setView('library',{...reset,source:section});goTab('library');}
  }
  function openSearch() { setView('search', { scope: 'all' }); if (androidDesign) open({ type: 'browse', view: 'search' }); else goTab('search'); }
  function openFavorites(){setView('library',{source:'saved'});goTab('library');}
  function openSettings() { if (androidDesign) goTab('settings'); else open({ type: 'settings' }); }
  function openProfiles() { setSheetError(''); open({ type: 'profiles' }); }
  function goHome() { goTab('home'); }
  function startDemo() { connection.current?.abort(); setDemo(true); setCache({}); setDemoFavorites([]); setDemoHidden([]); setDemoActivity([]); setLibraryError(''); goHome(); }
  async function connect(raw: Provider, editing?: Profile, selecting?: Profile) {
    if (family.enabled && !family.unlocked) { family.request(); return; }
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
        provider: normalized, createdAt: existing?.createdAt || new Date().toISOString(), favorites: sameProvider ? existing.favorites : [], hiddenGroups: sameProvider ? existing.hiddenGroups : [], tracks: existing?.tracks, library: sameProvider ? existing.library : undefined, guide: sameProvider ? existing.guide : undefined, restrictedGroups: sameProvider ? existing.restrictedGroups : undefined, displayFit: existing?.displayFit, channelPlayback: sameProvider ? existing.channelPlayback : undefined, liveFormat: sameProvider ? existing.liveFormat : 'auto', liveEngine: existing?.liveEngine };
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
      haptic('success');
      providerCloseAllowed.current=true;setProviderDirty(false);
      setDemo(false); setLibraryError(''); setConnecting(false); goHome();
    } catch (error) {
      if (!controller.signal.aborted) {
        const text = error instanceof ProviderError ? error.message : 'Could not connect or save this profile securely. Check your details and try again. Up to 30 profiles can be saved.';
        setConnectError(text); setSheetError(text);
      }
    } finally { if (!controller.signal.aborted && alive.current) setConnecting(false); }
  }
  function toggleFavorite(item: Media) {
    haptic('selection');
    if (demo) { setDemoFavorites(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]); return; }
    if (!active) return;
    const id = active.id;
    void updateVault(current => ({ ...current, profiles: current.profiles.map(p => p.id !== id ? p : { ...p, favorites: p.favorites.includes(item.id) ? p.favorites.filter(key => key !== item.id) : [...p.favorites, item.id] }) }))
      .catch(() => setMessage({text:'Could not save your favorite on this device. Please try again.',tone:'error'}));
  }
  function saveProgress(item: Media, snapshot: PlaybackSnapshot) {
    if (demo) { setDemoActivity(entries => recordViewing(entries, item, snapshot)); return; }
    if (!active) return;
    const profileId = active.id;
    if (activityRef.current.profile !== profileId) return; // Never overwrite unread history.
    const entries = recordViewing(activityRef.current.entries, item, snapshot);
    const next = { profile: profileId, entries }; activityRef.current = next; setActivity(next);
    void writeViewing(profileId, entries).catch(() => setMessage({text:'Viewing progress could not be saved on this device.',tone:'error'}));
  }
  function removeViewing(id?: string) {
    if (demo) { setDemoActivity(entries => id ? entries.filter(entry => entry.item.id !== id) : []); return; }
    if (!active) return;
    const entries = id ? activityRef.current.entries.filter(entry => entry.item.id !== id) : [];
    const next = { profile: active.id, entries }; activityRef.current = next; setActivity(next);
    void writeViewing(active.id, entries).catch(() => setMessage({text:'Could not update viewing history.',tone:'error'}));
  }
  async function clearProfileRecents() {
    if (demo) { setDemoActivity(hideRecents); return; } if (!active || activityRef.current.profile !== active.id) throw new Error('History is still loading.');
    const owner = active.id; const previous = activityRef.current; const next = { profile: owner, entries: hideRecents(previous.entries) }; activityRef.current = next; setActivity(next);
    try { await writeViewing(owner, next.entries); } catch (error) { if (activityRef.current === next) { activityRef.current = previous; setActivity(previous); } throw error; }
  }
  function confirmClearRecents() { Alert.alert('Clear recents?', 'Resume positions and watched marks stay. Watching again adds a title back.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear recents', style: 'destructive', onPress: () => { void clearProfileRecents().catch(() => setMessage({text:'Could not clear recents. Try again.',tone:'error'})); } }]); }
  async function launch(item: Media, startOver = false, destination: 'default' | 'internal' | 'external' = 'default') {
    if (!contentAllowed(active, item, !family.enabled || family.unlocked)) { family.request(); return; }
    const generation = ++launchGeneration.current; const owner = active?.id;
    if (playerSession && playerSession.item.id !== item.id) { await playerStop.current?.(); if (generation !== launchGeneration.current || vaultRef.current.activeId !== owner) return; }
    let playable = item;
    if (!item.url && provider) {
      playable = hydrateMedia(item, provider);
      if (!playable.url && provider.kind === 'm3u') {
        setMessage({text:'Refreshing your playlist to open this saved title…',tone:'info'});
        try {
          const items = await loadLibrary(provider, 'live');
          if (vaultRef.current.activeId !== owner) return;
          const match = items.find(candidate => candidate.id === item.id);
          if (!match?.url) { setMessage({text:'This title is no longer available in the provider’s playlist.',tone:'error'}); return; }
          playable = match; setMessage(null);
        } catch { setMessage({text:'Connect to your provider to play a title from the saved library.',tone:'error'}); return; }
      }
    }
    if (!playable.url) { setMessage({text:'This title has no playable stream. Refresh the playlist and try again.',tone:'error'}); return; }
    const options = resolvePlayback(active, item.id, preferences.player);
    playable = preparePlayback(playable, provider, options.format);
    const progress = viewing.find(entry => entry.item.id === item.id);
    if (destination === 'internal' || (destination === 'default' && options.player === 'internal')) startPlayer({ item: playable, resumeAt: startOver ? 0 : resumePosition(progress) });
    else open({ type: 'external', item: playable, preferred: options.player === 'vlc' || options.player === 'infuse' ? options.player : undefined });
  }
  function play(item: Media) {
    if (!contentAllowed(active, item, !family.enabled || family.unlocked)) { family.request(); return; }
    setSheetError('');
    if (item.kind === 'series' && !item.url) { open({ type: 'series', item }); return; }
    if (item.kind === 'movies') { open({ type: 'details', item }); return; }
    void launch(item);
  }
  async function deleteSavedProfile(profile: Profile) {
    if (family.enabled && !family.unlocked) { family.request(); return; }
    setConnecting(true); setSheetError('');
    try {
      await updateVault(current => removeProfile(current, profile.id));
      await clearProfileData(profile.id);
      if (active?.id === profile.id) { setCache({}); setDemo(false); }
      haptic('warning');
      setConnecting(false); back();
    } catch { setSheetError('Could not delete this profile. Try again.'); }
    finally { setConnecting(false); }
  }
  function saveProfile(update: (profile: Profile) => Profile, failure: string, onError: (message:string)=>void = setSheetError) {
    if (!active) return;
    const id = active.id;
    void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === id ? update(profile) : profile) })).catch(() => onError(failure));
  }

  // ── Screens ───────────────────────────────────────────────────────────────
  const preview = saved.length ? saved.slice(0, 6) : demo ? [...demoLibrary.filter(i => i.kind === 'movies'), ...demoLibrary.filter(i => i.kind === 'live')].slice(0, 6) : allItems.slice(0, 6);
  const guideChannels = useMemo(() => allItems.filter(item => item.kind === 'live' && !hiddenGroups.includes(item.group)), [allItems, hiddenGroups]);
  const authorize = () => { if (family.enabled && !family.unlocked) { family.request(); return false; } return true; };
  const renderGuide = (scrollRef?: React.Ref<unknown>,settingsOnly=false) => active ? <FullGuide settingsOnly={settingsOnly} onOpenSettings={()=>open({type:'guide-settings'})} onSettingsDone={back} listRef={scrollRef} onOpenProgramme={(item, programme) => open({ type: 'programme', item, programme })} onAuthorize={() => { if (family.enabled && !family.unlocked) { family.request(); return false; } return true; }} profile={active} channels={guideChannels} onPlay={item => { void launch(item); }} onSave={guide => updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active.id ? { ...profile, guide } : profile) }))} /> : <Empty icon="grid-outline" title="Your TV guide" message="Connect a playlist, then add its guide source to see schedules."><Button title="Connect playlist" onPress={() => addProfile()} /></Empty>;
  const renderHome = (scrollRef?: React.ComponentProps<typeof ScrollView>['ref']) => <HomeScreen scrollRef={scrollRef} active={active} demo={demo} profileCount={vault.profiles.length} loading={loading} liveCount={demo ? demoLibrary.filter(i => i.kind === 'live').length : cache.live?.length}
    favoriteIds={favorites} onFavorite={toggleFavorite} onCategory={group => browse('live', group)} liveChannels={allItems.filter(item => item.kind === 'live')} onSearch={openSearch} preview={preview} savedCount={saved.length} playerName={playerName} error={libraryError}
    onRetry={refreshLibrary} onAdd={() => addProfile()} onDemo={startDemo} onProfiles={openProfiles}
    continueWatching={continueWatching} recentChannels={recentChannels.map(entry => allItems.find(item => item.id === entry.item.id) || (provider ? hydrateMedia(entry.item, provider) : entry.item))} onResume={entry => { void launch(allItems.find(item => item.id === entry.item.id) || entry.item, false, 'internal'); }} onRemove={id => removeViewing(id)} onClearRecents={confirmClearRecents}
    onBrowse={section => browse(section)} onSaved={openFavorites} onPlay={play} onPlayers={() => open({ type: 'players' })}
    network={<NetworkCard baseline={preferences.baseline} onBaseline={value => updatePreferences({ baseline: value, homeIPSetup: value ? 'saved' : 'skipped' })} />}
  />;
  const renderSettings = (scrollRef?: React.ComponentProps<typeof ScrollView>['ref']) => <ScrollView ref={scrollRef} contentContainerStyle={u.content} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
    <Text style={u.body}>Your players, playlists, and preferences.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Manage active profile, ${demo?"Demo library":active?.provider.name||"No active profile"}, ${vault.profiles.length} saved profiles, stored on this device`} onPress={openProfiles} style={({ pressed }) => [u.card, { backgroundColor: colors.panel, borderColor: colors.line, gap: 16 }, pressed && { opacity: .8 }]}><View style={u.row}><View style={[s.avatar, { backgroundColor: 'transparent', width: 32, height: 48 }]}><Icon name="layers-outline" color={colors.text} size={23} /></View><View style={{ flex: 1, gap: 8 }}><Text style={u.eyebrow}>{demo ? 'EXPLORING GLOWTV' : active ? 'ACTIVE PROFILE' : 'YOUR LIBRARY'}</Text><Text numberOfLines={2} style={u.label}>{demo ? 'Demo library' : active?.provider.name || 'Make it your own'}</Text><Text style={u.small}>{vault.profiles.length} saved {vault.profiles.length === 1 ? 'profile' : 'profiles'} · {Platform.OS === 'web' ? 'Preview session' : 'Stored on this device'}</Text></View><Icon name="chevron-forward" size={17} color={colors.link} /></View></Pressable>
    <Button title="Add playlist" icon="add" variant="secondary" onPress={()=>addProfile()}/>
    <View style={s.settingsGroup}><SettingsRow icon="play-circle-outline" title="Default player" subtitle={playerName} onPress={() => open({ type: 'players' })} /><View style={u.divider} /><SettingsRow icon="options-outline" title="Library organization" subtitle="Categories, search, and favorites order" onPress={() => open({ type: 'organize', view: androidDesign ? 'watch' : 'live' })} /></View><Text accessibilityRole="header" style={u.eyebrow}>MAKE IT YOURS</Text><View style={s.settingsGroup}><SettingsRow icon="color-palette-outline" title="Appearance" subtitle="Light, dark or your device setting" onPress={() => open({ type: 'appearance' })} /><View style={u.divider} /><SettingsRow icon="shield-checkmark-outline" title="Family controls" subtitle="PIN and protected categories" onPress={() => open({ type: 'family' })} /></View><Text accessibilityRole="header" style={u.eyebrow}>ON THIS DEVICE</Text><View style={s.settingsGroup}><SettingsRow icon="swap-horizontal-outline" title="Backup & transfer" subtitle="Move profiles and settings to another device" onPress={() => open({ type: 'backup' })} /><View style={u.divider} /><SettingsRow icon="folder-outline" title="Library & storage" subtitle="Cache and viewing history" onPress={() => open({ type: 'storage' })} /><View style={u.divider} /><SettingsRow icon="home-outline" title="Home IP & connection" subtitle="Save or update your home connection" onPress={() => openHomeIP(false)} /><View style={u.divider} /><SettingsRow icon="lock-closed-outline" title="Privacy & storage" subtitle="What stays on your device" onPress={() => open({ type: 'privacy' })} /><View style={u.divider} /><SettingsRow icon="time-outline" title="Version history" subtitle={`What’s new · ${appVersion}`} onPress={() => open({ type: 'history' })} /></View>
    <View style={{ gap: 8 }}><Text accessibilityRole="header" style={u.eyebrow}>SUPPORT GLOWTV</Text><Pressable accessibilityRole="link" accessibilityLabel="Buy me a coffee" accessibilityHint="Opens the optional support website in your browser" onPress={() => { void Linking.openURL('https://buymeacoffee.com/hexorbd').catch(() => setMessage({text:'Couldn’t open the support page. You can visit buymeacoffee.com/hexorbd in your browser.',tone:'error'})); }} style={({ pressed }) => [u.card, { backgroundColor: colors.panel, borderColor: colors.line, opacity: pressed ? .8 : 1 }]}><View style={u.row}><View style={{ width: 32, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="cafe-outline" color={colors.text} size={23} /></View><View style={{ flex: 1, gap: 8 }}><Text style={[u.label, { color: colors.text }]}>Buy me a coffee</Text><Text style={[u.small, { color: colors.secondary }]}>Free to use. Optional support is appreciated.</Text></View><Icon name="open-outline" size={18} color={colors.secondary} /></View></Pressable></View>
    {demo && <Button title="Leave demo" variant="secondary" onPress={() => { setDemo(false); setCache({}); goHome(); }} />}
    <View style={{ gap: 8, paddingHorizontal: 8 }}><Text style={u.small}>Made for the content you bring. No channels or subscriptions are included.</Text><Text style={u.small}>{`GlowTV ${appVersion} · GPL-3.0-only`}</Text></View>
  </ScrollView>;
  const browseTitle = (view: LibraryView) => view === 'saved' ? 'Favorites' : view === 'search' ? 'Search' : view === 'library' ? 'Library' : view === 'watch' || view === 'live' ? 'Live TV' : view === 'movies' ? 'Movies' : 'Series';
  function pageTitle(page: Page): string {
    switch (page.type) {
      case 'provider': return page.profile ? 'Edit playlist' : 'Add a playlist';
      case 'profiles': return 'Your playlists'; case 'players': return 'Playback'; case 'delete': return 'Remove profile';
      case 'series': case 'details': return page.item.name; case 'external': return 'Choose your player';
      case 'appearance': return 'Appearance'; case 'backup': return 'Backup & transfer'; case 'storage': return 'Library & storage';
      case 'family': return 'Family controls'; case 'channel-options': return 'Channel playback'; case 'guide': return 'TV guide'; case 'guide-settings': return 'Guide source';
      case 'organize': return 'Library options'; case 'home-ip': return 'Home IP setup'; case 'history': return 'Version history';
      case 'browse': return browseTitle(page.view); case 'settings': return 'Settings'; case 'programme': return page.programme.title; default: return 'Privacy & storage';
    }
  }
  function renderPage(entry: PageEntry, renderLibrary: (view: LibraryView) => React.ReactNode): React.ReactNode {
    const page = entry.page;
    switch (page.type) {
      case 'browse': return renderLibrary(page.view);
      case 'programme': return active ? <ProgrammeSheet profile={active} item={page.item} programme={page.programme} onAuthorize={authorize} onPlay={item => { void launch(item); }} /> : null;
      case 'settings': return renderSettings();
      case 'appearance': return <AppearanceSettings onSave={value => updatePreferences({ theme: value })} />;
      case 'backup': return <BackupSettings onBusy={setConnecting} beforeTransfer={async () => { await mutations.current; await preferenceMutations.current; }} />;
      case 'storage': return <StorageSettings profile={active} onClearRecents={clearProfileRecents} onClearHistory={() => removeViewing()} onCleared={() => setLibraryNotice('Library cache cleared. Refresh when ready.')} />;
      case 'family': return <FamilySettings profile={active} groups={[...new Set(rawItems.map(item => item.group))].sort()} onSave={restrictedGroups => updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === active?.id ? { ...profile, restrictedGroups } : profile) }))} />;
      case 'history': return <VersionHistory />;
      case 'home-ip': return <HomeIPSetup onSave={baseline => finishHomeIP(baseline)} onSkip={() => finishHomeIP()} />;
      case 'guide': return active ? renderGuide() : null;
      case 'guide-settings': return active?renderGuide(undefined,true):null;
      case 'organize': {
        const state = views[page.view]; const section = sectionOf(page.view, state);
        return <><LibraryOptions section={section} sort={active?.library?.sort?.[section] || 'provider'} refreshMinutes={active?.library?.refreshMinutes || 30}
          onRefreshMinutes={minutes => saveProfile(profile => ({ ...profile, library: { ...profile.library, refreshMinutes: minutes } }), 'Could not save refresh policy.')}
          onSort={order => saveProfile(profile => ({ ...profile, library: { ...profile.library, sort: { ...profile.library?.sort, [section]: order } } }), 'Could not save sort order.')}
          scope={state.scope} onScope={value => setView(page.view, { scope: value, category: 'All' })} groups={Array.from(new Set(allItems.map(item => item.group))).sort()} hidden={hiddenGroups} favorites={saved}
          onToggle={group => { if (demo) { setDemoHidden(current => current.includes(group) ? current.filter(item => item !== group) : [...current, group]); return; } saveProfile(profile => ({ ...profile, hiddenGroups: profile.hiddenGroups?.includes(group) ? profile.hiddenGroups.filter(item => item !== group) : [...(profile.hiddenGroups || []), group] }), 'Could not save category preferences.'); }}
          onMove={(id, direction) => { const move = (list: string[]) => { const next = [...list], index = next.indexOf(id), target = index + direction; if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]; return next; }; if (demo) { setDemoFavorites(move); return; } saveProfile(profile => ({ ...profile, favorites: move(profile.favorites) }), 'Could not save favorites order.'); }} />{!!sheetError && <Notice danger>{sheetError}</Notice>}</>;
      }
      case 'provider': return <ProviderSheet onDirtyChange={setProviderDirty} key={page.profile?.id || 'new'} profile={page.profile} busy={connecting} error={connectError} onSave={(raw, profile) => { void connect(raw, profile); }} />;
      case 'profiles': return <ScrollView contentContainerStyle={u.content} contentInsetAdjustmentBehavior="automatic"><Text style={u.body}>Switch profiles or add a new provider. Your favorites stay separate.</Text>{vault.profiles.map(profile => <View key={profile.id} style={[u.card, { borderWidth: 0, padding: 16 }]}><View style={u.between}><View style={{ flex: 1, gap: 8 }}><H2 style={u.h2}>{profile.provider.name}</H2><Text style={u.small}>{profile.provider.kind === 'xtream' ? 'Xtream Codes' : 'M3U playlist'}{active?.id === profile.id ? ' · Active' : ''}</Text></View><Icon name="server-outline" color={colors.link} /></View><Button title={active?.id === profile.id ? 'Reconnect profile' : 'Use this profile'} busy={connecting} onPress={() => { void connect(profile.provider, undefined, profile); }} /><View style={u.between}><Pressable accessibilityRole="button" disabled={connecting} accessibilityLabel={`Edit details for ${profile.provider.name}`} onPress={() => addProfile(profile)} style={s.textAction}><Text style={u.link}>Edit details</Text></Pressable><Pressable accessibilityRole="button" disabled={connecting} accessibilityLabel={`Remove ${profile.provider.name}`} onPress={() => { setSheetError(''); open({ type: 'delete', profile }); }} style={s.textAction}><Text style={[u.link, { color: colors.danger }]}>Remove</Text></Pressable></View></View>)}{!!sheetError && <Notice danger>{sheetError}</Notice>}{!vault.profiles.length && <Notice>No saved profiles yet. Add your first provider to make this space yours.</Notice>}<Button title="Add a profile" icon="add" disabled={connecting || vault.profiles.length >= 30} onPress={() => addProfile()} /><Text style={u.small}>{Platform.OS === 'web' ? 'Browser preview keeps profiles only for this running session. Use Expo Go for device persistence.' : 'Protected by iOS secure storage on this device. No account, password to remember, or cloud backup.'}</Text></ScrollView>;
      case 'players': return <PlaybackSettings choice={preferences.player} profile={active} compatibilityAvailable={compatibilityAvailable} error={sheetError} onPlayer={player => { haptic('selection'); void updatePreferences({ player }).catch(() => setSheetError('Could not save your player preference.')); }} onEngine={liveEngine => saveProfile(profile => ({ ...profile, liveEngine }), 'Could not save the playback engine.')} onFormat={liveFormat => saveProfile(profile => ({ ...profile, liveFormat }), 'Could not save the live format.')} />;
      case 'delete': return <View style={u.content}><Text style={u.body}>{page.profile.provider.name} and its saved favorites will be removed from this device. This does not cancel your IPTV subscription.</Text>{!!sheetError && <Notice danger>{sheetError}</Notice>}<Button title="Remove profile" variant="danger" busy={connecting} onPress={() => { void deleteSavedProfile(page.profile); }} /><Button title="Keep profile" variant="secondary" disabled={connecting} onPress={back} /></View>;
      case 'privacy': return <ScrollView contentContainerStyle={u.content} contentInsetAdjustmentBehavior="automatic"><H1 style={u.h1}>{'Private by design.\nSimple by choice.'}</H1><Button title="Clear this profile’s viewing history" variant="danger" disabled={!viewing.length} onPress={()=>confirmDestructive("Clear this profile’s viewing history","This deletes viewing history and resume positions for this profile. Saved playlists and favorites remain.",() => removeViewing())} /><View style={u.section}><H2 style={u.h2}>On this device</H2><Text style={u.body}>Server details, passwords, playlist links, and profile favorites use the device’s secure storage. Player preferences, viewing history, and your optional reference IP use local app storage. The browsing cache stores only titles and metadata, without provider passwords or stream URLs. There is no account or cloud sync.</Text></View><View style={u.section}><H2 style={u.h2}>When you connect</H2><Text style={u.body}>Your provider receives the details needed to load and play its content. Artwork loads from URLs supplied by your provider. Prefer HTTPS; HTTP is unencrypted.</Text></View><View style={u.section}><H2 style={u.h2}>The IP check</H2><Text style={u.body}>ipwho.is sees your public IP when you open Home or refresh. We show approximate city/country information, not GPS location. Neither an IP change nor an IP match verifies whether a VPN is on. No IPTV credentials are sent with IP lookups.</Text></View><View style={u.section}><H2 style={u.h2}>External players</H2><Text style={u.body}>Opening VLC or Infuse sends it the complete stream URL, which may include your provider credentials. Only choose apps you trust.</Text></View><Text style={u.small}>Browser preview keeps provider details in memory. Local profiles do not sync to other devices. There is no in-app cloud backup or account recovery. Secure storage availability and uninstall behavior depend on the platform and app build; do not rely on this app as your only copy of provider details. Secure storage does not protect data already visible on an unlocked device.</Text></ScrollView>;
      case 'channel-options': return <ChannelPlaybackOptions key={page.item.id} value={active?.channelPlayback?.[page.item.id]} onSave={value => saveChannelOptions(page.item, value)} />;
      case 'series': return episodeLoading ? <LibrarySkeleton label="Loading episodes"/> : episodeError ? <Empty icon="alert-circle-outline" title="Couldn’t load episodes" message={episodeError}><Button title="Try again" onPress={()=>{setEpisodeError('');setEpisodeRetry(value=>value+1)}}/></Empty> : <SeriesEpisodes series={page.item} seasonMemory={seasonMemory.current} seriesKey={`${active?.id}:${page.item.id}`} key={page.item.id} episodes={episodes.filter(item => contentAllowed(active, item, !family.enabled || family.unlocked))} history={viewing} onPlay={item => { void launch(item); }} onWatched={changeWatched} />;
      case 'details': {
        const resume = resumePosition(viewing.find(item => item.item.id === page.item.id));
        return <ScrollView contentContainerStyle={u.content} contentInsetAdjustmentBehavior="automatic"><View style={{ alignItems: 'center', paddingVertical: 24 }}><View style={{ width: 168, height: 232, borderRadius: 21, overflow: 'hidden' }}><Artwork item={page.item} poster /></View></View><View style={{ gap: 8 }}><H1 style={u.h1}>{page.item.name}</H1><View style={u.between}><Text style={u.body}>{page.item.group}{page.item.rating ? ` · ${page.item.rating}` : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel={favorites.includes(page.item.id) ? 'Remove movie from favorites' : 'Save movie to favorites'} onPress={() => toggleFavorite(page.item)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name={favorites.includes(page.item.id) ? 'heart' : 'heart-outline'} color={colors.link} /></Pressable></View></View><Button title={resume ? `Resume in GlowTV · ${timeLabel(resume)}` : 'Play movie'} icon="play" onPress={() => { void launch(page.item, false, resume ? 'internal' : 'default'); }} />{resume > 0 && <Pressable accessibilityRole="button" onPress={() => { void launch(page.item, true); }} style={[s.textAction, { alignSelf: 'center' }]}><Text style={u.link}>Start over</Text></Pressable>}<Button title="Choose another player" variant="secondary" onPress={() => { void launch(page.item, false, 'external'); }} /><View style={{ gap: 8 }}><Text style={u.label}>About this title</Text><Text style={u.body}>{page.item.description || 'No description was provided by this playlist.'}</Text></View><Text style={u.small}>{demo ? 'Public sample film · Demo library' : `From ${active?.provider.name || 'your playlist'}`}</Text></ScrollView>;
      }
      case 'external': return <ScrollView><ExternalSheet key={page.item.id} item={page.item} preferred={page.preferred} onInternal={() => startPlayer({ item: page.item, resumeAt: resumePosition(viewing.find(item => item.item.id === page.item.id)) })} onOpened={back} /></ScrollView>;
    }
  }

  const playerElement = playerSession && playerOwner.current === (active?.id || 'demo') ? <BuiltInPlayer onRegisterStop={stop => { playerStop.current = stop; }} nextEpisode={episodeQueue && episodeQueue.profile === active?.id && followingEpisode(episodeQueue.items, playerSession.item) ? { item: followingEpisode(episodeQueue.items, playerSession.item)!, onPress: () => { const next = followingEpisode(episodeQueue.items, playerSession.item); if (next) { seasonMemory.current.set(`${active?.id}:${episodeQueue.series.id}`, next.group); void launch(next, true, 'internal'); } } } : undefined}
    channelOptions={active?.channelPlayback?.[playerSession.item.id]} onSaveOptions={active ? value => saveChannelOptions(playerSession.item, value) : undefined} minimized={minimized} onMinimize={() => { setMinimized(true); setPlayerFullscreen(false); }}
    savedFit={active?.displayFit} onFit={displayFit => saveProfile(profile => ({ ...profile, displayFit }), 'Could not save display choice.', text=>setMessage({text,tone:'error'}))} fullscreen={playerFullscreen} onFullscreenChange={setPlayerFullscreen} liveEngine={resolvePlayback(active, playerSession.item.id, preferences.player).engine}
    onClose={() => { const series = episodeQueue?.series; const episode = playerSession.item.id.startsWith('episode:'); closePlayer(); if (episode && series && !pagesRef.current.some(entry => entry.page.type === 'series' && entry.page.item.id === series.id)) open({ type: 'series', item: series }); }}
    key={playerSession.item.id} item={playerSession.item} resumeAt={playerSession.resumeAt} tracks={active?.tracks} onProgress={snapshot => saveProgress(playerSession.item, snapshot)}
    onTracks={tracks => saveProfile(profile => ({ ...profile, tracks }), 'Could not save language preferences.', text=>setMessage({text,tone:'error'}))} onExternal={() => { const item = playerSession.item; closePlayer(); open({ type: 'external', item }); }} /> : null;

  return {
    booting, family, message, setMessage, providerDirty,setProviderDirty,providerCloseAllowed, connected: !!provider || demo, active, demo, provider, vault,
    welcome: !preferences.onboarded && !active && !demo && !pages.length,
    onboardStart: () => { void updatePreferences({ onboarded: true }).then(() => openHomeIP(true)).catch(() => setMessage({text:'Could not save preferences. Try again.',tone:'error'})); },
    onboardDemo: () => { void updatePreferences({ onboarded: true }).catch(() => setMessage({text:'Could not save preferences.',tone:'error'})); startDemo(); },
    pages, open, back, retain, release, getPage, pageTitle, renderPage, connecting, focused, setFocused,
    renderHome, renderSettings, renderGuide,
    views, setView, allItems, saved, favorites, hiddenGroups, loading, libraryError, refreshing, libraryNotice, updatedAt, scrollMemory: scrollMemory.current,
    play, toggleFavorite, addProfile, startDemo, refreshLibrary, browse, openSearch, openFavorites, openSettings, openProfiles, goHome,
    player: { element: playerElement, session: playerSession, minimized, fullscreen: playerFullscreen, restore: () => setMinimized(false), close: closePlayer },
  };
}
export type NodeCastState = ReturnType<typeof useNodeCastState>;
const Context = createContext<NodeCastState | null>(null);
export function useNodeCast() { const value = useContext(Context); if (!value) throw new Error('GlowTV state is not mounted.'); return value; }
export function NodeCastProvider({ launchComplete, onReady, children }: { launchComplete: boolean; onReady: () => void; children: React.ReactNode }) {
  const state = useNodeCastState(launchComplete, onReady);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
