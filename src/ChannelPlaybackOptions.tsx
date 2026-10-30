import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Pressable from './FocusPressable';
import { GlassButton, glass } from './PlaybackGlass';
import type { ChannelPlayback } from './viewingPreferences';
import { Button, Notice, colors, u } from './ui';
export default function ChannelPlaybackOptions({ value, onSave, overlay = false, onEditing }: { overlay?: boolean; onEditing?: (active: boolean) => void; value?: ChannelPlayback; onSave: (value?: ChannelPlayback) => Promise<void> }) {
  const [draft, setDraft] = useState<ChannelPlayback>(value || {});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(value || {});
  useEffect(() => { onEditing?.(busy || dirty); return () => onEditing?.(false); }, [busy, dirty, onEditing]);
  const action = overlay ? GlassButton : Button;
  const SaveButton = action;
  async function save(value?: ChannelPlayback) { setBusy(true); setError(''); setSaved(false); try { await onSave(value); setDraft(value || {}); setSaved(true); } catch { setError('Could not save these playback options. Please try again.'); } finally { setBusy(false); } }
  const groups: { key: keyof ChannelPlayback; title: string; choices: [string, string][] }[] = [
    { key: 'player', title: 'Player', choices: [['internal', 'NodeCast'], ['ask', 'Ask each time'], ['vlc', 'External VLC'], ...(Platform.OS === 'ios' ? [['infuse', 'External Infuse']] as [string, string][] : [])] },
    { key: 'engine', title: 'Built-in live engine', choices: [['auto', 'Automatic'], ['native', 'Native'], ['vlc', 'Built-in VLC']] },
    { key: 'format', title: 'Live format', choices: [['auto', 'Automatic'], ['hls', 'HLS'], ['ts', 'MPEG-TS']] },
  ];
  return <ScrollView style={overlay ? {flexGrow:0,flexShrink:1} : undefined} contentContainerStyle={overlay ? glass.content : u.content}><Text style={overlay ? glass.title : u.h2}>Just for this channel</Text><Text style={overlay ? glass.text : u.body}>Other channels keep their defaults. Saved changes apply the next time you open this channel.</Text>{groups.map(group => <View key={group.key} style={[overlay ? { gap: 8 } : u.card, { gap: 8 }]}><Text style={overlay ? glass.label : u.label}>{group.title}</Text>{[['', 'Use default'], ...group.choices].map(([id, label]) => <Pressable key={id} disabled={busy} accessibilityRole="radio" accessibilityLabel={`${group.title}: ${label}`} accessibilityState={{ checked: (draft[group.key] || '') === id }} onPress={() => { setSaved(false); setDraft(current => { const next = { ...current }; if (id) Object.assign(next, { [group.key]: id }); else delete next[group.key]; return next; }); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: (draft[group.key] || '') === id ? (overlay ? '#B9B4F2' : colors.accent) : (overlay ? '#FFFFFF' : colors.text) }}>{(draft[group.key] || '') === id ? '● ' : '○ '}{label}</Text></Pressable>)}</View>)}<SaveButton title="Save playback options" busy={busy} onPress={() => { void save(draft); }} /><SaveButton title="Reset to default" disabled={busy} onPress={() => { void save(); }} />{saved && <Text accessibilityLiveRegion="polite" style={overlay ? glass.text : u.body}>Saved. Applies next time you open this channel.</Text>}{!!error && <Text accessibilityLiveRegion="polite" style={{color:overlay ? "#FAE7C8" : colors.danger}}>{error}</Text>}</ScrollView>;
}
