import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { PlayerChoice } from './players';
import { players } from './players';
import type { Profile } from './vault';
import type { LiveFormat } from './livePlayback';
import { liveFormats } from './livePlayback';
import type { LiveEngine } from './playbackPolicy';
import { Icon, Notice, colors, u } from './ui';
export default function PlaybackSettings({ choice, profile, compatibilityAvailable, error, onPlayer, onEngine, onFormat }: {
  choice: PlayerChoice; profile: Profile | null; compatibilityAvailable: boolean; error: string;
  onPlayer: (value: PlayerChoice) => void; onEngine: (value: LiveEngine) => void; onFormat: (value: LiveFormat) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  return <ScrollView contentContainerStyle={u.content} showsVerticalScrollIndicator={false}>
    <View style={{ gap: 8 }}><Text style={u.h1}>Playback</Text><Text style={u.body}>Choose where to watch. You can pick a different player for any title.</Text></View>
    <View style={{ gap: 10 }}><Text style={u.eyebrow}>DEFAULT PLAYER</Text><View style={{ backgroundColor: colors.panel, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>{players.filter(player => Platform.OS !== 'android' || player.id !== 'infuse').map((player, index) => {
      const selected = choice === player.id;
      return <Pressable key={player.id} accessibilityRole="radio" accessibilityLabel={player.name} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={() => onPlayer(player.id)} style={({ pressed }) => ({ minHeight: 78, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: selected ? colors.pale : pressed ? colors.bg : colors.panel, borderTopWidth: index ? 1 : 0, borderTopColor: colors.line })}><View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: selected ? colors.mint : colors.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={player.id === 'internal' ? 'play-circle-outline' : player.id === 'ask' ? 'options-outline' : 'open-outline'} color={colors.text} /></View><View style={{ flex: 1, gap: 3 }}><Text style={u.label}>{player.name}</Text><Text style={u.small}>{player.detail}</Text></View><Icon name={selected ? 'checkmark-circle' : 'ellipse-outline'} color={selected ? colors.accent : '#C9C5D5'} size={22} /></Pressable>;
    })}</View><View style={[u.row, { alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 }]}><Icon name="information-circle-outline" size={17} color={colors.secondary} /><Text style={[u.small, { flex: 1 }]}>External players must be installed separately. We’ll ask before sharing a stream link with them.</Text></View></View>
    {profile && <View style={{ gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel="Live TV options" accessibilityState={{ expanded: advanced }} aria-expanded={advanced} onPress={() => setAdvanced(value => !value)} style={[u.card, u.between, { gap: 12, paddingVertical: 17 }]}><View style={[u.row, { flex: 1 }]}><Icon name="options-outline" color={colors.accent} /><View style={{ flex: 1, gap: 4 }}><Text style={u.label}>Live TV options</Text><Text numberOfLines={1} style={u.small}>Engine & format · {profile.provider.name}</Text></View></View><Icon name={advanced ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondary} /></Pressable>
    {advanced && <><View style={u.card}><Text style={u.h2}>Built-in live player</Text><Text style={u.small}>{compatibilityAvailable ? 'VLC is available in this build. Movies use the native player.' : 'Expo Go uses the platform player. Built-in VLC needs a custom NodeCast build.'}</Text>{([{ id: 'auto', title: 'Automatic', detail: 'Use the best available built-in engine.' }, { id: 'native', title: 'Native device player', detail: 'For compatible HLS and MP4 streams.' }, { id: 'vlc', title: 'Built-in VLC', detail: compatibilityAvailable ? 'Wider support for live stream formats.' : 'Available in a new custom build.' }] as const).map(engine => {
      const disabled = engine.id === 'vlc' && !compatibilityAvailable; const selected = (profile.liveEngine || 'auto') === engine.id;
      return <Pressable key={engine.id} accessibilityRole="radio" accessibilityLabel={`Engine: ${engine.title}`} aria-disabled={disabled} aria-checked={selected} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => onEngine(engine.id)} style={[u.row, { minHeight: 62, alignItems: 'center' }]}><Icon name={disabled ? 'lock-closed-outline' : selected ? 'radio-button-on' : 'radio-button-off'} size={21} color={disabled ? colors.secondary : colors.accent} /><View style={{ flex: 1, gap: 3 }}><Text style={u.label}>{engine.title}</Text><Text style={u.small}>{engine.detail}</Text></View></Pressable>;
    })}</View>{profile.provider.kind === 'xtream' && <View style={u.card}><Text style={u.h2}>Live TV format</Text><Text style={u.small}>Keep Automatic unless your provider recommends a format. Movies are unaffected.</Text>{liveFormats.map(format => <Pressable key={format.id} accessibilityRole="radio" accessibilityLabel={format.title} aria-checked={(profile.liveFormat || 'auto') === format.id} accessibilityState={{ checked: (profile.liveFormat || 'auto') === format.id }} onPress={() => onFormat(format.id)} style={[u.row, { minHeight: 64 }]}><Icon name={(profile.liveFormat || 'auto') === format.id ? 'radio-button-on' : 'radio-button-off'} color={colors.accent} size={21} /><View style={{ flex: 1, gap: 3 }}><Text style={u.label}>{format.title}</Text><Text style={u.small}>{format.detail}</Text></View></Pressable>)}</View>}</>}
    </View>}
    {!!error && <Notice danger>{error}</Notice>}
    <Text style={[u.small, { textAlign: 'center' }]}>Saved on this device. You’re always in control.</Text>
  </ScrollView>;
}
