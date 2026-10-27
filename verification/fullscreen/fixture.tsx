// Geometry fixture, not a real VLC render. Uses the production layout with a 16:9 test card.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import LivePlayerLayout from '../../src/LivePlayerLayout';
declare global { interface Window { surfaceMounts: number; } }
function Surface() {
  const { width, height } = useWindowDimensions();
  useEffect(() => { window.surfaceMounts = (window.surfaceMounts || 0) + 1; }, []);
  const w = Math.min(width, height * 16 / 9);
  return <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}><View testID="test-card" style={{ width: w, height: w * 9 / 16, backgroundColor: '#B9B4F2' }}>
    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner, i) => <View key={corner} testID={corner} style={{ position: 'absolute', [i < 2 ? 'top' : 'bottom']: 0, [i % 2 ? 'right' : 'left']: 0, padding: 8, backgroundColor: '#FAE7C8' }}><Text>{corner}</Text></View>)}
  </View></View>;
}
export default function Fixture() {
  const [fullscreen, setFullscreen] = useState(false);
  return <LivePlayerLayout fullscreen={fullscreen} video={<Surface />} overlay={fullscreen && <Pressable testID="exit" onPress={() => setFullscreen(false)} style={{ position: 'absolute', top: 60, left: 50, padding: 15, backgroundColor: '#fff' }}><Text>Exit fullscreen</Text></Pressable>}>
    <Text>Player details</Text><Pressable testID="enter" onPress={() => setFullscreen(true)}><Text>Enter fullscreen</Text></Pressable>
    <View style={{ height: 1500 }} /><Text>End of long settings</Text>
  </LivePlayerLayout>;
}
