import React from 'react';
import {LinearGradient} from 'expo-linear-gradient';
import {colors} from './theme';
export default function VideoScrim(){return <LinearGradient pointerEvents="none" colors={[colors.videoTopScrim,colors.videoTransparent]} style={{position:'absolute',top:0,left:0,right:0,height:160}}/>;}
