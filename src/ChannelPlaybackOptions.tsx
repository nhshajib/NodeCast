import React, { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Pressable from './FocusPressable';
import type { ChannelPlayback } from './viewingPreferences';
import { Button, Notice, colors, u } from './ui';
export default function ChannelPlaybackOptions({ value, onSave }: { value?: ChannelPlayback; onSave: (value?: ChannelPlayback) => Promise<void> }) {
  const [draft, setDraft] = useState<ChannelPlayback>(value || {});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  async function save(value?: ChannelPlayback) { setBusy(true); setError(''); setSaved(false); try { await onSave(value); setDraft(value || {}); setSaved(true); } catch { setError('Could not save these playback options. Please try again.'); } finally { setBusy(false); } }
  const groups: { key: keyof ChannelPlayback; title: string; choices: [string, string][] }[] = [
    { key: 'player', title: 'Player', choices: [['internal', 'NodeCast'], ['ask', 'Ask each time'], ['vlc', 'External VLC'], ...(Platform.OS === 'ios' ? [['infuse', 'External Infuse']] as [string, string][] : [])] },
    { key: 'engine', title: 'Built-in live engine', choices: [['auto', 'Automatic'], ['native', 'Native'], ['vlc', 'Built-in VLC']] },
    { key: 'format', title: 'Live format', choices: [['auto', 'Automatic'], ['hls', 'HLS'], ['ts', 'MPEG-TS']] },
  ];
  return <ScrollView contentContainerStyle={u.content}><Text style={u.h2}>Just for this channel</Text><Text style={u.body}>Other channels keep their defaults. Saved changes apply the next time you open this channel.</Text>{groups.map(group => <View key={group.key} style={[u.card, { gap: 8 }]}><Text style={u.label}>{group.title}</Text>{[['', 'Use default'], ...group.choices].map(([id, label]) => <Pressable key={id} disabled={busy} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: (draft[group.key] || '') === id }} onPress={() => { setSaved(false); setDraft(current => { const next = { ...current }; if (id) Object.assign(next, { [group.key]: id }); else delete next[group.key]; return next; }); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: (draft[group.key] || '') === id ? colors.accent : colors.text }}>{(draft[group.key] || '') === id ? '● ' : '○ '}{label}</Text></Pressable>)}</View>)}<Button title="Save playback options" busy={busy} onPress={() => { void save(draft); }} /><Button title="Reset to default" variant="secondary" disabled={busy} onPress={() => { void save(); }} />{saved && <Notice>Saved. Applies next time you open this channel.</Notice>}{!!error && <Notice danger>{error}</Notice>}</ScrollView>;
}
