import React from 'react';
import { Switch, Text, View } from 'react-native';
import Pressable,{isTVBuild} from './FocusPressable';
import {colors} from './theme';
/** On TV Select toggles a full-size, labelled control; no tiny touch-only switch target. */
export default function RemoteSwitch(props:React.ComponentProps<typeof Switch>){
 if(!isTVBuild)return <Switch {...props}/>;
 return <Pressable accessibilityRole="switch" accessibilityLabel={props.accessibilityLabel} accessibilityState={{checked:!!props.value,disabled:props.disabled}} disabled={props.disabled} onPress={()=>props.onValueChange?.(!props.value)} style={{minHeight:48,minWidth:92,padding:12,borderRadius:24,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:props.value?colors.mint:colors.pale}}><View style={{width:12,height:12,borderRadius:6,backgroundColor:props.value?colors.ink:colors.secondary}}/><Text style={{fontWeight:'700',color:props.value?colors.ink:colors.text}}>{props.value?'On':'Off'}</Text></Pressable>;
}
