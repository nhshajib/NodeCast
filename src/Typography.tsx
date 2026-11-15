import React, { forwardRef } from 'react';
import { Text as NativeText, StyleSheet } from 'react-native';
/** Static Inter faces keep text weight identical on iOS, Android and browser previews. */
export const Text = forwardRef<React.ComponentRef<typeof NativeText>, React.ComponentProps<typeof NativeText>>(function Text({ style, ...props }, ref) {
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight === 'bold' ? 700 : Number(resolved?.fontWeight || 400);
  const face = weight >= 800 ? 'Inter-800' : weight >= 700 ? 'Inter-700' : weight >= 600 ? 'Inter-600' : 'Inter-400';
  return <NativeText {...props} ref={ref} style={[{ fontFamily: face }, style]} />;
});
