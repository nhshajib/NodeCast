import {tvDesign} from './theme';
import React, { forwardRef } from 'react';
import { Text as NativeText, StyleSheet, Platform } from 'react-native';
/** Static Inter faces keep text weight identical on iOS, Android and browser previews. */
export const Text = forwardRef<React.ComponentRef<typeof NativeText>, React.ComponentProps<typeof NativeText>>(function Text({ style, ...props }, ref) {
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight === 'bold' ? 700 : Number(resolved?.fontWeight || 400);
  const face = weight >= 800 ? 'Inter-800' : weight >= 700 ? 'Inter-700' : weight >= 600 ? 'Inter-600' : 'Inter-400';
  // Each native file is already the requested weight. Asking iOS to synthesize
  // that weight again can resolve a different family member instead.
  const tvSize=tvDesign?Math.max(14, resolved?.fontSize||18):Math.max(12,resolved?.fontSize||16);
  return <NativeText {...props} ref={ref} style={[{ fontFamily: face }, style, tvSize !== undefined && {fontSize:tvSize,lineHeight:Math.max(resolved?.lineHeight||0,Math.ceil(tvSize*1.35))}, Platform.OS !== 'web' && { fontFamily: face, fontWeight: 'normal' }]} />;
});
