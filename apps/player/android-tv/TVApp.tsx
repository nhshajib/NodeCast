import {adjacentChannel} from '../src/channelNavigation';
import FavoriteCategories from '../src/FavoriteCategories';
import {orderFavoriteGroups,toggleFavoriteGroup} from '../src/favoriteGroups';
import {plural} from '../src/formatting';
import {H2,H1} from '../src/ui';
import TVInfoOverlay from './TVInfoOverlay';
import {tvSafe} from '../src/designTokens';
import {tvBackAction} from '../src/uiPolicy';
import {tvPosterLayout} from '../src/tvPosterLayout';
import BrandMark from '../src/BrandMark';
import { Text } from '../src/Typography';
import TVHome from './TVHome';
import BackupSettings from '../src/BackupSettings';
import { t } from '../src/i18n';
import { ThemeProvider } from '../src/theme';
import { FamilyProvider, useFamily } from '../src/FamilyControls';
import FamilySettings from '../src/FamilyControls';
import { contentAllowed } from '../src/familyPolicy';
import { PlayerToolsProvider, useSleepTimer } from '../src/PlayerToolsContext';
import AppearanceSettings from '../src/appearanceSettings';
import StorageSettings from '../src/StorageSettings';
import FullGuide from '../src/FullGuide';
import TVLibraryOptions from './TVLibraryOptions';
import type { OrganizationMode } from './TVLibraryOptions';
import TVChannelRow, { CHANNEL_ROW_HEIGHT, CHANNEL_ROW_GAP } from './TVChannelRow';
import { cachedTVSection, favoriteSections, moveTVFavorite, needsTVArtwork, sortTVMedia } from './library';
import PlaybackSettings from '../src/PlaybackSettings';
import { hasCompatibilityPlayer } from '../src/nativePlayback';
import { themedStyles, useThemeChoice, isDarkTheme } from '../src/theme';
import SearchScopeControl from '../src/SearchScope';
import type { SearchScope } from '../src/SearchScope';
import { resolvePlayback, setChannelPlayback } from '../src/viewingPreferences';
import type { ChannelPlayback } from '../src/viewingPreferences';
import ChannelPlaybackOptions from '../src/ChannelPlaybackOptions';
import SeriesEpisodes from '../src/SeriesEpisodes';
import RetainedList from '../src/RetainedList';
import GuideScreen from '../src/GuideScreen';
import { readCatalog, writeCatalog, clearProfileData, readLogos, writeLogos } from '../src/libraryStore';
import { logoMap, withLogos } from '../src/logoCache';
/** Saved catalogue plus its saved channel logos, so lists show logos right after a restart. */
async function readTVCatalog(profile: string, section: Section, provider: Provider) {
  const row = await readCatalog(profile, section, provider);
  if (!row) return null;
  const logos = await readLogos(profile, section);
  return logos ? { ...row, items: withLogos(row.items, logos), artworkFresh: true } : row;
}
function saveTVCatalog(profile: string, section: Section, items: Media[], provider: Provider) {
  void writeCatalog(profile, section, items).catch(() => {});
  void writeLogos(profile, section, logoMap(items, provider));
}
import { RefreshGate, stageRefresh } from '../src/refreshPipeline';
import { createRankedSearch } from '../src/catalogQuery';
import { features } from '../src/featureFlags';
import { recentChannelPicker } from '../src/playbackAssist';
import ItemActions from '../src/ItemActions';
import { createList, toggleHidden, toggleInList } from '../src/organization';
import type { MediaList } from '../src/organization';
const emptyLists: MediaList[] = [];
import { followingEpisode } from '../src/episodes';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Alert, BackHandler, DeviceEventEmitter, useWindowDimensions, FlatList, Image, Keyboard, Linking, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { fontAssets } from '../src/Typography';
import * as SplashScreen from 'expo-splash-screen';
import Pressable from '../src/FocusPressable';
import { authenticate, loadEpisodes, loadLibrary, normalizeProvider } from '../src/provider';
import type { Media, Provider, Section } from '../src/provider';
import { emptyVault, removeProfile } from '../src/vault';
import type { Vault, Profile } from '../src/vault';
import { loadVault, saveVault, loadPreferences, savePreferences } from '../src/storage';
import type { Preferences } from '../src/storage';
import { preparePlayback } from '../src/livePlayback';
import { createSearchIndex, searchIndex, hydrateMedia } from '../src/catalog';
import { clearRecents as hideRecents, recordViewing, resumePosition, markWatched } from '../src/activity';
import { readViewing, writeViewing } from '../src/libraryStore';
import type { ViewingEntry } from '../src/activity';
import ProviderSheet from '../src/ProviderSheet';
import BuiltInPlayer from '../src/BuiltInPlayer';
import ExternalSheet from '../src/ExternalSheet';
import VersionHistory from '../src/VersionHistory';
import StartupSplash from '../src/StartupSplash';
import { NavigationMotionProvider, PageTransition } from '../src/NavigationMotion';
import { NativeHeaderTitle, Button, Field, Icon, Notice, colors, u } from '../src/ui';
import { appVersion } from '../src/releases';
import { categoryList, groupLabel, matchesAny } from '../src/groups';
void SplashScreen.preventAutoHideAsync().catch(() => {});
type Page = 'live' | 'movies' | 'series' | 'favorites' | 'settings';
type Overlay = 'favorite-categories' | 'item-options' | 'provider' | 'history' | 'external' | 'episodes' | 'channel-options' | 'guide' | 'appearance' | 'storage' | 'backup' | 'family' | 'organize' | 'players' | 'profiles' | null;
const EMPTY_MEDIA: Media[] = [];
const labels: Record<Page, string> = { live: 'Live TV', movies: 'Movies', series: 'Series', favorites: 'Favorites', settings: 'Settings' };
/** Library header action. With an icon it is a compact square so the category chips keep most of
 * the row; its label appears as a tooltip while focused, absolutely placed so nothing shifts. */
