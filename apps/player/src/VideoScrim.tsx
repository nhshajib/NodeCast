import React from 'react';
import {View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {colors} from './theme';
import {ChromeLayer} from './PlaybackGlass';
/** Shade readable controls, never permanently dim the decoded picture. */
export default function VideoScrim({visible}:{visible:boolean}){return <ChromeLayer visible={visible} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}><View testID="video-controls-scrim" pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0}}><LinearGradient pointerEvents="none" colors={[colors.videoTopScrim,colors.videoTransparent]} style={{position:'absolute',top:0,left:0,right:0,height:'32%',maxHeight:160}}/><LinearGradient colors={[colors.videoTransparent,colors.videoTopScrim]} style={{position:'absolute',bottom:0,left:0,right:0,height:'32%',maxHeight:160}}/></View></ChromeLayer>;}
