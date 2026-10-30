import {isPictureInPictureSupported,VideoAirPlayButton} from 'expo-video';
import { AppState } from 'react-native';
import { useSleepTimer } from './PlayerToolsContext';
import { sleepExpired, speeds, sleepMinutes } from './playerTools';
import type { DisplayFit } from './playerTools';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Player from './Player';
import Pressable, {isTVBuild} from './FocusPressable';
import CompatibilityPlayer from './CompatibilityPlayer';
import ChannelPlaybackOptions from './ChannelPlaybackOptions';
import { diagnosticReport } from './viewingPreferences';
import type { ChannelPlayback, PlaybackInfo } from './viewingPreferences';
import { hasCompatibilityPlayer } from './nativePlayback';
import { chooseEngine } from './playbackPolicy';
import type { LiveEngine } from './playbackPolicy';
import { colors, u } from './ui';
import { GlassButton as Button, glass } from './PlaybackGlass';
import { PlaybackChromeProvider, usePlaybackChrome } from './PlaybackChrome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
type Props = React.ComponentProps<typeof Player> & { liveEngine?: LiveEngine; channelOptions?: ChannelPlayback; onSaveOptions?: (value?: ChannelPlayback) => Promise<void>; savedFit?: DisplayFit; onFit?: (fit: DisplayFit) => void; onMinimize?: () => void; minimized?: boolean; onRegisterStop?: (stop: () => Promise<void>) => void };
export default function BuiltInPlayer({ liveEngine = 'auto', channelOptions, onSaveOptions, savedFit = 'contain', onFit, onMinimize, minimized = false, onRegisterStop, ...props }: Props) {
  const [override, setOverride] = useState<LiveEngine | null>(null);
  const [panel, setPanel] = useState<'menu' | 'options' | 'info' | 'tools' | null>(null);
  const [fit, setFit] = useState<DisplayFit>(savedFit);
  const [rate, setRate] = useState(1);
  const sleep = useSleepTimer();
  const pip=useRef<(()=>Promise<void>)|null>(null);
  const [capabilityError,setCapabilityError]=useState('');
  const registerPip=React.useCallback((action:()=>Promise<void>)=>{pip.current=action},[]);
  const stop = useRef<(() => Promise<void>) | null>(null);
  const close = useRef(props.onClose); close.current=props.onClose;
  const stopping = useRef(false);
  const parentRegister=useRef(onRegisterStop);parentRegister.current=onRegisterStop;
  const registerStop = React.useCallback((operation: () => Promise<void>) => { stop.current=operation;parentRegister.current?.(operation); },[]);
  useEffect(() => {
    if (sleep.deadline === null) return;
    const expire = () => { if (!sleepExpired(sleep.deadline) || stopping.current) return; stopping.current=true; sleep.clear(); void (stop.current?.() || Promise.resolve()).finally(() => { close.current(); }); };
    const timer=setTimeout(expire,Math.max(0,sleep.deadline-Date.now()));
    const sub=AppState.addEventListener('change',state=>{if(state==='active')expire()});
    return()=>{clearTimeout(timer);sub.remove()};
  },[sleep.deadline]);
  const [info, setInfo] = useState<PlaybackInfo>({ engine: 'native' });
  const available = hasCompatibilityPlayer();
  // Capture the effective engine at mount: saved options take effect next time, not mid-stream.
  const [initialEngine] = useState(liveEngine);
  const engine = chooseEngine(props.item.kind, override || initialEngine, available);
  useEffect(() => { if (!panel) return; const listener = BackHandler.addEventListener('hardwareBackPress', () => { setPanel(null); return true; }); return () => listener.remove(); }, [panel]);
  let surface: React.ReactNode;
  if (engine === 'vlc') surface = <CompatibilityPlayer item={props.item} tracks={props.tracks} onTracks={props.onTracks} onInfo={setInfo} displayFit={fit} minimized={minimized} registerStop={registerStop} onOptions={() => setPanel('menu')} onProgress={props.onProgress} onClose={props.onClose} onExternal={props.onExternal} fullscreen={props.fullscreen} onFullscreenChange={props.onFullscreenChange || (() => {})} />;
  else if (engine === 'unavailable') surface = <View style={[u.center, { padding: 24, backgroundColor: '#090124' }]}><Text style={[u.h2, { color: '#fff' }]}>This build needs the VLC engine</Text><Text style={[u.body, { color: '#C4C0CF' }]}>Install a NodeCast standalone build, or choose an external player.</Text><Button title="Choose an external player" onPress={props.onExternal} /><Button title="Back to library" onPress={props.onClose} /></View>;
  else surface = <Player {...props} registerPip={registerPip} minimized={minimized} displayFit={fit} playbackRate={rate} registerStop={registerStop} onInfo={setInfo} onOptions={() => setPanel('menu')} compatibilityAvailable={available} onCompatibility={available ? () => setOverride('vlc') : undefined} />;
  return <PlaybackChromeProvider panelOpen={!!panel} onIdle={() => setPanel(null)} playing={info.state === 'playing'} minimized={minimized}>
    <PlaybackOverlay panel={panel} onClose={() => setPanel(null)} television={!!props.television} surface={surface}>
      {panel === 'options' && onSaveOptions ? <ChannelOptions value={channelOptions} onSave={onSaveOptions} /> : panel === 'tools' ? <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={glass.content}>
        <Text style={glass.title}>Make yourself comfortable</Text><Text style={glass.label}>Display</Text>
        {(['contain','cover'] as const).map(value => <Button key={value} title={`${fit===value?'✓ ':''}${value==='contain'?'Fit · show the whole picture':'Fill · crop the edges'}`} onPress={() => { setFit(value); onFit?.(value); }} />)}
        {props.item.kind !== 'live' && <><Text style={glass.label}>Playback speed</Text>{speeds.map(value => <Button key={value} title={`${rate===value?'✓ ':''}${value}× speed`} onPress={() => setRate(value)} />)}</>}
        <Text style={glass.label}>Sleep timer</Text><Text style={glass.text}>Stops in-app playback. Picture in Picture is unavailable while a timer is set.</Text><Text style={glass.text}>{sleep.deadline ? `Stops at ${new Date(sleep.deadline).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Off'}</Text>
        <Button title="Turn sleep timer off" onPress={sleep.clear} />{sleepMinutes.map(value => <Button key={value} title={`Stop after ${value} minutes`} onPress={() => sleep.setTimer(value)} />)}
      </ScrollView> : panel === 'info' ? <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={glass.content}>
        <Text style={glass.title}>Playback information</Text><Text style={glass.text}>Only details reported by this engine are shown. Buffering alone cannot identify a provider or network fault.</Text>
        {props.television ? <Text selectable style={[glass.text, {fontFamily:'monospace'}]}>{diagnosticReport(info)}</Text> : <TextInput accessibilityLabel="Redacted playback report, select text to copy" multiline editable={false} selectTextOnFocus value={diagnosticReport(info)} style={[glass.text, {minHeight:200, padding:12, backgroundColor:'#FFFFFF10', borderRadius:14}]} />}
        <Text style={glass.text}>Excludes your server, stream URL, credentials, public IP and location.</Text>
      </ScrollView> : <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={glass.content}>
        <Text style={glass.title}>Player options</Text>
        {engine==='native' && !props.television && Platform.OS!=='web' && sleep.deadline===null && isPictureInPictureSupported() && <Button title="Picture in Picture" onPress={() => { void pip.current?.().then(() => setPanel(null)).catch(() => setCapabilityError('Picture in Picture is unavailable for this video or device.')); }} />}
        {engine==='native' && Platform.OS==='ios' && <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}><Text style={glass.text}>AirPlay</Text><VideoAirPlayButton tint="#B9B4F2" style={{width:48,height:48}} /></View>}
        {!!capabilityError && <Text style={glass.text}>{capabilityError}</Text>}
        <Button title="Display, speed & sleep timer" onPress={() => setPanel('tools')} />
        {onMinimize && <Button title="Watch while browsing" onPress={() => { setPanel(null); onMinimize(); }} />}
        {props.item.kind==='live' && onSaveOptions && <Button title="Playback options for this channel" onPress={() => setPanel('options')} />}
        <Button title="Playback information" onPress={() => setPanel('info')} />
      </ScrollView>}
    </PlaybackOverlay>
  </PlaybackChromeProvider>;
}
function ChannelOptions(props: React.ComponentProps<typeof ChannelPlaybackOptions>) {
  const chrome = usePlaybackChrome();
  const editing = React.useCallback((active: boolean) => chrome.hold('channel-edit', active), [chrome.hold]);
  return <ChannelPlaybackOptions {...props} overlay onEditing={editing} />;
}
function PlaybackOverlay({ panel, onClose, surface, children, television }: { panel: string | null; onClose: () => void; surface: React.ReactNode; children: React.ReactNode; television: boolean }) {
  const chrome = usePlaybackChrome();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const landscape = width > height;
  return <View style={{flex:1}} onTouchStart={() => chrome.hold('touch', true)} onTouchEnd={() => chrome.hold('touch', false)} onTouchCancel={() => chrome.hold('touch', false)}>
    <View collapsable={false} style={{flex:1}} pointerEvents={panel?'none':'auto'} accessibilityElementsHidden={!!panel} importantForAccessibility={panel?'no-hide-descendants':'auto'}>{surface}</View>
    {!!panel && <Pressable accessible={false} focusable={false} onPress={() => { onClose(); chrome.show(); }} style={{position:'absolute',top:0,bottom:0,left:0,right:0}} />}
    {!!panel && <View nativeID={`tv-trap:player-panel:${panel}`} accessibilityViewIsModal style={[glass.panel, {position:'absolute', top:Math.max(insets.top, 12), right:Math.max(insets.right, 12), width:television ? '42%' : landscape ? Math.min(360, width * .48) : Math.min(360, width - 24), maxHeight:landscape ? height - Math.max(insets.top,12) - Math.max(insets.bottom,12) : height * .64}]}>
      <View style={{padding:12, borderBottomWidth:1, borderBottomColor:'#FFFFFF20'}}><Button nativeID="tv-preferred:close-player-settings" title="Back to video" onPress={() => { onClose(); chrome.show(); }} /></View>
      {children}
    </View>}
  </View>;
}
