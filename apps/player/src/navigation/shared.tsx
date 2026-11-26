import { IconSlot } from '../AuditPrimitives';
import { Text } from '../Typography';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Pressable from '../FocusPressable';
import { themedStyles } from '../theme';
import type { Media } from '../provider';
import { Icon, colors, u } from '../ui';
import type { IconName } from '../ui';

export function Artwork({ item, poster = false }: { item: Media; poster?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.logo]);
  return <View style={[s.artwork, poster && s.poster]}>{(item.logo || item.artwork) && !failed ? <Image source={item.artwork || { uri: item.logo }} onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} resizeMode={poster ? 'cover' : 'contain'} /> : <><Icon name={item.kind === 'live' ? 'radio-outline' : 'film-outline'} size={poster ? 35 : 26} color={colors.link} />{poster && <Text numberOfLines={3} style={{ fontSize: 16, lineHeight: 21, fontWeight: '600', color: colors.text, textAlign: 'center' }}>{item.name}</Text>}</>}</View>;
}
export function SettingsRow({ icon, title, subtitle, onPress, trailing }: { icon: IconName; title: string; subtitle?: string; onPress: () => void; trailing?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={[title,subtitle,trailing].filter(Boolean).join(', ')} onPress={onPress} style={({ pressed }) => [s.settingsRow, pressed && { backgroundColor: colors.surface, opacity: 1 }]}><IconSlot><Icon name={icon} size={20} color={colors.secondary}/></IconSlot><View style={{ flex: 1, gap: 0 }}><Text style={u.label}>{title}</Text>{subtitle && <Text style={u.small}>{subtitle}</Text>}</View>{trailing && <Text style={u.small}>{trailing}</Text>}<Icon name="chevron-forward" size={16} color={colors.secondary} /></Pressable>;
}
export const s = themedStyles(() => ({
  avatar: { width: 42, height: 42, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  artwork: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', padding: 0, overflow: 'hidden' },
  poster: { width: '100%', height: '100%', borderRadius: 12, padding: 0, gap: 16 },
  settingsGroup: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.panel, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, minHeight: 64, gap: 8 }, rowIcon: { width: 32, height: 48, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  segment: { marginHorizontal: 16, flexDirection: 'row', padding: 8, borderRadius: 12, backgroundColor: colors.surface }, segmentItem: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
  search: { marginHorizontal: 16, marginTop: 8, backgroundColor: colors.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, gap: 8 },
  categories: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 }, category: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, maxWidth: 220, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1 },
  mediaRow: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 72, paddingVertical: 8, paddingHorizontal: 0, marginBottom: 0, borderRadius: 0, borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line, backgroundColor: 'transparent' }, liveTag: { backgroundColor: colors.live, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8 },
  /** Text-only actions keep a 44-point touch target. */
  textAction: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  iconAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
}));
