import Pressable, { isTVBuild } from './FocusPressable';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, useWindowDimensions, View } from 'react-native';
import type { LibVlcPlayerViewRef, MediaTracks, Tracks } from 'expo-libvlc-player';
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
export default function CompatibilityPlayer({ item, onProgress, onClose, onExternal, fullscreen = false, onFullscreenChange }: {
  item: Media; onProgress: (snapshot: PlaybackSnapshot) => void; onClose: () => void; onExternal: () => void; fullscreen?: boolean; onFullscreenChange: (value: boolean) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orientation = usePlayerOrientation(onFullscreenChange);
  const [controls, setControls] = useState(true);
  const mediaOptions = useMemo(() => compatibilityOptions(item), [item.headers]);
  const NativeView = useMemo(nativeView, []);
  const urls = useMemo(() => compatibilityURLs(item), [item.url, item.externalURL, item.playbackURLs]);
  const player = useRef<LibVlcPlayerViewRef | null>(null);
  const lastNative = useRef<LibVlcPlayerViewRef | null>(null);
  const [generation, setGeneration] = useState(0);
  const [source, setSource] = useState<string | null>(urls[0] || null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'paused'>('loading');
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  const [availableTracks, setAvailableTracks] = useState<MediaTracks>({ audio: [], video: [], subtitle: [] });
  const [tracks, setTracks] = useState<Tracks>({});
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
  useEffect(() => {
    if (isTVBuild || !fullscreen || !controls || status !== 'playing' || failed) return;
    const timer = setTimeout(() => setControls(false), 4000); return () => clearTimeout(timer);
  }, [fullscreen, controls, status, failed]);
  return <LivePlayerLayout fullscreen={fullscreen} video={<NativeView key={generation} ref={instance => { player.current = instance; if (instance) lastNative.current = instance; }} source={source} options={mediaOptions} autoplay contentFit="contain" style={{ width: '100%', height: '100%' }} tracks={tracks}
      onPlaying={onPlaying} onPaused={() => { if (alive.current) { setStatus('paused'); save(true); } }}
      onEncounteredError={event => onError(event.message)} onTimeChanged={() => save()}
      onESAdded={event => { if (alive.current) setAvailableTracks(event); }}
      onDialogDisplay={() => { void player.current?.dismiss().catch(() => {}); onError('Provider requires additional authorization'); }}
    />} overlay={fullscreen && <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={controls ? 'Hide player controls' : 'Show player controls'} focusable={!isTVBuild} onPress={() => setControls(value => !value)} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
    {(controls || failed || status !== 'playing') && <><View style={{ position: 'absolute', top: Math.max(insets.top, 12), left: Math.max(insets.left, 16), right: Math.max(insets.right, 16), flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel="Exit full screen" onPress={() => { setControls(true); orientation.exit(); }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#090124CC', flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="contract-outline" color="#fff" size={20} /><Text style={{ color: '#fff', fontWeight: '600' }}>Exit</Text></Pressable><Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontWeight: '600', fontSize: 14, textShadowColor: '#000', textShadowRadius: 3 }}>{item.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Rotate screen" onPress={() => { setControls(true); orientation.rotate(width <= height); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#090124CC', alignItems: 'center', justifyContent: 'center' }}><Icon name="phone-landscape-outline" color="#fff" /></Pressable></View>
    <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 16), left: Math.max(insets.left, 16), right: Math.max(insets.right, 16), alignItems: 'center', gap: 12 }}>{failed ? <><Text style={{ color: '#fff', textAlign: 'center' }}>Couldn’t open this channel.</Text><Button title="Try again" onPress={retry} /></> : status === 'loading' || reconnecting ? <ActivityIndicator color={colors.mint} /> : <Pressable accessibilityRole="button" accessibilityLabel={status === 'playing' ? 'Pause live TV' : 'Play live TV'} onPress={() => { setControls(true); void toggle(); }} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#090124CC', alignItems: 'center', justifyContent: 'center' }}><Icon name={status === 'playing' ? 'pause' : 'play'} size={26} color="#fff" /></Pressable>}{!!orientation.notice && <Text style={{ color: '#fff', fontSize: 12, backgroundColor: '#090124CC', padding: 6 }}>{orientation.notice}</Text>}</View></>}
  </View>}>
    {!fullscreen && <Text style={{ color: '#C4C0CF', textAlign: 'center', fontSize: 12 }}>Built-in VLC · Live TV</Text>}
    {!fullscreen && (status === 'loading' || reconnecting) && !failed && <View style={{ alignItems: 'center', gap: 10 }}><ActivityIndicator color={colors.mint} /><Text style={{ color: '#C4C0CF', fontSize: 13 }}>{reconnecting ? `Reconnecting · ${recovery.attempt} of 2` : 'Opening live TV…'}</Text></View>}
    {!fullscreen && (failed ? <View style={{ paddingHorizontal: 24, gap: 16 }}><Text style={[u.h2, { color: '#fff' }]}>Couldn’t open this channel</Text><Text style={[u.body, { color: '#C4C0CF' }]}>{failureMessage(recovery.kind)}</Text><Button title="Try again" onPress={retry} /><Button title="Choose an external player" variant="secondary" onPress={onExternal} /></View> : <View style={{ paddingHorizontal: 24, gap: 12 }}><Button title={status === 'playing' ? 'Pause live TV' : status === 'paused' ? 'Play live TV' : 'Stop loading'} onPress={status === 'loading' ? onClose : () => { void toggle(); }} /><Button title="Audio & subtitles" variant="secondary" onPress={() => setShowTracks(value => !value)} /><Button title="Full screen" variant="secondary" onPress={() => { setControls(true); orientation.enter(); }} icon="expand-outline" />{!!orientation.notice && <Text style={{ color: '#C4C0CF', fontSize: 12 }}>{orientation.notice}</Text>}</View>)}
    {!fullscreen && showTracks && !failed && <View style={{ marginHorizontal: 20, padding: 18, borderRadius: 20, gap: 12, backgroundColor: '#211A36' }}><Text style={{ color: '#C4C0CF', fontSize: 12 }}>For this live stream. Language preferences from the native player do not apply here.</Text><Text style={{ color: colors.mint }}>Audio</Text>{availableTracks.audio.length ? availableTracks.audio.map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => setTracks(value => ({ ...value, audio: track.id }))} style={{ paddingVertical: 10 }}><Text style={{ color: '#fff' }}>{track.name}{tracks.audio === track.id ? ' ✓' : ''}</Text></Pressable>) : <Text style={{ color: '#C4C0CF' }}>No selectable audio tracks reported.</Text>}<Text style={{ color: colors.mint }}>Subtitles</Text>{[{ id: -1, name: 'Off' }, ...availableTracks.subtitle.filter(track => track.id !== -1)].map(track => <Pressable accessibilityRole="button" key={track.id} onPress={() => setTracks(value => ({ ...value, subtitle: track.id }))} style={{ paddingVertical: 10 }}><Text style={{ color: '#fff' }}>{track.name}{tracks.subtitle === track.id ? ' ✓' : ''}</Text></Pressable>)}</View>}
    {!fullscreen && !failed && <Pressable accessibilityRole="button" onPress={onExternal} style={{ alignSelf: 'center', padding: 12 }}><Text style={{ color: colors.mint }}>Choose another player</Text></Pressable>}
    {!fullscreen && <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: 'center', padding: 14 }}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Back to library</Text></Pressable>}
  </LivePlayerLayout>;
}
