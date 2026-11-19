import React,{useEffect,useRef} from 'react';
import {DeviceEventEmitter,View} from 'react-native';
import Pressable from './FocusPressable';
import {Text} from './Typography';
import {playbackClock} from './activity';
import {colors,u} from './ui';
/** TV transport UI delegates seeking to the unchanged player seek action. */
export default function TVSeekBar({position,duration,onSeekBy}:{position:number;duration:number;onSeekBy:(seconds:number)=>void}){
 const latest=useRef(onSeekBy);latest.current=onSeekBy;
 useEffect(()=>{const sub=DeviceEventEmitter.addListener('GlowTVSeek',seconds=>latest.current(Number(seconds)));return()=>sub.remove()},[]);
 const percent=`${Math.max(0,Math.min(100,position/Math.max(1,duration)*100))}%` as `${number}%`;
 return <Pressable nativeID="tv-control:seek-video" accessibilityRole="adjustable" accessibilityLabel="Video progress, Left or Right to seek ten seconds" accessibilityValue={{min:0,max:duration,now:position,text:`${playbackClock(position)} of ${playbackClock(duration)}`}} accessibilityActions={[{name:'increment',label:'Forward ten seconds'},{name:'decrement',label:'Rewind ten seconds'}]} onAccessibilityAction={event=>onSeekBy(event.nativeEvent.actionName==='increment'?10:-10)} onPress={()=>{}} style={{width:'100%',minHeight:64,padding:8,gap:8,borderRadius:16}}><View style={u.between}><Text style={[u.label,{fontSize:18,color:colors.onVideo}]}>{playbackClock(position)}</Text><Text style={[u.label,{fontSize:18,color:colors.onVideo}]}>{playbackClock(duration)}</Text></View><View style={{height:8,borderRadius:4,backgroundColor:colors.videoTrack}}><View style={{height:8,borderRadius:4,width:percent,backgroundColor:colors.primary}}/></View></Pressable>;
}
