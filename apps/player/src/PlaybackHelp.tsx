import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from './Typography';
import Pressable from './FocusPressable';
import { colors } from './ui';
import { playbackHelp } from './playbackAssist';
import type { FailureKind } from './recovery';

/** "What can I do?" under a playback error: collapsed by default, one primary recovery action stays above it. */
export default function PlaybackHelp({ kind }: { kind: FailureKind }) {
  const [open, setOpen] = useState(false);
  const help = playbackHelp(kind);
  return <View style={{ alignSelf: 'stretch', gap: 8 }}>
    <Pressable nativeID="tv-control:playback-help" accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="What can I do?" onPress={() => setOpen(value => !value)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 16 }}><Text style={{ color: colors.videoLink, fontWeight: '600' }}>{open ? 'Hide help' : 'What can I do?'}</Text></Pressable>
    {open && <View style={{ gap: 8 }}><Text style={{ color: colors.onVideo, fontWeight: '600' }}>{help.title}</Text>{help.steps.map((step, index) => <Text key={step} style={{ color: colors.videoSecondary }}>{index + 1}. {step}</Text>)}<Text style={{ color: colors.videoMuted, fontSize: 13 }}>{help.uncertainty}</Text></View>}
  </View>;
}
