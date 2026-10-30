import React, { forwardRef, useId, useState } from 'react';
import { Pressable, Platform } from 'react-native';
import { colors } from './theme';
export const isTVBuild = process.env.EXPO_PUBLIC_APP_VARIANT === 'tv' || Platform.isTV;
/** The native TV navigator restores controls by ID; selected state is separate from focus. */
export default forwardRef<React.ComponentRef<typeof Pressable>,React.ComponentProps<typeof Pressable>>(function FocusPressable({ style, onFocus, onBlur, ...props },ref) {
  const [focused, setFocused] = useState(false);const id=useId();
  const disabled=props.disabled||props.accessibilityState?.disabled||props['aria-disabled']===true;
  const label=props.accessibilityLabel||props.testID||id;
  return <Pressable {...props} ref={ref} nativeID={props.nativeID||(isTVBuild?`tv-control:${label}`:undefined)}
    accessible={props.accessible??true} accessibilityRole={props.accessibilityRole ?? 'button'}
    focusable={!disabled && props.focusable !== false} disabled={disabled}
    onFocus={e => { setFocused(true); onFocus?.(e); }} onBlur={e => { setFocused(false); onBlur?.(e); }}
    style={state => [isTVBuild&&{minHeight:44},typeof style === 'function' ? style(state) : style,
      isTVBuild && focused && !disabled && { outlineWidth: 3, outlineStyle: 'solid', outlineColor: colors.accent, outlineOffset: -3, opacity: 1 }]} />;
});
