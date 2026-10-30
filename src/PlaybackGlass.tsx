import React from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, StyleSheet, Text } from 'react-native';
import Pressable from './FocusPressable';
import { usePlaybackChrome } from './PlaybackChrome';
export const glass = StyleSheet.create({
  panel: { backgroundColor: '#100B25D9', borderColor: '#FFFFFF30', borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  content: { padding: 18, gap: 14 },
  title: { color: '#FFFFFF', fontSize: 21, fontWeight: '600' },
  text: { color: '#DCD8E9', fontSize: 14, lineHeight: 20 },
  label: { color: '#B9B4F2', fontSize: 13, fontWeight: '600', marginTop: 8 },
  button: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FFFFFF10', borderWidth: 1, borderColor: '#FFFFFF18', justifyContent: 'center' },
});
export function GlassButton({ title, onPress, busy, disabled, ...props }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean } & Omit<React.ComponentProps<typeof Pressable>, 'onPress' | 'children'>) {
  const chrome = usePlaybackChrome();
  return <Pressable {...props} disabled={disabled || busy} accessibilityRole={props.accessibilityRole || 'button'} accessibilityLabel={props.accessibilityLabel || title} accessibilityState={{ ...props.accessibilityState, disabled: !!disabled || !!busy, busy: !!busy }} onFocus={chrome.activity} onPress={() => { chrome.activity(); onPress(); }} style={[glass.button, { opacity: disabled || busy ? .5 : 1 }]}>{busy ? <ActivityIndicator color="#B9B4F2" /> : <Text style={{ color: '#FFFFFF', fontSize: 14 }}>{title}</Text>}</Pressable>;
}

/** Animate opacity only: video and control layout never move or remount on idle. */
export function ChromeLayer({ visible, children, style }: { visible: boolean; children: React.ReactNode; style?: import('react-native').StyleProp<import('react-native').ViewStyle> }) {
  const opacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => { let alive=true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if(alive)setReduced(value); }); const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{alive=false;sub.remove();}; }, []);
  React.useEffect(() => { const animation=Animated.timing(opacity,{toValue:visible?1:0,duration:reduced?0:180,useNativeDriver:true});animation.start();return()=>animation.stop(); }, [visible,reduced,opacity]);
  return <Animated.View pointerEvents={visible?'box-none':'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible?'auto':'no-hide-descendants'} style={[style,{opacity}]}>{children}</Animated.View>;
}
