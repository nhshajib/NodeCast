import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from './Typography';
import { Button, colors } from './ui';
import { isTVBuild } from './FocusPressable';

export const countdownSeconds = 10;
/** Optional autoplay: a cancellable ten-second countdown. The caller rechecks profile, family access and availability when it fires. */
export default function NextEpisodeCountdown({ title, onPlay, onCancel }: { title: string; onPlay: () => void; onCancel: () => void }) {
  const [left, setLeft] = useState(countdownSeconds);
  const play = useRef(onPlay); play.current = onPlay;
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = countdownSeconds - Math.floor((Date.now() - started) / 1000);
      if (remaining <= 0) { clearInterval(timer); play.current(); } else setLeft(remaining);
    }, 250);
    return () => clearInterval(timer);
  }, []);
  return <View accessibilityViewIsModal nativeID="tv-trap:next-episode-countdown" accessibilityLiveRegion="polite" style={{ position: 'absolute', right: isTVBuild ? 48 : 16, bottom: isTVBuild ? 48 : 96, maxWidth: 420, padding: 24, gap: 16, borderRadius: 20, backgroundColor: colors.videoScrim, borderWidth: 1, borderColor: colors.videoBorder }}>
    <Text style={{ color: colors.videoSecondary, fontSize: isTVBuild ? 18 : 14 }}>Next episode in {left}</Text>
    <Text numberOfLines={2} style={{ color: colors.onVideo, fontSize: isTVBuild ? 24 : 18, fontWeight: '600' }}>{title}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}><Button nativeID="tv-preferred:countdown-play" title="Play now" icon="play" onPress={onPlay} /><Button title="Cancel" variant="secondary" onPress={onCancel} /></View>
  </View>;
}
