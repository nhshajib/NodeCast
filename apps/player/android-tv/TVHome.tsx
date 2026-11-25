import {favoriteLiveChannel,homeGreeting} from '../src/homePresentation';
import {HomeSkeleton} from '../src/Skeletons';
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
type Props = { items: Media[]; favorites: Media[]; recent: (Omit<ViewingEntry, 'item'> & { item: Media })[]; profileName?: string; busy: boolean; loadStep?: string; showChannelLogos: boolean; onPlay: (item: Media) => void; onLive: () => void; onGuide: () => void; onAdd: () => void; onProfiles: () => void; error?: string; onRetry: () => void };

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
  const item=favoriteLiveChannel(p.items,p.favorites.map(item=>item.id));
  const heroLogo=item&&p.showChannelLogos?(item.artwork||(item.logo?{uri:item.logo}:undefined)):undefined;
  const recentIds = new Set(recent.map(entry => entry.item.id));
  const playlist = p.items.filter(row => !recentIds.has(row.id)).slice(0, 12);
  const loading = p.busy && !p.items.length;
  return <View style={{ flex: 1 }}>
    <ScrollView nativeID="tv-scope:home" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Manage playlists" onPress={p.onProfiles} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 999 }}><Text numberOfLines={1} style={u.small}>{p.profileName || 'Your playlists'}</Text><Icon name="person-circle-outline" color={colors.text} size={28} /></Pressable></View>
      {loading?<HomeSkeleton/>:<View style={{ minHeight: item?Math.max(220, Math.min(340, height * .4)):0, borderRadius: item?16:0, overflow: 'hidden', backgroundColor: item?colors.featured:'transparent', justifyContent: 'center' }}>
        {!!heroLogo&&<Image source={heroLogo} resizeMode="contain" resizeMethod="resize" style={{position:'absolute',top:32,bottom:32,right:48,width:'28%'}}/>}
        <View style={{ padding: 24, maxWidth: 720, gap: 16 }}>
          {item&&<View style={[u.row, { gap: 8 }]}>{item?.kind === 'live' && <View style={{ backgroundColor: colors.live, paddingHorizontal: 8, borderRadius: 4 }}><Text style={{ color: colors.onVideo, fontWeight: '600', fontSize: 16, lineHeight: 32 }}>Live</Text></View>}<Text style={{ color: colors.videoLink, fontSize: 18, fontWeight: '600' }}>{item?'Your favorite channel':''}</Text></View>}
          <Text numberOfLines={2} style={{ color: item?colors.onVideo:colors.text, fontFamily: 'Display-500', fontWeight: '500', fontSize: 44, lineHeight: 52 }}>{item?.name || homeGreeting(new Date().getHours())}</Text>
          {item&&<Text numberOfLines={2} style={{ color: colors.onVideoSecondary, fontSize: 16, lineHeight: 23 }}>{groupLabel(item.group)}</Text>}
          {(!item&&p.profileName)?null:<View style={[u.row, { flexWrap: 'wrap', marginTop: 8 }]}><Button nativeID="tv-preferred:home-watch-live" title={item?'Watch live':p.profileName?'Browse channels':'Add your playlist'} icon={item ? 'play' : 'add'} onPress={() => item ? p.onPlay(item) : p.profileName?p.onLive():p.onAdd()} /><Button title="TV guide" variant="secondary" onPress={p.onGuide} /><Button title="Browse channels" variant="secondary" onPress={p.onLive} /></View>}
        </View>
      </View>}
      {p.busy&&!loading&&<View accessibilityLiveRegion="polite" style={[u.row,{gap:8}]}><ActivityIndicator color={colors.link}/><Text style={u.small}>{p.loadStep||'Updating your library…'}</Text></View>}
      {!!p.error && <View style={{ gap: 16 }}><Text accessibilityRole="alert" style={u.errorText}>{p.error}</Text><Button title="Try again" onPress={p.onRetry} /><Button title="Manage playlists" variant="secondary" onPress={p.onProfiles} /></View>}
      {!p.items.length && !loading && <Text style={u.body}>Your channels and films will appear after connecting a playlist.</Text>}
      <Row title="Continue watching" entries={recent.map(entry => ({ item: entry.item, entry: entry as unknown as ViewingEntry }))} logos={p.showChannelLogos} onPlay={p.onPlay} />
      <Row title="Favorites" entries={p.favorites.filter(favorite=>favorite.id!==item?.id).slice(0, 12).map(item => ({ item }))} logos={p.showChannelLogos} onPlay={p.onPlay} />
      <Row title="From your playlist" entries={playlist.map(item => ({ item }))} logos={p.showChannelLogos} onPlay={p.onPlay} />
    </ScrollView>
    {/* Content scrolls under a soft fade instead of being cut by a hard edge. */}
    <LinearGradient pointerEvents="none" colors={[colors.bg, colors.bg + '00']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24 }} />
  </View>;
}
