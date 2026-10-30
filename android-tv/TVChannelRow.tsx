import React, { memo } from 'react';
import { Image, Text, View } from 'react-native';
import Pressable from '../src/FocusPressable';
import type { Media } from '../src/provider';
import { Icon, colors } from '../src/ui';
export const CHANNEL_ROW_HEIGHT=54;
export const CHANNEL_ROW_GAP=6;
/** Text-first rows avoid poster downloads and rerender only the changed channel. */
export default memo(function TVChannelRow({item,favorite,logos,onPlay,onFavorite,onOptions}: {item:Media;favorite:boolean;logos:boolean;tone:string;onPlay:(item:Media)=>void;onFavorite:(item:Media)=>void;onOptions:(item:Media)=>void}) {
  return <View style={{height:CHANNEL_ROW_HEIGHT,flexDirection:'row',alignItems:'stretch',borderRadius:14,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,overflow:'hidden'}}>
    <Pressable nativeID={`tv-control:channel:${item.id}`} accessibilityLabel={`${item.kind==='series'?'Open':'Play'} ${item.name}`} onPress={()=>onPlay(item)} style={{flex:1,flexDirection:'row',alignItems:'center',paddingHorizontal:16,gap:14}}>
      <View style={{width:34,height:34,borderRadius:9,backgroundColor:colors.pale,alignItems:'center',justifyContent:'center'}}>{logos&&item.logo?<Image source={{uri:item.logo}} resizeMode="contain" style={{width:30,height:30}}/>:<Text style={{fontSize:13,fontWeight:'700',color:colors.accent}}>{item.name.trim().slice(0,2).toUpperCase()}</Text>}</View>
      <View style={{flex:1,gap:3}}><Text numberOfLines={1} style={{fontSize:17,fontWeight:'600',color:colors.text}}>{item.name}</Text><Text numberOfLines={1} style={{fontSize:11,color:colors.secondary}}>{item.group}</Text></View>
      {item.kind==='live'&&<Text style={{fontSize:10,fontWeight:'700',color:colors.accent,letterSpacing:1}}>LIVE</Text>}
    </Pressable>
    {item.kind==='live'&&<Pressable nativeID={`tv-control:channel-options:${item.id}`} accessibilityLabel={`Playback options for ${item.name}`} onPress={()=>onOptions(item)} style={{width:52,alignItems:'center',justifyContent:'center'}}><Icon name="ellipsis-horizontal" color={colors.accent}/></Pressable>}
    <Pressable nativeID={`tv-control:channel-favorite:${item.id}`} accessibilityLabel={`${favorite?'Remove':'Save'} favorite: ${item.name}`} accessibilityState={{selected:favorite}} onPress={()=>onFavorite(item)} style={{width:52,alignItems:'center',justifyContent:'center'}}><Icon name={favorite?'heart':'heart-outline'} color={colors.accent} size={21}/></Pressable>
  </View>;
});
