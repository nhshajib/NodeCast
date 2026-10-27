import Pressable from './FocusPressable';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, ScrollView, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { AudioTrack, SubtitleTrack, VideoPlayer } from 'expo-video';
import type { Media } from './provider';
import type { PlaybackSnapshot } from './activity';
import { classifyFailure, failureMessage, RecoveryCoordinator } from './recovery';
import type { RecoveryState } from './recovery';
import { playbackURLs, streamFormat } from './livePlayback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { timeLabel } from './activity';
import { Button, Icon, colors, u } from './ui';
// Keep the native/video surface stable while status/format controls rerender.
// On web, rerendering a changed src during replaceAsync can cancel the play request.
const PlaybackSurface = memo(function PlaybackSurface({ player, viewRef, television = false }: { player: VideoPlayer; television?: boolean; viewRef: React.RefObject<VideoView | null> }) {
  return <VideoView ref={viewRef} player={player} style={television ? { width: '100%', height: '100%' } : { width: '100%', aspectRatio: 16 / 9 }} nativeControls={!television} surfaceType={television ? 'textureView' : undefined} contentFit="contain" fullscreenOptions={{ enable: !television, orientation: 'landscape' }} />;
});
export type TrackPreferences = { audio?: string; subtitles?: string };
const language = (value: string) => ({ eng: 'en', fra: 'fr', fre: 'fr', spa: 'es', deu: 'de', ger: 'de', ita: 'it', por: 'pt' }[value.toLowerCase()] || value.toLowerCase().split('-')[0]);
export default function Player({ item, resumeAt = 0, tracks = {}, onProgress, onTracks, onExternal, onClose, compatibilityAvailable = false, onCompatibility, fullscreen, onFullscreenChange, television = false, nextEpisode }: {
  television?: boolean; nextEpisode?: { item: Media; onPress: () => void };
  item: Media; resumeAt?: number; tracks?: TrackPreferences; onProgress: (snapshot: PlaybackSnapshot) => void;
  onTracks: (preferences: TrackPreferences) => void; onExternal: () => void; onClose: () => void; compatibilityAvailable?: boolean; onCompatibility?: () => void; fullscreen?: boolean; onFullscreenChange?: (value: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
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
  const [trackNotice, setTrackNotice] = useState('');
  const persist = useRef(onProgress); persist.current = onProgress;
  const preference = useRef(tracks); preference.current = tracks;
  const lastSnapshot = useRef<PlaybackSnapshot>({ position: resumeAt, duration: 0 });
  const started = useRef(false);
  const lastWrite = useRef(0);
  const session = useRef<{ retry: () => void } | null>(null);
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
          const match = available.find(track => language(track.language || '') === language(preferred));
          if (match) player.audioTrack = match;
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
          const match = available.find(track => language(track.language || '') === language(preferred));
          if (match) { player.subtitleTrack = match; setTrackNotice(''); }
          else setTrackNotice('Your preferred subtitles are not available in this stream. You can choose another available track.');
        }
      } catch { /* No unavailable feature is presented as a supported track. */ }
    }
    const operation = async (advance = true) => {
      if (!active || !source) return;
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
        if (television) setIsPlaying(player.playing);
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
        if (television) setClock({ position: lastSnapshot.current.position, duration: lastSnapshot.current.duration });
        flush();
      }),
      player.addListener('playingChange', event => { if (television && active) setIsPlaying(event.isPlaying); if (!event.isPlaying) flush(true); }),
      player.addListener('playToEnd', () => {
        started.current = true;
        lastSnapshot.current = { ...lastSnapshot.current, ended: true };
        flush(true);
      }),
      player.addListener('availableAudioTracksChange', applyAudio),
      player.addListener('availableSubtitleTracksChange', applySubtitles),
    ];
    const appState = AppState.addEventListener('change', value => { if (value !== 'active') flush(true); });
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
  function chooseAudio(track: AudioTrack) {
    try { player.audioTrack = track; onTracks({ ...preference.current, audio: track.language || undefined }); }
    catch { setTrackNotice('This audio track could not be selected. Try the native player controls.'); }
  }
  function chooseSubtitles(track: SubtitleTrack | null) {
    try { player.subtitleTrack = track; setTrackNotice(''); onTracks({ ...preference.current, subtitles: track ? track.language || undefined : 'off' }); }
    catch { setTrackNotice('This subtitle track could not be selected. Try another available track.'); }
  }
  useEffect(() => {
    if (!television || !showTracks) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setShowTracks(false); return true; });
    return () => subscription.remove();
  }, [television, showTracks]);
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
  if (television) return <View style={{ flex: 1, backgroundColor: '#000' }}>
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}><PlaybackSurface player={player} viewRef={viewRef} television /></View>
    <View style={{ position: 'absolute', top: Math.max(insets.top, 20), left: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to library" onPress={onClose} style={{ backgroundColor: '#090124D9', borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="chevron-back" color="#fff" /><Text style={{ color: '#fff', fontWeight: '600' }}>Back</Text></Pressable>
      <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: '#fff', fontSize: 20, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 }}>{item.name}</Text><Text style={{ color: '#EAE9EE', textShadowColor: '#000', textShadowRadius: 4 }}>{item.group}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Choose another player" onPress={onExternal} style={{ backgroundColor: '#090124D9', padding: 14, borderRadius: 24 }}><Icon name="open-outline" color="#fff" /></Pressable>
    </View>
    {(status === 'loading' || recovering || failed) && <View style={{ position: 'absolute', top: '28%', left: '20%', right: '20%', alignItems: 'center', gap: 14, padding: 24, borderRadius: 24, backgroundColor: '#090124E8' }}>
      {failed ? <><Text style={{ color: '#fff', fontSize: 18 }}>Couldn’t open this video</Text><Text style={{ color: '#EAE9EE', textAlign: 'center' }}>{failureMessage(recovery.kind)}</Text><Button title="Try again" onPress={() => session.current?.retry()} /><Button title="Choose an external player" variant="secondary" onPress={onExternal} /></> : <><ActivityIndicator color={colors.mint} /><Text style={{ color: '#fff' }}>{recovering ? 'Reconnecting…' : 'Opening your video…'}</Text></>}
    </View>}
    {showTracks && <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 20) + 100, right: 24, width: 380, maxWidth: '80%', maxHeight: '55%', backgroundColor: '#211A36', borderRadius: 22, padding: 16, gap: 10 }}>
      <Pressable hasTVPreferredFocus accessibilityRole="button" accessibilityLabel="Close audio and subtitles" onPress={() => setShowTracks(false)} style={{ padding: 10 }}><Text style={{ color: colors.mint, fontWeight: '600' }}>Done · Audio & subtitles</Text></Pressable>
      <ScrollView contentContainerStyle={{ gap: 8 }}><Text style={{ color: '#fff' }}>Remember for this profile</Text>{audio.map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseAudio(track)} style={{ padding: 12 }}><Text style={{ color: '#fff' }}>Audio · {track.label || track.language || 'Track'}</Text></Pressable>)}{!audio.length && <Text style={{ color: '#C4C0CF' }}>No selectable audio tracks reported.</Text>}<Pressable accessibilityRole="button" onPress={() => chooseSubtitles(null)} style={{ padding: 12 }}><Text style={{ color: '#fff' }}>Subtitles · Off</Text></Pressable>{subtitles.map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseSubtitles(track)} style={{ padding: 12 }}><Text style={{ color: '#fff' }}>Subtitles · {track.label || track.language || 'Track'}</Text></Pressable>)}</ScrollView>
    </View>}
    <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 20), left: 24, right: 24, padding: 14, borderRadius: 24, backgroundColor: '#090124E8', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Pressable hasTVPreferredFocus accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'} disabled={failed || advancing} onPress={() => { try { if (isPlaying) player.pause(); else { if (player.duration > 0 && player.currentTime >= player.duration - .5) player.currentTime = 0; player.play(); } } catch { setTrackNotice('Couldn’t change playback. Try again.'); } }} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={isPlaying ? 'pause' : 'play'} size={24} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Rewind 10 seconds" disabled={status !== 'readyToPlay' || clock.duration <= 0 || advancing} onPress={() => seek(-10)} style={{ padding: 12 }}><Icon name="play-back" color="#fff" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Forward 30 seconds" disabled={status !== 'readyToPlay' || clock.duration <= 0 || advancing} onPress={() => seek(30)} style={{ padding: 12 }}><Icon name="play-forward" color="#fff" /></Pressable>
      <View style={{ flex: 1, gap: 4 }}><Text style={{ color: '#fff', fontSize: 13 }}>{timeLabel(clock.position)} / {timeLabel(clock.duration)}</Text>{!!trackNotice && <Text numberOfLines={2} style={{ color: '#FAE7C8', fontSize: 11 }}>{trackNotice}</Text>}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Audio and subtitles" onPress={() => setShowTracks(value => !value)} style={{ padding: 12 }}><Icon name="options-outline" color="#fff" /></Pressable>
      {nextEpisode && <Pressable testID="next-episode" accessibilityRole="button" accessibilityLabel={`Next episode: ${nextEpisode.item.group} · ${nextEpisode.item.name}`} accessibilityState={{ disabled: advancing, busy: advancing }} disabled={advancing} onPress={() => { void advanceEpisode(); }} style={{ maxWidth: '38%', minHeight: 54, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, backgroundColor: colors.mint, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {advancing ? <ActivityIndicator color={colors.text} /> : <Icon name="play-skip-forward" />}
        <View style={{ flexShrink: 1, gap: 3 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{advancing ? 'Opening next…' : 'Next episode'}</Text><Text numberOfLines={1} style={{ color: colors.text, fontSize: 11 }}>{nextEpisode.item.group} · {nextEpisode.item.name}</Text></View>
      </Pressable>}
    </View>
  </View>;
  return <ScrollView style={{ flex: 1, backgroundColor: '#090124' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 17, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
    {item.kind === 'live' && <Text style={{ color: '#C4C0CF', textAlign: 'center', fontSize: 12 }}>{format} · Live TV</Text>}
    <View style={{ display: failed ? 'none' : 'flex' }}><PlaybackSurface player={player} viewRef={viewRef} /></View>
    {(status === 'loading' || recovering) && !failed && <View style={{ alignItems: 'center', gap: 9 }}><ActivityIndicator color="#B9B4F2" /><Text accessibilityLiveRegion="polite" style={{ fontSize: 12, color: '#C4C0CF' }}>{recovering ? `Reconnecting${recovery.attempt ? ` · ${recovery.attempt} of 2` : '…'}` : 'Opening your stream…'}</Text></View>}
    {failed && <View style={{ paddingHorizontal: 24, gap: 14 }}><Text style={[u.h2, { color: '#fff' }]}>Let’s get you watching again</Text><Text style={[u.body, { color: '#C4C0CF' }]}>{failureMessage(recovery.kind)}</Text>{item.kind === 'live' && <Text style={{ fontSize: 12, lineHeight: 19, color: '#C4C0CF' }}>{format === 'MPEG-TS' ? 'MPEG-TS may need VLC. If it also fails there, check your provider’s live access, VPN requirements, or connection limit.' : 'Try a different live format in Settings → Playback, or check this channel with your provider.'}</Text>}{item.kind === 'live' && <Text style={{ color: '#FAE7C8', fontSize: 12, lineHeight: 19 }}>{compatibilityAvailable ? 'This stream may work with the built-in VLC engine.' : 'Expo Go does not include the built-in VLC engine. Install a new NodeCast custom build for in-app VLC playback, or use external VLC.'}</Text>}{item.kind === 'live' && onCompatibility && <Button title="Try built-in VLC" onPress={onCompatibility} />}<Button title="Try again" onPress={() => session.current?.retry()} /><Button title="Choose an external player" variant="secondary" onPress={onExternal} /></View>}
    {!failed && <View style={{ marginHorizontal: 24 }}><Button title="Full screen" variant="secondary" icon="expand-outline" onPress={() => { void viewRef.current?.enterFullscreen().catch(() => setTrackNotice('Could not enter full screen. Try the video’s native fullscreen control.')); }} /></View>}
    {!failed && <Pressable accessibilityRole="button" accessibilityLabel="Audio & subtitles" onPress={() => setShowTracks(value => !value)} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}><Icon name="options-outline" color="#C4C0CF" size={17} /><Text style={{ fontSize: 12, color: '#EAE9EE' }}>Audio & subtitles</Text></Pressable>}
    {showTracks && <ScrollView style={{ maxHeight: 230, marginHorizontal: 20, backgroundColor: '#211A36', borderRadius: 18 }} contentContainerStyle={{ padding: 16, gap: 12 }}><Text style={{ color: '#fff', fontWeight: '600' }}>Remember for this profile</Text><Text style={{ color: '#AAA4B8', fontSize: 11 }}>Choices made here apply to future streams when the matching language is available.</Text><Text style={{ color: '#B9B4F2', fontSize: 12 }}>Audio</Text>{audio.length ? audio.map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseAudio(track)} style={{ paddingVertical: 9 }}><Text style={{ color: '#fff', fontSize: 13 }}>{track.label || track.language || 'Audio track'}</Text></Pressable>) : <Text style={{ color: '#AAA4B8', fontSize: 12 }}>No selectable audio tracks reported.</Text>}<Text style={{ color: '#B9B4F2', fontSize: 12 }}>Subtitles</Text><Pressable accessibilityRole="button" onPress={() => chooseSubtitles(null)} style={{ paddingVertical: 9 }}><Text style={{ color: '#fff', fontSize: 13 }}>Off</Text></Pressable>{subtitles.map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => chooseSubtitles(track)} style={{ paddingVertical: 9 }}><Text style={{ color: '#fff', fontSize: 13 }}>{track.label || track.language || 'Subtitle track'}</Text></Pressable>)}{!!trackNotice && <Text style={{ fontSize: 12, lineHeight: 18, color: '#FAE7C8' }}>{trackNotice}</Text>}</ScrollView>}
    {!failed && <Pressable accessibilityRole="button" accessibilityLabel="Choose another player" onPress={onExternal} style={{ alignSelf: 'center', padding: 10 }}><Text style={{ color: '#B9B4F2', fontSize: 13 }}>Choose another player</Text></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel="Back to library" onPress={onClose} style={{ alignSelf: 'center', padding: 14 }}><Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Back to library</Text></Pressable>
  </ScrollView>;
}
