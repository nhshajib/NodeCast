import { Text } from './Typography';
import { themedStyles, useThemeChoice, isDarkTheme } from './theme';
import React, { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, Icon } from './ui';
import type { IconName } from './ui';
import { getTransition, slideTransition, subscribeTransitions } from './transitionConfig';

/** Stable primitive snapshot: configuration changes render once; animation frames do not. */
export function useScreenTransition(screenName: string) {
  return useSyncExternalStore(subscribeTransitions, () => getTransition(screenName), () => getTransition(screenName));
}
// Mobile runs transforms on the native UI thread; web uses Animated's browser implementation.
const nativeAnimation = Platform.OS !== 'web';
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
  const transition = useScreenTransition(name);
  const [visited, setVisited] = useState(active);
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const wasActive = useRef(active);
  useLayoutEffect(() => { if (active) setVisited(true); }, [active]);
  useLayoutEffect(() => {
    const entering = active && !wasActive.current; wasActive.current = active;
    let animation: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let live = true;
    const settle = () => {
      if (!live) return;
      if (timer) clearTimeout(timer);
      animation?.stop(); progress.setValue(active ? 1 : 0);
      if (active) onSettled?.(name);
    };
    const lifecycle = AppState.addEventListener('change', settle);
    progress.stopAnimation();
    // Initial mount/accessibility changes must not hide an already visible tab.
    if (transition === 'none' || reduced || !entering || AppState.currentState !== 'active') settle();
    else {
      progress.setValue(0);
      animation = Animated.timing(progress, { toValue: 1, duration: slideTransition.duration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeAnimation });
      timer = setTimeout(settle, slideTransition.settleAfter);
      animation.start(({ finished }) => { if (finished && live) { if (timer) clearTimeout(timer); onSettled?.(name); } });
    }
    return () => { live = false; if (timer) clearTimeout(timer); lifecycle.remove(); animation?.stop(); };
  }, [active, reduced, transition, progress, name, onSettled]);
  const translateX = useMemo(() => progress.interpolate({ inputRange: [0, 1], outputRange: [slideTransition.distance, 0] }), [progress]);
  if (!visited && !active) return null;
  return <ScreenFocus.Provider value={active}><Animated.View collapsable={false} testID={`tab-scene-${name}`} pointerEvents={active ? 'auto' : 'none'} aria-hidden={!active} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'} style={[n.scene, { zIndex: active ? 2 : previous ? 1 : 0, opacity: active || previous ? 1 : 0, transform: [{ translateX: transition === 'none' || reduced || !active ? 0 : translateX }] }]}><FrozenContent active={active}>{children}</FrozenContent></Animated.View></ScreenFocus.Provider>;
}
export function MovingTabBar<T extends string>({ tabs, active, bottom, onChange }: {
  tabs: { id: T; title: string; icon: IconName; selected: IconName }[]; active: T; bottom: number; onChange: (tab: T) => void;
}) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const selected = Math.max(0, tabs.findIndex(tab => tab.id === active));
  const position = useRef(new Animated.Value(selected)).current;
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => { if (timer) clearTimeout(timer); animation?.stop(); position.setValue(selected); };
    const lifecycle = AppState.addEventListener('change', settle);
    position.stopAnimation();
    if (reduced || AppState.currentState !== 'active') settle();
    else {
      animation = Animated.timing(position, { toValue: selected, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: nativeAnimation });
      timer = setTimeout(settle, 380); animation.start(({ finished }) => { if (finished && timer) clearTimeout(timer); });
    }
    return () => { if (timer) clearTimeout(timer); lifecycle.remove(); animation?.stop(); };
  }, [selected, reduced, position]);
  const itemWidth = Math.max(0, width - 14) / tabs.length;
  const translateX = useMemo(() => Animated.multiply(position, itemWidth), [position, itemWidth]);
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[n.bar, { bottom }]}>
    {!!width && <Animated.View pointerEvents="none" testID="tab-indicator" style={[n.indicator, { left: 7 + itemWidth / 2 - 23, transform: [{ translateX: translateX }] }]} />}
    {tabs.map(tab => <Pressable key={tab.id} testID={`navigation-tab-${tab.id}`} accessibilityRole="tab" accessibilityLabel={tab.title} aria-selected={active === tab.id} accessibilityState={{ selected: active === tab.id }} onPress={() => onChange(tab.id)} style={({ pressed }) => [n.tab, pressed && { opacity: .65 }]}><View style={n.icon}><Icon name={active === tab.id ? tab.selected : tab.icon} size={21} color={active === tab.id ? colors.link : colors.secondary} /></View><Text style={{ color: active === tab.id ? colors.link : colors.secondary, fontSize: 11, fontWeight: active === tab.id ? '700' : '500' }}>{tab.title}</Text></Pressable>)}
  </View>;
}
/** Internal page changes animate once; presenting/dismissing the modal is left to UIKit. */
export function PageTransition({ pageKey, disabled = false, children }: { pageKey: string; disabled?: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const transition = useScreenTransition(pageKey);
  const previous = useRef(pageKey);
  const progress = useRef(new Animated.Value(1)).current;
  useLayoutEffect(() => {
    // Native Modal owns first presentation; only slide between already open pages.
    const changed = !!previous.current && !!pageKey && previous.current !== pageKey;
    previous.current = pageKey;
    let animation: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => { if (timer) clearTimeout(timer); animation?.stop(); progress.setValue(1); };
    const lifecycle = AppState.addEventListener('change', settle);
    progress.stopAnimation();
    if (!changed || transition === 'none' || reduced || disabled || AppState.currentState !== 'active') settle();
    else {
      progress.setValue(0);
      animation = Animated.timing(progress, { toValue: 1, duration: slideTransition.duration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeAnimation });
      timer = setTimeout(settle, slideTransition.settleAfter); animation.start(({ finished }) => { if (finished && timer) clearTimeout(timer); });
    }
    return () => { if (timer) clearTimeout(timer); lifecycle.remove(); animation?.stop(); };
  }, [pageKey, reduced, transition, disabled, progress]);
  const translateX = useMemo(() => progress.interpolate({ inputRange: [0, 1], outputRange: [slideTransition.distance, 0] }), [progress]);
  return <Animated.View style={{ flex: 1, transform: [{ translateX: transition === 'none' || disabled || reduced ? 0 : translateX }] }}>{children}</Animated.View>;
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
const n = themedStyles(() => ({
  scene: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.bg },
  bar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 9, paddingHorizontal: 7 },
  indicator: { position: 'absolute', top: 9, width: 46, height: 29, borderRadius: 999, backgroundColor: colors.selected },
  tab: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48, justifyContent: 'center' },
  icon: { width: 46, height: 29, alignItems: 'center', justifyContent: 'center' },
}));
