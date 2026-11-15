import { Text } from './Typography';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { androidDesign, themedStyles, useThemeChoice } from './theme';
import type { Media, Section } from './provider';
import { progressPercent, timeLabel } from './activity';
import type { ViewingEntry } from './activity';
import type { Profile } from './vault';
import { Button, Icon, SectionHeading, colors, u } from './ui';
type Props = {
  active: Profile | null; demo: boolean; profileCount: number; loading: boolean; liveCount?: number;
  preview: Media[]; liveChannels: Media[]; savedCount: number; playerName: string; error: string;
  onAdd: () => void; onDemo: () => void; onProfiles: () => void; onBrowse: (section: Section) => void;
  continueWatching: ViewingEntry[]; recentChannels: Media[]; onResume: (entry: ViewingEntry) => void; onRemove: (id: string) => void; onClearRecents: () => void;
  onSearch: () => void; onCategory: (group: string) => void; favoriteIds: string[]; onFavorite: (item: Media) => void; onSaved: () => void; onPlay: (item: Media) => void; onPlayers: () => void; network: React.ReactNode;
};
export function MediaImage({ item, style }: { item: Media; style?: React.ComponentProps<typeof View>['style'] }) {
  return <View style={[h.image, style]}>{item.artwork || item.logo ? <Image source={item.artwork || { uri: item.logo }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name={item.kind === 'live' ? 'tv-outline' : 'film-outline'} size={30} color="#A3ADA7" /><Text numberOfLines={1} style={{ color: '#E8EEEA', fontSize: 12 }}>{item.group}</Text></View>}</View>;
}
export default function HomeScreen(p: Props) {
  useThemeChoice();
  const connected = !!p.active || p.demo;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const resume = p.continueWatching[0];
  const featured: Media | undefined = resume?.item || p.recentChannels[0] || p.liveChannels[0] || p.preview[0];
  const live = p.liveChannels.slice(0, 4);
  return <ScrollView testID="home-content" showsVerticalScrollIndicator={false} contentContainerStyle={[u.content, { paddingTop: 8, gap: 20 }]}>
    {!androidDesign && <View style={u.between}><View style={{ gap: 3, flex: 1 }}><Text style={u.small}>{greeting}{p.demo ? ' · Demo' : ''}</Text><Text style={u.h1}>{androidDesign ? 'For you' : 'Watch'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Switch active playlist" onPress={p.onProfiles} style={h.avatar}><Icon name="person-outline" color={colors.text} size={20} /></Pressable></View>}
    {!androidDesign && <Pressable accessibilityRole="button" accessibilityLabel="Search channels, movies and series" onPress={p.onSearch} style={h.search}><Icon name="search-outline" size={19} color={colors.secondary} /><Text style={u.small}>Channels, movies, series</Text></Pressable>}
    {androidDesign && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{(['For you', 'Live TV', 'Movies', 'Series'] as const).map((title, i) => <Pressable key={title} accessibilityRole="button" accessibilityState={{ selected: i === 0 }} onPress={() => i > 0 && p.onBrowse((['live', 'movies', 'series'] as Section[])[i - 1])} style={[h.chip, i === 0 && { backgroundColor: colors.selected }]}><Text style={{ color: i === 0 ? colors.selectedText : colors.text, fontWeight: '600', fontSize: 13 }}>{i === 0 ? '✓  ' : ''}{title}</Text></Pressable>)}</ScrollView>}
    {connected && featured ? <View style={[h.feature, androidDesign && { minHeight: 226 }]}>
      {androidDesign && !!(featured.artwork || featured.logo) && <MediaImage item={featured} style={StyleSheet.absoluteFill} />}
      <View style={[h.featureCopy, androidDesign && { backgroundColor: featured.artwork || featured.logo ? '#0A0E0CD9' : '#0D4029', marginTop: featured.artwork || featured.logo ? 80 : 0 }]}>
        <Text style={h.kicker}>{resume ? 'CONTINUE WATCHING' : featured.kind === 'live' ? 'FROM YOUR LIVE PLAYLIST' : 'FROM YOUR LIBRARY'}</Text>
        <Text numberOfLines={2} style={h.featureTitle}>{featured.name}</Text>
        <Text numberOfLines={1} style={h.featureMeta}>{featured.group}{p.demo ? ' · Public sample' : ''}</Text>
        {resume && <View style={h.track}><View style={[h.progress, { width: `${progressPercent(resume.position, resume.duration)}%` }]} /></View>}
        <View style={[u.row, { marginTop: 4, gap: 10 }]}><View style={{ alignSelf: 'flex-start' }}><Button title={resume ? 'Resume' : featured.kind === 'live' ? 'Watch live' : 'Play'} icon="play" onPress={() => resume ? p.onResume(resume) : p.onPlay(featured)} /></View><Pressable accessibilityRole="button" accessibilityLabel={`${p.favoriteIds.includes(featured.id)?'Remove':'Save'} favorite: ${featured.name}`} onPress={() => p.onFavorite(featured)} style={h.featureFavorite}><Icon name={p.favoriteIds.includes(featured.id)?'heart':'heart-outline'} color="#E8EEEA" size={20} /></Pressable></View>
      </View>
      {!androidDesign && <View pointerEvents="none" style={h.featureArt}><MediaImage item={featured} style={{ flex: 1, borderRadius: 12 }} />{featured.kind === 'live' && <View style={h.live}><Text style={h.liveText}>• LIVE</Text></View>}</View>}
    </View> : <View style={h.emptyFeature}><Icon name="tv-outline" size={40} color="#E8EEEA" /><Text style={h.featureTitle}>Your TV. On your terms.</Text><Text style={h.featureMeta}>Bring your own playlist for live TV, movies and series.</Text><Button title="Connect playlist" icon="add" onPress={p.onAdd} /><Button title="Explore demo" variant="secondary" onPress={p.onDemo} /></View>}
    {!!p.error && <Text style={u.errorText}>{p.error}</Text>}
    {!androidDesign && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><Pressable accessibilityRole="button" onPress={() => p.onBrowse('live')} style={[h.chip, { backgroundColor: colors.text }]}><Text style={{ color: colors.bg, fontWeight: '600' }}>All</Text></Pressable>{Array.from(new Set(p.liveChannels.map(item => item.group))).slice(0, 6).map(group => <Pressable key={group} accessibilityRole="button" onPress={() => p.onCategory(group)} style={h.chip}><Text numberOfLines={1} style={{ color: colors.text, fontSize: 13 }}>{group}</Text></Pressable>)}</ScrollView>}
    {p.continueWatching.length > 0 && <View style={{ gap: 10 }}><SectionHeading title="Continue watching" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{p.continueWatching.slice(0, 8).map(entry => <View key={entry.item.id} style={{ width: 164, gap: 6 }}><Pressable accessibilityRole="button" accessibilityLabel={`Resume ${entry.item.name} in NodeCast`} onPress={() => p.onResume(entry)}><MediaImage item={entry.item} style={{ height: 98 }} /><View style={h.track}><View style={[h.progress, { width: `${progressPercent(entry.position, entry.duration)}%` }]} /></View><Text numberOfLines={1} style={[u.label, { fontSize: 13, marginTop: 6 }]}>{entry.item.name}</Text><Text style={u.small}>{timeLabel(entry.duration - entry.position)} left</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${entry.item.name} from Continue watching`} onPress={() => p.onRemove(entry.item.id)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={u.small}>Remove</Text></Pressable></View>)}</ScrollView></View>}
    {live.length > 0 && <View style={{ gap: 6 }}><SectionHeading title="Live now" action="See all" onAction={() => p.onBrowse('live')} /><View style={h.channelList}>{live.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Watch ${item.name}`} onPress={() => p.onPlay(item)} style={[h.channel, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}><View style={h.channelLogo}>{item.logo ? <Image source={{ uri: item.logo }} resizeMode="contain" style={{ width: 36, height: 36 }} /> : <Text style={{ color: colors.text, fontWeight: '800' }}>{item.name.slice(0, 2).toUpperCase()}</Text>}</View><View style={{ flex: 1, gap: 3 }}><Text numberOfLines={1} style={[u.label, { fontSize: 14 }]}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></View><View style={h.live}><Text style={h.liveText}>LIVE</Text></View></Pressable>)}</View></View>}
    {p.recentChannels.length > 0 && <View style={{ gap: 6 }}><SectionHeading title="Recently watched" action="Clear recents" onAction={p.onClearRecents} />{p.recentChannels.slice(0, 4).map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => p.onPlay(item)} style={h.channel}><Icon name="play-circle-outline" color={colors.link} /><Text numberOfLines={1} style={[u.label, { flex: 1 }]}>{item.name}</Text></Pressable>)}</View>}
    {p.preview.length > 0 && <View style={{ gap: 10 }}><SectionHeading title={p.savedCount ? 'Your favorites' : 'From your playlist'} action="View all" onAction={p.savedCount ? p.onSaved : () => p.onBrowse('movies')} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{p.preview.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={() => p.onPlay(item)} style={{ width: 128, gap: 6 }}><MediaImage item={item} style={{ height: 174 }} /><Text numberOfLines={2} style={[u.label, { fontSize: 13 }]}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable>)}</ScrollView></View>}
    <View style={{ gap: 8 }}><SectionHeading title="Browse" /><View style={{ flexDirection: 'row', gap: 8 }}>{(['live', 'movies', 'series'] as const).map((section, i) => <Pressable key={section} accessibilityRole="button" onPress={() => p.onBrowse(section)} style={[h.chip, { flex: 1, alignItems: 'center' }]}><Text style={{ color: colors.text, fontSize: 13 }}>{['Live TV', 'Movies', 'Series'][i]}</Text></Pressable>)}</View></View>
    {p.network}
    <View style={h.channelList}><Pressable accessibilityRole="button" accessibilityLabel="Manage saved profiles" onPress={p.onProfiles} style={h.channel}><Icon name="layers-outline" /><View style={{ flex: 1 }}><Text style={u.label}>Your playlists</Text><Text style={u.small}>{p.profileCount} saved {p.profileCount===1?'profile':'profiles'}</Text></View><Icon name="chevron-forward" size={18} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Choose default player" onPress={p.onPlayers} style={h.channel}><Icon name="play-circle-outline" /><View style={{ flex: 1 }}><Text style={u.label}>Playback</Text><Text style={u.small}>{p.playerName}</Text></View><Icon name="chevron-forward" size={18} /></Pressable></View>
  </ScrollView>;
}
const h = themedStyles(() => ({
  search: { minHeight: 44, backgroundColor: colors.pale, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  avatar: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  chip: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  feature: { backgroundColor: '#0D4029', borderRadius: 16, minHeight: 194, overflow: 'hidden', flexDirection: 'row' },
  featureCopy: { flex: 1, padding: 16, gap: 7 }, featureArt: { width: '29%', marginVertical: 16, marginRight: 14, position: 'relative' },
  featureTitle: { color: '#FFFFFF', fontFamily: 'Inter-800', fontWeight: '800', letterSpacing: -.6, fontSize: 23, lineHeight: 28 },
  featureMeta: { color: '#D0E9DB', fontSize: 13, lineHeight: 19 }, kicker: { color: '#B9EAD1', fontSize: 10, fontWeight: '800', letterSpacing: .7 },
  featureFavorite: { minWidth: 44, height: 44, borderRadius: 999, backgroundColor: '#FFFFFF16', alignItems: 'center', justifyContent: 'center' },
  emptyFeature: { backgroundColor: '#0D4029', borderRadius: 16, padding: 20, gap: 16 },
  image: { backgroundColor: '#18201C', borderRadius: 12, overflow: 'hidden' },
  track: { height: 3, backgroundColor: '#789487', borderRadius: 999, overflow: 'hidden' }, progress: { height: 3, backgroundColor: '#1EC677', borderRadius: 999 },
  channelList: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, overflow: 'hidden' },
  channel: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 72 },
  channelLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  live: { backgroundColor: '#DD3027', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' }, liveText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
}));
