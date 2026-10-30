import { ChromeLayer } from './PlaybackGlass';
import { usePlaybackChrome, usePlaybackMedia } from './PlaybackChrome';
import Pressable, { isTVBuild } from './FocusPressable';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import type { LibVlcPlayerViewRef, MediaTracks, Tracks } from 'expo-libvlc-player';
import type { PlaybackInfo } from './viewingPreferences';
import type { TrackPreferences } from './Player';
import type { Media } from './provider';
import type { PlaybackSnapshot } from './activity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LivePlayerLayout from './LivePlayerLayout';
import { usePlayerOrientation } from './usePlayerOrientation';
import { compatibilityURLs, compatibilityOptions } from './playbackPolicy';
import { classifyFailure, failureMessage, RecoveryCoordinator } from './recovery';
import type { RecoveryState } from './recovery';
import { Button, Icon, colors, u } from './ui';
// Imported only when the installed binary exposes ExpoLibVlcPlayer. Expo Go never evaluates this require.
function nativeView(): typeof import('expo-libvlc-player').LibVlcPlayerView {
  return require('expo-libvlc-player').LibVlcPlayerView;
}
// Updating menus must not update/reparent the native decoder or its texture.
type SurfaceProps=React.ComponentProps<ReturnType<typeof nativeView>>;
const StableVlcSurface=memo(function StableVlcSurface(props:SurfaceProps){
 const NativeView=useMemo(nativeView,[]);return <NativeView {...props}/>;
});
const videoStyle={width:'100%',height:'100%'} as const;
export default function CompatibilityPlayer({ item, onProgress, onClose, onExternal, fullscreen = false, onFullscreenChange, tracks: preferences = {}, onTracks, onInfo, onOptions, displayFit = 'contain', minimized = false, registerStop }: {
  displayFit?: 'contain' | 'cover'; minimized?: boolean; registerStop?: (stop: () => Promise<void>) => void; tracks?: TrackPreferences; onTracks: (value: TrackPreferences) => void; onInfo?: (info: PlaybackInfo) => void; onOptions?: () => void; item: Media; onProgress: (snapshot: PlaybackSnapshot) => void; onClose: () => void; onExternal: () => void; fullscreen?: boolean; onFullscreenChange: (value: boolean) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orientation = usePlayerOrientation(onFullscreenChange);
  const chrome = usePlaybackChrome();
  const controls = chrome.visible;
  function setControls(value: boolean | ((previous: boolean) => boolean)) { if (typeof value === 'function') chrome.toggle(); else if (value) chrome.show(); }
  const mediaOptions = useMemo(() => compatibilityOptions(item), [item.headers]);
  const urls = useMemo(() => compatibilityURLs(item), [item.url, item.externalURL, item.playbackURLs]);
  const player = useRef<LibVlcPlayerViewRef | null>(null);
  const lastNative = useRef<LibVlcPlayerViewRef | null>(null);
  const [generation, setGeneration] = useState(0);
  const [source, setSource] = useState<string | null>(urls[0] || null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'paused'>('loading');
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  useEffect(()=>{
    if(!showTracks && (!fullscreen || isTVBuild))return;
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(showTracks)setShowTracks(false);else orientation.exit();chrome.show();return true});
    return()=>sub.remove();
  },[showTracks,fullscreen]);
  const [availableTracks, setAvailableTracks] = useState<MediaTracks>({ audio: [], video: [], subtitle: [] });
  const [tracks, setTracks] = useState<Tracks>({});
  const [trackNotice, setTrackNotice] = useState('');
  const selected = useRef<TrackPreferences>(preferences);
  const language = (name: string) => {
    const text = name.toLowerCase();
    const known: [RegExp, string][] = [[/\b(english|eng|en)\b/, 'en'], [/\b(french|fra|fre|fr)\b/, 'fr'], [/\b(spanish|spa|es)\b/, 'es'], [/\b(german|deu|ger|de)\b/, 'de'], [/\b(italian|ita|it)\b/, 'it'], [/\b(portuguese|por|pt)\b/, 'pt']];
    return known.find(([pattern]) => pattern.test(text))?.[1] || `vlc:${name.slice(0, 26)}`;
  };
  useEffect(() => {
    onInfo?.({ engine: 'vlc', state: recovery?.mode === 'failed' ? 'failed' : status, format: /\.m3u8(?:\?|$)/i.test(source || '') ? 'HLS' : /\.ts(?:\?|$)/i.test(source || '') ? 'MPEG-TS' : 'Video', audioTracks: availableTracks.audio.length, subtitleTracks: availableTracks.subtitle.length, attempts: recovery?.attempt || 0 });
  }, [status, source, recovery, availableTracks, onInfo]);
  useEffect(() => {
    const preferred = selected.current;
    const next: Tracks = {}; const missing: string[] = [];
    if (preferred.subtitles === 'off') next.subtitle = -1;
    for (const [key, list] of [['audio', availableTracks.audio], ['subtitles', availableTracks.subtitle]] as const) {
      const wanted = preferred[key]; if (!wanted || wanted === 'off' || !list.length) continue;
      const match = list.find(track => language(track.name) === (wanted.startsWith('vlc:') ? wanted : language(wanted)));
      if (match) { if (key === 'audio') next.audio = match.id; else next.subtitle = match.id; }
      else missing.push(key);
    }
    setTracks(next); setTrackNotice(missing.length ? `Saved ${missing.join(' and ')} choice is not reported by this stream. Choose an available track.` : '');
  }, [availableTracks]);
  function chooseTrack(key: 'audio' | 'subtitles', id: number, name: string) {
    setTracks(current => ({ ...current, [key === 'audio' ? 'audio' : 'subtitle']: id }));
    const next = { ...selected.current, [key]: id === -1 ? 'off' : language(name) }; selected.current = next; onTracks(next); setTrackNotice('');
  }
  const index = useRef(0);
  const alive = useRef(false);
  const foreground = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const started = useRef(false);
  const lastWrite = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useRef(onProgress); persist.current = onProgress;
  const controller = useRef<RecoveryCoordinator | null>(null);
  const attempt = useRef<((advance?: boolean) => Promise<void>) | null>(null);
  function clearTimer() { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; }
  function save(force = false) {
    if (!started.current || (!force && Date.now() - lastWrite.current < 10000)) return;
    if(isTVBuild&&!force&&lastWrite.current>0)return;
    lastWrite.current = Date.now(); persist.current({ position: 0, duration: 0 });
  }
  function armTimeout() { clearTimer(); timer.current = setTimeout(() => { if (foreground.current) controller.current?.request('network'); }, 20000); }
  useEffect(() => {
    alive.current = true;
    const retry = async (advance = true) => {
      clearTimer();
      await player.current?.stop();
      if (!alive.current || !foreground.current) return;
      if (advance && index.current < urls.length - 1) index.current++;
      setStatus('loading'); setAvailableTracks({ audio: [], video: [], subtitle: [] }); setTracks({});
      // A stop completes before a new source is assigned; no second simultaneous stream.
      setSource(urls[index.current] || null); armTimeout();
      setGeneration(value => value + 1);
    };
    const coordinator = new RecoveryCoordinator(() => retry(), state => { if (alive.current) setRecovery(state); });
    registerStop?.(async () => { alive.current=false; coordinator.dispose(); clearTimer(); await player.current?.stop(); });
    controller.current = coordinator; attempt.current = retry; armTimeout();
    const appState = AppState.addEventListener('change', state => {
      foreground.current = state === 'active';
      if (state !== 'active') {
        clearTimer(); coordinator.reset(); save(true);
        void player.current?.pause().catch(() => {});
        if (alive.current) { setRecovery(null); setStatus('paused'); }
      }
    });
    return () => {
      alive.current = false; clearTimer(); coordinator.dispose(); controller.current = null; attempt.current = null; appState.remove(); save(true);
      // Stop errors on an already released native view are harmless during unmount.
      void lastNative.current?.stop().catch(() => {});
    };
  }, [urls]);
  const failed = recovery?.mode === 'failed';
  const reconnecting = recovery?.mode === 'waiting' || recovery?.mode === 'reconnecting';
  function onPlaying() { if (!alive.current) return; if (!foreground.current) { void player.current?.pause().catch(() => {}); return; } clearTimer(); controller.current?.ready(); setRecovery(null); setStatus('playing'); started.current = true; save(); }
  function onError(message: string) {
    if (!alive.current || !foreground.current) return;
    clearTimer();
    controller.current?.request(index.current < urls.length - 1 ? 'network' : classifyFailure(message));
  }
  async function toggle() {
    try {
      if (status === 'playing') await player.current?.pause();
      else { setStatus('loading'); armTimeout(); await player.current?.play(); }
    } catch { onError('Playback failed'); }
  }
  function retry() {
    index.current = 0; controller.current?.reset(); setRecovery(null);
    void attempt.current?.(false).catch(() => onError('Reconnect failed'));
  }
  usePlaybackMedia(key => {
    if (key===86) { onClose(); return; }
    if (key===89 || key===90 || (key===126 && status==='playing') || (key===127 && status==='paused')) return;
    void toggle();
  });
  function renderTracks() { return <View nativeID={isTVBuild?'tv-trap:live-tracks':undefined} style={{ marginHorizontal: 20, padding: 18, borderRadius: 20, gap: 12, backgroundColor: '#100B25D9', borderWidth:1, borderColor:'#FFFFFF30' }}><Pressable accessibilityRole="button" accessibilityLabel="Close audio and subtitles" onPress={() => setShowTracks(false)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.mint }}>Done · Audio & subtitles</Text></Pressable><Text style={{ color: '#C4C0CF', fontSize: 12 }}>Remembered for this profile when the stream reports a matching language or track name.</Text><Text style={{ color: colors.mint }}>Audio</Text>{availableTracks.audio.length ? availableTracks.audio.map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseTrack('audio', track.id, track.name)} style={{ paddingVertical: 10 }}><Text style={{ color: '#fff' }}>{track.name}{tracks.audio === track.id ? ' ✓' : ''}</Text></Pressable>) : <Text style={{ color: '#C4C0CF' }}>No selectable audio tracks reported.</Text>}<Text style={{ color: colors.mint }}>Subtitles</Text>{[{ id: -1, name: 'Off' }, ...availableTracks.subtitle.filter(track => track.id !== -1)].map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseTrack('subtitles', track.id, track.name)} style={{ paddingVertical: 10 }}><Text style={{ color: '#fff' }}>{track.name}{tracks.subtitle === track.id ? ' ✓' : ''}</Text></Pressable>)}</View>; }
  const callbacks=useRef({onPlaying,onError});callbacks.current={onPlaying,onError};
  const nativeEvents=useMemo(()=>({
    onPlaying:()=>callbacks.current.onPlaying(),
    onPaused:()=>{if(alive.current){setStatus('paused');save(true)}},
    onEncounteredError:(event:{message:string})=>callbacks.current.onError(event.message),
    onTimeChanged:()=>save(),
    onESAdded:(event:MediaTracks)=>{if(alive.current)setAvailableTracks(event)},
    onDialogDisplay:()=>{void player.current?.dismiss().catch(()=>{});callbacks.current.onError('Provider requires additional authorization')},
  }),[]);
  const attachVideo=useCallback((instance:LibVlcPlayerViewRef|null)=>{player.current=instance;if(instance)lastNative.current=instance},[]);
  return <LivePlayerLayout fullscreen={true} video={<StableVlcSurface key={generation} ref={attachVideo} source={source} options={mediaOptions} autoplay contentFit={displayFit} style={videoStyle} tracks={tracks} {...nativeEvents}/>} overlay={!minimized && <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={controls ? 'Hide player controls' : 'Show player controls'} nativeID={!controls ? 'tv-preferred:reveal-controls' : undefined} focusable={isTVBuild && !controls} onPress={() => setControls(value => !value)} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
    <ChromeLayer visible={controls || failed || status !== 'playing'} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}><View style={{ position: 'absolute', top: Math.max(insets.top, 12), left: Math.max(insets.left, 16), right: Math.max(insets.right, 16), flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel={isTVBuild || !fullscreen ? 'Back to library' : 'Exit full screen'} onPress={() => { setControls(true); if(isTVBuild || !fullscreen)onClose();else orientation.exit(); }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#090124CC', flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="contract-outline" color="#fff" size={20} /><Text style={{ color: '#fff', fontWeight: '600' }}>Exit</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Player options" onPress={onOptions} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: '#090124CC' }}><Icon name="ellipsis-horizontal" color="#fff" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Audio and subtitles" onPress={() => { setControls(true); setShowTracks(value => !value); }} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: '#090124CC' }}><Icon name="options-outline" color="#fff" /></Pressable><Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontWeight: '600', fontSize: 14, textShadowColor: '#000', textShadowRadius: 3 }}>{item.name}</Text>{!isTVBuild&&<Pressable accessibilityRole="button" accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'} onPress={() => fullscreen ? orientation.exit() : orientation.enter()} style={{width:44,height:44,borderRadius:22,backgroundColor:'#090124CC',alignItems:'center',justifyContent:'center'}}><Icon name={fullscreen ? 'contract-outline' : 'expand-outline'} color="#fff" /></Pressable>}{!isTVBuild&&fullscreen&&<Pressable accessibilityRole="button" accessibilityLabel="Rotate screen" onPress={() => { setControls(true); orientation.rotate(width <= height); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#090124CC', alignItems: 'center', justifyContent: 'center' }}><Icon name="phone-landscape-outline" color="#fff" /></Pressable>}</View>
    {showTracks && <ScrollView style={{ position: 'absolute', top: Math.max(insets.top, 12) + 56, bottom: Math.max(insets.bottom, 16) + 72, right: Math.max(insets.right, 16), width: 350, maxWidth: '85%' }}>{renderTracks()}</ScrollView>}
    <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 16), left: Math.max(insets.left, 16), right: Math.max(insets.right, 16), alignItems: 'center', gap: 12 }}>{failed ? <><Text style={{ color: '#fff', textAlign: 'center' }}>Couldn’t open this channel.</Text><Button title="Try again" onPress={retry} /></> : status === 'loading' || reconnecting ? <ActivityIndicator color={colors.mint} /> : <Pressable accessibilityRole="button" nativeID={isTVBuild?'tv-preferred:playback-toggle':undefined} accessibilityLabel={status === 'playing' ? 'Pause live TV' : 'Play live TV'} onPress={() => { setControls(true); void toggle(); }} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#090124CC', alignItems: 'center', justifyContent: 'center' }}><Icon name={status === 'playing' ? 'pause' : 'play'} size={26} color="#fff" /></Pressable>}{!!orientation.notice && <Text style={{ color: '#fff', fontSize: 12, backgroundColor: '#090124CC', padding: 6 }}>{orientation.notice}</Text>}</View></ChromeLayer>
  </View>} />;
}
