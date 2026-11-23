import { Text } from '../src/Typography';
import React, { memo } from 'react';
import { Image, View } from 'react-native';
import Pressable from '../src/FocusPressable';
import type { Media } from '../src/provider';
import { Icon, colors } from '../src/ui';
import { groupLabel } from '../src/groups';
// Compact rows: at least five fit below the Live TV toolbar at 1080p.
export const CHANNEL_ROW_HEIGHT=56;
export const CHANNEL_ROW_GAP=8;
/** Text-first rows avoid poster downloads and rerender only the changed channel. */
export default memo(function TVChannelRow({item,favorite,logos,onPlay,onFavorite,onOptions,preferred}: {item:Media;preferred?:boolean;favorite:boolean;logos:boolean;tone:string;onPlay:(item:Media)=>void;onFavorite:(item:Media)=>void;onOptions:(item:Media)=>void}) {
  return <View nativeID={`tv-focus-container:channel:${item.id}`} style={{height:CHANNEL_ROW_HEIGHT,flexDirection:'row',alignItems:'stretch',borderRadius:12,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,overflow:'visible'}}>
    <Pressable nativeID={`${preferred?"tv-preferred":"tv-control"}:channel:${item.id}`} accessibilityLabel={`${item.kind==='series'?'Open':'Play'} ${item.name}`} onLongPress={()=>onOptions(item)} onPress={()=>onPlay(item)} style={{flex:1,flexDirection:'row',alignItems:'center',paddingHorizontal:16,gap:16}}>
      <View style={{width:64,height:40,borderRadius:8,backgroundColor:colors.pale,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{logos&&item.logo?<Image source={{uri:item.logo}} resizeMode="contain" resizeMethod="resize" style={{width:56,height:36}}/>:<Text style={{fontSize:14,fontWeight:'700',color:colors.link}}>{item.name.trim().slice(0,2).toUpperCase()}</Text>}</View>
      <View style={{flex:1}}><Text numberOfLines={1} style={{fontSize:18,lineHeight:24,fontWeight:'600',color:colors.text}}>{item.name}</Text><Text numberOfLines={1} style={{fontSize:14,lineHeight:20,color:colors.secondary}}>{groupLabel(item.group)}</Text></View>
      {item.kind==='live'&&<Text style={{fontSize:14,fontWeight:'700',color:colors.link,letterSpacing: 0}}>LIVE</Text>}
    </Pressable>
    {item.kind==='live'&&<Pressable nativeID={`tv-control:channel-options:${item.id}`} accessibilityLabel={`Playback options for ${item.name}`} onPress={()=>onOptions(item)} style={{width:52,alignItems:'center',justifyContent:'center'}}><Icon name="ellipsis-horizontal" color={colors.link}/></Pressable>}
    <Pressable nativeID={`tv-control:channel-favorite:${item.id}`} accessibilityLabel={`${favorite?'Remove':'Save'} favorite: ${item.name}`} accessibilityState={{selected:favorite}} onPress={()=>onFavorite(item)} style={{width:52,alignItems:'center',justifyContent:'center'}}><Icon name={favorite?'heart':'heart-outline'} color={colors.link} size={21}/></Pressable>
  </View>;
});
