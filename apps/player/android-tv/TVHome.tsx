import {H2} from '../src/ui';
import { Text } from '../src/Typography';
import React from 'react';
import { ActivityIndicator, Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Pressable from '../src/FocusPressable';
import { Button, Icon, colors, u } from '../src/ui';
import type { Media } from '../src/provider';
import type { ViewingEntry } from '../src/activity';
import { progressPercent, timeLabel } from '../src/activity';
import { groupLabel } from '../src/groups';
type Props = { connection?: React.ReactNode; items: Media[]; favorites: Media[]; recent: (Omit<ViewingEntry, 'item'> & { item: Media })[]; profileName?: string; busy: boolean; loadStep?: string; showChannelLogos: boolean; onPlay: (item: Media) => void; onLive: () => void; onGuide: () => void; onAdd: () => void; onProfiles: () => void; onConnection?: () => void; error?: string; onRetry: () => void };

/** A logo that keeps its proportions (contain), with initials only when there is no logo. */
function Artwork({ item, logos, height }: { item: Media; logos: boolean; height: number }) {
  const logo = item.kind === 'live' ? (logos ? item.logo : undefined) : item.logo;
  return <View style={{ height, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: item.kind === 'live' ? 16 : 0 }}>
    {logo ? <Image source={{ uri: logo }} resizeMode={item.kind === 'live' ? 'contain' : 'cover'} resizeMethod="resize" style={{ width: '100%', height: '100%' }} />
      : <Text style={{ fontSize: 28, fontWeight: '700', color: colors.link }}>{item.name.trim().slice(0, 2).toUpperCase()}</Text>}
  </View>;
}
function Row({ title, entries, logos, onPlay }: { title: string; entries: { item: Media; entry?: ViewingEntry }[]; logos: boolean; onPlay: (item: Media) => void }) {
  if (!entries.length) return null;
  return <View style={{ gap: 8 }}><H2 style={u.h2}>{title}</H2>
    {/* Vertical padding leaves room for a focused, scaled card and its ring. */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingVertical: 16 }}>{entries.map(({ item, entry }) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${entry && item.kind !== 'live' ? 'Resume' : 'Watch'} ${item.name}`} onPress={() => onPlay(item)} style={{ width: 202, gap: 8, borderRadius: 16, padding: 8 }}>
      <Artwork item={item} logos={logos} height={112} />
      {!!entry && item.kind !== 'live' && <View style={{ height: 3, backgroundColor: colors.artPlaceholder, borderRadius: 999 }}><View style={{ height: 3, borderRadius: 999, width: `${progressPercent(entry.position, entry.duration)}%`, backgroundColor: colors.primary }} /></View>}
      <Text numberOfLines={1} style={[u.label, { fontSize: 18 }]}>{item.name}</Text>
      <Text numberOfLines={1} style={[u.small, { fontSize: 16 }]}>{entry && item.kind !== 'live' && entry.duration > 0 ? `${timeLabel(entry.duration - entry.position)} left` : groupLabel(item.group)}</Text>
    </Pressable>)}</ScrollView>
  </View>;
}
/** Content-only TV landing page. Provider, history and playback still belong to TVApp. */
export default function TVHome(p: Props) {
  const { height } = useWindowDimensions();
  const recent = p.recent.filter(entry => !entry.completed).slice(0, 12);
  // The hero is what you watched last; otherwise the first channel in the playlist.
  const item = recent[0]?.item || p.items.find(row => row.kind === 'live') || p.items[0];
  const heroLogo = item && (item.kind !== 'live' || p.showChannelLogos) ? item.artwork || (item.logo ? { uri: item.logo } : undefined) : undefined;
  const recentIds = new Set(recent.map(entry => entry.item.id));
  const playlist = p.items.filter(row => !recentIds.has(row.id)).slice(0, 12);
  const loading = p.busy && !p.items.length;
  return <View style={{ flex: 1 }}>
    <ScrollView nativeID="tv-scope:home" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Manage playlists" onPress={p.onProfiles} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 999 }}><Text numberOfLines={1} style={u.small}>{p.profileName || 'Your playlists'}</Text><Icon name="person-circle-outline" color={colors.text} size={28} /></Pressable></View>
      <View style={{ minHeight: Math.max(220, Math.min(340, height * .4)), borderRadius: 16, overflow: 'hidden', backgroundColor: colors.featured, justifyContent: 'center' }}>
        {!!heroLogo && <><Image source={heroLogo} resizeMode={item?.kind === 'live' ? 'contain' : 'cover'} resizeMethod="resize" style={item?.kind === 'live' ? { position: 'absolute', top: 32, bottom: 32, right: 48, width: '28%' } : { position: 'absolute', top: 0, bottom: 0, left: '28%', right: 0 }} />{item?.kind !== 'live' && <LinearGradient pointerEvents="none" colors={[colors.videoBackdrop, colors.videoArtBottom, colors.videoArtTop]} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />}</>}
        <View style={{ padding: 24, maxWidth: 720, gap: 16 }}>
          <View style={[u.row, { gap: 8 }]}>{item?.kind === 'live' && <View style={{ backgroundColor: colors.live, paddingHorizontal: 8, borderRadius: 4 }}><Text style={{ color: colors.onVideo, fontWeight: '600', fontSize: 16, lineHeight: 32 }}>Live</Text></View>}<Text style={{ color: colors.videoLink, fontSize: 18, fontWeight: '600' }}>{recent[0] ? 'Last watched' : item ? groupLabel(item.group) : 'Your personal TV'}</Text></View>
          <Text numberOfLines={2} style={{ color: colors.onVideo, fontFamily: 'Display-500', fontWeight: '500', fontSize: 44, lineHeight: 52 }}>{item?.name || 'A bigger screen. All yours.'}</Text>
          <Text numberOfLines={2} style={{ color: colors.onVideoSecondary, fontSize: 16, lineHeight: 23 }}>{item?.description || (item ? groupLabel(item.group) : p.profileName ? 'Live channels from your playlist. Ready when you are.' : 'Connect your Xtream Codes server, M3U link or playlist file.')}</Text>
          {loading ? <View accessibilityLiveRegion="polite" style={[u.row, { gap: 16, marginTop: 8 }]}><ActivityIndicator size="large" color={colors.mint} /><Text style={{ color: colors.onVideo, fontSize: 18, fontWeight: '600' }}>{p.loadStep || 'Loading your library…'}</Text></View>
            : <View style={[u.row, { flexWrap: 'wrap', marginTop: 8 }]}><Button nativeID="tv-preferred:home-watch-live" title={item ? (item.kind === 'live' ? 'Watch live' : item.kind === 'series' ? 'Open series' : 'Play') : 'Add your playlist'} icon={item ? 'play' : 'add'} onPress={() => item ? p.onPlay(item) : p.onAdd()} /><Button title="TV guide" variant="secondary" onPress={p.onGuide} /><Button title="Browse channels" variant="secondary" onPress={p.onLive} /></View>}
        </View>
      </View>
      {!!p.error && <View style={{ gap: 16 }}><Text accessibilityRole="alert" style={u.errorText}>{p.error}</Text><Button title="Try again" onPress={p.onRetry} /><Button title="Manage playlists" variant="secondary" onPress={p.onProfiles} /></View>}
      {!p.items.length && !loading && <Text style={u.body}>Your channels and films will appear after connecting a playlist.</Text>}
      <Row title="Continue watching" entries={recent.map(entry => ({ item: entry.item, entry: entry as unknown as ViewingEntry }))} logos={p.showChannelLogos} onPlay={p.onPlay} />
      <Row title="Favorites" entries={p.favorites.slice(0, 12).map(item => ({ item }))} logos={p.showChannelLogos} onPlay={p.onPlay} />
      <Row title="From your playlist" entries={playlist.map(item => ({ item }))} logos={p.showChannelLogos} onPlay={p.onPlay} />
    </ScrollView>
    {/* Content scrolls under a soft fade instead of being cut by a hard edge. */}
    <LinearGradient pointerEvents="none" colors={[colors.bg, colors.bg + '00']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24 }} />
  </View>;
}
