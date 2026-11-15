import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState, Animated, Easing, Platform } from 'react-native';
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
/** Phone screens report native-stack/tab focus here so per-screen work (IP checks) pauses off-screen. */
export const ScreenFocusProvider = ScreenFocus.Provider;
