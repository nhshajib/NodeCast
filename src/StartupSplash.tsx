import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NativeSplash from 'expo-splash-screen';

/** Native launch artwork hands off to this animation; it never waits for a provider or IP lookup. */
export default function StartupSplash({ ready, onFinish, nativeHandoff = true }: {
  ready: boolean; onFinish: () => void; nativeHandoff?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [laidOut, setLaidOut] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const alive = useRef(true);
  const handoff = useRef(false);
  const finished = useRef(false);
  const finish = useRef(onFinish); finish.current = onFinish;
  const lift = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    alive.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive.current) setReduceMotion(value); }).catch(() => { if (alive.current) setReduceMotion(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive.current = false; sub.remove(); };
  }, []);
  useEffect(() => {
    if (!layoutReady || !imageReady) return;
    async function releaseNative() {
      if (handoff.current) return;
      handoff.current = true;
      // The first JS frame exactly matches the native image size, center and background.
      if (nativeHandoff) { try { await NativeSplash.hideAsync(); } catch { /* The JS intro also works when the native launch screen is unavailable. */ } }
      if (alive.current) setLaidOut(true);
    }
    void releaseNative();
  }, [layoutReady, imageReady, nativeHandoff]);
  useEffect(() => {
    if (!laidOut || reduceMotion === null) return;
    let cancelled = false;
    const timing = (value: Animated.Value, toValue: number, duration: number) => Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    lift.setValue(reduceMotion ? 1 : 0); reveal.setValue(reduceMotion ? 1 : 0); halo.setValue(0);
    const animation = reduceMotion ? Animated.delay(400) : Animated.sequence([
      Animated.delay(80),
      Animated.parallel([
        timing(lift, 1, 760),
        Animated.sequence([Animated.delay(220), timing(reveal, 1, 620)]),
        timing(halo, 1, 1100),
      ]),
      Animated.delay(250),
    ]);
    animation.start(({ finished: complete }) => { if (complete && !cancelled) setIntroDone(true); });
    return () => { cancelled = true; animation.stop(); };
  }, [laidOut, reduceMotion, lift, reveal, halo]);
  useEffect(() => {
    if (!ready || !introDone || finished.current) return;
    const animation = Animated.timing(exit, { toValue: 0, duration: reduceMotion ? 100 : 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished: complete }) => { if (complete && alive.current && !finished.current) { finished.current = true; finish.current(); } });
    return () => animation.stop();
  }, [ready, introDone, reduceMotion, exit]);
  const rise = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -68] });
  return <Animated.View testID="startup-splash" onLayout={() => setLayoutReady(true)} accessibilityViewIsModal style={[s.root, { opacity: exit }]}>
    <StatusBar barStyle="light-content" />
    <View pointerEvents="none" style={s.center}>
      <Animated.View style={[s.halo, { opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0, .3] }), transform: [{ translateY: rise }, { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [.82, 1.12] }) }] }]} />
      <Animated.View style={[s.orbit, { opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0, .12] }), transform: [{ translateY: rise }, { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [.8, 1.2] }) }] }]} />
      <Animated.View testID="startup-mark" style={[s.mark, { transform: [{ translateY: rise }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, .9] }) }] }]}>
        <Image onLoad={() => setImageReady(true)} onError={() => setImageReady(true)} accessibilityIgnoresInvertColors source={require('../assets/brand/nodecast-mark.png')} style={s.image} />
      </Animated.View>
      <Animated.View style={[s.copy, { opacity: reveal, transform: [{ translateY: reduceMotion ? 0 : reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
        <Text accessibilityRole="header" style={s.wordmark}>NodeCast</Text>
        <View style={s.rule} />
        <Text style={s.tagline}>Your world. Now playing.</Text>
      </Animated.View>
    </View>
    <Animated.Text style={[s.signature, { bottom: Math.max(insets.bottom, 20) + 30, opacity: reveal }]}>YOUR PLAYLIST. YOUR SPACE.</Animated.Text>
  </Animated.View>;
}
const s = StyleSheet.create({
  root: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: '#090124' },
  center: { flex: 1 },
  mark: { position: 'absolute', width: 200, height: 200, top: '50%', left: '50%', marginLeft: -100, marginTop: -100 },
  image: { width: 200, height: 200, borderRadius: 100 },
  halo: { position: 'absolute', width: 196, height: 196, borderRadius: 98, top: '50%', left: '50%', marginLeft: -98, marginTop: -98, borderWidth: 1, borderColor: '#B9B4F2' },
  orbit: { position: 'absolute', width: 210, height: 210, borderRadius: 105, top: '50%', left: '50%', marginLeft: -105, marginTop: -105, borderWidth: 1, borderColor: '#FAE7C8' },
  copy: { position: 'absolute', top: '50%', marginTop: 50, left: 20, right: 20, alignItems: 'center', gap: 17 },
  wordmark: { fontFamily: 'CrimsonText', fontSize: 62, lineHeight: 72, letterSpacing: -2, color: '#FAE7C8' },
  rule: { width: 28, height: 1, backgroundColor: '#B9B4F2', opacity: .7 },
  tagline: { fontSize: 14, lineHeight: 21, letterSpacing: .5, color: '#C9C5DB' },
  signature: { position: 'absolute', left: 20, right: 20, textAlign: 'center', color: '#9790B1', fontSize: 9, lineHeight: 16, letterSpacing: 2.4 },
});
