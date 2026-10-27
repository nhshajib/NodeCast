import React, { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Icon } from './ui';
import type { IconName } from './ui';
const ReducedMotion = createContext(true);
const ScreenFocus = createContext(true);
export const useScreenFocus = () => useContext(ScreenFocus);
export const useReducedMotion = () => useContext(ReducedMotion);
export function NavigationMotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; listener.remove(); };
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}
// Retain each hidden tab's last committed content. Context changes (e.g. focus) still propagate.
const FrozenContent = memo(function FrozenContent({ children }: { children: React.ReactNode; active: boolean }) { return <>{children}</>; }, (_, next) => !next.active);
export function TabScene({ name, active, previous = false, onSettled, children }: { name: string; active: boolean; previous?: boolean; onSettled?: (name: string) => void; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [visited, setVisited] = useState(active);
  const progress = useRef(new Animated.Value(0)).current;
  useLayoutEffect(() => { if (active) setVisited(true); }, [active]);
  useLayoutEffect(() => {
    progress.stopAnimation();
    if (reduced || !active) { progress.setValue(active ? 1 : 0); if (active) onSettled?.(name); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) onSettled?.(name); }); return () => animation.stop();
  }, [active, reduced, progress, name, onSettled]);
  const translateY = useMemo(() => progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }), [progress]);
  if (!visited && !active) return null;
  return <ScreenFocus.Provider value={active}><Animated.View testID={`tab-scene-${name}`} pointerEvents={active ? 'auto' : 'none'} aria-hidden={!active} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'} style={[n.scene, { zIndex: active ? 2 : previous ? 1 : 0, opacity: active ? progress : previous ? 1 : 0, transform: [{ translateY: reduced || !active ? 0 : translateY }] }]}><FrozenContent active={active}>{children}</FrozenContent></Animated.View></ScreenFocus.Provider>;
}
export function MovingTabBar<T extends string>({ tabs, active, bottom, onChange }: {
  tabs: { id: T; title: string; icon: IconName; selected: IconName }[]; active: T; bottom: number; onChange: (tab: T) => void;
}) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const selected = Math.max(0, tabs.findIndex(tab => tab.id === active));
  const position = useRef(new Animated.Value(selected)).current;
  useEffect(() => {
    position.stopAnimation();
    if (reduced) { position.setValue(selected); return; }
    const animation = Animated.timing(position, { toValue: selected, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [selected, reduced, position]);
  const itemWidth = Math.max(0, width - 14) / tabs.length;
  const translateX = useMemo(() => Animated.multiply(position, itemWidth), [position, itemWidth]);
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[n.bar, { bottom }]}>
    {!!width && <Animated.View pointerEvents="none" testID="tab-indicator" style={[n.indicator, { left: 7 + itemWidth / 2 - 23, transform: [{ translateX: translateX }] }]} />}
    {tabs.map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.title} aria-selected={active === tab.id} accessibilityState={{ selected: active === tab.id }} onPress={() => onChange(tab.id)} style={({ pressed }) => [n.tab, pressed && { opacity: .65 }]}><View style={n.icon}><Icon name={active === tab.id ? tab.selected : tab.icon} size={21} color={active === tab.id ? '#090124' : '#C7C3D0'} /></View><Text style={{ color: active === tab.id ? '#fff' : '#C7C3D0', fontSize: 11, fontWeight: active === tab.id ? '700' : '500' }}>{tab.title}</Text></Pressable>)}
  </View>;
}
/** Internal page changes animate once; presenting/dismissing the modal is left to UIKit. */
export function PageTransition({ pageKey, disabled = false, children }: { pageKey: string; disabled?: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const previous = useRef(pageKey);
  const progress = useRef(new Animated.Value(1)).current;
  useLayoutEffect(() => {
    const changed = previous.current !== pageKey; previous.current = pageKey;
    progress.stopAnimation();
    if (!changed || reduced || disabled) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [pageKey, reduced, disabled, progress]);
  const translateX = useMemo(() => progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }), [progress]);
  return <Animated.View style={{ flex: 1, opacity: progress, transform: [{ translateX: disabled || reduced ? 0 : translateX }] }}>{children}</Animated.View>;
}
export function useRetainedModal<T>(route: T | null) {
  const [retained, setRetained] = useState<T | null>(route);
  useLayoutEffect(() => { if (route !== null) setRetained(route); }, [route]);
  useEffect(() => {
    if (route !== null || retained === null) return;
    // Android/web do not reliably emit onDismiss; keep the content through the native exit.
    const timer = setTimeout(() => setRetained(null), 450);
    return () => clearTimeout(timer);
  }, [route, retained]);
  return { displayed: route ?? retained, onDismiss: () => { if (route === null) setRetained(null); } };
}
const n = StyleSheet.create({
  scene: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.bg },
  bar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', backgroundColor: '#111', borderRadius: 30, paddingVertical: 9, paddingHorizontal: 7, shadowColor: '#090124', shadowOpacity: .13, shadowRadius: 18, shadowOffset: { width: 0, height: 7 } },
  indicator: { position: 'absolute', top: 9, width: 46, height: 29, borderRadius: 19, backgroundColor: '#B9B4F2' },
  tab: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48, justifyContent: 'center' },
  icon: { width: 46, height: 29, alignItems: 'center', justifyContent: 'center' },
});
