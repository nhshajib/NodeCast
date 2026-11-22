import React, { forwardRef, useId, useState } from 'react';
import { Pressable, Platform } from 'react-native';
import type { PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';
import { colors } from './theme';
import { haptic as playHaptic } from './haptics';
import type { HapticKind } from './haptics';
export const isTVBuild = process.env.EXPO_PUBLIC_APP_VARIANT === 'tv' || Platform.isTV;
const androidPhone = Platform.OS === 'android' && !isTVBuild;
// Feedback starts when the finger lands. A caller's own `pressed` style, listed later, wins.
const pressedFeedback: ViewStyle = isTVBuild ? {} : androidPhone ? {} : { opacity: .6 };
const tvSelect: ViewStyle = { transform: [{ scale: .97 }] };
type Props = React.ComponentProps<typeof Pressable> & {
  /** Fires on press-in, only for controls whose press changes something (favorite, toggle, seek). */
  haptic?: HapticKind;
  /** Turn off the default pressed feedback, e.g. for full-screen tap layers over video. */
  noFeedback?: boolean;
};
/** The single touchable: 44×44 minimum, pressed state on press-in, TV focus ring, optional haptic. */
export default forwardRef<React.ComponentRef<typeof Pressable>, Props>(function FocusPressable({ style, onFocus, onBlur, onPressIn, haptic, noFeedback, android_ripple, ...props }, ref) {
  const [focused, setFocused] = useState(false); const id = useId();
  const disabled = props.disabled || props.accessibilityState?.disabled || props['aria-disabled'] === true;
  const label = props.accessibilityLabel || props.testID || id;
  // RN Web 0.22 consumes ARIA attributes rather than native accessibilityState.
  const webState=Platform.OS==='web'?{'aria-selected':props['aria-selected']??props.accessibilityState?.selected,'aria-checked':props['aria-checked']??props.accessibilityState?.checked,'aria-expanded':props['aria-expanded']??props.accessibilityState?.expanded,'aria-busy':props['aria-busy']??props.accessibilityState?.busy,'aria-disabled':disabled}:{};
  return <Pressable {...props} {...webState} ref={ref} nativeID={props.nativeID || (isTVBuild ? `tv-control:${label}` : undefined)}
    accessible={props.accessible ?? true} accessibilityRole={props.accessibilityRole ?? 'button'}
    focusable={!disabled && props.focusable !== false} disabled={disabled}
    android_ripple={android_ripple ?? (androidPhone && !noFeedback ? { color: colors.accent + '40', foreground: true } : undefined)}
    onPressIn={e => { if (haptic && !disabled) playHaptic(haptic); onPressIn?.(e); }}
    onFocus={e => { if (!(isTVBuild && Platform.OS === 'android')) setFocused(true); onFocus?.(e); }} onBlur={e => { if (!(isTVBuild && Platform.OS === 'android')) setFocused(false); onBlur?.(e); }}
    style={(state: PressableStateCallbackType) => [{ minHeight: 44, minWidth: 44 } as ViewStyle,
      !noFeedback && state.pressed && !disabled && pressedFeedback,
      typeof style === 'function' ? style(state) : style as StyleProp<ViewStyle>,
      isTVBuild && focused && !disabled && { outlineWidth: 3, outlineStyle: 'solid', outlineColor: colors.focusOuter, outlineOffset: 0, boxShadow: `inset 0 0 0 2px ${colors.focusInner}`, opacity: 1, transform: [{ scale: 1.05 }] },
      isTVBuild && !noFeedback && state.pressed && !disabled && tvSelect]} />;
});
