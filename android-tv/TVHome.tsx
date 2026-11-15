import { Text } from '../src/Typography';
import React from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Pressable from '../src/FocusPressable';
import { Button, Icon, colors, u } from '../src/ui';
import type { Media } from '../src/provider';
import type { ViewingEntry } from '../src/activity';
import { progressPercent, timeLabel } from '../src/activity';
import { MediaImage } from '../src/HomeScreen';
type Props = { connection: React.ReactNode; items: Media[]; recent: ViewingEntry[]; profileName?: string; busy: boolean; showChannelLogos: boolean; onPlay: (item: Media) => void; onLive: () => void; onGuide: () => void; onAdd: () => void; onProfiles: () => void; onConnection: () => void; error?: string };
/** Content-only TV landing page. Provider, history and playback still belong to TVApp. */
export default function TVHome(p: Props) {
  const { height } = useWindowDimensions();
  const item = p.items.find(row => row.kind === 'live') || p.items[0];
  const recent = p.recent.filter(entry => !entry.completed && entry.item.kind !== 'live').slice(0, 8);
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32, gap: 22 }}>
    <View style={[u.between, { paddingHorizontal: 20, paddingTop: 12 }]}><Text style={[u.h2, { fontSize: 20 }]}>NodeCast</Text><Pressable accessibilityRole="button" accessibilityLabel="Manage playlists" onPress={p.onProfiles} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 999 }}><Text numberOfLines={1} style={u.small}>{p.profileName || 'Your playlists'}</Text><Icon name="person-circle-outline" color={colors.text} size={28} /></Pressable></View>
    <View style={{ minHeight: Math.max(220, Math.min(420, height * .44)), borderRadius: 16, overflow: 'hidden', backgroundColor: '#0D4029', justifyContent: 'center' }}>
      {!!(item?.artwork || item?.logo) && (item?.kind!=='live'||p.showChannelLogos) && <><Image source={item.artwork || { uri: item.logo }} resizeMode="cover" style={{ position: 'absolute', top: 0, bottom: 0, left: '28%', right: 0 }} /><LinearGradient pointerEvents="none" colors={['#0A0E0C', '#0A0E0CF2', '#0A0E0C26']} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} /></>}
      <View style={{ padding: 24, maxWidth: 720, gap: 12 }}><View style={[u.row, { gap: 10 }]}>{item?.kind === 'live' && <View style={{ backgroundColor: '#DD3027', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>• LIVE</Text></View>}<Text style={{ color: '#C9F5DD', fontSize: 12, fontWeight: '700', letterSpacing: .6 }}>{item?.group || 'YOUR PERSONAL TV'}</Text></View><Text numberOfLines={2} style={{ color: '#FFFFFF', fontFamily: 'Inter-800', fontWeight: '800', fontSize: height < 620 ? 36 : 48, lineHeight: height < 620 ? 42 : 54, letterSpacing: -1.4 }}>{item?.name || 'A bigger screen. All yours.'}</Text><Text numberOfLines={2} style={{ color: '#D0DAD4', fontSize: 16, lineHeight: 23 }}>{item?.description || (p.profileName ? 'Live channels from your playlist. Ready when you are.' : 'Connect your Xtream Codes server, M3U link or playlist file.')}</Text><View style={[u.row, { flexWrap: 'wrap', marginTop: 4 }]}><Button nativeID="tv-preferred:home-watch-live" title={item ? 'Watch live' : 'Add your playlist'} icon={item ? 'play' : 'add'} onPress={() => item ? p.onPlay(item) : p.onAdd()} /><Button title="TV guide" variant="secondary" onPress={p.onGuide} /><Button title="Browse channels" variant="secondary" onPress={p.onLive} /></View></View>
    </View>
    {!!p.error && <Text style={u.errorText}>{p.error}</Text>}
    <View style={{ gap: 10, paddingHorizontal: 4 }}><Text style={u.h2}>{recent.length ? 'Continue watching' : 'From your playlist'}</Text>{!p.items.length && <Text style={u.body}>{p.busy ? 'Loading your library…' : 'Your channels and films will appear after connecting a playlist.'}</Text>}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, padding: 4 }}>{(recent.length ? recent.map(entry => ({ item: entry.item, entry })) : p.items.slice(0, 10).map(item => ({ item, entry: undefined as ViewingEntry | undefined }))).map(({ item, entry }) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${entry ? 'Resume' : 'Watch'} ${item.name}`} onPress={() => p.onPlay(item)} style={{ width: 202, gap: 6, borderRadius: 12, padding: 4 }}><MediaImage item={item.kind==='live'&&!p.showChannelLogos?{...item,logo:undefined,artwork:undefined}:item} style={{ height: 112 }} />{!!entry && <View style={{ height: 3, backgroundColor: '#42524A', borderRadius: 999 }}><View style={{ height: 3, borderRadius: 999, width: `${progressPercent(entry.position, entry.duration)}%`, backgroundColor: '#1EC677' }} /></View>}<Text numberOfLines={1} style={[u.label, { fontSize: 14 }]}>{item.name}</Text><Text numberOfLines={1} style={[u.small, { fontSize: 12 }]}>{entry ? `${timeLabel(entry.duration - entry.position)} left` : item.group}</Text></Pressable>)}</ScrollView></View>
    <View style={{maxWidth:360}}>{p.connection}</View>
  </ScrollView>;
}
