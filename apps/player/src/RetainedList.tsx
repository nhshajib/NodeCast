import React, { useRef } from 'react';
import { FlatList } from 'react-native';
import type { FlatListProps } from 'react-native';
/** Offsets belong to the caller's profile/tab/category key; never shared globally. */
export default function RetainedList<T>({ memory, memoryKey, ...props }: FlatListProps<T> & { memory: Map<string, number>; memoryKey: string }) {
  const list = useRef<FlatList<T>>(null);
  const restored = useRef(false);
  const target = useRef(memory.get(memoryKey) || 0);
  return <FlatList {...props} ref={list} onScroll={event => { memory.set(memoryKey, event.nativeEvent.contentOffset.y); if (memory.size > 300) memory.delete(memory.keys().next().value!); props.onScroll?.(event); }} scrollEventThrottle={100} onContentSizeChange={(w, h) => { if (!restored.current && h > 0) { restored.current = true; list.current?.scrollToOffset({ offset: target.current, animated: false }); } props.onContentSizeChange?.(w, h); }} />;
}
