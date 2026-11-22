import {Text} from './Typography';
import Pressable,{isTVBuild} from './FocusPressable';
import React,{useEffect,useRef} from 'react';
import {Alert,ScrollView,View,useWindowDimensions} from 'react-native';
import type {GuideProgramme} from './xmltv';
import {Icon,colors,u} from './ui';
export type TimelineGroup={offset:number;views:Map<string,React.ComponentRef<typeof ScrollView>>;move:(id:string,x:number)=>void};
export function timelineGroup():TimelineGroup {const group:TimelineGroup={offset:0,views:new Map(),move(id,x){if(Math.abs(group.offset-x)<1)return;group.offset=x;for(const [key,view]of group.views)if(key!==id)view.scrollTo({x,animated:false});}};return group;}
export default function GuideTimeline({id,channelName,programmes,from,group,onWatch,onProgramme,catchupAvailable,showTimes=true,onFocusProgramme}:{id:string;channelName?:string;programmes:GuideProgramme[];from:number;group:TimelineGroup;onWatch:()=>void;onProgramme?:(p:GuideProgramme)=>void;catchupAvailable?:(p:GuideProgramme)=>boolean;showTimes?:boolean;onFocusProgramme?:(p:GuideProgramme)=>void}){
 const {fontScale}=useWindowDimensions();
 const cellHeight=Math.ceil(80*Math.max(1,fontScale)/8)*8;
 const rulerHeight=Math.ceil(24*Math.min(1.4,Math.max(1,fontScale))/8)*8;
 const ref=useRef<React.ComponentRef<typeof ScrollView>|null>(null);useEffect(()=>{if(ref.current){group.views.set(id,ref.current);const first=programmes.length?Math.max(0,Math.floor((Math.min(...programmes.map(p=>p.start))-from)/1800000)*170):0;ref.current.scrollTo({x:group.offset||first,animated:false})}return()=>{group.views.delete(id)}},[group,id]);
 const time=(value:number)=>new Date(value).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 return <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={showTimes} onScroll={event=>group.move(id,event.nativeEvent.contentOffset.x)} scrollEventThrottle={50}><View style={{width:4080+160,minHeight:cellHeight+(showTimes?rulerHeight:0)}}>
 {showTimes&&Array.from({length:24},(_,index)=><Text maxFontSizeMultiplier={1.4} key={index} style={[u.small,{position:'absolute',left:index*170,top:0,width:160,fontSize:isTVBuild?14:12}]}>{time(from+index*1800000)}</Text>)}
 {Date.now()>=from&&Date.now()<from+12*3600000&&<View pointerEvents="none" style={{position:'absolute',left:(Date.now()-from)/1800000*170,top:0,bottom:0,width:2,backgroundColor:colors.accent,zIndex:0}}/>}
 {programmes.map((p,index)=>{const left=Math.max(p.start,from),right=Math.min(p.end,from+12*3600000);const current=p.start<=Date.now()&&p.end>Date.now();return <Pressable nativeID={`tv-control:programme:${id}:${p.start}`} accessibilityRole="button" accessibilityLabel={`${channelName||id}, ${p.title}, ${time(p.start)} to ${time(p.end)}${current?', On now':''}`} accessibilityHint={catchupAvailable?.(p)?'Provider catch-up is available.':undefined} onFocus={()=>onFocusProgramme?.(p)} onPress={()=>onProgramme?onProgramme(p):Alert.alert(p.title,p.description||`${time(p.start)}–${time(p.end)}`,[{text:'Close',style:'cancel'},{text:'Watch channel live',onPress:onWatch}])} key={`${p.start}-${index}`} style={{zIndex:1,position:'absolute',left:(left-from)/1800000*170,top:showTimes?rulerHeight:0,width:Math.max(48,(right-left)/1800000*170-8),minHeight:cellHeight,padding:8,borderRadius:12,backgroundColor:current?colors.selected:colors.panel,borderWidth:1,borderColor:current?colors.link:colors.line,gap:8}}>
 <Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.4} style={[u.small,{color:current?colors.selectedText:colors.secondary,fontSize:isTVBuild?14:12}]}>{time(p.start)}–{time(p.end)}</Text><View style={{flexDirection:'row',alignItems:'center',gap:8}}>{catchupAvailable?.(p)&&<Icon name="time-outline" size={14} color={colors.secondary}/>}<Text numberOfLines={2} style={[u.label,{flex:1,fontSize:isTVBuild?18:14}]}>{p.title}</Text></View></Pressable>})}
 </View></ScrollView>;
}

/** A separate ruler stays visible while channel rows scroll vertically. */
export function GuideRuler({from,group}:{from:number;group:TimelineGroup}){
 const ref=useRef<React.ComponentRef<typeof ScrollView>>(null);
 useEffect(()=>{if(ref.current){group.views.set('ruler',ref.current);ref.current.scrollTo({x:group.offset,animated:false})}return()=>{group.views.delete('ruler')}},[group]);
 return <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onScroll={e=>group.move('ruler',e.nativeEvent.contentOffset.x)} scrollEventThrottle={50} style={{flexGrow:0,flexShrink:0}}><View style={{width:4080+160,height:isTVBuild?48:32}}>{Array.from({length:24},(_,i)=><Text key={i} maxFontSizeMultiplier={1.4} style={[u.small,{position:'absolute',left:i*170,width:160,fontSize:isTVBuild?14:12}]}>{new Date(from+i*1800000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text>)}{Date.now()>=from&&Date.now()<from+12*3600000&&<View accessibilityLabel="Current time" style={{position:'absolute',left:(Date.now()-from)/1800000*170-4,bottom:0,width:8,height:8,borderRadius:4,backgroundColor:colors.accent}}/>}</View></ScrollView>;
}
