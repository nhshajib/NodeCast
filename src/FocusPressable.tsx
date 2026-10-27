import React, { useState } from 'react';
import { Pressable, Platform } from 'react-native';
export const isTVBuild = process.env.EXPO_PUBLIC_APP_VARIANT === 'tv' || Platform.isTV;
export default function FocusPressable({ style, onFocus, onBlur, ...props }: React.ComponentProps<typeof Pressable>) {
  const [focused, setFocused] = useState(false);
  return <Pressable {...props} focusable={props.focusable ?? true}
    onFocus={e => { setFocused(true); onFocus?.(e); }} onBlur={e => { setFocused(false); onBlur?.(e); }}
    style={state => [typeof style === 'function' ? style(state) : style,
      isTVBuild && focused && { outlineWidth: 3, outlineColor: '#6655AC', outlineOffset: -3, opacity: 1 }]} />;
}
