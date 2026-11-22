import {tvSafe} from './designTokens';
import {H2,H1} from './ui';
import { Text } from './Typography';
import {isPictureInPictureSupported,VideoAirPlayButton} from 'expo-video';
import { AppState } from 'react-native';
import { useSleepTimer } from './PlayerToolsContext';
import { sleepExpired, speeds, sleepMinutes } from './playerTools';
import type { DisplayFit } from './playerTools';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Player from './Player';
import Pressable, {isTVBuild} from './FocusPressable';
import CompatibilityPlayer from './CompatibilityPlayer';
import ChannelPlaybackOptions from './ChannelPlaybackOptions';
import { diagnosticReport } from './viewingPreferences';
import type { ChannelPlayback, PlaybackInfo } from './viewingPreferences';
import { hasCompatibilityPlayer } from './nativePlayback';
import { chooseEngine } from './playbackPolicy';
import type { LiveEngine } from './playbackPolicy';
import { Button as ActionButton, Icon, LiveDot, colors, u } from './ui';
import { GlassButton as Button, glass } from './PlaybackGlass';
import { PlaybackChromeProvider, usePlaybackChrome } from './PlaybackChrome';
import NextEpisodeCountdown from './NextEpisodeCountdown';
import { features } from './featureFlags';
import type { Media } from './provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
type Props = React.ComponentProps<typeof Player> & { liveEngine?: LiveEngine; channelOptions?: ChannelPlayback; onSaveOptions?: (value?: ChannelPlayback) => Promise<void>; savedFit?: DisplayFit; onFit?: (fit: DisplayFit) => void; onMinimize?: () => void; minimized?: boolean; onRegisterStop?: (stop: () => Promise<void>) => void; /** Off by default. Shows a cancellable countdown when an episode ends. */ autoplayNext?: boolean; /** Recently watched live channels, most recent first (already filtered for access). */ recentChannels?: Media[]; onChannel?: (item: Media) => void };
export default function BuiltInPlayer({ liveEngine = 'auto', channelOptions, onSaveOptions, savedFit = 'contain', onFit, onMinimize, minimized = false, onRegisterStop, autoplayNext = false, recentChannels = [], onChannel, ...props }: Props) {
  const [reload, setReload] = useState(0);
  // Return to live: release the current connection through the controlled stop, then reopen the same source. No local timeshift.
  const returnToLive = () => { setPanel(null); void (stop.current?.() || Promise.resolve()).catch(() => {}).finally(() => setReload(value => value + 1)); };
  const [countdown, setCountdown] = useState(false);
  const onProgress = (snapshot: Parameters<Props['onProgress']>[0]) => { props.onProgress(snapshot); if (snapshot.ended && autoplayNext && props.nextEpisode && !minimized) setCountdown(true); };
  const viewport = useWindowDimensions();
  const portraitDetails = !props.television && !minimized && !props.fullscreen && viewport.height > viewport.width;
  // iPad and large landscape screens: video and its details side by side, like a theatre.
  const theatre = !props.television && !minimized && !props.fullscreen && viewport.width > viewport.height && viewport.width >= 1000;
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
  if (engine === 'vlc') surface = <CompatibilityPlayer key={`vlc:${reload}`} item={props.item} tracks={props.tracks} onTracks={props.onTracks} onInfo={setInfo} displayFit={fit} minimized={minimized} registerStop={registerStop} onOptions={() => setPanel('menu')} onProgress={onProgress} onClose={props.onClose} onExternal={props.onExternal} fullscreen={props.fullscreen} onFullscreenChange={props.onFullscreenChange || (() => {})} />;
  else if (engine === 'unavailable') surface = <View style={[u.center, { padding: 24, backgroundColor: colors.featured }]}><H2 style={[u.h2, { color: colors.onVideo }]}>This build needs the VLC engine</H2><Text style={[u.body, { color: colors.videoMuted }]}>Install a GlowTV standalone build, or choose an external player.</Text><Button title="Choose an external player" onPress={props.onExternal} /><Button title="Back to library" onPress={props.onClose} /></View>;
  else surface = <Player key={`native:${reload}`} {...props} onProgress={onProgress} registerPip={registerPip} minimized={minimized} displayFit={fit} playbackRate={rate} registerStop={registerStop} onInfo={setInfo} onOptions={() => setPanel('menu')} compatibilityAvailable={available} onCompatibility={available ? () => setOverride('vlc') : undefined} />;
  return <PlaybackChromeProvider panelOpen={!!panel} onIdle={() => setPanel(null)} playing={info.state === 'playing'} minimized={minimized}>
    <PlaybackOverlay panel={panel} onClose={() => setPanel(null)} television={!!props.television} surface={<View style={{flex:1,backgroundColor:colors.bg,flexDirection:theatre?'row':'column'}}><View style={theatre?{flex:1,justifyContent:'center',backgroundColor:colors.videoBlack}:portraitDetails?{height:Math.max(props.item.kind==='live'?(viewport.fontScale>1.3?320:240):props.nextEpisode?(viewport.fontScale>1.3?560:384):(viewport.fontScale>1.3?400:320),viewport.width*9/16)}:{flex:1}}><View style={theatre?{width:'100%',aspectRatio:16/9}:{flex:1}}>{surface}</View></View>{(portraitDetails||theatre)&&<ScrollView style={theatre?{width:360,flexGrow:0,borderLeftWidth:1,borderLeftColor:colors.line}:undefined} contentContainerStyle={{padding:24,gap:24,paddingBottom:32,width:'100%',maxWidth:720,alignSelf:'center'}}>
        <View style={{gap:8}}><View style={[u.row,{gap:8}]}>{props.item.kind==='live'&&<LiveDot/>}<Text numberOfLines={1} style={[u.small,{flex:1}]}>{props.item.kind==='live'?`Live · ${props.item.group}`:props.item.group}</Text></View><Text accessibilityRole="header" numberOfLines={3} style={u.display}>{props.item.name}</Text>{!!props.item.description&&<Text style={u.body}>{props.item.description}</Text>}</View>
        {props.nextEpisode&&<ActionButton title={`Next episode · ${props.nextEpisode!.item.name}`} icon="play-skip-forward" onPress={props.nextEpisode!.onPress}/>}
        {features.playbackAssist&&props.item.kind==='live'&&onChannel&&recentChannels[0]&&<ActionButton title={`Previous channel · ${recentChannels[0].name}`} icon="play-back" variant="secondary" onPress={()=>onChannel(recentChannels[0])}/>}
        <View style={{borderRadius:16,backgroundColor:colors.panel,overflow:'hidden'}}>{([{title:'Player options',icon:'options-outline',panel:'menu',value:''},{title:'Display & speed',icon:'expand-outline',panel:'tools',value:fit==='contain'?'Fit':'Fill'},{title:'Sleep timer',icon:'time-outline',panel:'tools',value:sleep.deadline?new Date(sleep.deadline).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'Off'},{title:'Playback info',icon:'information-circle-outline',panel:'info',value:''}] as const).map((tool,index)=><Pressable key={tool.title} accessibilityRole="button" accessibilityLabel={tool.value?`${tool.title}, ${tool.value}`:tool.title} onPress={()=>setPanel(tool.panel)} style={{minHeight:56,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:16,borderTopWidth:index?1:0,borderTopColor:colors.line}}><Icon name={tool.icon} color={colors.link} size={20}/><Text style={[u.label,{flex:1,fontWeight:'500'}]}>{tool.title}</Text>{!!tool.value&&<Text style={u.small}>{tool.value}</Text>}<Icon name="chevron-forward" size={16} color={colors.secondary}/></Pressable>)}
        {engine==='native'&&Platform.OS==='ios'&&<View style={{minHeight:56,paddingLeft:16,paddingRight:8,flexDirection:'row',alignItems:'center',gap:16,borderTopWidth:1,borderTopColor:colors.line}}><Icon name="tv-outline" color={colors.link} size={20}/><Text style={[u.label,{flex:1,fontWeight:'500'}]}>AirPlay</Text><VideoAirPlayButton tint={colors.link} style={{width:48,height:48}}/></View>}
        {engine==='native'&&Platform.OS!=='web'&&sleep.deadline===null&&isPictureInPictureSupported()&&<Pressable accessibilityRole="button" accessibilityLabel="Picture in Picture" onPress={()=>{void pip.current?.().catch(()=>setCapabilityError('Picture in Picture is unavailable for this video or device.'))}} style={{minHeight:56,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:16,borderTopWidth:1,borderTopColor:colors.line}}><Icon name="contract-outline" color={colors.link} size={20}/><Text style={[u.label,{flex:1,fontWeight:'500'}]}>Picture in Picture</Text></Pressable>}</View>
        {!!capabilityError&&<Text style={u.errorText}>{capabilityError}</Text>}
      </ScrollView>}</View>}>
      {panel === 'options' && onSaveOptions ? <ChannelOptions value={channelOptions} onSave={onSaveOptions} /> : panel === 'tools' ? <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={glass.content}>
        <Text style={glass.title}>Make yourself comfortable</Text><Text style={glass.label}>Display</Text>
        {(['contain','cover'] as const).map(value => <Button key={value} title={value==='contain'?'Fit · show the whole picture':'Fill · crop the edges'} icon={fit===value?'checkmark':undefined} onPress={() => { setFit(value); onFit?.(value); }} />)}
        {props.item.kind !== 'live' && <><Text style={glass.label}>Playback speed</Text>{speeds.map(value => <Button key={value} title={`${value}× speed`} icon={rate===value?'checkmark':undefined} onPress={() => setRate(value)} />)}</>}
        <Text style={glass.label}>Sleep timer</Text><Text style={glass.text}>Stops in-app playback. Picture in Picture is unavailable while a timer is set.</Text><Text style={glass.text}>{sleep.deadline ? `Stops at ${new Date(sleep.deadline).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Off'}</Text>
        <Button title="Turn sleep timer off" disabled={sleep.deadline===null} onPress={sleep.clear} />{sleepMinutes.map(value => <Button key={value} title={`Stop after ${value} minutes`} onPress={() => sleep.setTimer(value)} />)}
      </ScrollView> : panel === 'info' ? <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={glass.content}>
        <Text style={glass.title}>Playback information</Text><Text style={glass.text}>Only details reported by this engine are shown. Buffering alone cannot identify a provider or network fault.</Text>
        {props.television ? <Text selectable style={[glass.text, {fontFamily:'monospace'}]}>{diagnosticReport(info)}</Text> : <TextInput accessibilityLabel="Redacted playback report, select text to copy" multiline editable={false} selectTextOnFocus value={diagnosticReport(info)} style={[glass.text, {fontSize:16,minHeight:200, padding:16, backgroundColor:colors.videoChip, borderRadius:14}]} />}
        <Text style={glass.text}>Excludes your server, stream URL, credentials, public IP and location.</Text>
      </ScrollView> : <ScrollView style={{flexGrow:0,flexShrink:1}} contentContainerStyle={glass.content}>
        <Text style={glass.title}>Player options</Text>
        {engine==='native' && !props.television && Platform.OS!=='web' && sleep.deadline===null && isPictureInPictureSupported() && <Button title="Picture in Picture" onPress={() => { void pip.current?.().then(() => setPanel(null)).catch(() => setCapabilityError('Picture in Picture is unavailable for this video or device.')); }} />}
        {engine==='native' && Platform.OS==='ios' && <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}><Text style={glass.text}>AirPlay</Text><VideoAirPlayButton tint={colors.primary} style={{width:48,height:48}} /></View>}
        {!!capabilityError && <Text style={glass.text}>{capabilityError}</Text>}
        {features.playbackAssist && props.item.kind === 'live' && <Button nativeID="tv-preferred:return-to-live" title="Return to live" onPress={returnToLive} />}
        {features.playbackAssist && props.item.kind === 'live' && onChannel && recentChannels.length > 0 && <><Text style={glass.label}>Recent channels</Text>{recentChannels.slice(0, 5).map((channel, index) => <Button key={channel.id} title={index === 0 ? `Previous: ${channel.name}` : channel.name} onPress={() => { setPanel(null); onChannel(channel); }} />)}</>}
        <Button title="Display, speed & sleep timer" onPress={() => setPanel('tools')} />
        {onMinimize && <Button title="Watch while browsing" onPress={() => { setPanel(null); onMinimize(); }} />}
        {props.item.kind==='live' && onSaveOptions && <Button title="Playback options for this channel" onPress={() => setPanel('options')} />}
        <Button title="Playback information" onPress={() => setPanel('info')} />
      </ScrollView>}
    </PlaybackOverlay>
    {countdown && props.nextEpisode && !minimized && <NextEpisodeCountdown key={props.item.id} title={props.nextEpisode.item.name} onPlay={() => { setCountdown(false); props.nextEpisode?.onPress(); }} onCancel={() => setCountdown(false)} />}
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
    {!!panel && <Pressable noFeedback accessible={false} focusable={false} onPress={() => { onClose(); chrome.show(); }} style={{position:'absolute',top:0,bottom:0,left:0,right:0}} />}
    {!!panel && <View nativeID={`tv-trap:player-panel:${panel}`} accessibilityViewIsModal style={[glass.panel, {position:'absolute', top:Math.max(insets.top, television?tvSafe.v:16), right:Math.max(insets.right, television?tvSafe.h:16), width:television ? '42%' : landscape ? Math.min(360, width * .48) : Math.min(360, width - 32), maxHeight:landscape ? height - Math.max(insets.top, television?tvSafe.v:16) - Math.max(insets.bottom, television?tvSafe.v:16) : height * .64}]}>
      <View style={{padding:16, borderBottomWidth:1, borderBottomColor:colors.videoDivider}}><Button nativeID="tv-preferred:close-player-settings" title={television?'Back':'Back to video'} accessibilityLabel="Back to video" icon={television?'chevron-back':undefined} onPress={() => { onClose(); chrome.show(); }} /></View>
      {children}
    </View>}
  </View>;
}
