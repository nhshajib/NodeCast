import { Text } from './Typography';
import React, { useState } from 'react';
import { FlatList, Image, ScrollView, View } from 'react-native';
import Pressable,{isTVBuild} from './FocusPressable';
import type { Media } from './provider';
import type { ViewingEntry } from './activity';
import { continueEpisode } from './episodes';
import { playbackClock } from './activity';
import { Button, colors, u } from './ui';
export default function SeriesEpisodes({ series, episodes, history, onPlay, onWatched, seasonMemory, seriesKey = 'series' }: { series?: Media; seasonMemory?: Map<string, string>; seriesKey?: string; episodes: Media[]; history: ViewingEntry[]; onPlay: (item: Media) => void; onWatched: (item: Media, watched: boolean) => void }) {
  const seasons = [...new Set(episodes.map(item => item.group))];
  const [season, setSeason] = useState(seasonMemory?.get(seriesKey) || seasons[0] || '');
  const play = (item: Media) => { seasonMemory?.set(seriesKey, item.group); onPlay(item); };
  const selected = seasons.includes(season) ? season : seasons[0];
  const next = continueEpisode(episodes, history);
  return <View style={{ flex: 1, gap: 10 }}><View style={{ paddingHorizontal: 20, gap: 12 }}>{series && <View style={{gap:12}}>{(series.logo||series.artwork)&&<Image source={series.artwork||{uri:series.logo}} resizeMode="cover" style={{width:'100%',height:160,borderRadius:12}}/>}<Text style={u.h1}>{series.name}</Text><Text style={u.small}>{series.group} · {seasons.length} {seasons.length===1?'season':'seasons'}</Text>{!!series.description&&<Text numberOfLines={4} style={u.body}>{series.description}</Text>}</View>}{next && <Button title={history.some(entry => episodes.some(item => item.id === entry.item.id)) ? 'Continue series' : 'Start series'} onPress={() => play(next)} />}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{seasons.map(value => <Pressable key={value} accessibilityLabel={value} accessibilityRole="tab" aria-selected={selected === value} accessibilityState={{ selected: selected === value }} onPress={() => { setSeason(value); seasonMemory?.set(seriesKey, value); }} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: selected === value ? colors.selected : colors.panel }}><Text style={[u.label, selected===value&&{color:colors.onAccent}]}>{selected===value?'✓ ':''}{value}</Text></Pressable>)}</ScrollView></View><FlatList initialNumToRender={isTVBuild?5:10} maxToRenderPerBatch={isTVBuild?4:10} windowSize={isTVBuild?3:21} data={episodes.filter(item => item.group === selected)} keyExtractor={item => item.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} ListEmptyComponent={<Text style={u.body}>No episodes returned by your provider.</Text>} renderItem={({ item }) => {
    const entry = history.find(row => row.item.id === item.id);
    return <View style={[u.card, { marginBottom: 10, gap: 8 }]}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.name}`} onPress={() => play(item)} style={{ minHeight: 52, justifyContent: 'center', gap: 6 }}><Text style={u.label}>{item.name}</Text><Text style={u.small}>{entry?.completed ? 'Watched' : entry && entry.position > 0 ? `${playbackClock(entry.position)} watched` : item.group}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${entry?.completed?'Mark unwatched':'Mark watched'}: ${item.name}`} onPress={() => onWatched(item, !entry?.completed)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={u.link}>{entry?.completed ? 'Mark unwatched' : 'Mark watched'}</Text></Pressable></View>;
  }} /></View>;
}
