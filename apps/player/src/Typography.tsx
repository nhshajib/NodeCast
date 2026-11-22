import {tvDesign} from './theme';
import React, { forwardRef } from 'react';
import { Text as NativeText, StyleSheet, Platform, useWindowDimensions } from 'react-native';
/** The same faces as glowtv.app: Instrument Sans for interface text, Newsreader for a few display titles.
 * Static files keep the weight identical on iOS, Android and browser previews. Interface weight tops out at 600. */
export const fontAssets = { 'Sans-400': require('../assets/fonts/InstrumentSans-400.ttf'), 'Sans-500': require('../assets/fonts/InstrumentSans-500.ttf'), 'Sans-600': require('../assets/fonts/InstrumentSans-600.ttf'), 'Display-500': require('../assets/fonts/Newsreader-500.ttf') };
export const displayFace = 'Display-500';
export const Text = forwardRef<React.ComponentRef<typeof NativeText>, React.ComponentProps<typeof NativeText>>(function Text({ style, ...props }, ref) {
  const {fontScale}=useWindowDimensions();
  const webScale=Platform.OS==='web'?Math.min(fontScale,props.maxFontSizeMultiplier||Infinity):1;
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight === 'bold' ? 700 : Number(resolved?.fontWeight || 400);
  const face = resolved?.fontFamily === displayFace ? displayFace : weight >= 600 ? 'Sans-600' : weight >= 500 ? 'Sans-500' : 'Sans-400';
  // Each native file is already the requested weight. Asking iOS to synthesize
  // that weight again can resolve a different family member instead.
  const tvSize=tvDesign?Math.max(14, resolved?.fontSize||18):Math.max(12,resolved?.fontSize||16);
  return <NativeText {...props} ref={ref} style={[{ fontFamily: face }, style, tvSize !== undefined && {fontSize:tvSize*webScale,lineHeight:Math.max(resolved?.lineHeight||0,Math.ceil(tvSize*1.35))*webScale}, Platform.OS !== 'web' && { fontFamily: face, fontWeight: 'normal' }]} />;
});
