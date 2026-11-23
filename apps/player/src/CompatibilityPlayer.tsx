import {Announcement} from './accessibility';
import TVTrackSheet from './TVTrackSheet';
import VideoScrim from './VideoScrim';
import {tvSafe} from './designTokens';
import { Text } from './Typography';
import { ChromeLayer } from './PlaybackGlass';
import { usePlaybackChrome, usePlaybackMedia } from './PlaybackChrome';
import Pressable, { isTVBuild } from './FocusPressable';
import { features } from './featureFlags';
import PlaybackHelp from './PlaybackHelp';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Image, ScrollView, useWindowDimensions, View } from 'react-native';
import { groupLabel } from './groups';
import type { LibVlcPlayerViewRef, MediaTracks, Time, Tracks } from 'expo-libvlc-player';
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
export default function CompatibilityPlayer({ item, onProgress, onClose, onExternal, fullscreen = false, onFullscreenChange, tracks: preferences = {}, onTracks, onInfo, onOptions, displayFit = 'contain', minimized = false, registerStop, onOtherPlayer, onNextChannel, channelInfo }: {
  onOtherPlayer?: () => void; onNextChannel?: () => void; channelInfo?: string;
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
  // A first picture, not VLC's 'playing' state, ends buffering: some streams report playing and stay black.
  const [frame, setFrame] = useState(false);
  const [stalled, setStalled] = useState(false);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameSeen = useRef(false);
  function clearStall() { if (stallTimer.current !== null) clearTimeout(stallTimer.current); stallTimer.current = null; }
  function armStall() { clearStall(); frameSeen.current = false; setFrame(false); setStalled(false); stallTimer.current = setTimeout(() => { if (!frameSeen.current && foreground.current) setStalled(true); }, 15000); }
  function markFrame() { if (frameSeen.current) return; frameSeen.current = true; clearStall(); setFrame(true); setStalled(false); }
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
      setSource(urls[index.current] || null); armTimeout(); armStall();
      setGeneration(value => value + 1);
    };
    const coordinator = new RecoveryCoordinator(() => retry(), state => { if (alive.current) setRecovery(state); });
    registerStop?.(async () => { alive.current=false; coordinator.dispose(); clearTimer(); await player.current?.stop(); });
    controller.current = coordinator; attempt.current = retry; armTimeout(); armStall();
    const appState = AppState.addEventListener('change', state => {
      foreground.current = state === 'active';
      if (state !== 'active') {
        clearTimer(); coordinator.reset(); save(true);
        void player.current?.pause().catch(() => {});
        if (alive.current) { setRecovery(null); setStatus('paused'); }
      }
    });
    return () => {
      alive.current = false; clearTimer(); clearStall(); coordinator.dispose(); controller.current = null; attempt.current = null; appState.remove(); save(true);
      // Stop errors on an already released native view are harmless during unmount.
      void lastNative.current?.stop().catch(() => {});
    };
  }, [urls]);
  const failed = recovery?.mode === 'failed';
  const blocked = failed || stalled;
  const waiting = !frame && !blocked;
  const failureKind = failed ? recovery!.kind : 'stalled';
  // Bring the controls up with focus on Retry as soon as a stream fails or stalls.
  useEffect(() => { if (blocked) chrome.show(); }, [blocked]);
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
    index.current = 0; controller.current?.reset(); setRecovery(null); setStalled(false);
    void attempt.current?.(false).catch(() => onError('Reconnect failed'));
  }
  usePlaybackMedia(key => {
    if (key===86) { onClose(); return; }
    if (key===89 || key===90 || (key===126 && status==='playing') || (key===127 && status==='paused')) return;
    void toggle();
  });
  function renderTracks() { if(isTVBuild)return <TVTrackSheet audio={availableTracks.audio.map(t=>({id:String(t.id),label:t.name}))} subtitles={availableTracks.subtitle.filter(t=>t.id!==-1).map(t=>({id:String(t.id),label:t.name}))} selectedAudio={String(tracks.audio)} selectedSubtitle={tracks.subtitle===-1?'off':String(tracks.subtitle)} onAudio={id=>{const t=availableTracks.audio.find(t=>String(t.id)===id);if(t)chooseTrack('audio',t.id,t.name)}} onSubtitle={id=>{const t=availableTracks.subtitle.find(t=>String(t.id)===id);chooseTrack('subtitles',t?.id??-1,t?.name||'Off')}} onClose={()=>setShowTracks(false)}/>;return <View nativeID={isTVBuild?'tv-trap:live-tracks':undefined} style={{ marginHorizontal: 16, padding: 16, borderRadius: 20, gap: 16, backgroundColor: colors.videoScrim, borderWidth:1, borderColor:colors.videoBorder }}><Pressable accessibilityRole="button" accessibilityLabel="Close audio and subtitles" onPress={() => setShowTracks(false)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.videoLink }}>Done · Audio & subtitles</Text></Pressable><Text style={{ color: colors.videoMuted, fontSize: 12 }}>Remembered for this profile when the stream reports a matching language or track name.</Text><Text style={{ color: colors.videoLink }}>Audio</Text>{availableTracks.audio.length ? availableTracks.audio.map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseTrack('audio', track.id, track.name)} style={{ paddingVertical: 8 }}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{ color: colors.onVideo,flex:1 }}>{track.name}</Text>{tracks.audio===track.id&&<Icon name="checkmark" color={colors.onVideo} size={18}/>}</View></Pressable>) : <Text style={{ color: colors.videoMuted }}>No selectable audio tracks reported.</Text>}<Text style={{ color: colors.videoLink }}>Subtitles</Text>{[{ id: -1, name: 'Off' }, ...availableTracks.subtitle.filter(track => track.id !== -1)].map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseTrack('subtitles', track.id, track.name)} style={{ paddingVertical: 8 }}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{ color: colors.onVideo,flex:1 }}>{track.name}</Text>{tracks.subtitle===track.id&&<Icon name="checkmark" color={colors.onVideo} size={18}/>}</View></Pressable>)}</View>; }
  const callbacks=useRef({onPlaying,onError,markFrame});callbacks.current={onPlaying,onError,markFrame};
  const nativeEvents=useMemo(()=>({
    onPlaying:()=>callbacks.current.onPlaying(),
    onPaused:()=>{if(alive.current){setStatus('paused');save(true)}},
    onEncounteredError:(event:{message:string})=>callbacks.current.onError(event.message),
    onTimeChanged:(event:Time)=>{if((event?.value||0)>0)callbacks.current.markFrame();save()},
    onFirstPlay:()=>callbacks.current.markFrame(),
    onESAdded:(event:MediaTracks)=>{if(alive.current)setAvailableTracks(event)},
    onDialogDisplay:()=>{void player.current?.dismiss().catch(()=>{});callbacks.current.onError('Provider requires additional authorization')},
  }),[]);
  const attachVideo=useCallback((instance:LibVlcPlayerViewRef|null)=>{player.current=instance;if(instance)lastNative.current=instance},[]);
  return <LivePlayerLayout fullscreen={true} video={<StableVlcSurface key={generation} ref={attachVideo} source={source} options={mediaOptions} autoplay contentFit={displayFit} style={videoStyle} tracks={tracks} {...nativeEvents}/>} overlay={!minimized && <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
    <VideoScrim/>
    <Pressable noFeedback accessibilityRole="button" accessibilityLabel={controls ? 'Hide player controls' : 'Show player controls'} nativeID={!controls || (isTVBuild && waiting) ? 'tv-preferred:reveal-controls' : undefined} focusable={isTVBuild && (!controls || waiting)} onPress={() => setControls(value => !value)} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
    <ChromeLayer visible={controls || failed || status !== 'playing'} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}><View style={{ position: 'absolute', top: Math.max(insets.top, isTVBuild ? tvSafe.v : 16), left: Math.max(insets.left, isTVBuild ? tvSafe.h : 16), right: Math.max(insets.right, isTVBuild ? tvSafe.h : 16), flexDirection: 'row', alignItems: 'center', gap: 16 }}><Pressable accessibilityRole="button" accessibilityLabel={isTVBuild || !fullscreen ? 'Back to library' : 'Exit full screen'} onPress={() => { setControls(true); if(isTVBuild || !fullscreen)onClose();else orientation.exit(); }} style={{ minWidth: 44, minHeight: 44, paddingHorizontal: isTVBuild ? 16 : 0, borderRadius: 22, backgroundColor: colors.videoControl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name={isTVBuild||!fullscreen?"chevron-back":"contract-outline"} color={colors.onVideo} size={20} />{isTVBuild&&<Text style={{ color: colors.onVideo, fontWeight: '600' }}>Back</Text>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Player options" onPress={onOptions} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: colors.videoControl }}><Icon name="ellipsis-horizontal" color={colors.onVideo}/>{isTVBuild&&<Text style={{color:colors.onVideo,fontSize:14}}>Player options</Text>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Audio and subtitles" onPress={() => { setControls(true); setShowTracks(value => !value); }} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: colors.videoControl }}><Icon name="headset-outline" color={colors.onVideo}/>{isTVBuild&&<Text style={{color:colors.onVideo,fontSize:14}}>Audio and subtitles</Text>}</Pressable><View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 }}>{isTVBuild && !!item.logo && <Image source={{ uri: item.logo }} resizeMode="contain" resizeMethod="resize" style={{ width: 64, height: 48 }} />}<View style={{ flex: 1 }}><Text numberOfLines={2} style={{ color: colors.onVideo, fontWeight: '600', fontSize: isTVBuild ? 28 : 16, lineHeight: isTVBuild ? 36 : 20, textShadowColor: colors.videoBlack, textShadowRadius: 3 }}>{item.name}</Text>{isTVBuild && <Text numberOfLines={1} style={{ color: colors.videoMuted, fontSize: 16, lineHeight: 24 }}>{[channelInfo || groupLabel(item.group), item.kind === 'live' ? '▲▼ Change channel' : ''].filter(Boolean).join('  ·  ')}</Text>}</View></View>{!isTVBuild&&<Pressable accessibilityRole="button" accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'} onPress={() => fullscreen ? orientation.exit() : orientation.enter()} style={{width:44,height:44,borderRadius:22,backgroundColor:colors.videoControl,alignItems:'center',justifyContent:'center'}}><Icon name={fullscreen ? 'contract-outline' : 'expand-outline'} color={colors.onVideo} /></Pressable>}{!isTVBuild&&fullscreen&&<Pressable accessibilityRole="button" accessibilityLabel="Rotate screen" onPress={() => { setControls(true); orientation.rotate(width <= height); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.videoControl, alignItems: 'center', justifyContent: 'center' }}><Icon name="phone-landscape-outline" color={colors.onVideo} /></Pressable>}</View>
    {waiting && !minimized && <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}><View style={{ alignItems: 'center', gap: 16, padding: 24, borderRadius: 24, backgroundColor: colors.videoControl, maxWidth: '70%' }}><ActivityIndicator size="large" color={colors.mint} /><Text numberOfLines={2} style={{ color: colors.onVideo, fontWeight: '600', fontSize: isTVBuild ? 28 : 18, textAlign: 'center' }}>Loading {item.name}…</Text>{!!channelInfo && <Text style={{ color: colors.videoMuted, fontSize: isTVBuild ? 18 : 14, textAlign: 'center' }}>{channelInfo}</Text>}{reconnecting && <Text style={{ color: colors.videoMuted, fontSize: isTVBuild ? 18 : 14 }}>Reconnecting…</Text>}</View></View>}
    {blocked && !minimized && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}><View style={{ alignItems: 'stretch', gap: 16, padding: 24, borderRadius: 24, backgroundColor: colors.videoControl, width: isTVBuild ? 640 : '90%', maxWidth: '90%' }}><Announcement text={`${item.name} didn’t start. ${failureMessage(failureKind)}`}/><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: colors.onVideo, fontWeight: '600', fontSize: isTVBuild ? 28 : 18 }}>{item.name} didn’t start</Text><Text style={{ color: colors.videoMuted, fontSize: isTVBuild ? 18 : 15, lineHeight: isTVBuild ? 26 : 21 }}>{failureMessage(failureKind)}</Text><Button nativeID="tv-preferred:stall-retry" title="Retry" icon="refresh-outline" onPress={() => { setStalled(false); retry(); armStall(); }} />{onOtherPlayer && <Button title="Try other player" variant="secondary" onPress={onOtherPlayer} />}{onNextChannel && item.kind === 'live' && <Button title="Next channel" variant="secondary" icon="play-forward" onPress={onNextChannel} />}{!onOtherPlayer && onExternal && <Button title="Open in another app" variant="secondary" onPress={onExternal} />}{features.playbackAssist && <PlaybackHelp kind={failureKind} />}</View></View>}
    {showTracks && isTVBuild&&renderTracks()}
    {showTracks && !isTVBuild && <ScrollView style={{ position: 'absolute', top: Math.max(insets.top, isTVBuild ? tvSafe.v : 16) + 56, bottom: Math.max(insets.bottom, isTVBuild ? tvSafe.v : 16) + 72, right: Math.max(insets.right, isTVBuild ? tvSafe.h : 16), width: 350, maxWidth: '85%' }}>{renderTracks()}</ScrollView>}
    <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, isTVBuild ? tvSafe.v : 16), left: Math.max(insets.left, isTVBuild ? tvSafe.h : 16), right: Math.max(insets.right, isTVBuild ? tvSafe.h : 16), alignItems: 'center', gap: 16 }}>{blocked || waiting || status === 'loading' || reconnecting ? null : <Pressable accessibilityRole="button" nativeID={isTVBuild?'tv-preferred:playback-toggle':undefined} accessibilityLabel={status === 'playing' ? 'Pause live TV' : 'Play live TV'} onPress={() => { setControls(true); void toggle(); }} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.videoControl, alignItems: 'center', justifyContent: 'center' }}><Icon name={status === 'playing' ? 'pause' : 'play'} size={26} color={colors.onVideo} /></Pressable>}{!!orientation.notice && <Text style={{ color: colors.onVideo, fontSize: 12, backgroundColor: colors.videoControl, padding: 8 }}>{orientation.notice}</Text>}</View></ChromeLayer>
  </View>} />;
}
