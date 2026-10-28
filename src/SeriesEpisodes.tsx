import React, { useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import Pressable from './FocusPressable';
import type { Media } from './provider';
import type { ViewingEntry } from './activity';
import { continueEpisode } from './episodes';
import { playbackClock } from './activity';
import { Button, colors, u } from './ui';
export default function SeriesEpisodes({ episodes, history, onPlay, onWatched, seasonMemory, seriesKey = 'series' }: { seasonMemory?: Map<string, string>; seriesKey?: string; episodes: Media[]; history: ViewingEntry[]; onPlay: (item: Media) => void; onWatched: (item: Media, watched: boolean) => void }) {
  const seasons = [...new Set(episodes.map(item => item.group))];
  const [season, setSeason] = useState(seasonMemory?.get(seriesKey) || seasons[0] || '');
  const play = (item: Media) => { seasonMemory?.set(seriesKey, item.group); onPlay(item); };
  const selected = seasons.includes(season) ? season : seasons[0];
  const next = continueEpisode(episodes, history);
  return <View style={{ flex: 1, gap: 10 }}><View style={{ paddingHorizontal: 20, gap: 10 }}>{next && <Button title={history.some(entry => episodes.some(item => item.id === entry.item.id)) ? 'Continue series' : 'Start series'} onPress={() => play(next)} />}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{seasons.map(value => <Pressable key={value} accessibilityRole="tab" aria-selected={selected === value} accessibilityState={{ selected: selected === value }} onPress={() => { setSeason(value); seasonMemory?.set(seriesKey, value); }} style={{ minHeight: 44, padding: 12, borderRadius: 22, backgroundColor: selected === value ? colors.mint : '#fff' }}><Text style={[u.label, selected===value&&{color:colors.onAccent}]}>{value}</Text></Pressable>)}</ScrollView></View><FlatList data={episodes.filter(item => item.group === selected)} keyExtractor={item => item.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} ListEmptyComponent={<Text style={u.body}>No episodes returned by your provider.</Text>} renderItem={({ item }) => {
    const entry = history.find(row => row.item.id === item.id);
    return <View style={[u.card, { marginBottom: 10, gap: 8 }]}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.name}`} onPress={() => play(item)} style={{ minHeight: 52, justifyContent: 'center', gap: 6 }}><Text style={u.label}>{item.name}</Text><Text style={u.small}>{entry?.completed ? 'Watched' : entry && entry.position > 0 ? `${playbackClock(entry.position)} watched` : item.group}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onWatched(item, !entry?.completed)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={u.link}>{entry?.completed ? 'Mark unwatched' : 'Mark watched'}</Text></Pressable></View>;
  }} /></View>;
}
