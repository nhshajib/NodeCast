import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,ActivityIndicator,Animated,Image,Platform,StatusBar,StyleSheet,View,useWindowDimensions} from 'react-native';
import {VideoView,useVideoPlayer} from 'expo-video';
import * as NativeSplash from 'expo-splash-screen';
import {isTVBuild} from './FocusPressable';
import {colors} from './theme';
import {Text} from './Typography';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const duration=4000;
const portraitVideo=require('../assets/launch/glowtv-launch-portrait.mp4');
const landscapeVideo=require('../assets/launch/glowtv-launch-landscape.mp4');
const portraitStill=require('../assets/launch/glowtv-launch-portrait-still.png');
const landscapeStill=require('../assets/launch/glowtv-launch-landscape-still.png');
const portraitFirst=require('../assets/launch/glowtv-launch-portrait-first.png');
const landscapeFirst=require('../assets/launch/glowtv-launch-landscape-first.png');

/** Owns only the bundled launch clip, never the IPTV playback instance. */
function LaunchVideo({source,active,onFrame,onDone,onError}:{source:number;active:boolean;onFrame:()=>void;onDone:()=>void;onError:()=>void}) {
 const callbacks=useRef({onFrame,onDone,onError});callbacks.current={onFrame,onDone,onError};
 const player=useVideoPlayer(source,instance=>{instance.loop=false;instance.muted=true;instance.audioMixingMode='mixWithOthers';instance.showNowPlayingNotification=false;});
 useEffect(()=>{
  const start=()=>{if(active)try{player.play()}catch{callbacks.current.onError()}};
  const status=player.addListener('statusChange',event=>{if(event.status==='error')callbacks.current.onError();else if(event.status==='readyToPlay')start()});
  const ended=player.addListener('playToEnd',()=>callbacks.current.onDone());
  if(player.status==='readyToPlay')start();
  return()=>{status.remove();ended.remove()};
 },[player,active]);
 return <View pointerEvents="none" style={StyleSheet.absoluteFill}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} fullscreenOptions={{enable:false}} allowsPictureInPicture={false} onFirstFrameRender={()=>callbacks.current.onFrame()}/></View>;
}
class LaunchBoundary extends React.Component<{onError:()=>void;children:React.ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(){this.props.onError()}
 render(){return this.state.failed?null:this.props.children}
}

/** Static OS launch → decoded local clip → app. Reduced motion uses its final still. */
export default function StartupSplash({ready,onFinish,nativeHandoff=true}:{ready:boolean;onFinish:()=>void;nativeHandoff?:boolean}) {
 const {width,height}=useWindowDimensions();const insets=useSafeAreaInsets();
 // Rotating during these four seconds must not restart the clip.
 const [landscape]=useState(()=>isTVBuild||width>height);
 const [reduced,setReduced]=useState<boolean|null>(null);
 const [layoutReady,setLayoutReady]=useState(false);const [posterReady,setPosterReady]=useState(false);
 const [frameReady,setFrameReady]=useState(false);const [failed,setFailed]=useState(false);const [videoEnded,setVideoEnded]=useState(false);
 const [laidOut,setLaidOut]=useState(false);const [introDone,setIntroDone]=useState(false);const [expired,setExpired]=useState(false);
 const opacity=useRef(new Animated.Value(1)).current;const finish=useRef(onFinish);finish.current=onFinish;
 const finished=useRef(false);
 const onFrame=useCallback(()=>setFrameReady(true),[]);const onError=useCallback(()=>setFailed(true),[]);const onDone=useCallback(()=>setVideoEnded(true),[]);
 useEffect(()=>{
  let alive=true;
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)setReduced(value)}).catch(()=>{if(alive)setReduced(true)});
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
  const barrier=setTimeout(()=>{setPosterReady(true);setReduced(current=>current??true)},1500);
  return()=>{alive=false;listener.remove();clearTimeout(barrier)};
 },[]);
 useEffect(()=>{
  if(!laidOut||reduced!==false||frameReady||failed)return;
  const timeout=setTimeout(()=>setFailed(true),1800);
  return()=>clearTimeout(timeout);
 },[laidOut,reduced,frameReady,failed]);
 // Release the OS layer as soon as our own safe artwork exists. Never play
 // the beginning of the owner's film invisibly behind an OS logo.
 const canHandoff=layoutReady&&posterReady&&reduced!==null;
 useEffect(()=>{
  if(!canHandoff)return;
  let alive=true;
  void (async()=>{if(nativeHandoff){try{await NativeSplash.hideAsync()}catch{/* Already released in a browser/preview. */}}if(alive)setLaidOut(true)})();
  return()=>{alive=false};
 },[canHandoff,nativeHandoff]);
 useEffect(()=>{
  if(!laidOut)return;
  const timer=setTimeout(()=>setIntroDone(true),reduced?400:duration);
  // Local storage recovery has its own loading/error UI under this layer.
  const watchdog=setTimeout(()=>setExpired(true),8000);
  return()=>{clearTimeout(timer);clearTimeout(watchdog)};
 },[laidOut,reduced]);
 useEffect(()=>{
  if(!laidOut||!introDone||(!ready&&!expired)||finished.current)return;
  const complete=()=>{if(!finished.current){finished.current=true;finish.current()}};
  const animation=Animated.timing(opacity,{toValue:0,duration:reduced?0:180,useNativeDriver:Platform.OS!=='web'});
  const watchdog=setTimeout(complete,500);
  animation.start(({finished:done})=>{if(done)complete()});
  return()=>{clearTimeout(watchdog);animation.stop()};
 },[laidOut,introDone,ready,expired,reduced,opacity]);
 return <Animated.View testID="startup-splash" accessibilityViewIsModal accessibilityLabel="GlowTV is starting" onLayout={()=>setLayoutReady(true)} style={[s.root,{opacity}]}>
  <StatusBar hidden/>
  <Image accessible={false} source={reduced||failed||videoEnded?(landscape?landscapeStill:portraitStill):(landscape?landscapeFirst:portraitFirst)} resizeMode="contain" style={StyleSheet.absoluteFill} onLoad={()=>setPosterReady(true)} onError={()=>setPosterReady(true)}/>
  {reduced===false&&!failed&&!videoEnded&&<LaunchBoundary onError={onError}><LaunchVideo source={landscape?landscapeVideo:portraitVideo} active={laidOut} onFrame={onFrame} onDone={onDone} onError={onError}/></LaunchBoundary>}
  {introDone&&!ready&&<View style={[s.status,{bottom:Math.max(insets.bottom,24)}]}><ActivityIndicator color={colors.onVideo}/><Text style={{color:colors.onVideo}}>Loading your saved library…</Text></View>}
 </Animated.View>;
}
const s=StyleSheet.create({root:{position:'absolute',top:0,bottom:0,left:0,right:0,zIndex:1000,backgroundColor:colors.videoBackdrop},status:{position:'absolute',left:24,right:24,alignItems:'center',gap:8}});
