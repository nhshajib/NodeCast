import Pressable from './FocusPressable';
import React,{useEffect,useRef} from 'react';
import {Alert,ScrollView,Text,View} from 'react-native';
import type {GuideProgramme} from './xmltv';
import {colors,u} from './ui';
export type TimelineGroup={offset:number;views:Map<string,React.ComponentRef<typeof ScrollView>>;move:(id:string,x:number)=>void};
export function timelineGroup():TimelineGroup {const group:TimelineGroup={offset:0,views:new Map(),move(id,x){if(Math.abs(group.offset-x)<1)return;group.offset=x;for(const [key,view]of group.views)if(key!==id)view.scrollTo({x,animated:false});}};return group;}
export default function GuideTimeline({id,programmes,from,group,onWatch}:{id:string;programmes:GuideProgramme[];from:number;group:TimelineGroup;onWatch:()=>void}){
 const ref=useRef<React.ComponentRef<typeof ScrollView>|null>(null);useEffect(()=>{if(ref.current){group.views.set(id,ref.current);ref.current.scrollTo({x:group.offset,animated:false})}return()=>{group.views.delete(id)}},[group,id]);
 const time=(value:number)=>new Date(value).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 return <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator onScroll={event=>group.move(id,event.nativeEvent.contentOffset.x)} scrollEventThrottle={50}><View style={{width:4080,height:142}}>{Array.from({length:24},(_,index)=><Text key={index} style={[u.small,{position:'absolute',left:index*170,top:0,width:160,fontSize:11}]}>{time(from+index*1800000)}</Text>)}{programmes.map((p,index)=>{const left=Math.max(p.start,from),right=Math.min(p.end,from+12*3600000);return <Pressable accessibilityRole="button" accessibilityLabel={`${p.title}, ${time(p.start)} to ${time(p.end)}`} onPress={()=>Alert.alert(p.title,p.description||`${time(p.start)}–${time(p.end)}`,[{text:'Close',style:'cancel'},{text:'Watch channel live',onPress:onWatch}])} key={`${p.start}-${index}`} style={{position:'absolute',left:(left-from)/1800000*170,top:30,width:Math.max(24,(right-left)/1800000*170-6),height:100,padding:12,borderRadius:16,backgroundColor:colors.pale,gap:8}}><Text style={[u.small,{fontSize:11}]}>{time(p.start)}–{time(p.end)}</Text><Text numberOfLines={2} style={u.label}>{p.title}</Text></Pressable>})}</View></ScrollView>;
}
