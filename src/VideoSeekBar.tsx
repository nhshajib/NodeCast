import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Pressable from './FocusPressable';
import { playbackClock } from './activity';
/** Touch seeking stays inside the custom player instead of opening native fullscreen UI. */
export default function VideoSeekBar({ position, duration, onSeek }: { position: number; duration: number; onSeek: (seconds: number) => void }) {
  const node = useRef<React.ComponentRef<typeof Pressable>>(null);
  const left = useRef(0);
  const width = useRef(0);
  const pending = useRef<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const limit = (value: number) => Math.max(0, Math.min(value, Math.max(0, duration - .1)));
  function target(event: GestureResponderEvent) { const {locationX, pageX} = event.nativeEvent; const x = Number.isFinite(locationX) ? locationX : pageX - left.current; return limit(width.current > 0 && Number.isFinite(x) ? x / width.current * duration : position); }
  function finish() { if (pending.current !== null) onSeek(pending.current); pending.current = null; setPreview(null); }
  const value = preview ?? position;
  const percent = `${Math.max(0, Math.min(100, value / duration * 100))}%` as `${number}%`;
  return <Pressable ref={node} accessibilityRole="adjustable" accessibilityLabel="Seek video" accessibilityHint="Tap or drag to a position. Adjust accessibility controls to move thirty seconds." accessibilityValue={{min:0,max:duration,now:value,text:`${playbackClock(value)} of ${playbackClock(duration)}`}} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={value} aria-valuetext={`${playbackClock(value)} of ${playbackClock(duration)}`} accessibilityActions={[{name:'increment',label:'Forward 30 seconds'},{name:'decrement',label:'Rewind 30 seconds'}]} onAccessibilityAction={event => onSeek(limit(position + (event.nativeEvent.actionName === 'increment' ? 30 : -30)))} onLayout={event => {width.current=event.nativeEvent.layout.width;node.current?.measureInWindow(x => {left.current=x;});}} onTouchMove={event => { const next=target(event);pending.current=next;setPreview(next); }} onTouchCancel={() => { pending.current=null;setPreview(null); }} onTouchEnd={finish} onPress={event => onSeek(target(event))} style={{width:'100%',height:32,justifyContent:'center'}}>
    <View pointerEvents="none" style={{height:4,borderRadius:2,backgroundColor:'#FFFFFF40'}}><View style={{height:4,width:percent,borderRadius:2,backgroundColor:'#B9B4F2'}} /></View>
    <View pointerEvents="none" style={{position:'absolute',left:percent,marginLeft:-6,width:12,height:12,borderRadius:6,backgroundColor:'#EAE9EE'}} />
  </Pressable>;
}
