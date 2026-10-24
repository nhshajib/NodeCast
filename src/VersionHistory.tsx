import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { appVersion, releases } from './releases';
import { Icon, colors, u } from './ui';
export default function VersionHistory() {
  const [opened, setOpened] = useState<string[]>([appVersion]);
  return <ScrollView contentContainerStyle={u.content} showsVerticalScrollIndicator={false}><View style={{ gap: 8 }}><Text style={u.h1}>What’s new</Text><Text style={u.body}>Thoughtful improvements, one update at a time.</Text></View>{releases.map((release, index) => {
    const expanded = opened.includes(release.version);
    return <View key={release.version} style={[u.card, { padding: 0, gap: 0, overflow: 'hidden' }, index === 0 && { backgroundColor: colors.pale, borderColor: '#DED9F3' }]}><Pressable accessibilityRole="button" accessibilityLabel={`Version ${release.version}`} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setOpened(values => values.includes(release.version) ? values.filter(value => value !== release.version) : [...values, release.version])} style={{ padding: 20, gap: 10 }}><View style={u.between}><View style={[u.row, { gap: 8 }]}><Text style={[u.label, { fontSize: 18 }]}>{release.version}</Text>{index === 0 && <View style={{ backgroundColor: colors.text, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: .8 }}>CURRENT</Text></View>}</View><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.secondary} /></View><Text style={u.label}>{release.title}</Text><Text style={u.small}>{release.date}</Text></Pressable>{expanded && <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>{release.changes.map(change => <View key={change} style={[u.row, { alignItems: 'flex-start', gap: 10 }]}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, marginTop: 9 }} /><Text style={[u.body, { flex: 1 }]}>{change}</Text></View>)}</View>}</View>;
  })}</ScrollView>;
}
