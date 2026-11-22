import {H1} from './ui';
import { Text } from './Typography';
import Pressable from './FocusPressable';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { appVersion, releases } from './releases';
import { Icon, colors, u } from './ui';
export default function VersionHistory() {
  const [opened, setOpened] = useState<string[]>([appVersion]);
  return <ScrollView contentContainerStyle={u.content} showsVerticalScrollIndicator={false}><View style={{ gap: 8 }}><H1 style={u.h1}>What’s new</H1><Text style={u.body}>Thoughtful improvements, one update at a time.</Text></View>{releases.map((release, index) => {
    const expanded = opened.includes(release.version);
    return <View key={release.version} style={[u.card, { padding: 0, gap: 0, overflow: 'hidden' }]}><Pressable accessibilityRole="button" accessibilityLabel={`Version ${release.version}, ${index===0?"Current, ":""}${release.title}, ${release.date}`} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setOpened(values => values.includes(release.version) ? values.filter(value => value !== release.version) : [...values, release.version])} style={{ padding: 24, gap: 8 }}><View style={u.between}><View style={[u.row, { gap: 8 }]}><Text style={[u.label, { fontSize: 18 }]}>{release.version}</Text>{index === 0 && <View style={{ backgroundColor: colors.text, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 8 }}><Text style={{ color: colors.bg, fontSize: 11, fontWeight: '700', letterSpacing: 0 }}>Current</Text></View>}</View><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.secondary} /></View><Text style={u.label}>{release.title}</Text><Text style={u.small}>{release.date}</Text></Pressable>{expanded && <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>{release.changes.map(change => <View key={change} style={[u.row, { alignItems: 'flex-start', gap: 8 }]}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.secondary, marginTop: 8 }} /><Text style={[u.body, { flex: 1 }]}>{change}</Text></View>)}</View>}</View>;
  })}</ScrollView>;
}
