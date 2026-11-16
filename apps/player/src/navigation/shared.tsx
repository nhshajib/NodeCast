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
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [s.settingsRow, pressed && { backgroundColor: colors.surface, opacity: 1 }]}><View style={s.rowIcon}><Icon name={icon} size={21} /></View><View style={{ flex: 1, gap: 4 }}><Text style={u.label}>{title}</Text>{subtitle && <Text style={u.small}>{subtitle}</Text>}</View>{trailing && <Text style={u.small}>{trailing}</Text>}<Icon name="chevron-forward" size={16} color={colors.secondary} /></Pressable>;
}
export const s = themedStyles(() => ({
  avatar: { width: 42, height: 42, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale, borderColor: '#E6E3DA', borderWidth: 1 },
  artwork: { width: 58, height: 62, borderRadius: 16, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', padding: 7, overflow: 'hidden' },
  poster: { width: '100%', height: '100%', borderRadius: 20, padding: 0, gap: 16 },
  settingsGroup: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.panel, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 17, minHeight: 78, gap: 12 }, rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  segment: { marginHorizontal: 20, flexDirection: 'row', padding: 5, borderRadius: 16, backgroundColor: colors.line }, segmentItem: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  search: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingLeft: 15, paddingRight: 4, gap: 4 },
  categories: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 }, category: { backgroundColor: colors.panel, maxWidth: 220, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  chip: { borderRadius: 999, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1 },
  mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 86, padding: 14, marginBottom: 10, borderRadius: 16, backgroundColor: colors.panel }, liveTag: { backgroundColor: colors.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  /** Text-only actions keep a 44-point touch target. */
  textAction: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  iconAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
}));
