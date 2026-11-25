import React from 'react';
import {View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {colors} from './theme';
export default function VideoScrim(){return <View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0}}><LinearGradient pointerEvents="none" colors={[colors.videoTopScrim,colors.videoTransparent]} style={{position:'absolute',top:0,left:0,right:0,height:160}}/><LinearGradient colors={[colors.videoTransparent,colors.videoTopScrim]} style={{position:'absolute',bottom:0,left:0,right:0,height:180}}/></View>;}
