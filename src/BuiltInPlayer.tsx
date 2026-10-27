import React, { useEffect, useState } from 'react';
import { BackHandler, ScrollView, Text, TextInput, View } from 'react-native';
import Player from './Player';
import CompatibilityPlayer from './CompatibilityPlayer';
import ChannelPlaybackOptions from './ChannelPlaybackOptions';
import { diagnosticReport } from './viewingPreferences';
import type { ChannelPlayback, PlaybackInfo } from './viewingPreferences';
import { hasCompatibilityPlayer } from './nativePlayback';
import { chooseEngine } from './playbackPolicy';
import type { LiveEngine } from './playbackPolicy';
import { Button, u } from './ui';
type Props = React.ComponentProps<typeof Player> & { liveEngine?: LiveEngine; channelOptions?: ChannelPlayback; onSaveOptions?: (value?: ChannelPlayback) => Promise<void> };
export default function BuiltInPlayer({ liveEngine = 'auto', channelOptions, onSaveOptions, ...props }: Props) {
  const [override, setOverride] = useState<LiveEngine | null>(null);
  const [panel, setPanel] = useState<'menu' | 'options' | 'info' | null>(null);
  const [info, setInfo] = useState<PlaybackInfo>({ engine: 'native' });
  const available = hasCompatibilityPlayer();
  // Capture the effective engine at mount: saved options take effect next time, not mid-stream.
  const [initialEngine] = useState(liveEngine);
  const engine = chooseEngine(props.item.kind, override || initialEngine, available);
  useEffect(() => { if (!panel) return; const listener = BackHandler.addEventListener('hardwareBackPress', () => { setPanel(null); return true; }); return () => listener.remove(); }, [panel]);
  let surface: React.ReactNode;
  if (engine === 'vlc') surface = <CompatibilityPlayer item={props.item} tracks={props.tracks} onTracks={props.onTracks} onInfo={setInfo} onOptions={() => setPanel('menu')} onProgress={props.onProgress} onClose={props.onClose} onExternal={props.onExternal} fullscreen={props.fullscreen} onFullscreenChange={props.onFullscreenChange || (() => {})} />;
  else if (engine === 'unavailable') surface = <View style={[u.center, { padding: 24, backgroundColor: '#090124' }]}><Text style={[u.h2, { color: '#fff' }]}>This build needs the VLC engine</Text><Text style={[u.body, { color: '#C4C0CF' }]}>Install a NodeCast standalone build, or choose an external player.</Text><Button title="Choose an external player" onPress={props.onExternal} /><Button title="Back to library" variant="secondary" onPress={props.onClose} /></View>;
  else surface = <Player {...props} onInfo={setInfo} onOptions={() => setPanel('menu')} compatibilityAvailable={available} onCompatibility={available ? () => setOverride('vlc') : undefined} />;
  return <View style={{ flex: 1 }}><View style={{ flex: 1 }} pointerEvents={panel ? 'none' : 'auto'} accessibilityElementsHidden={!!panel} importantForAccessibility={panel ? 'no-hide-descendants' : 'auto'}>{surface}</View>{panel && <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#F7F6FA', paddingTop: 24 }}><View style={{ paddingHorizontal: 20, paddingBottom: 14 }}><Button title="Back to video" variant="secondary" onPress={() => setPanel(null)} /></View>{panel === 'options' && onSaveOptions ? <ChannelPlaybackOptions value={channelOptions} onSave={onSaveOptions} /> : panel === 'info' ? <ScrollView contentContainerStyle={u.content}><Text style={u.h2}>Playback information</Text><Text style={u.body}>Only details reported by this engine are shown. Buffering alone cannot identify a provider or network fault.</Text><TextInput accessibilityLabel="Redacted playback report, select text to copy" multiline editable={false} selectTextOnFocus value={diagnosticReport(info)} style={{ minHeight: 200, padding: 16, borderRadius: 16, backgroundColor: '#fff', color: '#090124', fontSize: 15 }} /><Text style={u.small}>Select the report text to copy. It excludes your server, stream URL, credentials, public IP and location.</Text></ScrollView> : <ScrollView contentContainerStyle={u.content}><Text style={u.h2}>Player options</Text>{props.item.kind === 'live' && onSaveOptions && <Button title="Playback options for this channel" variant="secondary" onPress={() => setPanel('options')} />}<Button title="Playback information" variant="secondary" onPress={() => setPanel('info')} /></ScrollView>}</View>}</View>;
}
