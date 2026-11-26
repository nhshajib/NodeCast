import {colors} from './theme';
import {tvDesign} from './theme';
import { Icon } from './ui';
import type { IconName } from './ui';
import { Text } from './Typography';
import React from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import Pressable from './FocusPressable';
import { usePlaybackChrome } from './PlaybackChrome';
export const glass = StyleSheet.create({
  panel: { backgroundColor: colors.videoScrim, borderColor: colors.videoBorder, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: 'hidden' },
  content: { padding: 16, gap: 16 },
  title: { color: colors.onVideo, fontSize: tvDesign?24:21, fontWeight: '600' },
  text: { color: colors.videoCopy, fontSize: tvDesign?18:14, lineHeight: 20 },
  label: { color: colors.videoMuted, fontSize: tvDesign?18:13, fontWeight: '500', marginTop: 8 },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.videoChip, borderWidth: 0, borderColor: colors.videoControlBorder, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 8 },
});
export function GlassButton({ title, onPress, busy, disabled, icon, ...props }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; icon?: IconName } & Omit<React.ComponentProps<typeof Pressable>, 'onPress' | 'children'>) {
  const chrome = usePlaybackChrome();
  return <Pressable {...props} disabled={disabled || busy} accessibilityRole={props.accessibilityRole || 'button'} accessibilityLabel={props.accessibilityLabel || title} accessibilityState={{ ...props.accessibilityState, disabled: !!disabled || !!busy, busy: !!busy }} onFocus={chrome.activity} onPress={() => { chrome.activity(); onPress(); }} style={({ pressed }) => [glass.button, pressed && { backgroundColor: colors.videoPressed }, { opacity: disabled || busy ? .5 : 1 }]}>{busy ? <ActivityIndicator color={colors.primary} /> : <>{icon && <Icon name={icon} color={colors.onVideo} size={18}/>}<Text style={{ color: colors.onVideo, fontSize: tvDesign?18:14, flexShrink: 1 }}>{title}</Text></>}</Pressable>;
}

/** Animate opacity only: video and control layout never move or remount on idle. */
export function ChromeLayer({ visible, children, style, onLayout }: { visible: boolean; children: React.ReactNode; onLayout?: import('react-native').ViewProps['onLayout']; style?: import('react-native').StyleProp<import('react-native').ViewStyle> }) {
  const opacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => { let alive=true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if(alive)setReduced(value); }); const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{alive=false;sub.remove();}; }, []);
  React.useEffect(() => { const animation=Animated.timing(opacity,{toValue:visible?1:0,duration:reduced?0:180,useNativeDriver:true});animation.start();return()=>animation.stop(); }, [visible,reduced,opacity]);
  return <Animated.View onLayout={onLayout} pointerEvents={visible?'box-none':'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible?'auto':'no-hide-descendants'} style={[style,{opacity}]}>{children}</Animated.View>;
}
