import React from 'react';
import {isTVBuild} from './FocusPressable';
import { ScrollView, StyleSheet, View } from 'react-native';

/** Keep the native surface mounted outside scrolling content, including during rotation. */
export default function LivePlayerLayout({ fullscreen, video, overlay, children }: {
  fullscreen: boolean; video: React.ReactNode; overlay?: React.ReactNode; children?: React.ReactNode;
}) {
  return <View collapsable={false} style={styles.root}>
    <View collapsable={false} key="video-stage" testID="live-video-stage" style={fullscreen ? styles.fullscreen : styles.inline}>{video}</View>
    <ScrollView style={[styles.details, fullscreen && styles.hidden]} contentContainerStyle={styles.content}
      automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustsScrollIndicatorInsets={false}>
      {children}
    </ScrollView>
    {overlay}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  inline: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden' },
  fullscreen: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#000', overflow: 'hidden' },
  details: { flex: 1, backgroundColor: '#090124' },
  hidden: { display: 'none' },
  content: { flexGrow: 1, justifyContent: 'center', gap: 18, paddingVertical: 24 },
});
