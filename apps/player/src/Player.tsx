import TVTrackSheet from './TVTrackSheet';
import VideoScrim from './VideoScrim';
import {Announcement} from './accessibility';
import TVSeekBar from './TVSeekBar';
import {tvSafe} from './designTokens';
import { Text } from './Typography';
import VideoSeekBar from './VideoSeekBar';
import { ChromeLayer } from './PlaybackGlass';
import { usePlaybackChrome, usePlaybackMedia } from './PlaybackChrome';
import { features } from './featureFlags';
import { matchTrack } from './playbackAssist';
import PlaybackHelp from './PlaybackHelp';
import { usePlayerOrientation } from './usePlayerOrientation';
import { useSleepTimer } from './PlayerToolsContext';
import Pressable from './FocusPressable';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, ScrollView, View, Platform, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { AudioTrack, SubtitleTrack, VideoPlayer } from 'expo-video';
import type { PlaybackInfo } from './viewingPreferences';
import type { Media } from './provider';
import type { PlaybackSnapshot } from './activity';
import { classifyFailure, failureMessage, RecoveryCoordinator } from './recovery';
import type { RecoveryState } from './recovery';
import { playbackURLs, streamFormat } from './livePlayback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playbackClock } from './activity';
import { Button, Icon, colors, u } from './ui';
// Keep the native/video surface stable while status/format controls rerender.
// On web, rerendering a changed src during replaceAsync can cancel the play request.
const PlaybackSurface = memo(function PlaybackSurface({ player, viewRef, television = false, fit = 'contain', minimized = false, allowPip = false, onPipStop }: { allowPip?: boolean; onPipStop?:()=>void; fit?: 'contain' | 'cover'; minimized?: boolean; player: VideoPlayer; television?: boolean; viewRef: React.RefObject<VideoView | null> }) {
  return <VideoView ref={viewRef} player={player} style={{ width: '100%', height: '100%' }} nativeControls={false} onPictureInPictureStop={onPipStop} allowsPictureInPicture={allowPip} surfaceType={Platform.OS==='android' ? 'textureView' : undefined} contentFit={fit} fullscreenOptions={{ enable: false }} />;
});
export type TrackPreferences = { audio?: string; subtitles?: string };
const language = (value: string) => ({ eng: 'en', fra: 'fr', fre: 'fr', spa: 'es', deu: 'de', ger: 'de', ita: 'it', por: 'pt' }[value.toLowerCase()] || value.toLowerCase().split('-')[0]);
export default function Player({ item, resumeAt = 0, tracks = {}, onProgress, onTracks, onExternal, onClose, compatibilityAvailable = false, onCompatibility, fullscreen, onFullscreenChange, television = false, nextEpisode, onOptions, onInfo, displayFit = 'contain', playbackRate = 1, registerStop, registerPip, minimized = false }: {
  registerPip?: (action:()=>Promise<void>)=>void; displayFit?: 'contain' | 'cover'; playbackRate?: number; registerStop?: (stop: () => Promise<void>) => void; minimized?: boolean; onOptions?: () => void; onInfo?: (info: PlaybackInfo) => void; television?: boolean; nextEpisode?: { item: Media; onPress: () => void };
  item: Media; resumeAt?: number; tracks?: TrackPreferences; onProgress: (snapshot: PlaybackSnapshot) => void;
  onTracks: (preferences: TrackPreferences) => void; onExternal: () => void; onClose: () => void; compatibilityAvailable?: boolean; onCompatibility?: () => void; fullscreen?: boolean; onFullscreenChange?: (value: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const compactChrome=!television&&width<600;
  const [controlBounds,setControlBounds]=useState({headerBottom:0,bottomTop:0});
  const controlSpace=controlBounds.bottomTop-controlBounds.headerBottom;
  const transportSize=television?72:controlSpace>0&&controlSpace<88?44:72;
  const transportTop=controlSpace>0?Math.max(controlBounds.headerBottom+8,controlBounds.headerBottom+(controlSpace-(television?80:transportSize))/2):undefined;
  const chrome = usePlaybackChrome();
  const orientation = usePlayerOrientation(onFullscreenChange || (() => {}));
  const sleep = useSleepTimer();
  const mounted = useRef(true);
  const handoff = useRef(false);
  const [advancing, setAdvancing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clock, setClock] = useState({ position: resumeAt, duration: 0 });

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const viewRef = useRef<VideoView | null>(null);
  const candidates = useMemo(() => playbackURLs(item), [item.url, item.playbackURLs]);
  const candidateIndex = useRef(0);
  const [format, setFormat] = useState(streamFormat(item.url));
  const source = useMemo(() => item.url ? { uri: item.url, headers: item.headers, contentType: /\.m3u8(\?|$)/i.test(item.url) ? 'hls' as const : 'auto' as const } : null, [item.url, item.headers]);
  const player = useVideoPlayer(source, instance => { instance.timeUpdateEventInterval = 1; instance.play(); });
  const [status, setStatus] = useState(player.status);
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  const [audio, setAudio] = useState<AudioTrack[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  useEffect(() => { onInfo?.({ engine: 'native', format: format === 'HLS' || format === 'MPEG-TS' ? format : 'Video', state: recovery?.mode === 'failed' ? 'failed' : status === 'readyToPlay' ? (isPlaying ? 'playing' : 'paused') : 'loading', audioTracks: audio.length, subtitleTracks: subtitles.length, attempts: recovery?.attempt || 0 }); }, [format, status, isPlaying, audio.length, subtitles.length, recovery, onInfo]);
  const [trackNotice, setTrackNotice] = useState('');
  const persist = useRef(onProgress); persist.current = onProgress;
  const preference = useRef(tracks); preference.current = tracks;
  const lastSnapshot = useRef<PlaybackSnapshot>({ position: resumeAt, duration: 0 });
  const started = useRef(false);
  const lastWrite = useRef(0);
  const session = useRef<{ retry: () => void } | null>(null);
  useEffect(()=>{ try { player.playbackRate = item.kind === 'live' ? 1 : playbackRate; } catch { setTrackNotice('This stream does not support that playback speed.'); } },[playbackRate]);
  const pipGate = useRef<{ resolve: () => void; reject: (error: unknown) => void } | null>(null);
  const [pipReady, setPipReady] = useState(false);
  // Enabling PiP at mount races the audio session and can abort the iOS process. Arm it only after the user asks.
  useEffect(() => {
    if (!pipReady || !pipGate.current) return;
    const gate = pipGate.current;
    pipGate.current = null;
    void (async () => {
      try {
        if (!viewRef.current) throw new Error('Picture in Picture is unavailable.');
        await viewRef.current.startPictureInPicture();
        gate.resolve();
      } catch (error) {
        player.staysActiveInBackground = false;
        gate.reject(error);
      }
    })();
  }, [pipReady, player]);
  useEffect(() => {
    registerPip?.(async () => {
      if (television || Platform.OS === 'web') throw new Error('Picture in Picture is unavailable.');
      player.staysActiveInBackground = true;
      if (pipReady) {
        try {
          if (!viewRef.current) throw new Error('Picture in Picture is unavailable.');
          await viewRef.current.startPictureInPicture();
        } catch (error) {
          player.staysActiveInBackground = false;
          throw error;
        }
        return;
      }
      await new Promise<void>((resolve, reject) => {
        pipGate.current = { resolve, reject };
        setPipReady(true);
      });
    });
  }, [registerPip, player, pipReady, television]);
  const desiredSeek = useRef(resumeAt);
  const needsSeek = useRef(resumeAt > 0 && item.kind !== 'live');

  useEffect(() => {
    let active = true;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    const clearLoadTimer = () => { if (loadTimer) clearTimeout(loadTimer); loadTimer = undefined; };
    function flush(force = false) {
      if (!started.current) return;
      if (force || Date.now() - lastWrite.current >= 10000) { lastWrite.current = Date.now(); persist.current({ ...lastSnapshot.current }); }
    }
    function applyAudio() {
      if (!active) return;
      try {
        const available = player.availableAudioTracks || []; setAudio([...available]);
        const preferred = preference.current.audio;
        if (preferred) {
          const { track: match, notice } = features.playbackAssist ? matchTrack(available, preferred) : { track: available.find(track => language(track.language || '') === language(preferred)) || null, notice: available.length ? 'Your preferred audio is not reported by this stream. You can choose an available track.' : '' };
          if (match) player.audioTrack = match;
          else if (notice) setTrackNotice(notice);
        }
      } catch { /* Native controls remain available when track APIs are unavailable. */ }
    }
    function applySubtitles() {
      if (!active) return;
      try {
        const available = player.availableSubtitleTracks || []; setSubtitles([...available]);
        const preferred = preference.current.subtitles;
        if (preferred === 'off') player.subtitleTrack = null;
        else if (preferred) {
          const { track: match, notice } = features.playbackAssist ? matchTrack(available, preferred) : { track: available.find(track => language(track.language || '') === language(preferred)) || null, notice: 'Your preferred subtitles are not available in this stream. You can choose another available track.' };
          if (match) { player.subtitleTrack = match; setTrackNotice(''); }
          else setTrackNotice(notice || 'Your preferred subtitles are not available in this stream. You can choose another available track.');
        }
      } catch { /* No unavailable feature is presented as a supported track. */ }
    }
    const operation = async (advance = true) => {
      if (!active || !source || handoff.current) return;
      player.pause();
      desiredSeek.current = lastSnapshot.current.position;
      needsSeek.current = item.kind !== 'live' && desiredSeek.current > 0;
      await player.replaceAsync(null); // Release the previous stream before reconnecting.
      if (!active) return;
      if (advance && item.kind === 'live' && candidateIndex.current < candidates.length - 1) candidateIndex.current++;
      const uri = candidates[candidateIndex.current] || source.uri;
      setFormat(streamFormat(uri));
      await player.replaceAsync({ uri, headers: item.headers, contentType: /\.m3u8(\?|$)/i.test(uri) ? 'hls' : 'auto' });
      if (!active) return;
      player.play();
    };
    const coordinator = new RecoveryCoordinator(() => operation(), value => { if (active) setRecovery(value); });
    function handleStatus(value: typeof player.status, message?: string) {
      if (!active || handoff.current) return;
      setStatus(value); clearLoadTimer();
      if (value === 'readyToPlay') {
        { setIsPlaying(player.playing); setClock({ position: lastSnapshot.current.position, duration: Number.isFinite(player.duration) ? player.duration : 0 }); }
        coordinator.ready(); setRecovery(null);
        if (needsSeek.current && Number.isFinite(player.duration) && player.duration > 5 && !player.isLive) {
          player.currentTime = Math.max(0, Math.min(desiredSeek.current, player.duration - 5)); needsSeek.current = false;
        }
        applyAudio(); applySubtitles();
      } else if (value === 'error') {
        // An HLS endpoint may be refused while the provider's TS endpoint works.
        const canTryFormat = item.kind === 'live' && candidateIndex.current < candidates.length - 1;
        coordinator.request(canTryFormat ? 'network' : classifyFailure(message));
      }
      else if (value === 'loading') loadTimer = setTimeout(() => { if (active) coordinator.request('network'); }, 15000);
    }
    const listeners = [
      player.addListener('statusChange', event => handleStatus(event.status, event.error?.message)),
      player.addListener('timeUpdate', event => {
        if (!active || needsSeek.current || handoff.current) return;
        if (player.status === 'readyToPlay' && player.playing) started.current = true;
        lastSnapshot.current = { position: item.kind === 'live' ? 0 : event.currentTime, duration: Number.isFinite(player.duration) ? player.duration : 0 };
        setClock({ position: lastSnapshot.current.position, duration: lastSnapshot.current.duration });
        flush();
      }),
      player.addListener('playingChange', event => { if (active) setIsPlaying(event.isPlaying); if (!event.isPlaying) flush(true); }),
      player.addListener('playToEnd', () => {
        started.current = true;
        lastSnapshot.current = { ...lastSnapshot.current, ended: true };
        flush(true);
      }),
      player.addListener('availableAudioTracksChange', applyAudio),
      player.addListener('availableSubtitleTracksChange', applySubtitles),
    ];
    const appState = AppState.addEventListener('change', value => { if (value !== 'active') flush(true); });
    registerStop?.(async () => { active=false; handoff.current=true; coordinator.dispose(); clearLoadTimer(); player.pause(); await player.replaceAsync(null); });
    session.current = { retry: () => {
      candidateIndex.current = 0; coordinator.reset(); setRecovery({ mode: 'reconnecting', attempt: 0, kind: 'unknown' });
      void operation(false).catch(() => { if (active) coordinator.request('unknown'); });
    } };
    handleStatus(player.status);
    return () => {
      active = false; clearLoadTimer(); coordinator.dispose(); appState.remove(); listeners.forEach(listener => listener.remove());
      session.current = null;
      // Use our snapshot: Expo may already have released the native player during cleanup.
      if (started.current) persist.current({ ...lastSnapshot.current });
    };
  }, [player, source, item.kind, candidates, television]);
  const recovering = recovery?.mode === 'waiting' || recovery?.mode === 'reconnecting';
  const failed = recovery?.mode === 'failed';
  const [selectedTrack,setSelectedTrack]=useState<{audio?:string;subtitle?:string}>({});
  function chooseAudio(track: AudioTrack) {
    try { player.audioTrack = track; setSelectedTrack(value=>({...value,audio:String(track.id)})); const next = { ...preference.current, audio: track.language || undefined }; preference.current = next; onTracks(next); }
    catch { setTrackNotice('This audio track could not be selected. Try the native player controls.'); }
  }
  function chooseSubtitles(track: SubtitleTrack | null) {
    try { player.subtitleTrack = track; setSelectedTrack(value=>({...value,subtitle:track?String(track.id):'off'})); setTrackNotice(''); const next = { ...preference.current, subtitles: track ? track.language || undefined : 'off' }; preference.current = next; onTracks(next); }
    catch { setTrackNotice('This subtitle track could not be selected. Try another available track.'); }
  }
  useEffect(() => {
    if (!showTracks && (!fullscreen || television)) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (showTracks) setShowTracks(false); else orientation.exit(); chrome.show(); return true; });
    return () => subscription.remove();
  }, [television, showTracks, fullscreen]);
  async function advanceEpisode() {
    if (!nextEpisode || handoff.current) return;
    handoff.current = true; setAdvancing(true); setTrackNotice('');
    if (started.current) persist.current({ ...lastSnapshot.current });
    try {
      player.pause();
      await player.replaceAsync(null); // Close this connection before mounting the following episode.
      if (mounted.current) nextEpisode.onPress();
    } catch {
      handoff.current = false;
      if (mounted.current) { setAdvancing(false); setTrackNotice('Couldn’t switch episodes. Please try again.'); }
    }
  }
  function seek(seconds: number) {
    try { player.currentTime = Math.max(0, Math.min(player.currentTime + seconds, Math.max(0, player.duration - 1))); }
    catch { setTrackNotice('Seeking is not available for this video.'); }
  }
  usePlaybackMedia(key => {
    if (key===86) { onClose(); return; }
    if (key===89 || key===90) { if (item.kind!=='live') seek(key===89 ? -10 : 30); return; }
    try { if (key===127 || (key===85 && player.playing)) player.pause(); else player.play(); } catch { setTrackNotice('Couldn’t change playback. Try again.'); }
  });
  return <View style={{ flex: 1, backgroundColor: colors.videoBlack }}>
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}><PlaybackSurface player={player} viewRef={viewRef} television={television} fit={displayFit} minimized={minimized} allowPip={pipReady && sleep.deadline===null} onPipStop={()=>{player.staysActiveInBackground=false}} /></View>
    {!minimized&&<VideoScrim visible={chrome.visible}/>}
    {!minimized && <Pressable noFeedback nativeID={!chrome.visible ? 'tv-preferred:reveal-controls' : undefined} focusable={television && !chrome.visible} accessibilityRole="button" accessibilityLabel={chrome.visible ? 'Hide player controls' : 'Show player controls'} onPress={chrome.toggle} style={{position:'absolute',top:0,bottom:0,left:0,right:0}} />}
    <ChromeLayer visible={!minimized && chrome.visible} onLayout={event=>{const bottom=event.nativeEvent.layout.y+event.nativeEvent.layout.height;setControlBounds(current=>current.headerBottom===bottom?current:{...current,headerBottom:bottom})}} style={{ position: 'absolute', top: Math.max(insets.top, television ? tvSafe.v : 24), left: Math.max(insets.left, television ? tvSafe.h : 16), right: Math.max(insets.right, television ? tvSafe.h : 16), flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={item.catchup?"Back to TV guide":"Back to library"} onPress={onClose} style={{ backgroundColor: 'transparent', borderRadius: 16, padding: compactChrome?8:16, minWidth:44,minHeight:44,flexDirection: 'row', alignItems: 'center', justifyContent:'center',gap: 8 }}><Icon name="chevron-back" color={colors.onVideo} />{television&&<Text style={{ color: colors.onVideo, fontWeight: '600' }}>Back</Text>}</Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Player options" onPress={onOptions} style={{ minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',padding:compactChrome?8:16, backgroundColor: 'transparent', borderRadius: 16 }}><Icon name="ellipsis-horizontal" color={colors.onVideo}/>{television&&<Text style={{color:colors.onVideo,fontSize:14}}>Player options</Text>}</Pressable><View style={{ flex: 1,minWidth:0 }}><Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.onVideo, fontSize: television ? 28 : 16, fontWeight: '600', textShadowColor: colors.videoBlack, textShadowRadius: 4 }}>{item.name}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.videoHandle, fontSize: television ? 18 : 13, textShadowColor: colors.videoBlack, textShadowRadius: 4 }}>{item.group}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Choose another player" onPress={onExternal} style={{ minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',backgroundColor: colors.videoControlStrong, padding:compactChrome?8:16, borderRadius: 24 }}><Icon name="open-outline" color={colors.onVideo}/>{television&&<Text style={{color:colors.onVideo,fontSize:14}}>Other player</Text>}</Pressable>
    </ChromeLayer>
    {!minimized && (status === 'loading' || recovering || failed) && <View style={{ position: 'absolute', top: '28%', left: '20%', right: '20%', alignItems: 'center', gap: 16, padding: 24, borderRadius: 24, backgroundColor: colors.videoErrorSurface }}>
      {failed ? <><Announcement text={`Could not open this video. ${failureMessage(recovery.kind)}`}/><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: colors.onVideo, fontSize: 18 }}>Couldn’t open this video</Text><Text style={{ color: colors.videoHandle, textAlign: 'center' }}>{failureMessage(recovery.kind)}</Text>{features.playbackAssist && <PlaybackHelp kind={recovery.kind} />}<Button title="Try again" onPress={() => session.current?.retry()} />{item.kind==='live' && onCompatibility && <Button title="Try built-in VLC" onPress={onCompatibility} />}<Button title="Choose an external player" variant="secondary" onPress={onExternal} /></> : <><ActivityIndicator color={colors.mint} /><Text style={{ color: colors.onVideo }}>{recovering ? 'Reconnecting…' : 'Opening your video…'}</Text></>}
    </View>}
    {!minimized&&showTracks&&television&&<TVTrackSheet audio={audio.map(t=>({id:String(t.id),label:t.label||t.language||'Audio track'}))} subtitles={subtitles.map(t=>({id:String(t.id),label:t.label||t.language||'Subtitle track'}))} selectedAudio={selectedTrack.audio||String(player.audioTrack?.id||'')} selectedSubtitle={selectedTrack.subtitle??(player.subtitleTrack?String(player.subtitleTrack.id):'off')} onAudio={id=>{const t=audio.find(t=>String(t.id)===id);if(t)chooseAudio(t)}} onSubtitle={id=>chooseSubtitles(subtitles.find(t=>String(t.id)===id)||null)} onClose={()=>setShowTracks(false)}/>}
    {!minimized && chrome.visible && showTracks && !television && <View nativeID="tv-trap:video-tracks" style={{ position: 'absolute', bottom: Math.max(insets.bottom, television ? tvSafe.v : 24) + 100, right: 24, width: 380, maxWidth: '80%', maxHeight: '55%', backgroundColor: colors.videoScrim, borderWidth:1, borderColor:colors.videoBorder, borderRadius: 22, padding: 16, gap: 8 }}>
      <Pressable accessibilityRole="button" nativeID="tv-preferred:close-tracks" accessibilityLabel="Close audio and subtitles" onPress={() => setShowTracks(false)} style={{ padding: 8 }}><Text style={{ color: colors.videoLink, fontWeight: '600' }}>Done · Audio & subtitles</Text></Pressable>
      <ScrollView contentContainerStyle={{ gap: 8 }}><Text style={{ color: colors.onVideo }}>Remember for this profile</Text>{audio.map(track => <Pressable accessibilityRole="radio" accessibilityState={{checked:(selectedTrack.audio||String(player.audioTrack?.id))===String(track.id)}} key={track.id} onPress={() => chooseAudio(track)} style={{ padding: 16 }}><Text style={{ color: colors.onVideo }}>Audio · {track.label || track.language || 'Track'}</Text>{(selectedTrack.audio||String(player.audioTrack?.id))===String(track.id)&&<Icon name="checkmark" color={colors.onVideo}/>}</Pressable>)}{!audio.length && <Text style={{ color: colors.videoMuted }}>No selectable audio tracks reported.</Text>}<Pressable accessibilityRole="radio" accessibilityState={{checked:selectedTrack.subtitle==='off'||(!selectedTrack.subtitle&&!player.subtitleTrack)}} onPress={() => chooseSubtitles(null)} style={{ padding: 16 }}><Text style={{ color: colors.onVideo }}>Subtitles · Off</Text>{(selectedTrack.subtitle==='off'||(!selectedTrack.subtitle&&!player.subtitleTrack))&&<Icon name="checkmark" color={colors.onVideo}/>}</Pressable>{subtitles.map(track => <Pressable accessibilityRole="radio" accessibilityState={{checked:(selectedTrack.subtitle||String(player.subtitleTrack?.id))===String(track.id)}} key={track.id} onPress={() => chooseSubtitles(track)} style={{ padding: 16 }}><Text style={{ color: colors.onVideo }}>Subtitles · {track.label || track.language || 'Track'}</Text>{(selectedTrack.subtitle||String(player.subtitleTrack?.id))===String(track.id)&&<Icon name="checkmark" color={colors.onVideo}/>}</Pressable>)}</ScrollView>
    </View>}
    <ChromeLayer visible={!minimized && chrome.visible && !failed && status !== 'loading' && !recovering && !showTracks} style={{position:'absolute',top:transportTop??'42%',left:16,right:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:24}}>
      {item.kind!=='live'&&<Pressable accessibilityRole="button" accessibilityLabel="Rewind 10 seconds" disabled={status !== 'readyToPlay' || clock.duration <= 0 || advancing} onPress={() => seek(-10)} style={{width:television?80:transportSize,height:television?80:transportSize,minWidth:44,minHeight:44,justifyContent:'center'}}><View style={{ alignItems: 'center', gap: 0 }}><Icon name="play-back" color={colors.onVideo} /><Text maxFontSizeMultiplier={1.4} style={{ color: colors.onVideo, fontSize: television?18:12 }}>10s</Text></View></Pressable>}
      <Pressable accessibilityRole="button" nativeID="tv-preferred:playback-toggle" accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'} disabled={failed || advancing} onPress={() => { try { if (isPlaying) player.pause(); else { if (player.duration > 0 && player.currentTime >= player.duration - .5) player.currentTime = 0; player.play(); } } catch { setTrackNotice('Couldn’t change playback. Try again.'); } }} style={{ width: transportSize, height: transportSize, borderRadius: transportSize/2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name={isPlaying ? 'pause' : 'play'} size={32} color={colors.primaryText} /></Pressable>
      {item.kind!=='live'&&<Pressable accessibilityRole="button" accessibilityLabel="Forward 30 seconds" disabled={status !== 'readyToPlay' || clock.duration <= 0 || advancing} onPress={() => seek(30)} style={{width:television?80:transportSize,height:television?80:transportSize,minWidth:44,minHeight:44,justifyContent:'center'}}><View style={{ alignItems: 'center', gap: 0 }}><Icon name="play-forward" color={colors.onVideo} /><Text maxFontSizeMultiplier={1.4} style={{ color: colors.onVideo, fontSize: television?18:12 }}>30s</Text></View></Pressable>}
    </ChromeLayer>
    <ChromeLayer visible={!minimized && chrome.visible} onLayout={event=>{const top=event.nativeEvent.layout.y;setControlBounds(current=>current.bottomTop===top?current:{...current,bottomTop:top})}} style={{ position: 'absolute', bottom: Math.max(insets.bottom, television ? tvSafe.v : 24), left: Math.max(insets.left, television ? tvSafe.h : 16), right: Math.max(insets.right, television ? tvSafe.h : 16), padding: television ? 16 : 8, borderRadius: 0, backgroundColor: 'transparent', flexDirection: 'row', flexWrap:'wrap', gap: 8, alignItems: 'center' }}>
      {television && item.kind!=='live' && <TVSeekBar position={clock.position} duration={clock.duration} onSeekBy={seek}/>}
      {!television && item.kind!=='live' && clock.duration>0 && <VideoSeekBar position={clock.position} duration={clock.duration} onSeek={seconds => {try {player.currentTime=seconds;setClock(current=>({...current,position:seconds}));}catch {setTrackNotice('Seeking is not available for this video.');}}} />}
      <View style={{flex:1,minWidth:0,gap:8}}><Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{color:colors.onVideo,fontSize:television?18:13}}>{item.kind==='live'?'Live':`${playbackClock(clock.position)} / ${clock.duration>0?playbackClock(clock.duration):'—:—'}`}</Text>{!!(trackNotice || orientation.notice) && <Text numberOfLines={2} style={{ color: colors.videoSecondary, fontSize: television?16:12 }}>{trackNotice || orientation.notice}</Text>}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Audio and subtitles" onPress={() => setShowTracks(value => !value)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',padding:compactChrome?8:16}}><Icon name="headset-outline" color={colors.onVideo} />{television&&<Text style={{color:colors.onVideo,fontSize:14}}>Audio and subtitles</Text>}</Pressable>
      {!television && <Pressable accessibilityRole="button" accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'} onPress={() => fullscreen ? orientation.exit() : orientation.enter()} style={{minWidth:44,minHeight:44,padding:compactChrome?8:16,alignItems:'center',justifyContent:'center'}}><Icon name={fullscreen ? 'contract-outline' : 'expand-outline'} color={colors.onVideo} /></Pressable>}
      {nextEpisode && <Pressable testID="next-episode" accessibilityRole="button" accessibilityLabel={`Next episode: ${nextEpisode.item.group} · ${nextEpisode.item.name}`} accessibilityState={{ disabled: advancing, busy: advancing }} disabled={advancing} onPress={() => { void advanceEpisode(); }} style={{ maxWidth: television ? '38%' : '100%', minHeight: 54, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {advancing ? <ActivityIndicator color={colors.primaryText} /> : <Icon name="play-skip-forward" color={colors.primaryText} />}
        <View style={{ flexShrink: 1, gap: 8 }}><Text style={{ color: colors.primaryText, fontWeight: '700' }}>{advancing ? 'Opening next…' : 'Next episode'}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.primaryText, fontSize: television?16:12 }}>{nextEpisode.item.group} · {nextEpisode.item.name}</Text></View>
      </Pressable>}
    </ChromeLayer>
  </View>;
}
