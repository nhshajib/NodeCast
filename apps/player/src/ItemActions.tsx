import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from './Typography';
import Pressable from './FocusPressable';
import { Button, Field, Icon, Notice, colors, u } from './ui';
import type { Media } from './provider';
import type { MediaList } from './organization';

/** One sheet for everything you can do with a title: favourite, lists, hide, and channel playback. */
export default function ItemActions({ item, favorite, lists, hidden, onFavorite, onToggleList, onCreateList, onToggleHidden, onPlaybackOptions }: {
  item: Media; favorite: boolean; lists: MediaList[]; hidden: boolean;
  onFavorite: () => void; onToggleList: (listId: string) => Promise<void>; onCreateList: (name: string) => Promise<void>; onToggleHidden: () => Promise<void>; onPlaybackOptions?: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = (task: () => Promise<void>) => { setError(''); setBusy(true); void task().catch(e => setError(e instanceof Error ? e.message : 'Could not save this change.')).finally(() => setBusy(false)); };
  const row = (key: string, icon: React.ComponentProps<typeof Icon>['name'], title: string, checked: boolean | null, onPress: () => void, role: 'checkbox' | 'button' = 'checkbox') =>
    <Pressable key={key} accessibilityRole={role} accessibilityLabel={title} accessibilityState={checked === null ? { disabled: busy } : { checked, disabled: busy }} disabled={busy} haptic="selection" onPress={onPress} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16 }}>
      <Icon name={icon} size={20} color={colors.link} /><Text style={[u.label, { flex: 1, fontWeight: '500' }]}>{title}</Text>
      {checked !== null && <Icon name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={checked ? colors.link : colors.secondary} />}
    </Pressable>;
  return <ScrollView contentContainerStyle={[u.content, { gap: 16 }]} keyboardShouldPersistTaps="handled">
    <View style={{ gap: 8 }}><Text numberOfLines={2} style={u.h2}>{item.name}</Text><Text style={u.small}>{item.group}</Text></View>
    <View style={{ borderRadius: 16, backgroundColor: colors.panel, overflow: 'hidden' }}>{row('favorite', favorite ? 'heart' : 'heart-outline', 'Favorite', favorite, onFavorite)}</View>
    <Text accessibilityRole="header" style={u.eyebrow}>Lists</Text>
    {lists.length > 0 && <View style={{ borderRadius: 16, backgroundColor: colors.panel, overflow: 'hidden' }}>{lists.map((list, index) => <View key={list.id} style={index ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>{row(list.id, 'albums-outline', list.name, list.items.includes(item.id), () => run(() => onToggleList(list.id)))}</View>)}</View>}
    <View style={{ gap: 8 }}><Field label="New list" value={name} onChangeText={setName} placeholder="For example, Weekend films" maxLength={60} returnKeyType="done" onSubmitEditing={() => name.trim() && run(async () => { await onCreateList(name); setName(''); })} /><Button title="Create list and add" variant="secondary" disabled={!name.trim() || busy} onPress={() => run(async () => { await onCreateList(name); setName(''); })} /></View>
    <View style={{ borderRadius: 16, backgroundColor: colors.panel, overflow: 'hidden' }}>
      {row('hidden', hidden ? 'eye-outline' : 'eye-off-outline', hidden ? 'Show in browsing and search' : 'Hide from browsing and search', null, () => run(onToggleHidden), 'button')}
      {onPlaybackOptions && <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>{row('playback', 'options-outline', 'Channel playback options', null, onPlaybackOptions, 'button')}</View>}
    </View>
    <Text style={u.small}>{hidden ? 'Hidden titles stay in your favourites and lists.' : 'Hiding keeps this title in your favourites and lists. Family controls always apply.'}</Text>
    {!!error && <Notice danger>{error}</Notice>}
  </ScrollView>;
}
