import React from 'react';
import { View } from 'react-native';
import { colors, u } from './ui';
export function LibrarySkeleton({ posters = false }: { posters?: boolean }) {
 return <View accessibilityLabel="Loading library" accessibilityState={{busy:true}} style={{gap:16,padding:24}}>{Array.from({length:posters?2:3},(_,index)=><View key={index} style={{height:posters?224:80,backgroundColor:colors.surface,borderRadius:16}}/>)}</View>;
}
export function HomeSkeleton(){return <View accessibilityLabel="Loading your playlist" accessibilityState={{busy:true}} style={{gap:16}}><View style={{height:224,borderRadius:16,backgroundColor:colors.surface}}/>{[0,1,2].map(i=><View key={i} style={{height:80,borderRadius:16,backgroundColor:colors.surface}}/>)}</View>;}
