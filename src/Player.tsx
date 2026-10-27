import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { AudioTrack, SubtitleTrack, VideoPlayer } from 'expo-video';
import type { Media } from './provider';
import type { PlaybackSnapshot } from './activity';
import { classifyFailure, failureMessage, RecoveryCoordinator } from './recovery';
import type { RecoveryState } from './recovery';
import { playbackURLs, streamFormat } from './livePlayback';
import { Button, Icon, colors, u } from './ui';
// Keep the native/video surface stable while status/format controls rerender.
// On web, rerendering a changed src during replaceAsync can cancel the play request.
const PlaybackSurface = memo(function PlaybackSurface({ player, viewRef }: { player: VideoPlayer; viewRef: React.RefObject<VideoView | null> }) {
  return <VideoView ref={viewRef} player={player} style={{ width: '100%', aspectRatio: 16 / 9 }} nativeControls contentFit="contain" fullscreenOptions={{ enable: true, orientation: 'landscape' }} />;
});
export type TrackPreferences = { audio?: string; subtitles?: string };
const language = (value: string) => ({ eng: 'en', fra: 'fr', fre: 'fr', spa: 'es', deu: 'de', ger: 'de', ita: 'it', por: 'pt' }[value.toLowerCase()] || value.toLowerCase().split('-')[0]);
export default function Player({ item, resumeAt = 0, tracks = {}, onProgress, onTracks, onExternal, onClose, compatibilityAvailable = false, onCompatibility, fullscreen, onFullscreenChange }: {
  item: Media; resumeAt?: number; tracks?: TrackPreferences; onProgress: (snapshot: PlaybackSnapshot) => void;
  onTracks: (preferences: TrackPreferences) => void; onExternal: () => void; onClose: () => void; compatibilityAvailable?: boolean; onCompatibility?: () => void; fullscreen?: boolean; onFullscreenChange?: (value: boolean) => void;
}) {
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
      if (!active) return;
      setStatus(value); clearLoadTimer();
      if (value === 'readyToPlay') {
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
        if (!active || needsSeek.current) return;
        if (player.status === 'readyToPlay' && player.playing) started.current = true;
        lastSnapshot.current = { position: item.kind === 'live' ? 0 : event.currentTime, duration: Number.isFinite(player.duration) ? player.duration : 0 };
        flush();
      }),
      player.addListener('playingChange', event => { if (!event.isPlaying) flush(true); }),
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
  }, [player, source, item.kind, candidates]);
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
