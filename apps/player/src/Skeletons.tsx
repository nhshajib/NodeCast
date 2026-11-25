import React,{useEffect,useRef} from 'react';
import { Animated,Platform,View } from 'react-native';
import {useReducedMotion} from './NavigationMotion';
import { colors, u } from './ui';
export function LibrarySkeleton({ posters = false,label="Loading library" }: { posters?: boolean;label?:string }) {
 return <LoadingPulse label={label}><View style={{gap:16,padding:24}}>{Array.from({length:posters?2:3},(_,index)=><View key={index} style={{height:posters?224:80,backgroundColor:colors.surface,borderRadius:16}}/>)}</View></LoadingPulse>;
}
export function LoadingPulse({label,children}:{label:string;children:React.ReactNode}) {
 const opacity=useRef(new Animated.Value(1)).current;const reduced=useReducedMotion();
 useEffect(()=>{if(reduced){opacity.setValue(1);return;}const pulse=Animated.loop(Animated.sequence([Animated.timing(opacity,{toValue:.45,duration:750,useNativeDriver:Platform.OS!=='web'}),Animated.timing(opacity,{toValue:1,duration:750,useNativeDriver:Platform.OS!=='web'})]));pulse.start();return()=>pulse.stop();},[opacity,reduced]);
 return <Animated.View accessibilityLabel={label} accessibilityState={{busy:true}} style={{opacity}}>{children}</Animated.View>;
}
export function HomeSkeleton(){return <LoadingPulse label="Loading your playlist"><View style={{gap:16}}><View style={{height:160,borderRadius:16,backgroundColor:colors.surface}}/>{[0,1,2].map(i=><View key={i} style={{height:80,borderRadius:16,backgroundColor:colors.surface}}/>)}</View></LoadingPulse>;}
