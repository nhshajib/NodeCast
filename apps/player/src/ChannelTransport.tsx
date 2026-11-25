import React from 'react';
import {View} from 'react-native';
import Pressable, {isTVBuild} from './FocusPressable';
import {Icon, colors} from './ui';
import {Text} from './Typography';

/** The same live controls on both engines. Channel changes use the owner's existing stop/open path. */
export default function ChannelTransport({playing,onToggle,onPrevious,onNext,compact=false}: {
 playing:boolean;onToggle:()=>void;onPrevious?:()=>void;onNext?:()=>void;compact?:boolean;
}) {
 const size=isTVBuild?72:compact?48:64;
 const channel=(direction:'previous'|'next',action?:()=>void)=>action?<Pressable nativeID={`tv-control:${direction}-channel`} accessibilityRole="button" accessibilityLabel={direction==='next'?'Next channel':'Previous channel'} onPress={action} style={{minWidth:64,minHeight:48,alignItems:'center',justifyContent:'center',gap:0}}><Icon name={direction==='next'?'play-skip-forward':'play-skip-back'} size={24} color={colors.onVideo}/><Text style={{color:colors.onVideo,fontSize:isTVBuild?16:12}}>{direction==='next'?'Next':'Previous'}</Text></Pressable>:null;
 return <View testID="live-channel-transport" style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:isTVBuild?32:24}}>
  {channel('previous',onPrevious)}
  <Pressable nativeID="tv-preferred:playback-toggle" accessibilityRole="button" accessibilityLabel={playing?'Pause live TV':'Play live TV'} onPress={onToggle} style={{width:size,height:size,minWidth:44,minHeight:44,borderRadius:size/2,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'}}><Icon name={playing?'pause':'play'} size={28} color={colors.primaryText}/></Pressable>
  {channel('next',onNext)}
 </View>;
}
