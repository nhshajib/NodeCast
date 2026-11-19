import React,{useEffect} from 'react';
import {BackHandler,ScrollView,View} from 'react-native';
import {usePlaybackChrome} from './PlaybackChrome';
import Pressable from './FocusPressable';
import {Text} from './Typography';
import {Button,H2,Icon,colors,u} from './ui';
import {tvSafe} from './designTokens';
type Track={id:string;label:string};
/** Track selection is UI-only; callers keep their existing engine actions. */
export default function TVTrackSheet({audio,subtitles,selectedAudio,selectedSubtitle,onAudio,onSubtitle,onClose}:{audio:Track[];subtitles:Track[];selectedAudio?:string;selectedSubtitle?:string;onAudio:(id:string)=>void;onSubtitle:(id:string)=>void;onClose:()=>void}){
 const chrome=usePlaybackChrome();
 useEffect(()=>{chrome.hold('tracks',true);const sub=BackHandler.addEventListener('hardwareBackPress',()=>{onClose();return true});return()=>{sub.remove();chrome.hold('tracks',false)}},[chrome.hold,onClose]);
 const row=(track:Track,selected:boolean,onSelect:()=>void,type:string)=><Pressable key={track.id} nativeID={`tv-control:track:${type}:${track.id}`} accessibilityRole="radio" accessibilityLabel={`${type}, ${track.label}`} accessibilityState={{checked:selected}} onPress={onSelect} style={{minHeight:56,padding:16,gap:16,flexDirection:'row',alignItems:'center',borderRadius:16,backgroundColor:selected?colors.selected:colors.surface}}><Icon name={selected?'checkmark-circle':'ellipse-outline'} color={selected?colors.selectedText:colors.secondary}/><Text style={[u.label,{fontSize:18,color:selected?colors.selectedText:colors.text,flex:1}]}>{track.label}</Text></Pressable>;
 return <View nativeID="tv-trap:tracks" style={{position:'absolute',top:tvSafe.v,right:tvSafe.h,bottom:tvSafe.v,width:432,maxWidth:'70%',padding:16,borderRadius:16,backgroundColor:colors.panel,gap:16}}><Button nativeID="tv-preferred:close-tracks" title="Back to video" icon="chevron-back" variant="secondary" onPress={onClose}/><ScrollView contentContainerStyle={{gap:16}}><H2>Audio</H2>{audio.length?audio.map(track=>row(track,track.id===selectedAudio,()=>onAudio(track.id),'Audio')):<Text style={u.body}>No selectable audio tracks reported.</Text>}<H2>Subtitles</H2>{[{id:'off',label:'Off'},...subtitles.filter(t=>t.id!=='off')].map(track=>row(track,track.id===(selectedSubtitle||'off'),()=>onSubtitle(track.id),'Subtitles'))}<Text style={u.small}>Choices are remembered for this profile when the stream reports matching tracks.</Text></ScrollView></View>;
}
