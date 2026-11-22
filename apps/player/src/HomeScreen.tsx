import {H1,H2} from './ui';
import { HomeSkeleton } from './Skeletons';
import { PlainSection } from './AuditPrimitives';
import { Text } from './Typography';
import React, {useEffect,useRef,useState} from 'react';
import { useWindowDimensions, Image, ScrollView, StyleSheet, View } from 'react-native';
import Pressable from './FocusPressable';
import { androidDesign, themedStyles, useThemeChoice } from './theme';
import type { Media, Section } from './provider';
import { progressPercent, timeLabel } from './activity';
import type { ViewingEntry } from './activity';
import type { Profile } from './vault';
import { Button, Icon, LiveDot, SectionHeading, colors, u } from './ui';
type Props = {
  active: Profile | null; demo: boolean; profileCount: number; loading: boolean; liveCount?: number;
  preview: Media[]; liveChannels: Media[]; savedCount: number; playerName: string; error: string;
  onRetry: () => void; onAdd: () => void; onDemo: () => void; onProfiles: () => void; onBrowse: (section: Section) => void;
  continueWatching: ViewingEntry[]; /** Titles the provider dated in the last 30 days, newest first. Empty when no dates exist. */ recentlyAdded?: Media[]; recentChannels: Media[]; onResume: (entry: ViewingEntry) => void; onRemove: (id: string) => void; onClearRecents: () => void;
  onSearch: () => void; onCategory: (group: string) => void; favoriteIds: string[]; onFavorite: (item: Media) => void; onSaved: () => void; onPlay: (item: Media) => void; onPlayers: () => void; network: React.ReactNode;
  scrollRef?: React.ComponentProps<typeof ScrollView>['ref'];
};
export function MediaImage({ item, style }: { item: Media; style?: React.ComponentProps<typeof View>['style'] }) {
  return <View style={[h.image, style]}>{item.artwork || item.logo ? <Image source={item.artwork || { uri: item.logo }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name={item.kind === 'live' ? 'tv-outline' : 'film-outline'} size={30} color={colors.videoMuted} /><Text numberOfLines={1} style={{ color: colors.videoCopy, fontSize: 12 }}>{item.group}</Text></View>}</View>;
}
export default function HomeScreen(p: Props) {
  useThemeChoice();
  const {width}=useWindowDimensions();
  const wide=width>=900;
  const cardWidth=width>=600?224:164;const posterWidth=width>=600?160:128;
  const [pending,setPending]=useState<string|null>(null);const removal=useRef<{id:string;timer:ReturnType<typeof setTimeout>}|null>(null);
  const removeCallback=useRef(p.onRemove);removeCallback.current=p.onRemove;
  useEffect(()=>()=>{if(removal.current){clearTimeout(removal.current.timer);removeCallback.current(removal.current.id)}},[]);
  function remove(id:string){if(removal.current){clearTimeout(removal.current.timer);removeCallback.current(removal.current.id)}setPending(id);removal.current={id,timer:setTimeout(()=>{removeCallback.current(id);removal.current=null;setPending(null)},5000)};}
  function undo(){if(removal.current)clearTimeout(removal.current.timer);removal.current=null;setPending(null);}
  const connected = !!p.active || p.demo;
  const resume = p.continueWatching.find(entry=>entry.item.id!==pending);
  const featured: Media | undefined = resume?.item || p.recentChannels[0] || p.liveChannels[0] || p.preview[0];
  const live = p.liveChannels.slice(0, wide ? 6 : 4);
  return <ScrollView ref={p.scrollRef} testID="home-content" showsVerticalScrollIndicator={false} contentContainerStyle={[u.content, { paddingTop: 8, gap: 24 }, wide && { maxWidth: 1120, paddingHorizontal: 40 }]}>
    


    {p.loading ? <HomeSkeleton/> : connected && featured ? <View style={[h.feature, wide && { flexDirection: 'row', alignItems: 'stretch' }]}>
      <View pointerEvents="none" style={[h.featureArt, wide && { width: '52%', aspectRatio: undefined, minHeight: 240 }]}><MediaImage item={featured} style={{ flex: 1, borderRadius: 12 }} />{featured.kind === 'live' && <View style={h.live}><Text style={h.liveText}>Live</Text></View>}</View>
      <View style={[h.featureCopy, wide && { justifyContent: 'center', paddingLeft: 8 }]}>
        <Text style={h.kicker}>{resume ? 'Continue watching' : featured.kind === 'live' ? 'From your live playlist' : 'From your library'}</Text>
        <Text numberOfLines={2} style={h.featureTitle}>{featured.name}</Text>
        <Text numberOfLines={1} style={h.featureMeta}>{featured.group}{p.demo ? ' · Demo' : ''}</Text>
        {resume && <View style={h.track}><View style={[h.progress, { width: `${progressPercent(resume.position, resume.duration)}%` }]} /></View>}
        <View style={[u.row, { marginTop: 8, gap: 8 }]}><View style={{ flexShrink: 1 }}><Button title={resume ? 'Resume' : featured.kind === 'live' ? 'Watch live' : 'Play'} icon="play" onPress={() => resume ? p.onResume(resume) : p.onPlay(featured)} /></View><Pressable accessibilityRole="button" accessibilityLabel={`${p.favoriteIds.includes(featured.id)?'Remove from':'Save to'} favorites: ${featured.name}`} accessibilityState={{ selected: p.favoriteIds.includes(featured.id) }} onPress={() => p.onFavorite(featured)} style={h.featureFavorite}><Icon name={p.favoriteIds.includes(featured.id)?'heart':'heart-outline'} color={colors.onVideo} size={22} /></Pressable></View>
      </View>
    </View> : connected ? <PlainSection><H2 style={u.h2}>Your playlist is connected</H2><Text style={u.body}>Refresh to load the titles available from your provider.</Text><Button title="Try again" onPress={p.onRetry}/></PlainSection> : <PlainSection><Icon name="tv-outline" size={40} color={colors.secondary} /><H1 style={u.h1}>Your TV, beautifully lit.</H1><Text style={u.body}>Connect your playlist to start watching.</Text><Button title="Connect playlist" icon="add" onPress={p.onAdd} /><Button title="Explore demo" variant="secondary" onPress={p.onDemo} /></PlainSection>}
    {!!p.error && <View style={{gap:8}}><Text accessibilityRole="alert" style={u.errorText}>{p.error}</Text><Button title="Try again" variant="secondary" onPress={p.onRetry}/></View>}
    {pending&&<View accessibilityLiveRegion="polite" style={u.between}><Text style={u.body}>Removed</Text><Button title="Undo" accessibilityLabel="Undo removal from Continue watching" variant="secondary" onPress={undo}/></View>}
    {!androidDesign && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><Pressable accessibilityRole="button" onPress={() => p.onBrowse('live')} style={[h.chip, { backgroundColor: colors.text }]}><Text style={{ color: colors.bg, fontWeight: '600' }}>All</Text></Pressable>{Array.from(new Set(p.liveChannels.map(item => item.group))).slice(0, 6).map(group => <Pressable key={group} accessibilityRole="button" onPress={() => p.onCategory(group)} style={h.chip}><Text numberOfLines={1} style={{ color: colors.text, fontSize: 13 }}>{group}</Text></Pressable>)}</ScrollView>}
    {p.continueWatching.length > 0 && <View style={{ gap: 8 }}><SectionHeading title="Continue watching" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>{p.continueWatching.filter(entry=>entry.item.id!==pending).slice(0, 8).map(entry => <View key={entry.item.id} style={{ width: cardWidth, gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel={`Resume ${entry.item.name}, ${entry.item.group}, ${progressPercent(entry.position,entry.duration)}% watched, ${timeLabel(entry.duration-entry.position)} left`} onPress={() => p.onResume(entry)}><MediaImage item={entry.item} style={{ height: 98 }} /><View style={h.track}><View style={[h.progress, { width: `${progressPercent(entry.position, entry.duration)}%` }]} /></View><Text numberOfLines={1} style={[u.label, { fontSize: 13, marginTop: 8 }]}>{entry.item.name}</Text><Text style={u.small}>{timeLabel(entry.duration - entry.position)} left</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${entry.item.name} from Continue watching`} onPress={() => remove(entry.item.id)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[u.link,{color:colors.danger}]}>Remove</Text></Pressable></View>)}</ScrollView></View>}
    {!p.loading && (p.recentlyAdded?.length || 0) >= 3 && <View style={{ gap: 8 }}><SectionHeading title="Recently added" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>{p.recentlyAdded!.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.group}, added ${new Date(item.added!).toLocaleDateString()}`} onPress={() => p.onPlay(item)} style={{ width: posterWidth, gap: 8 }}><MediaImage item={item} style={{ height: 174 }} /><Text numberOfLines={2} style={[u.label, { fontSize: 13 }]}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable>)}</ScrollView></View>}
    {!p.loading && live.length > 0 && <View style={{ gap: 8 }}><SectionHeading title="Live now" action="See all" onAction={() => p.onBrowse('live')} /><View style={[h.channelList, wide && { flexDirection: 'row', flexWrap: 'wrap' }]}>{live.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Watch ${item.name}, live, ${item.group}`} onPress={() => p.onPlay(item)} style={[h.channel, wide ? { width: '50%', borderTopWidth: index > 1 ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.line } : index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}><View style={h.channelLogo}>{item.logo ? <Image source={{ uri: item.logo }} resizeMode="contain" style={{ width: 36, height: 36 }} /> : <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name.slice(0, 2).toUpperCase()}</Text>}</View><View style={{ flex: 1, gap: 8 }}><Text numberOfLines={1} style={[u.label, { fontSize: 15 }]}>{item.name}</Text><View style={[u.row, { gap: 8 }]}><LiveDot /><Text numberOfLines={1} style={[u.small, { flex: 1 }]}>{item.group}</Text></View></View><Icon name="play" size={18} color={colors.link} /></Pressable>)}</View></View>}
    {p.recentChannels.length > 0 && <View style={{ gap: 8 }}><SectionHeading title="Recently watched" action="Clear recents" onAction={p.onClearRecents} />{p.recentChannels.slice(0, 4).map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => p.onPlay(item)} style={h.channel}><Icon name="play-circle-outline" color={colors.link} /><Text numberOfLines={1} style={[u.label, { flex: 1 }]}>{item.name}</Text></Pressable>)}</View>}
    {!p.loading && p.preview.length > 0 && <View style={{ gap: 8 }}><SectionHeading title={p.savedCount ? 'Your favorites' : 'From your playlist'} action="View all" onAction={p.savedCount ? p.onSaved : () => p.onBrowse('movies')} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>{p.preview.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.kind==='live'?'LIVE, ':''}${item.group}`} onPress={() => p.onPlay(item)} style={{ width: posterWidth, gap: 8 }}><MediaImage item={item} style={{ height: 174 }} /><Text numberOfLines={2} style={[u.label, { fontSize: 13 }]}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable>)}</ScrollView></View>}
  </ScrollView>;
}
const h = themedStyles(() => ({
  search: { minHeight: 44, backgroundColor: colors.pale, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 44, borderRadius: 999, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  feature: { backgroundColor: colors.featured, borderRadius: 16, overflow: 'hidden', padding: 16, gap: 16 },
  featureCopy: { flex: 1, minWidth: 0, gap: 8 }, featureArt: { width: '100%', aspectRatio: 16 / 9, position: 'relative' },
  featureTitle: { color: colors.onVideo, fontFamily: 'Display-500', fontWeight: '500', fontSize: 28, lineHeight: 34 },
  featureMeta: { color: colors.featuredCopy, fontSize: 13, lineHeight: 19 }, kicker: { color: colors.featuredKicker, fontSize: 13, fontWeight: '600', letterSpacing: 0 },
  featureFavorite: { width: 56, height: 56, borderRadius: 999, borderWidth: 1, borderColor: colors.videoBorder, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  image: { backgroundColor: colors.videoSurface, borderRadius: 12, overflow: 'hidden' },
  track: { height: 3, backgroundColor: colors.line, borderRadius: 999, overflow: 'hidden' }, progress: { height: 3, backgroundColor: colors.link, borderRadius: 999 },
  channelList: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, overflow: 'hidden' },
  channel: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, minHeight: 72 },
  channelLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  live: { position: 'absolute', left: 8, top: 8, backgroundColor: colors.live, paddingHorizontal: 8, paddingVertical: 0, borderRadius: 4 }, liveText: { color: colors.onVideo, fontSize: 12, lineHeight: 24, fontWeight: '600' },
}));