function LibraryAction({title,label,icon,onPress}:{title:string;label?:string;icon?:React.ComponentProps<typeof Icon>['name'];onPress:()=>void}) {
  const [focused,setFocused]=useState(false);
  if(!icon)return <Pressable accessibilityRole="button" accessibilityLabel={label||title} onPress={onPress} style={{minHeight:44,paddingHorizontal:16,paddingVertical:8,borderRadius:20,justifyContent:'center',alignItems:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line}}><Text style={{fontSize:18,fontWeight:'600',color:colors.text}}>{title}</Text></Pressable>;
  return <View style={{width:56,height:56,zIndex:focused?20:0}}>
    <Pressable accessibilityRole="button" accessibilityLabel={label||title} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onPress={onPress} style={{width:56,height:56,borderRadius:28,justifyContent:'center',alignItems:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line}}><Icon name={icon} size={28} color={colors.text}/></Pressable>
    {focused&&<View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{position:'absolute',top:64,right:0,width:320,alignItems:'flex-end'}}><Text numberOfLines={1} style={{fontSize:16,fontWeight:'600',color:colors.text,backgroundColor:colors.panel,borderRadius:8,paddingHorizontal:16,paddingVertical:8,overflow:'hidden'}}>{title}</Text></View>}
  </View>;
}
/** Channel list over live video (Left): zap without leaving the player; Back closes it. */
function ChannelListOverlay({channels,current,logos,onPick}:{channels:Media[];current:string;logos:boolean;onPick:(item:Media)=>void}){
  const start=Math.max(0,channels.findIndex(item=>item.id===current));
  return <View nativeID="tv-trap:channel-list" accessibilityViewIsModal style={{position:'absolute',top:0,bottom:0,left:0,width:520,zIndex:120,backgroundColor:colors.videoScrim,paddingVertical:tvSafe.v,paddingLeft:tvSafe.h,paddingRight:16,gap:8}}>
    <Text style={[u.label,{color:colors.onVideo,fontSize:22}]}>Channels · {channels.length.toLocaleString()}</Text>
    <FlatList data={channels} keyExtractor={item=>item.id} initialScrollIndex={start} getItemLayout={(_,index)=>({length:64,offset:index*64,index})} initialNumToRender={9} windowSize={5} maxToRenderPerBatch={6} ItemSeparatorComponent={()=><View style={{height:8}}/>} contentContainerStyle={{paddingVertical:8}} renderItem={({item,index})=><Pressable nativeID={`${item.id===current?'tv-preferred':'tv-control'}:zap:${item.id}`} accessibilityRole="button" accessibilityLabel={`Watch ${item.name}`} accessibilityState={{selected:item.id===current}} onPress={()=>onPick(item)} style={{height:56,flexDirection:'row',alignItems:'center',gap:16,paddingHorizontal:16,borderRadius:12,backgroundColor:item.id===current?colors.selected:colors.videoControl}}><Text style={{width:48,color:colors.videoMuted,fontSize:16}}>{index+1}</Text>{logos&&item.logo?<Image source={{uri:item.logo}} resizeMode="contain" resizeMethod="resize" style={{width:56,height:36}}/>:null}<Text numberOfLines={1} style={{flex:1,color:item.id===current?colors.selectedText:colors.onVideo,fontSize:18,fontWeight:'600'}}>{item.name}</Text></Pressable>}/>
  </View>;
}
/** Visible progress while a large playlist downloads: the current step and elapsed time. */
export function LoadingProgress({step}:{step:string}){
  const [seconds,setSeconds]=useState(0);
  useEffect(()=>{const started=Date.now();const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer)},[]);
  return <View accessibilityLiveRegion="polite" style={[u.center,{gap:16}]}><ActivityIndicator size="large" color={colors.link}/><Text style={u.label}>{step||'Loading your library…'}</Text><Text style={u.small}>{seconds>0?`${seconds} s`:' '}{seconds>=8?' · Large playlists can take up to a minute.':''}</Text></View>;
}
function TVContent({ onReady, launchComplete }: { onReady: () => void; launchComplete: boolean }) {
  const theme = useThemeChoice();
  const {width}=useWindowDimensions();
  const [railFocused,setRailFocused]=useState(false);const railBlur=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [tvInfo,setTVInfo]=useState(false);const [toast,setToast]=useState('');const lastBack=useRef<number|null>(null);
  const railWidth=railFocused?224:72;
  const columns=Math.max(3,Math.min(5,Math.floor((width-tvSafe.h*2-72-48)/(140+16))));
  const posterWidth=Math.min(160,Math.floor((width-tvSafe.h*2-72-64-(columns-1)*16)/columns));
  const [gridHeight,setGridHeight]=useState<number>();
  const {imageWidth:posterImageWidth,imageHeight:posterImageHeight,tileHeight}=tvPosterLayout(posterWidth,gridHeight);
  function railFocus(){if(railBlur.current)clearTimeout(railBlur.current);setRailFocused(true)}
  function railLeave(){railBlur.current=setTimeout(()=>setRailFocused(false),60)}
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2000);return()=>clearTimeout(timer)},[toast]);
  const searchInput=useRef<React.ComponentRef<typeof TextInput>>(null);
  // Reselecting the active rail item returns its list to the top, like re-tapping a phone tab.
  const channelList=useRef<FlatList<Media>|null>(null);
  const family = useFamily();
  const sleepTimer = useSleepTimer();
  const playerStop=useRef<(() => Promise<void>)|null>(null);
  const launchGeneration=useRef(0);
  const [vault, setVault] = useState<Vault>(emptyVault());
  const vaultRef = useRef(vault); vaultRef.current = vault;
  const [preferences, setPreferences] = useState<Preferences>({ onboarded: true, player: 'internal', baseline: null });
  const prefsRef=useRef(preferences);const preferenceWrites=useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [guidePreviewBox,setGuidePreviewBox] = useState<{x:number;y:number;width:number;height:number}|null>(null);
  const [landing, setLanding] = useState(true);
  const [page, setPage] = useState<Page>('live');
  // Search is its own destination on the rail, not a hidden mode of the current page.
  const [searchPage, setSearchPage] = useState(false);
  const lastSection=useRef<Section>('live');
  const [organizeSection,setOrganizeSection]=useState<Section>('live');
  const [organizeMode,setOrganizeMode]=useState<OrganizationMode>('settings');
  const [organizeBusy,setOrganizeBusy]=useState(false);
  const [catalogVersion,setCatalogVersion]=useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [edit, setEdit] = useState<Profile | undefined>();
  const [libraryData, setLibraryData] = useState<{ key: string; items: Media[] }>({ key: '', items: [] });
  const memory = useRef(new Map<string, { items: Media[]; savedAt: string; artworkFresh?: boolean }>());
  const refreshGate = useRef(new RefreshGate());
  const guideWindows=useRef(new Map<string,number>());
  const scrollMemory = useRef(new Map<string, number>());
  const [updatedAt, setUpdatedAt] = useState('');
  const [optionItem, setOptionItem] = useState<Media | null>(null);
  const [externalItem, setExternalItem] = useState<Media | null>(null);
  const [externalPreferred, setExternalPreferred] = useState<'vlc' | 'infuse' | undefined>();
  const [browseStates, setBrowseStates] = useState<Record<string, { query: string; group: string; scope: SearchScope; hidden: boolean; recentOnly?: boolean; focused?: string }>>({});
  const [episodes, setEpisodes] = useState<Media[]>([]);
  const seasonMemory = useRef(new Map<string, string>());
  const [episodeQueue, setEpisodeQueue] = useState<{ profileId: string; seriesId: string; items: Media[] } | null>(null);
  const [playFromStart, setPlayFromStart] = useState(false);

  const [busy, setBusy] = useState(false);
  const [loadStep, setLoadStep] = useState('');
  const [providerDirty, setProviderDirty] = useState(false);
  const [zapList, setZapList] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState('');
  const forceRefresh=useRef(false);
  const [revision, setRevision] = useState(0);
  const [minimized,setMinimized]=useState(false);
  const playerOwner=useRef<string|null>(null);
  const [transferBusy,setTransferBusy]=useState(false);
  const [playing, setPlaying] = useState<Media | null>(null);
  const playbackVisible=useRef(false);playbackVisible.current=!!playing&&!minimized;
  const [fullscreen, setFullscreen] = useState(true);
  const [viewing, setViewing] = useState<ViewingEntry[]>([]);
  const viewingOwner = useRef<string | null>(null);
  const viewingRef = useRef(viewing); viewingRef.current = viewing;
  const [storageError, setStorageError] = useState('');
  const request = useRef<AbortController | null>(null);
  const catalogRequest = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const writes = useRef(Promise.resolve());
  const active = vault.profiles.find(p => p.id === vault.activeId);
  const activeId = active?.id;
  const next = useMemo(() => episodeQueue && episodeQueue.profileId === activeId ? followingEpisode(episodeQueue.items, playing) : null, [episodeQueue, activeId, playing]);
  const browseKey = `${activeId || 'empty'}:${page}`;
  const browse = browseStates[browseKey] || { query: '', group: 'All', scope: (page==='live'||page==='movies'||page==='series'?active?.library?.tvSearchScope?.[page]:undefined)||'section' as SearchScope, hidden: false };
  const { query, group } = browse;
  const recentOnly = browse.recentOnly || false;
  const organizationKey=`${activeId||'empty'}:${organizeSection}`;
  const organizationScope=browseStates[organizationKey]?.scope||active?.library?.tvSearchScope?.[organizeSection]||'section';
  const favoriteSectionKey=useMemo(()=>favoriteSections(active?.favorites||[]).join(','),[active?.favorites]);
  useEffect(()=>{if(page==='live'||page==='movies'||page==='series')lastSection.current=page;},[page]);
  const changeBrowse = (patch: Partial<typeof browse>) => setBrowseStates(current => ({ ...current, [browseKey]: { ...(current[browseKey] || browse), ...patch } }));
  const setQuery = (query: string) => changeBrowse({ query });
  const setGroup = (group: string) => changeBrowse({ group, scope: 'category' });
  const rawItems = libraryData.key === browseKey ? libraryData.items : EMPTY_MEDIA;
  const items=useMemo(()=>rawItems.filter(item=>contentAllowed(active,item,!family.enabled||family.unlocked)),[rawItems,active?.restrictedGroups,family.enabled,family.unlocked]);
  const profileById=useMemo(()=>{const result=new Map<string,Media>();for(const [key,row] of memory.current){if(key.startsWith(`${activeId}:`))for(const item of row.items)result.set(item.id,item);}return result;},[activeId,libraryData,catalogVersion]);
  const profileItems=useMemo(()=>[...profileById.values()],[profileById]);
  const deferred = useDeferredValue(query);
  async function updateVault(change: (current: Vault) => Vault) {
    const action = writes.current.then(async () => {
      const next = change(vaultRef.current); await saveVault(next);
      if (alive.current) { vaultRef.current = next; setVault(next); }
    });
    writes.current = action.catch(() => {}); return action;
  }
  async function updatePreferences(patch: Partial<Preferences>) {
    const operation=preferenceWrites.current.then(async()=>{const next={...prefsRef.current,...patch};await savePreferences(next);prefsRef.current=next;if(alive.current){setPreferences(next);if(patch.theme)theme.setChoice(patch.theme);}});preferenceWrites.current=operation.catch(()=>{});return operation;
  }
  useEffect(() => {
    alive.current = true;
    void Promise.all([loadVault(), loadPreferences()]).then(([v, p]) => { if (alive.current) { vaultRef.current = v; setVault(v); const next={...p,theme:p.theme||'dark' as const};prefsRef.current=next;setPreferences(next);theme.setChoice(next.theme);if(!p.theme)void savePreferences(next).catch(()=>{}); } })
      .catch(() => { if (alive.current) setStorageError('Could not read saved profiles. Restart the app before changing profiles.'); })
      .finally(() => { if (alive.current) { setReady(true); onReady(); } });
    return () => { alive.current = false; request.current?.abort(); catalogRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    setPlaying(null);setMinimized(false);
    memory.current.clear();
    viewingOwner.current = null; setViewing([]); setEpisodeQueue(null);
    if (!activeId) return;
    let live = true;
    void readViewing(activeId).then(entries => { if (live) { viewingOwner.current = activeId; viewingRef.current = entries; setViewing(entries); } }).catch(() => {});
    return () => { live = false; };
  }, [activeId,active?.provider]);
  useEffect(()=>{if(playing&&!contentAllowed(active,playing,!family.enabled||family.unlocked))setPlaying(null);if(family.enabled&&!family.unlocked&&['episodes','guide','external'].includes(overlay||''))setOverlay(null)},[family.enabled,family.unlocked,activeId]);
  useEffect(() => {
    catalogRequest.current?.abort(); const controller = new AbortController(); catalogRequest.current = controller;
    const forced=forceRefresh.current;forceRefresh.current=false;
    setError(''); setUpdatedAt('');
    if (!active || page === 'settings') { setBusy(false); return; }
    const profile = active;
    const owner = browseKey;
    const sections: Section[] = profile.provider.kind === 'm3u' ? ['live'] : page === 'favorites' ? favoriteSections(profile.favorites) : browse.scope === 'all' && !!deferred.trim() ? ['live', 'movies', 'series'] : [page];
    if(!sections.length){setLibraryData({key:owner,items:[]});setBusy(false);return;}
    setBusy(true); setLoadStep('Opening your saved channels…');
    void (async () => {
      const saved = await Promise.all(sections.map(async section => {
        const key = `${profile.id}:${section}`;
        return cachedTVSection(memory.current,profile.id,section,profile.provider,readTVCatalog);
      }));
      if (controller.signal.aborted) return;
      const cached = saved.flatMap(row => row?.items || []);
      if (saved.some(Boolean)) { setLibraryData({ key: owner, items: cached }); setUpdatedAt(saved.map(row => row?.savedAt || '').sort()[0] || ''); setBusy(false); }
      const missingArchiveMetadata=profile.provider.kind==='xtream'&&sections.includes('live')&&cached.some(item=>item.kind==='live'&&item.archiveDays===undefined);
      const artworkMissing=needsTVArtwork(page,sections,saved,profile.library?.tvLiveLayout,profile.library?.tvChannelLogos!==false);
      if(!forced&&!missingArchiveMetadata&&!artworkMissing&&saved.length&&saved.every(row=>row&&Date.now()-Date.parse(row.savedAt)<(active.library?.refreshMinutes||30)*60000)){setBusy(false);return;}
      setLoadStep(profile.provider.kind==='m3u'?'Downloading your playlist…':'Downloading your library…');
      const results = await Promise.allSettled(sections.map(async section => {
        const ticket = refreshGate.current.begin(profile.id, section);
        const fetched = await loadLibrary(profile.provider, section, controller.signal);
        if (!controller.signal.aborted) setLoadStep(`Saving ${fetched.length.toLocaleString()} ${section==='live'?'channels':'titles'}…`);
        if (controller.signal.aborted || !refreshGate.current.isCurrent(ticket, vaultRef.current.activeId)) return null;
        // An empty response never replaces a working library; exact duplicate IDs are dropped.
        const outcome = stageRefresh(memory.current.get(`${profile.id}:${section}`)?.items, fetched);
        if (!outcome.accept) return memory.current.get(`${profile.id}:${section}`) || null;
        const items = outcome.items;
        const row = { items, savedAt: new Date().toISOString(), artworkFresh:true };
        memory.current.set(`${profile.id}:${section}`, row);
        saveTVCatalog(profile.id, section, items, profile.provider);
        return row;
      }));
      if (controller.signal.aborted) return;
      const rows = results.map((result, i) => result.status === 'fulfilled' && result.value ? result.value : saved[i]);
      if (rows.some(Boolean)) { setLibraryData({ key: owner, items: rows.flatMap(row => row?.items || []) }); setUpdatedAt(rows.map(row => row?.savedAt || '').filter(Boolean).sort()[0] || ''); }
      if (results.some(result => result.status === 'rejected')) setError('Could not refresh everything. Saved titles remain available; try Refresh library.');
      setBusy(false);
    })().catch(() => { if (!controller.signal.aborted) { setError('Could not load your library. Try Refresh library.'); setBusy(false); } });
    return () => controller.abort();
  }, [activeId, active?.provider, page, revision, browse.scope, !!deferred.trim(), page==='favorites'?favoriteSectionKey:null,active?.library?.tvLiveLayout,active?.library?.tvChannelLogos]);
  useEffect(()=>{
    if(!active || overlay!=='organize' || organizeMode==='settings'){setOrganizeBusy(false);return;}
    const controller=new AbortController();const profile=active;
    const sections:Section[]=profile.provider.kind==='m3u'?['live']:organizeMode==='favorites'?(favoriteSectionKey?favoriteSectionKey.split(',') as Section[]:[]):[organizeSection];
    setOrganizeBusy(true);
    void (async()=>{
      const saved=await Promise.all(sections.map(section=>cachedTVSection(memory.current,profile.id,section,profile.provider,readTVCatalog)));
      if(controller.signal.aborted)return;setCatalogVersion(value=>value+1);
      const results=await Promise.allSettled(sections.map(async(section,index)=>{
        if(saved[index]&&Date.now()-Date.parse(saved[index]!.savedAt)<(profile.library?.refreshMinutes||30)*60000)return;
        const ticket=refreshGate.current.begin(profile.id,section);
        const outcome=stageRefresh(memory.current.get(`${profile.id}:${section}`)?.items,await loadLibrary(profile.provider,section,controller.signal));if(controller.signal.aborted||!refreshGate.current.isCurrent(ticket,vaultRef.current.activeId)||!outcome.accept)return;const items=outcome.items;
        memory.current.set(`${profile.id}:${section}`,{items,savedAt:new Date().toISOString(),artworkFresh:true});saveTVCatalog(profile.id,section,items,profile.provider);
      }));
      if(controller.signal.aborted)return;setCatalogVersion(value=>value+1);
      if(results.some(result=>result.status==='rejected'))setError('Could not refresh this library. Saved categories and favorites remain available.');
    })().catch(()=>{if(!controller.signal.aborted)setError('Could not load organization data. Open or refresh this media library, then try again.');}).finally(()=>{if(!controller.signal.aborted)setOrganizeBusy(false);});
    return()=>controller.abort();
  },[activeId,active?.provider,overlay==='organize',organizeSection,organizeMode,favoriteSectionKey]);
  useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state==='active')setRevision(value=>value+1)});return()=>sub.remove()},[]);
  const handleBack=useRef<()=>boolean>(()=>false);
  handleBack.current=()=>{
      if(transferBusy)return true;
      if(tvInfo){setTVInfo(false);return true;}
      if(zapList){setZapList(false);return true;}
      // Typed playlist details are never thrown away by a stray Back press.
      if(confirmDiscard){setConfirmDiscard(false);return true;}
      if(overlay==='provider'&&providerDirty&&!busy){setConfirmDiscard(true);return true;}
      if (overlay) { if (overlay === 'provider' || overlay === 'episodes') { request.current?.abort(); setBusy(false); } setOverlay(null); return true; }
      if (playing&&!minimized) { closePlayer(); return true; }
      const action=tvBackAction({home:landing,lastBack:lastBack.current,now:Date.now()});
      if(action==='home'){setLanding(true);setQuery('');setGroup('All');lastBack.current=null;return true;}
      if(action==='warn'){lastBack.current=Date.now();setToast('Press Back again to exit');return true;}
      return false;
  };
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>handleBack.current());return()=>sub.remove()},[]);

  const favoriteIds=useMemo(()=>new Set(active?.favorites||[]),[active?.favorites]);
  const favoritesForIndex=page==='favorites'?favoriteIds:null;
  const favoriteOrder=page==='favorites'?active?.favorites:null;
  const scope: SearchScope = searchPage ? 'all' : browse.scope;
  const tvLists = active?.lists || emptyLists;
  const listIds = useMemo(() => new Set(tvLists.flatMap(list => list.items)), [tvLists]);
  const hiddenSet = useMemo(() => new Set(active?.hiddenItems || []), [active?.hiddenItems]);
  const index = useMemo(() => (features.rankedSearch?((rows:Media[])=>rows.map(item=>({item,text:'',compactName:''}))):createSearchIndex)(page === 'favorites' ? items.filter(i => favoriteIds.has(i.id) || listIds.has(i.id)) : items.filter(i => (scope === 'all' && !!deferred.trim() || i.kind === page) && (browse.hidden && !!deferred.trim() || !hiddenSet.has(i.id)))), [items, page, favoritesForIndex, listIds, hiddenSet, browse.hidden, scope, !!deferred.trim()]);
  // With named lists, the Favorites page's chips choose between favorites and each list.
  const listMode = page === 'favorites' && features.organization && tvLists.length > 0;
  const groups = useMemo(() => listMode ? ['All', ...tvLists.map(list => list.name)] : orderFavoriteGroups(categoryList(index.map(entry => entry.item.group)).filter(group => group!=='All' && !active?.hiddenGroups?.includes(group)),page==='live'?active?.library?.favoriteGroups:[]), [listMode, tvLists, index, active?.hiddenGroups, active?.library?.favoriteGroups, page]);
  const tvList = listMode ? tvLists.find(list => list.name === group) : undefined;
  const preparedSearch=useMemo(()=>createRankedSearch(index.map(entry=>entry.item)),[index]);
  const matchedAll = useMemo(() => features.rankedSearch ? preparedSearch(deferred, deferred.trim() && scope !== 'category' ? 'All' : listMode ? 'All' : group, active?.hiddenGroups || [], page === 'favorites' || !!deferred.trim() && browse.hidden) : searchIndex(index, deferred, deferred.trim() && scope !== 'category' ? 'All' : listMode ? 'All' : group, active?.hiddenGroups || [], page === 'favorites' || !!deferred.trim() && browse.hidden), [index, preparedSearch, deferred, group, scope, browse.hidden, page, listMode, active?.hiddenGroups]);
  const matched = useMemo(() => !listMode ? matchedAll : matchedAll.filter(item => tvList ? tvList.items.includes(item.id) : favoriteIds.has(item.id)), [listMode, matchedAll, tvList, favoriteIds]);
  const pageSort=active?.library?.sort?.[page==='movies'||page==='series'?page:'live']||'provider';
  const filtered=useMemo(()=>{
    const recentIds=new Set(recentOnly?viewing.filter(entry=>!entry.hiddenFromRecents).map(entry=>entry.item.id):[]);
    const allowed=recentOnly?matched.filter(item=>recentIds.has(item.id)):matched;
    const byId=page==='favorites'?new Map(allowed.map(item=>[item.id,item])):null;
    return page==='favorites'?(tvList?tvList.items:active?.favorites)?.flatMap(id=>{const item=byId?.get(id);return item?[item]:[]})||[]:features.rankedSearch&&deferred.trim()?allowed:sortTVMedia(allowed,pageSort);
  },[matched,recentOnly,recentOnly?viewing:null,page,favoriteOrder,pageSort,deferred,tvList]);
  async function patchProfile(change: Partial<Profile>|((profile:Profile)=>Partial<Profile>)){const id=activeId;if(!id)return;await updateVault(current=>({...current,profiles:current.profiles.map(profile=>{if(profile.id!==id)return profile;const patch=typeof change==='function'?change(profile):change;return {...profile,...patch,...(patch.library?{library:{...profile.library,...patch.library,sort:{...profile.library?.sort,...patch.library.sort}}}:{} )};})}));}
  async function organizeSave(change:Partial<Profile>|((profile:Profile)=>Partial<Profile>)){setError('');try{await patchProfile(change);}catch(error){setError('Could not save library changes. Please try again.');throw error;}}
  function openOrganization(){setError('');setOrganizeSection(active?.provider.kind==='m3u'?'live':lastSection.current);setOrganizeMode('settings');setOverlay('organize');}
  useEffect(()=>{if(group!=='All'&&libraryData.key===browseKey&&!groups.includes(group))changeBrowse({group:'All'});},[groups,group,browseKey,libraryData.key]);
  const organizationGroups=useMemo(()=>categoryList(profileItems.filter(item=>item.kind===organizeSection&&contentAllowed(active,item,!family.enabled||family.unlocked)).map(item=>item.group)).sort(),[profileItems,organizeSection,active?.restrictedGroups,family.enabled,family.unlocked]);
  const organizationFavorites=useMemo(()=>{const history=new Map(viewing.map(entry=>[entry.item.id,entry.item]));return (active?.favorites||[]).flatMap(id=>{const item=profileById.get(id)||history.get(id);if(item&&!contentAllowed(active,item,!family.enabled||family.unlocked))return [];return [{id,name:item?.name||'Unavailable saved title',group:item?.group||'Remove this favorite if it is no longer in your playlist.'}];});},[active?.favorites,profileById,viewing,active?.restrictedGroups,family.enabled,family.unlocked]);
  const listView=(page==='live'||page==='favorites'&&filtered.every(item=>item.kind==='live'))&&(active?.library?.tvLiveLayout||'list')==='list';
  const logos=active?.library?.tvChannelLogos!==false;

  const zapChannels=useMemo(()=>{const source=!landing&&(searchPage||page==='live'||page==='favorites')?filtered:profileItems;return source.filter(item=>item.kind==='live'&&contentAllowed(active,item,!family.enabled||family.unlocked)&&!active?.hiddenItems?.includes(item.id)&&!matchesAny(item.group,active?.hiddenGroups||[]));},[filtered,profileItems,landing,searchPage,page,active?.restrictedGroups,active?.hiddenItems,active?.hiddenGroups,family.enabled,family.unlocked]);
  const remoteActions=useRef<(command:string)=>void>(()=>{});
  remoteActions.current=command=>{
    if(command==='info'){if(playing?.kind==='live')setTVInfo(value=>!value);return;}
    if(command==='channels'){if(playing?.kind==='live'&&!minimized){setTVInfo(false);setZapList(true);}return;}
    if(command==='guide'){setTVInfo(false);setLanding(false);setOverlay('guide');if(playing){setMinimized(true);setFullscreen(false)}return;}
    if(playing?.kind!=='live')return;
    const channel=adjacentChannel(zapChannels,playing.id,command==='next'?1:-1);
    if(channel){setTVInfo(false);void open(channel);}
  };
  function channelPosition(item:Media){const list=zapChannels;const at=list.findIndex(entry=>entry.id===item.id);return [at>=0?`${at+1} of ${list.length}`:'',groupLabel(item.group)].filter(Boolean).join(' · ');}
  const itemOptions=useRef<(id:string)=>void>(()=>{});
  const categoryOptions=useRef<(group:string)=>void>(()=>{});
  categoryOptions.current=group=>{
    if(page!=='live'||group==='All'){openOrganization();return;}
    if(!active||!groups.includes(group))return;
    if(family.enabled&&!family.unlocked){family.request();return;}
    void patchProfile(profile=>({library:{...profile.library,favoriteGroups:toggleFavoriteGroup(profile.library?.favoriteGroups,group)}})).catch(()=>setError('Couldn’t save this category.'));
  };
  itemOptions.current=id=>{const item=filtered.find(item=>item.id===id)||profileById.get(id);if(item){changeBrowse({focused:item.id});setOptionItem(item);setOverlay(item.kind==='live'?'channel-options':'item-options');}};
  useEffect(()=>{const commands=DeviceEventEmitter.addListener('GlowTVRemoteCommand',value=>remoteActions.current(String(value)));const menu=DeviceEventEmitter.addListener('GlowTVItemOptions',id=>itemOptions.current(String(id)));const categories=DeviceEventEmitter.addListener('GlowTVCategoryOptions',group=>categoryOptions.current(String(group)));return()=>{commands.remove();menu.remove();categories.remove()}},[]);
  async function connect(provider: Provider) {
    if(!family.ready)return;if(family.enabled&&!family.unlocked){family.request();return;}
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
      const profile: Profile = { ...(edit || { id: `tv-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), favorites: [] }), provider: normalized, ...(changed ? { favorites: [], hiddenGroups: [], channelPlayback: undefined, guide:undefined, restrictedGroups:undefined, library:undefined } : {}) };
      await updateVault(current => ({ ...current, activeId: profile.id, profiles: [...current.profiles.filter(p => p.id !== profile.id), profile] }));
      if (!controller.signal.aborted && alive.current) { forceRefresh.current=true;memory.current.clear();setOverlay(null); setRevision(r => r + 1); }
    } catch (e) { if (!controller.signal.aborted && alive.current) setError((e as Error).message); }
    finally { if (!controller.signal.aborted && alive.current) setBusy(false); }
  }
  async function open(item: Media, preview = false) {
    if(!contentAllowed(active,item,!family.enabled||family.unlocked)){family.request();return;}
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
    const generation=++launchGeneration.current;const owner=activeId;if(playing&&playing.id!==item.id){await playerStop.current?.();if(generation!==launchGeneration.current||vaultRef.current.activeId!==owner)return;}
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
    setPlayFromStart(false); setOverlay(preview?'guide':null); setMinimized(preview); playerOwner.current=activeId||null; setFullscreen(!preview); setPlaying(playable);
  }
  function closePlayer() { setViewing(viewingRef.current);sleepTimer.clear();launchGeneration.current++; setMinimized(false); const wasEpisode = playing?.id.startsWith('episode:'); setPlaying(null); if(playing?.catchup)setOverlay('guide');else if (wasEpisode && episodeQueue) setOverlay('episodes'); }
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
  async function clearProfileRecents(){if(!activeId||viewingOwner.current!==activeId)throw new Error('History is still loading.');const owner=activeId,previous=viewingRef.current,entries=hideRecents(previous);viewingRef.current=entries;setViewing(entries);try{await writeViewing(owner,entries)}catch(error){if(viewingOwner.current===owner&&viewingRef.current===entries){viewingRef.current=previous;setViewing(previous)}throw error;}}
  function confirmClearRecents(){Alert.alert('Clear recents?','Resume positions and watched marks stay. Watching again adds a title back.',[{text:'Cancel',style:'cancel'},{text:'Clear recents',onPress:()=>{void clearProfileRecents().catch(()=>setError('Could not clear recents. Try again.'))}}]);}
  const add = () => { if(family.enabled&&!family.unlocked){family.request();return;} setEdit(undefined); setError(''); setOverlay('provider'); };
  const actions=useRef({open,favorite,options:(item:Media)=>{changeBrowse({focused:item.id});setOptionItem(item);setOverlay('channel-options');}});
  actions.current={open:(item:Media)=>{changeBrowse({focused:item.id});return open(item)},favorite,options:(item:Media)=>{changeBrowse({focused:item.id});setOptionItem(item);setOverlay('channel-options');}};
  const playRow=useCallback((item:Media)=>{void actions.current.open(item);},[]);
  const favoriteRow=useCallback((item:Media)=>actions.current.favorite(item),[]);
  const optionsRow=useCallback((item:Media)=>actions.current.options(item),[]);
  const firstId=filtered[0]?.id;
  const renderChannel=useCallback(({item}:{item:Media})=><TVChannelRow item={item} favorite={favoriteIds.has(item.id)} logos={logos} tone={colors.bg} onPlay={playRow} onFavorite={favoriteRow} onOptions={optionsRow} preferred={browse.focused?browse.focused===item.id:item.id===firstId}/>,[favoriteIds,logos,colors.bg,playRow,favoriteRow,optionsRow,browse.focused,firstId]);
  const sheet = (title: string, body: React.ReactNode) => <View nativeID={`${overlay==='provider'?'tv-trap':'tv-scope'}:sheet:${activeId||'empty'}:${overlay}`} style={[s.sheet,overlay==='guide'&&{paddingTop:0}]}>{overlay!=='guide'&&<View style={s.sheetHeader}><Button nativeID="tv-control:sheet-back" title="Back" icon="chevron-back" variant="secondary" disabled={transferBusy} onPress={() => { if(overlay==='provider'&&providerDirty&&!busy){setConfirmDiscard(true);return;} if (overlay === 'provider' || overlay === 'episodes') { request.current?.abort(); setBusy(false); } setOverlay(null); }} /><H2 style={[u.h2,{fontSize:28}]}>{title}</H2></View>}<View style={{ flex: 1 }}><NativeHeaderTitle.Provider value>{body}</NativeHeaderTitle.Provider></View></View>;
  const renderBody=()=>{
  if(overlay==='item-options'&&optionItem)return sheet(optionItem.name,<View style={{flex:1}}><View style={{paddingHorizontal:24,paddingTop:8}}><Button nativeID="tv-preferred:item-play" title={optionItem.kind==='series'?'Open series':'Play'} onPress={()=>{setOverlay(null);void open(optionItem)}}/></View><ItemActions item={optionItem} favorite={favoriteIds.has(optionItem.id)} lists={active?.lists||[]} hidden={!!active?.hiddenItems?.includes(optionItem.id)} onFavorite={()=>favorite(optionItem)} onToggleList={listId=>patchProfile(profile=>({lists:toggleInList(profile.lists||[],listId,optionItem.id)}))} onCreateList={name=>patchProfile(profile=>{const id=`list-${Date.now().toString(36)}`;return {lists:toggleInList(createList(profile.lists,name,id),id,optionItem.id)};})} onToggleHidden={()=>patchProfile(profile=>({hiddenItems:toggleHidden(profile.hiddenItems,optionItem.id)}))} onPlaybackOptions={optionItem.kind==='live'?()=>setOverlay('channel-options'):undefined}/></View>);
  // Settings has no current-page catalogue. Category management belongs to the
  // active playlist's cached sections, with hidden/family rules applied again.
  if (overlay === 'favorite-categories') return sheet('Favorite categories',<FavoriteCategories groups={categoryList(profileItems.filter(item=>item.kind==='live'&&contentAllowed(active,item,!family.enabled||family.unlocked)&&!matchesAny(item.group,active?.hiddenGroups||[])).map(item=>item.group))} favorites={active?.library?.favoriteGroups||[]} onToggle={group=>patchProfile(profile=>({library:{...profile.library,favoriteGroups:toggleFavoriteGroup(profile.library?.favoriteGroups,group)}}))}/>);
  if(overlay==='profiles')return sheet('Switch playlist',<ScrollView contentContainerStyle={u.content}>{vault.profiles.map(p=><Button key={p.id} title={p.provider.name} icon={p.id===activeId?'checkmark':undefined} variant="secondary" onPress={()=>{void updateVault(v=>({...v,activeId:p.id})).then(()=>{setPage('live');setOverlay(null)}).catch(()=>setError('Could not switch playlist.'))}}/>)}<Button title="Add playlist" onPress={add}/></ScrollView>);
  if (overlay === 'provider') return sheet('Your playlist', <View style={{flex:1}}><ProviderSheet profile={edit} busy={busy} error={error} onDirtyChange={setProviderDirty} onSave={p => { void connect(p); }} />{confirmDiscard&&<View nativeID="tv-trap:discard-playlist" accessibilityViewIsModal style={{position:'absolute',top:0,bottom:0,left:0,right:0,alignItems:'center',justifyContent:'center',backgroundColor:colors.videoScrim}}><View style={[u.card,{width:560,gap:16,padding:24}]}><H2 style={u.h2}>Discard this playlist?</H2><Text style={u.body}>The details you typed haven’t been saved.</Text><Button nativeID="tv-preferred:keep-editing" title="Keep editing" onPress={()=>setConfirmDiscard(false)}/><Button title="Discard" variant="danger" onPress={()=>{setConfirmDiscard(false);setProviderDirty(false);setOverlay(null)}}/></View></View>}</View>);
  if(overlay==='appearance')return sheet('Appearance',<AppearanceSettings onSave={theme=>updatePreferences({theme})}/>);
  if(overlay==='backup')return sheet('Backup & transfer',<BackupSettings onBusy={setTransferBusy} beforeTransfer={async()=>{await writes.current;await preferenceWrites.current;}}/>);
  if(overlay==='storage')return sheet('Library & storage',<StorageSettings profile={active||null} onClearRecents={clearProfileRecents} onCleared={()=>{memory.current.clear();setUpdatedAt('')}} onClearHistory={()=>{if(activeId)void writeViewing(activeId,[]).then(()=>{viewingRef.current=[];setViewing([])}).catch(()=>setError('Could not clear history.'))}}/>);
  if(overlay==='family')return sheet('Family controls',<FamilySettings profile={active||null} groups={categoryList(profileItems.map(item=>item.group)).sort()} onSave={restrictedGroups=>patchProfile({restrictedGroups})}/>);
  if(overlay==='players')return sheet('Playback',<PlaybackSettings choice={preferences.player} profile={active||null} compatibilityAvailable={hasCompatibilityPlayer()} error={error} onPlayer={player=>{void updatePreferences({player}).catch(()=>setError('Could not save player.'))}} onEngine={liveEngine=>{void patchProfile({liveEngine}).catch(()=>setError('Could not save engine.'))}} onFormat={liveFormat=>{void patchProfile({liveFormat}).catch(()=>setError('Could not save format.'))}}/>);
  if(overlay==='organize'&&active)return sheet('Library organization',<View style={{flex:1,gap:8}}>{organizeSection==='live'&&<Button title="Favorite categories" variant="secondary" icon="heart-outline" onPress={()=>setOverlay('favorite-categories')}/>}<TVLibraryOptions hasDates={items.some(item=>item.kind===organizeSection&&!!item.added)} mode={organizeMode} onMode={setOrganizeMode} section={organizeSection} onSection={setOrganizeSection} m3u={active.provider.kind==='m3u'} groups={organizationGroups} hidden={active.hiddenGroups||[]} favorites={organizationFavorites} loading={organizeBusy} error={error} layout={active.library?.tvLiveLayout||'list'} logos={logos} sort={active.library?.sort?.[organizeSection]||'provider'} refreshMinutes={active.library?.refreshMinutes||30} scope={organizationScope} onScope={async scope=>{await organizeSave(profile=>({library:{tvSearchScope:{...profile.library?.tvSearchScope,[organizeSection]:scope}}}));setBrowseStates(current=>({...current,[organizationKey]:{...(current[organizationKey]||{query:'',group:'All',hidden:false}),scope}}));}} onLayout={layout=>organizeSave({library:{tvLiveLayout:layout}})} onLogos={()=>organizeSave(profile=>({library:{tvChannelLogos:profile.library?.tvChannelLogos===false}}))} onSort={order=>organizeSave({library:{sort:{[organizeSection]:order}}})} onRefresh={minutes=>organizeSave({library:{refreshMinutes:minutes}})} onToggle={group=>organizeSave(profile=>({hiddenGroups:profile.hiddenGroups?.includes(group)?profile.hiddenGroups.filter(value=>value!==group):[...(profile.hiddenGroups||[]),group]}))} onMove={(id,direction)=>organizeSave(profile=>({favorites:moveTVFavorite(profile.favorites,id,direction)}))} onRemove={id=>organizeSave(profile=>({favorites:profile.favorites.filter(value=>value!==id)}))}/></View>);
  if (overlay === 'history') return sheet('Version history', <VersionHistory />);
  if (overlay === 'channel-options' && optionItem) return sheet('Channel playback', <ChannelPlaybackOptions key={optionItem.id} value={active?.channelPlayback?.[optionItem.id]} onSave={value => saveChannelOptions(optionItem, value)} />);
  if(overlay==='guide'&&active)return sheet('TV guide',<FullGuide onClose={()=>setOverlay(null)} onPreview={item=>{void open(item,true)}} onPreviewBounds={bounds=>setGuidePreviewBox(current=>current&&Math.abs(current.x-bounds.x)<1&&Math.abs(current.y-bounds.y)<1&&current.width===bounds.width?current:bounds)} initialFrom={guideWindows.current.get(active.id)} onWindowChange={from=>guideWindows.current.set(active.id,from)} onAuthorize={()=>{if(family.enabled&&!family.unlocked){family.request();return false;}return true;}} profile={active} channels={items.filter(item=>item.kind==='live'&&!active.hiddenGroups?.includes(item.group))} onPlay={item=>{void open(item)}} onSave={guide=>patchProfile({guide})}/>);
  if (overlay === 'external' && (externalItem || playing)) return sheet('External player', <ScrollView><ExternalSheet item={(externalItem || playing)!} preferred={externalPreferred} onInternal={() => { if (externalItem) { playerOwner.current=activeId||null;setMinimized(false);setPlaying(externalItem); setFullscreen(true); } setExternalItem(null); setOverlay(null); }} onOpened={() => { setPlaying(null); setExternalItem(null); setOverlay(null); }} /></ScrollView>);
  if (overlay === 'episodes') return sheet(items.find(entry => entry.id === episodeQueue?.seriesId)?.name || 'Episodes', <View style={{ flex: 1, padding: 24 }}>{busy && <View style={u.row}><ActivityIndicator color={colors.link}/><Text style={u.body}>Loading episodes…</Text></View>}{!!error && <Notice danger>{error}</Notice>}{!busy && <SeriesEpisodes display={active?.seriesDisplay} onDisplay={value=>{void patchProfile({seriesDisplay:value}).catch(()=>setError('Could not save this series view.'))}} autoplay={!!active?.autoplayNext} onAutoplay={value=>{void patchProfile({autoplayNext:value}).catch(()=>setError('Could not save the autoplay choice.'))}} seasonMemory={seasonMemory.current} seriesKey={`${activeId}:${episodeQueue?.seriesId}`} key={episodeQueue?.seriesId} episodes={episodes.filter(item=>contentAllowed(active,item,!family.enabled||family.unlocked))} history={viewing.filter(entry=>contentAllowed(active,entry.item,!family.enabled||family.unlocked))} onPlay={item => { void open(item); }} onWatched={changeWatched} />}</View>);
  if (landing) return <TVHome loadStep={loadStep} favorites={(active?.favorites||[]).flatMap(id=>{const item=profileById.get(id)||items.find(entry=>entry.id===id);return item&&contentAllowed(active,item,!family.enabled||family.unlocked)?[item]:[]})} showChannelLogos={logos} profileName={active?.provider.name} items={items.filter(item=>contentAllowed(active,item,!family.enabled||family.unlocked))} recent={viewing.filter(entry=>!entry.hiddenFromRecents&&contentAllowed(active,entry.item,!family.enabled||family.unlocked)).map(entry=>({...entry,item:items.find(item=>item.id===entry.item.id)||(active?hydrateMedia(entry.item,active.provider):entry.item)}))} onRetry={()=>{forceRefresh.current=true;setRevision(value=>value+1)}} busy={busy} error={error||storageError} onPlay={item=>{void open(item)}} onLive={()=>{setLanding(false);setPage('live')}} onGuide={()=>{setLanding(false);setOverlay('guide')}} onAdd={add} onProfiles={()=>setOverlay('profiles')}/>;
  const filtering=!!query.trim()||group!=='All'||recentOnly;
  // M3U playlists carry live channels only; say so instead of implying a filter hides titles.
  const emptyState=!filtering&&active?.provider.kind==='m3u'&&(page==='movies'||page==='series')?<View style={{gap:8,padding:8}}><Text style={u.label}>This playlist has no {page==='movies'?'movies':'series'}.</Text><Text style={u.body}>{page==='movies'?'Movies':'Series'} come from Xtream Codes accounts. M3U playlists add live channels.</Text></View>:!filtering?<View style={{gap:8,padding:8}}><Text style={u.label}>Nothing here yet.</Text><Text style={u.body}>{page==='favorites'?'Hold OK on a channel or title, or press Menu, to add it to Favorites.':'Refresh the library to load this section from your provider.'}</Text></View>:<View style={{gap:16}}><Text style={u.body}>{page==='live'?'No channels match this view.':'No titles match this view.'}</Text>{!!query.trim()&&<Button title="Clear search" variant="secondary" onPress={()=>setQuery('')}/>}<Button title="Show all" variant="secondary" onPress={()=>{setGroup('All');setQuery('');changeBrowse({recentOnly:false,hidden:true})}}/></View>;
  const libraryHeading=<View style={s.heading}><View style={active&&page!=='settings'?{flexShrink:1}:{flex:1}}><Text style={{fontFamily: 'Sans-600',fontWeight: '600',fontSize:36,color:colors.text}}>{searchPage?'Search':labels[page]}</Text>{!!updatedAt&&page!=='settings'&&<Text numberOfLines={1} style={[u.small,{fontSize:14}]}>{plural(filtered.length,page==='live'?'channel':'title')} · Updated {new Date(updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · Menu for options</Text>}</View>{active&&page!=='settings'&&<><View style={{flex:1}}><Field nativeID="tv-control:library-search" inputRef={searchInput} returnKeyType="search" onSubmitEditing={()=>Keyboard.dismiss()} disableFullscreenUI hideLabel label="Search channels and titles" placeholder="Search channels and titles" value={query} onChangeText={setQuery} style={s.search}/></View><LibraryAction title="Refresh" label="Refresh library" onPress={()=>{forceRefresh.current=true;setRevision(value=>value+1);}}/></>}</View>;
  const libraryTools=<>{!searchPage && !!query.trim() && <SearchScopeControl value={browse.scope} onChange={scope => changeBrowse({ scope })} includeHidden={browse.hidden} onHidden={() => changeBrowse({ hidden: !browse.hidden })} favorites={page === 'favorites'} />}
      <View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:54}}><View style={{flex:1,minWidth:0}}><FlatList horizontal data={groups} keyExtractor={g=>g} initialNumToRender={10} maxToRenderPerBatch={6} windowSize={3} removeClippedSubviews={false} contentContainerStyle={{gap:8,alignItems:"center",paddingHorizontal:8}} showsHorizontalScrollIndicator={false} renderItem={({item:g})=><Pressable nativeID={`tv-control:category:${g}`} accessibilityLabel={`${g}${page==='live'&&active?.library?.favoriteGroups?.includes(g)?', favorite category':''}`} accessibilityHint={page==='live'&&g!=='All'?'Hold OK to pin or unpin category':undefined} onLongPress={page==='live'&&g!=='All'?()=>{void patchProfile(profile=>({library:{...profile.library,favoriteGroups:toggleFavoriteGroup(profile.library?.favoriteGroups,g)}})).catch(()=>setError('Couldn’t save this category.'))}:undefined} accessibilityState={{selected:group===g}} onPress={()=>setGroup(g)} style={[s.chip,{flexDirection:'row',alignItems:'center',gap:8},group===g&&{backgroundColor:colors.selected}]}>{page==='live'&&active?.library?.favoriteGroups?.includes(g)&&<Icon name="heart" size={18} color={colors.link}/>} {group===g&&<Icon name="checkmark" size={18} color={colors.selectedText}/>}<Text numberOfLines={1} style={[u.label,group===g&&{color:colors.selectedText}]}>{g}</Text></Pressable>}/></View><LibraryAction icon={recentOnly?'list-outline':'time-outline'} title={recentOnly?'All titles':'Recently watched'} onPress={()=>changeBrowse({recentOnly:!recentOnly})}/><LibraryAction icon="options-outline" title="Library options" onPress={openOrganization}/>{page==='live'&&<LibraryAction icon={listView?'grid-outline':'list-outline'} title={listView?'Grid view':'List view'} onPress={()=>{void patchProfile({library:{tvLiveLayout:listView?'grid':'list'}}).catch(()=>setError('Could not save channel layout.'));}}/>}{page==='live'&&<LibraryAction icon="calendar-outline" title="TV guide" onPress={()=>setOverlay('guide')}/>}</View>
      {recentOnly&&<View style={u.between}><Text style={u.small}>Recently watched · progress stays when cleared</Text><Button title="Clear recents" variant="secondary" onPress={confirmClearRecents}/></View>}
      {!!error && items.length > 0 && <Notice>{error}</Notice>}</>;
  return <View nativeID={`tv-scope:library:${activeId||'empty'}:${page}`} style={s.root}><View style={s.main}>
    {libraryHeading}
    {!!storageError && <Notice danger>{storageError}</Notice>}
    {page === 'settings' ? <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}><H2 style={u.h2}>Your profiles</H2>{vault.profiles.map(p => <View key={p.id} style={[u.card, { gap: 8 }]}><Text style={u.label}>{p.provider.name}{p.id === activeId ? ' · Active' : ''}</Text><View style={u.row}><Button accessibilityLabel={`Use profile ${p.provider.name}`} title="Use profile" disabled={p.id===activeId} variant="secondary" onPress={() => { void updateVault(v => ({ ...v, activeId: p.id })).catch(() => setError('Could not switch profile.')); }} /><Button accessibilityLabel={`Edit profile ${p.provider.name}`} title="Edit" variant="secondary" onPress={() => { if(family.enabled&&!family.unlocked){family.request();return;} setEdit(p); setError(''); setOverlay('provider'); }} /><View style={{flex:1}}/><Button accessibilityLabel={`Remove profile ${p.provider.name}. Asks before removing.`} title="Remove…" variant="danger" onPress={() => {if(family.enabled&&!family.unlocked){family.request();return;} Alert.alert('Remove profile?', 'This removes local favorites. Your subscription stays active.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void updateVault(v => removeProfile(v, p.id)).then(() => clearProfileData(p.id)).catch(() => setError('Could not remove profile.')); } }]);}} /></View></View>)}<H2>Make it yours</H2><View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>{([
 {title:'Appearance',description:'Light, dark and device appearance',action:()=>setOverlay('appearance')},
 {title:'Family controls',description:'PIN and protected categories',action:()=>setOverlay('family')},
 {title:'Playback',description:'Players, engine and live formats',action:()=>setOverlay('players')},
 {title:'Library organization',description:'Layout, categories and favorite order',action:openOrganization},
 {title:'Backup & transfer',description:'Encrypted profiles and preferences',action:()=>setOverlay('backup')},
 {title:'Library & storage',description:'Cache and viewing history',action:()=>setOverlay('storage')},
 {title:'Version history',description:'Changes in this app',action:()=>setOverlay('history')},
 ] as const).map(row=><Pressable key={row.title} nativeID={`tv-control:settings:${row.title}`} accessibilityLabel={`${row.title}, ${row.description}`} onPress={row.action} style={{width:'48%',flexGrow:1,minHeight:104,padding:16,gap:8,borderRadius:16,backgroundColor:colors.panel}}><Text style={u.label}>{row.title}</Text><Text style={u.small}>{row.description}</Text></Pressable>)}</View><Button title="Add playlist" onPress={add} disabled={!!storageError}/>
<View style={u.card}><H2 style={u.h2}>Support GlowTV</H2><Text style={u.body}>GlowTV is free. If it makes your evenings better, a little support is appreciated.</Text><Button title="Buy me a coffee" variant="secondary" onPress={() => { void Linking.openURL('https://buymeacoffee.com/hexorbd').catch(() => setError('Open buymeacoffee.com/hexorbd on your phone to support GlowTV.')); }} /></View>{!!error && <Notice danger>{error}</Notice>}</ScrollView> : !active ? <View style={[u.center, { gap: 16 }]}><H1 style={u.h1}>A bigger screen. All yours.</H1><Text style={u.body}>Connect your Xtream Codes server or M3U playlist.</Text><Button title="Add your playlist" onPress={add} disabled={!ready || !!storageError} /></View> : <>
      {libraryTools}
      {busy && !items.length ? <LoadingProgress step={loadStep}/> : error && !items.length ? <View style={u.center}><Notice danger>{error}</Notice><Button title="Try again" onPress={() => {forceRefresh.current=true;setRevision(r => r + 1)}} /></View>  : listView ? <RetainedList listRef={channelList} memory={scrollMemory.current} memoryKey={`${browseKey}:${group}:${deferred}:${browse.scope}:list:${active?.library?.sort?.live||'provider'}`} key={`${browseKey}:${group}:${deferred}:${browse.scope}:list:${active?.library?.sort?.live||'provider'}`} style={{flex:1,minHeight:0}} data={filtered} extraData={favoriteIds} keyExtractor={item=>item.id} renderItem={renderChannel} initialNumToRender={7} maxToRenderPerBatch={4} updateCellsBatchingPeriod={25} windowSize={7} removeClippedSubviews={false} getItemLayout={(_,index)=>({length:CHANNEL_ROW_HEIGHT+CHANNEL_ROW_GAP,offset:8+index*(CHANNEL_ROW_HEIGHT+CHANNEL_ROW_GAP),index})} ItemSeparatorComponent={()=> <View style={{height:CHANNEL_ROW_GAP}}/>} contentContainerStyle={{paddingHorizontal:16,paddingVertical:8,paddingBottom:24}} ListEmptyComponent={emptyState}/> : <RetainedList listRef={channelList} memory={scrollMemory.current} memoryKey={`${browseKey}:${group}:${deferred}:${browse.scope}`} key={`${browseKey}:${group}:${deferred}:${browse.scope}:${columns}`} onLayout={event=>{const height=event.nativeEvent.layout.height;setGridHeight(current=>current!==undefined&&Math.abs(current-height)<1?current:height)}} style={{flex:1,minHeight:0}} data={filtered} getItemLayout={(_,index)=>({length:tileHeight+16,offset:8+index*(tileHeight+16),index})} removeClippedSubviews={false} initialNumToRender={6} windowSize={7} maxToRenderPerBatch={3} numColumns={columns} keyExtractor={i => i.id} columnWrapperStyle={{ gap: 16 }} contentContainerStyle={{ gap: 16, padding: 8, paddingBottom: 32 }} ListEmptyComponent={emptyState} renderItem={({ item }) => <View nativeID={`tv-focus-container:tile:${item.id}`} style={[s.tile,{width:posterWidth,height:tileHeight}]}><Pressable nativeID={`${(browse.focused?browse.focused===item.id:item.id===firstId)?"tv-preferred":"tv-control"}:tile:${item.id}`} accessibilityRole="button" accessibilityLabel={`${item.kind==='series'?'Open':'Play'} ${item.name}, ${groupLabel(item.group)}${favoriteIds.has(item.id)?', Favorite':''}`} accessibilityHint="Hold OK or press Menu for options" onLongPress={()=>itemOptions.current(item.id)} onPress={()=>{changeBrowse({focused:item.id});void open(item)}} style={s.tilePlay}><View style={[s.art,{width:posterImageWidth,height:posterImageHeight,alignSelf:'center'}]}>{item.logo?<Image source={{uri:item.logo}} resizeMode={item.kind==='live'?'contain':'cover'} resizeMethod="resize" style={{width:'100%',height:'100%',borderRadius:item.kind==='live'?0:16}}/>:<Icon name="film-outline" size={40} color={colors.link}/>}</View><Text numberOfLines={2} style={[u.label,{paddingHorizontal:16}]}>{item.name}</Text><Text numberOfLines={1} style={[u.small,{paddingHorizontal:16,paddingBottom:8}]}>{groupLabel(item.group)}</Text></Pressable></View>} />}
    </>}
  </View></View>;
  };
  if(!family.ready)return <View style={[u.root,u.center]}><Text style={u.body}>{family.loadFailed?'Could not read family protection.':'Loading local protection…'}</Text>{family.loadFailed&&<Button title="Open recovery options" onPress={family.request}/>}</View>;
  // All nine destinations fit at 1080p (540 dp), so the rail never scrolls or hides Home.
  const railItem=(id:string,label:string,icon:React.ComponentProps<typeof Icon>['name'],selected:boolean,onPress:()=>void)=><Pressable key={id} onFocus={railFocus} onBlur={railLeave} nativeID={`tv-control:nav:${id}`} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={onPress} style={[s.nav,{width:railFocused?184:48,justifyContent:railFocused?'flex-start':'center',paddingHorizontal:railFocused?16:0},selected&&{backgroundColor:colors.selected}]}><Icon name={icon} color={selected?colors.link:colors.secondary} size={22}/>{railFocused&&<Text numberOfLines={1} style={[u.label,{flex:1,fontWeight:selected?'800':'500',color:selected?colors.selectedText:colors.text}]}>{label}</Text>}</Pressable>;
  const rail = <View nativeID="tv-scope:rail" style={[s.sidebar,{position:'absolute',top:0,bottom:0,left:0,width:railWidth,backgroundColor:colors.bg}]}><BrandMark size={24}/>{([
    {id:'home',label:'Home',icon:'home-outline'}, {id:'search',label:'Search',icon:'search-outline'}, {id:'live',label:'Live TV',icon:'tv-outline'}, {id:'guide',label:'TV guide',icon:'grid-outline'}, {id:'movies',label:'Movies',icon:'film-outline'}, {id:'series',label:'Series',icon:'albums-outline'}, {id:'favorites',label:'Favorites',icon:'heart-outline'}, {id:'settings',label:'Settings',icon:'settings-outline'}
  ] as const).map(item=>{const selected=item.id==='home'?landing&&!overlay:item.id==='guide'?overlay==='guide':item.id==='search'?searchPage&&!landing&&!overlay:!searchPage&&!landing&&!overlay&&page===item.id;return railItem(item.id,item.label,item.icon,selected,()=>{if(selected&&item.id!=='home'&&item.id!=='guide'&&item.id!=='search'){channelList.current?.scrollToOffset({offset:0,animated:true});return;}if(item.id==='home'){setSearchPage(false);setOverlay(null);setLanding(true);setPage('live')}else if(item.id==='guide'){setSearchPage(false);setLanding(false);setOverlay('guide')}else if(item.id==='search'){const target=page==='settings'||page==='favorites'?lastSection.current:page;setBrowseStates(current=>({...current,[`${activeId||'empty'}:${target}`]:{...(current[`${activeId||'empty'}:${target}`]||{group:'All',hidden:false,scope:'section' as SearchScope}),query:''}}));setSearchPage(true);setLanding(false);setOverlay(null);if(target!==page)setPage(target);setTimeout(()=>searchInput.current?.focus(),400)}else{setSearchPage(false);setLanding(false);setOverlay(null);setPage(item.id)}})})}{railItem('switch-playlist','Switch playlist','person-circle-outline',overlay==='profiles',()=>setOverlay('profiles'))}</View>;
  return <View style={{flex:1,backgroundColor:colors.bg}}><View style={{flex:1,flexDirection:'row',paddingHorizontal:tvSafe.h,paddingVertical:tvSafe.v}} pointerEvents={playing&&!minimized?'none':'auto'} accessibilityElementsHidden={!!playing&&!minimized} importantForAccessibility={playing&&!minimized?'no-hide-descendants':'auto'}><View style={{width:72,zIndex:2}}>{rail}</View>{railFocused&&<View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:tvSafe.h+72,right:0,zIndex:1,backgroundColor:colors.videoScrim}}/>}<View style={{flex:1,minWidth:0,paddingRight:24}}><PageTransition pageKey={overlay?`tv:${overlay}`:landing?'tv:home':searchPage?'tv:search':`tv:${page}`} disabled={!!playing&&!minimized}>{renderBody()}</PageTransition></View></View>{playing&&playerOwner.current===activeId&&<View collapsable={false} nativeID={`${minimized?'tv-scope:mini':'tv-trap:player'}:${playing.id}:${playing.kind}`} accessibilityViewIsModal={!minimized} style={minimized&&overlay==='guide'&&guidePreviewBox?{position:'absolute',left:guidePreviewBox.x,top:guidePreviewBox.y,width:guidePreviewBox.width,height:guidePreviewBox.height,zIndex:100,backgroundColor:colors.videoBlack,borderRadius:12,overflow:'hidden'}:minimized?{position:'absolute',right:tvSafe.h,bottom:tvSafe.v,width:320,height:180,zIndex:100,backgroundColor:colors.videoBlack,borderRadius:18,overflow:'hidden'}:{position:'absolute',top:0,bottom:0,left:0,right:0,zIndex:100,backgroundColor:colors.videoBlack}}>
<BuiltInPlayer onNextChannel={playing.kind==='live'&&zapChannels.length>1?()=>remoteActions.current('next'):undefined} onPreviousChannel={playing.kind==='live'&&zapChannels.length>1?()=>remoteActions.current('previous'):undefined} channelInfo={playing.kind==='live'?channelPosition(playing):undefined} recentChannels={playing.kind==='live'?recentChannelPicker(viewing,playing.id,items,{restricted:active?.restrictedGroups,unlocked:!family.enabled||family.unlocked,hidden:active?.hiddenItems}):undefined} onChannel={item=>{void open(item)}} autoplayNext={features.organization&&!!active?.autoplayNext} onRegisterStop={stop=>{playerStop.current=stop}} liveEngine={resolvePlayback(active, playing.id, preferences.player).engine} channelOptions={active?.channelPlayback?.[playing.id]} onSaveOptions={value => saveChannelOptions(playing, value)} minimized={minimized} onMinimize={()=>{setViewing(viewingRef.current);setMinimized(true);setFullscreen(false)}} savedFit={active?.displayFit} onFit={displayFit=>{void patchProfile({displayFit}).catch(()=>setError('Could not save display choice.'))}} television nextEpisode={next ? { item: next, onPress: () => { seasonMemory.current.set(`${activeId}:${episodeQueue?.seriesId}`, next.group); setPlayFromStart(true); setMinimized(false); setFullscreen(true); setPlaying(current => current?.id === playing.id ? next : current); } } : undefined} key={playing.id} item={playing} fullscreen={fullscreen} onFullscreenChange={setFullscreen} onClose={closePlayer} onExternal={()=>{setExternalItem(playing);setPlaying(null);setOverlay('external')}} resumeAt={playFromStart ? 0 : resumePosition(viewing.find(v => v.item.id === playing.id))} tracks={active?.tracks} onTracks={tracks => { if (activeId) void updateVault(current => ({ ...current, profiles: current.profiles.map(profile => profile.id === activeId ? { ...profile, tracks } : profile) })).catch(() => setError('Could not save language preferences.')); }} onProgress={snapshot => {
    if (playing.catchup || !activeId || viewingOwner.current !== activeId) return;
    const entries = recordViewing(viewingRef.current, playing, snapshot); viewingRef.current = entries; if(!playbackVisible.current)setViewing(entries);
    void writeViewing(activeId, entries).catch(() => {});
  }} />
  {tvInfo&&playing.kind==='live'&&!minimized&&<TVInfoOverlay item={playing} profile={active} onClose={()=>setTVInfo(false)}/>}
  {minimized&&<View style={{position:'absolute',top:0,bottom:0,left:0,right:0,flexDirection:'row'}}><Pressable accessibilityRole="button" accessibilityLabel="Return to video" onPress={()=>{setMinimized(false);setFullscreen(true)}} style={{flex:1}}/><Pressable accessibilityRole="button" accessibilityLabel="Close mini player" onPress={closePlayer} style={{width:48,height:48,backgroundColor:colors.videoControl,alignItems:'center',justifyContent:'center'}}><Icon name="close" color={colors.onVideo}/></Pressable></View>}
  </View>}{zapList&&playing?.kind==='live'&&!minimized&&<ChannelListOverlay channels={filtered.filter(item=>item.kind==='live')} current={playing.id} logos={logos} onPick={item=>{setZapList(false);if(item.id!==playing.id)void open(item);}}/>}{!!toast&&<View style={{position:'absolute',bottom:tvSafe.v,left:tvSafe.h,right:tvSafe.h,padding:16,borderRadius:16,backgroundColor:colors.panel}}><Text accessibilityLiveRegion="polite" style={u.body}>{toast}</Text></View>}</View>;
}
export default function TVApp() {
  const [fonts, fontError] = useFonts(fontAssets);
  const [ready, setReady] = useState(false); const [finished, setFinished] = useState(false);
  const fontsReady=fonts||!!fontError;
  return <ThemeProvider><PlayerToolsProvider><FamilyProvider><NavigationMotionProvider><SafeAreaProvider><StatusBar hidden /><View style={{ flex: 1 }}><View style={{ flex: 1 }} pointerEvents={finished ? 'auto' : 'none'} importantForAccessibility={finished ? 'auto' : 'no-hide-descendants'}>{fontsReady?<TVContent onReady={() => setReady(true)} launchComplete={finished} />:<View style={{flex:1,backgroundColor:colors.videoBackdrop}}/>}</View>{!finished && <StartupSplash ready={fontsReady&&ready} onFinish={() => setFinished(true)} />}</View></SafeAreaProvider></NavigationMotionProvider></FamilyProvider></PlayerToolsProvider></ThemeProvider>;
}
const s = themedStyles(() => ({
  root: { flex: 1, flexDirection: 'row', padding: 16, gap: 16, backgroundColor: colors.bg },
  sidebar: { width: 72, alignItems: 'center', paddingVertical: 8, gap: 8 }, brand: { color: colors.text, fontSize: 24, fontFamily: 'Sans-600', fontWeight: '600' },
  nav: { height:40, flexDirection:'row',gap:16,justifyContent:'center',alignItems:'center',borderRadius:12 }, main: { flex: 1, gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', minHeight: 54, gap: 16 },
  search: { backgroundColor: colors.panel, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 8, fontSize: 18, minHeight:56, color: colors.text },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.panel, maxWidth: 240 },
  tile: { flexGrow: 0, height:304, borderRadius: 16, backgroundColor: colors.panel, overflow: 'visible' }, tilePlay: { flex:1, padding: 0, gap: 8, minHeight: 140 },
  art: { height: 210, backgroundColor: colors.pale, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 8 },
  favorite: { alignItems: 'center', padding: 8, backgroundColor: colors.pale }, episode: { padding: 24, backgroundColor: colors.panel, borderRadius: 16, marginBottom: 16 },
  sheet: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 16 }, sheetHeader: { flexDirection: 'row', gap: 24, alignItems: 'center', paddingBottom: 16 },
}));
