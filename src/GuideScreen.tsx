import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Media, Provider } from './provider';
import { loadNowNext } from './provider';
import { nowAndNext, parseProgrammes } from './guide';
import type { Programme } from './guide';
import { Button, Empty, Icon, Notice, colors, u } from './ui';
export default function GuideScreen({ provider, channels, favorites, onPlay }: { provider: Provider; channels: Media[]; favorites: string[]; onPlay: (item: Media) => void }) {
  const [query, setQuery] = useState(''); const search = useDeferredValue(query);
  const [onlyFavorites, setOnlyFavorites] = useState(favorites.some(id => channels.some(item => item.id === id)));
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [rows, setRows] = useState<Record<string, { programmes: Programme[]; error: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const matches = useMemo(() => channels.filter(item => (!onlyFavorites || favorites.includes(item.id)) && item.name.toLowerCase().includes(search.toLowerCase().trim())), [channels, favorites, onlyFavorites, search]);
  const visible = useMemo(() => matches.slice(0, 10), [matches]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setRows({}); setLoading(visible.length > 0);
    void (async () => {
      // At most three simultaneous guide requests. Provider video sessions are not opened here.
      for (let index = 0; index < visible.length; index += 3) {
        if (controller.signal.aborted) return;
        const result = await Promise.all(visible.slice(index, index + 3).map(async channel => {
          try {
            const data = await loadNowNext(provider, channel.streamId || '', controller.signal);
            return [channel.id, { programmes: parseProgrammes(data), error: false }] as const;
          } catch { return [channel.id, { programmes: [], error: true }] as const; }
        }));
        if (!controller.signal.aborted) setRows(current => ({ ...current, ...Object.fromEntries(result) }));
      }
      if (!controller.signal.aborted) { setLoading(false); setClock(Date.now()); }
    })();
    return () => controller.abort();
  }, [provider, visible, revision]);
  const time = (value: number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={u.content}><View style={{ gap: 8 }}><Text style={u.h1}>Now & next</Text><Text style={u.body}>Your provider’s upcoming programmes. Times are shown in your iPhone’s local timezone.</Text></View><View style={[u.row, { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 15 }]}><Icon name="search-outline" size={19} color={colors.secondary} /><TextInput accessibilityLabel="Search guide channels" placeholder="Find a channel" placeholderTextColor={colors.secondary} value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" style={{ flex: 1, paddingVertical: 15, fontSize: 16, color: colors.text }} /></View><View style={u.between}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: onlyFavorites }} onPress={() => setOnlyFavorites(value => !value)} style={[u.row, { gap: 7, minHeight: 44 }]}><Icon name={onlyFavorites ? 'checkbox' : 'square-outline'} color={colors.accent} size={20} /><Text style={u.small}>Favorites only</Text></Pressable><Pressable accessibilityRole="button" disabled={loading} onPress={() => setRevision(value => value + 1)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={u.link}>{loading ? 'Updating…' : 'Refresh guide'}</Text></Pressable></View>{matches.length > 10 && <Notice>Showing the first 10 matching channels to keep guide loading quick. Search for a channel to narrow the list.</Notice>}{!visible.length && <Empty icon="calendar-outline" title="No matching channels" message="Try another channel name or turn off the favorites filter." />}{visible.map(channel => {
    const row = rows[channel.id]; const programme = nowAndNext(row?.programmes || [], clock);
    return <View key={channel.id} style={u.card}><View style={u.between}><Text style={[u.label, { flex: 1 }]}>{channel.name}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Watch ${channel.name}`} onPress={() => onPlay(channel)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Icon name="play-circle" size={29} color={colors.accent} /></Pressable></View>{!row ? <ActivityIndicator color={colors.accent} /> : row.error ? <Text style={u.small}>Could not load this channel’s guide. Try Refresh guide.</Text> : !row.programmes.length ? <Text style={u.small}>No usable schedule was returned by the provider. You can still watch the channel.</Text> : <>{programme.current ? <View style={{ gap: 7 }}><Text style={[u.eyebrow, { color: colors.accent }]}>NOW · {time(programme.current.start)}–{time(programme.current.end)}</Text><Text style={u.label}>{programme.current.title}</Text><View style={{ height: 3, borderRadius: 3, backgroundColor: '#EEEDFB' }}><View style={{ height: 3, borderRadius: 3, width: `${Math.min(100, Math.max(0, (clock - programme.current.start) / (programme.current.end - programme.current.start) * 100))}%`, backgroundColor: '#B9B4F2' }} /></View></View> : <Text style={u.small}>No programme is scheduled for the current time.</Text>}{programme.next && <View style={{ gap: 6 }}><Text style={u.eyebrow}>NEXT · {time(programme.next.start)}</Text><Text style={u.body}>{programme.next.title}</Text></View>}</>}</View>;
  })}<Text style={u.small}>Schedules come from your provider and may be missing or out of date. This view does not enable recording or catch-up playback.</Text></ScrollView>;
}
