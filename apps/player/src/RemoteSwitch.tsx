import { Text } from './Typography';
import React from 'react';
import { Switch, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import Pressable,{isTVBuild} from './FocusPressable';
import {colors} from './theme';
import { haptic } from './haptics';
/** On TV Select toggles a full-size, labelled control; no tiny touch-only switch target. */
export default function RemoteSwitch(props:React.ComponentProps<typeof Switch>){
 if(!isTVBuild)return <Switch {...props} onValueChange={value=>{haptic('selection');props.onValueChange?.(value);}}/>;
 return <Pressable accessibilityRole="switch" accessibilityLabel={props.accessibilityLabel} accessibilityState={{checked:!!props.value,disabled:props.disabled}} disabled={props.disabled} onPress={()=>props.onValueChange?.(!props.value)} style={{minHeight:48,minWidth:96,padding:8,borderRadius:24,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:props.value?colors.mint:colors.pale}}><View style={{width:12,height:12,borderRadius:6,backgroundColor:props.value?colors.ink:colors.secondary}}/><Text style={{fontWeight:'700',color:props.value?colors.ink:colors.text}}>{props.value?'On':'Off'}</Text></Pressable>;
}
/**
 * A labelled switch whose whole row is the touch target. An iOS switch alone is 31 pt tall,
 * so on phones the row (at least 48 pt) toggles it. TV keeps the separate focusable pill.
 */
export function SwitchRow({ label, value, onValueChange, disabled, accessibilityLabel, style, labelStyle, trackColor }: { label: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean; accessibilityLabel?: string; style?: StyleProp<ViewStyle>; labelStyle?: StyleProp<TextStyle>; trackColor?: React.ComponentProps<typeof Switch>['trackColor'] }) {
 if(isTVBuild)return <View style={[{flexDirection:'row',alignItems:'center',gap:16},style]}><Text style={[{fontSize:16,lineHeight:22,fontWeight:'600',color:colors.text,flex:1},labelStyle]}>{label}</Text><RemoteSwitch accessibilityLabel={accessibilityLabel||label} value={value} onValueChange={onValueChange} disabled={disabled}/></View>;
 return <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel||label} accessibilityState={{checked:value,disabled:!!disabled}} disabled={disabled} haptic="selection" onPress={()=>onValueChange(!value)} style={[{flexDirection:'row',alignItems:'center',gap:16,minHeight:48},style]}>
  <Text style={[{fontSize:16,lineHeight:22,fontWeight:'600',color:colors.text,flex:1},labelStyle]}>{label}</Text>
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"><Switch value={value} disabled={disabled} trackColor={trackColor}/></View>
 </Pressable>;
}
