import {useAnnouncement} from '../accessibility';
import { Text } from '../Typography';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions, ActivityIndicator, FlatList, Keyboard, Platform, TextInput, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import Pressable from '../FocusPressable';
import RetainedList from '../RetainedList';
import SearchScopeControl from '../SearchScope';
import { androidDesign, useThemeChoice } from '../theme';
import { sortMedia } from '../libraryPreferences';
import { createSearchIndex, searchIndex } from '../catalog';
import type { Media } from '../provider';
import { Button, Empty, Icon, colors, u } from '../ui';
import { Artwork, s } from './shared';
import { favoritesMode, sectionOf, sections, useNodeCast } from './NodeCastProvider';
import { useTabScrollToTop } from './scrollToTop';
import type { LibraryView } from './types';

const PosterItem = React.memo(function PosterItem({ item, favorite, width, onPlay, onFavorite }: { width:number; item: Media; favorite: boolean; onPlay: (item: Media) => void; onFavorite: (item: Media) => void }) {
  useThemeChoice();
  return <View style={{ width, maxWidth:width, marginBottom: 24, gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.kind==='live'?'LIVE, ':''}${item.group}`} onPress={() => onPlay(item)} style={{ gap: 8 }}><View style={{ aspectRatio: 0.73, width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.pale }}><Artwork item={item} poster /></View><Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.name}</Text><Text numberOfLines={1} style={u.small}>{item.group}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${favorite ? 'Remove' : 'Add'} ${item.name} ${favorite ? 'from' : 'to'} favorites`} onPress={() => onFavorite(item)} style={{ position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 16, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' }}><Icon name={favorite ? 'heart' : 'heart-outline'} size={17} color={colors.link} /></Pressable>
  </View>;
});
const RowItem = React.memo(function RowItem({ item, favorite, demo, onPlay, onFavorite, onOptions }: { item: Media; favorite: boolean; demo: boolean; onPlay: (item: Media) => void; onFavorite: (item: Media) => void; onOptions: (item: Media) => void }) {
  useThemeChoice();
  return <View style={s.mediaRow}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.kind==='live'?'LIVE, ':''}${item.group}`} onPress={() => onPlay(item)} style={[u.row, { flex: 1, gap: 16 }]}><Artwork item={item} /><View style={{ flex: 1, gap: 8 }}><Text numberOfLines={2} style={[u.label, { fontSize: 14, lineHeight: 20 }]}>{item.name}</Text><View style={[u.row, { gap: 8 }]}>{item.kind === 'live' && <View style={s.liveTag}><Text style={{ color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: .5 }}>LIVE</Text></View>}<Text numberOfLines={1} style={[u.small, { flex: 1 }]}>{demo ? 'Public sample' : item.group}</Text></View></View></Pressable>
    {item.kind === 'live' && <Pressable accessibilityRole="button" accessibilityLabel={`Playback options for ${item.name}`} onPress={() => onOptions(item)} style={s.iconAction}><Icon name="ellipsis-horizontal" size={20} color={colors.secondary} /></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel={`${favorite ? 'Remove' : 'Add'} ${item.name} ${favorite ? 'from' : 'to'} favorites`} onPress={() => onFavorite(item)} style={s.iconAction}><Icon name={favorite ? 'heart' : 'heart-outline'} size={21} color={favorite ? colors.accent : colors.secondary} /></Pressable>
  </View>;
});

/** One library list. Every tab or pushed page owns its view state, so lists never swap content. */
export default function LibraryScreen({ view, tab }: { view: LibraryView; tab?: string }) {
  useThemeChoice();
  const c = useNodeCast();
  const {width}=useWindowDimensions();
  const numColumns=Math.max(2,Math.floor((width-2*16+16)/(150+16)));
  const state = c.views[view];
  const set = useCallback((patch: Partial<typeof state>) => c.setView(view, patch), [c.setView, view]);
  const list = useRef<FlatList<Media> | null>(null);
  useTabScrollToTop(tab, list);
  const favorites = favoritesMode(view, state);
  const section = sectionOf(view, state);
  const deferred = useDeferredValue(state.search);
  const searching = !!state.search.trim();
  const allMediaSearch = !favorites && state.scope === 'all' && searching;
  const includeHidden = state.hidden && searching;
  const library = useMemo(() => favorites ? c.saved : allMediaSearch ? c.allItems : c.allItems.filter(item => item.kind === section), [favorites, c.saved, allMediaSearch, c.allItems, section]);
  const groups = useMemo(() => ['All', ...Array.from(new Set(library.filter(item => !c.hiddenGroups.includes(item.group)).map(item => item.group))).sort()], [library, c.hiddenGroups]);
  const index = useMemo(() => createSearchIndex(library), [library]);
  const sort = c.active?.library?.sort?.[section] || 'provider';
  const filtered = useMemo(() => {
    const found = searchIndex(index, deferred, deferred.trim() && state.scope !== 'category' ? 'All' : state.category, c.hiddenGroups, favorites || includeHidden);
    return favorites ? found : sortMedia(found, sort);
  }, [index, deferred, state.scope, state.category, c.hiddenGroups, favorites, includeHidden, sort]);
  const posterLayout = (view === 'watch' || view === 'movies' || view === 'series' || view === 'library') && !favorites && section !== 'live' && !allMediaSearch;
  // A new filter starts at the top. The list itself is not remounted per keystroke.
  const filterKey = `${section}:${state.category}:${deferred}:${state.scope}:${includeHidden}:${state.source}`;
  const firstFilter = useRef(true);
  useEffect(() => { if (firstFilter.current) { firstFilter.current = false; return; } list.current?.scrollToOffset({ offset: 0, animated: false }); }, [filterKey]);
  const favoriteSet = useMemo(() => new Set(c.favorites), [c.favorites]);
  const onOptions = useCallback((item: Media) => c.open({ type: 'channel-options', item }), [c.open]);
  const play = useRef(c.play); play.current = c.play;
  const favorite = useRef(c.toggleFavorite); favorite.current = c.toggleFavorite;
  const onPlay = useCallback((item: Media) => play.current(item), []);
  const onFavorite = useCallback((item: Media) => favorite.current(item), []);
  const renderItem = useCallback<ListRenderItem<Media>>(({ item }) => posterLayout
    ? <PosterItem width={(width-48-(numColumns-1)*16)/numColumns} item={item} favorite={favoriteSet.has(item.id)} onPlay={onPlay} onFavorite={onFavorite} />
    : <RowItem item={item} favorite={favoriteSet.has(item.id)} demo={c.demo} onPlay={onPlay} onFavorite={onFavorite} onOptions={onOptions} />, [posterLayout, favoriteSet, c.demo, onPlay, onFavorite, onOptions,width,numColumns]);
  const setSearch = (search: string) => set({ search });
  const subtitle = favorites ? 'Your personal collection' : c.demo ? 'Demo library' : c.active?.provider.name || 'Your playlists, beautifully organized';
  const updated = c.updatedAt[section];
  // Android poster libraries need room for the playable titles on short phones.
  // Keep source, count and refresh feedback together; filters and actions stay intact.
  const compactHeader = androidDesign && posterLayout;
  const refreshLabel = c.refreshing ? 'Updating library…' : c.libraryNotice || (updated ? `Updated ${new Date(updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '');
  useAnnouncement(searching?`${filtered.length} search results`:'');
  useAnnouncement(refreshLabel);
  const countLabel = compactHeader ? `${filtered.length.toLocaleString()} ${filtered.length === 1 ? 'title' : 'titles'}` : '';

  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    {!compactHeader && <Text numberOfLines={1} style={[u.body, { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }]}>{subtitle}</Text>}
    {view === 'library' && <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 16 }}>{(['saved', 'movies', 'series'] as const).map(source => {
      const selected = state.source === source;
      return <Pressable key={source} accessibilityRole="tab" accessibilityState={{ selected }} haptic={selected ? undefined : 'selection'} onPress={() => set({ source, search: '', category: 'All' })} style={[s.chip, { backgroundColor: selected ? colors.selected : colors.panel, borderColor: selected ? colors.selected : colors.line }]}>{selected && <Icon name="checkmark" size={16} color={colors.selectedText}/>}<Text style={{ color: selected ? colors.selectedText : colors.text, fontWeight: '600' }}>{source === 'saved' ? 'Favorites' : source === 'movies' ? 'Movies' : 'Series'}</Text></Pressable>;
    })}</View>}
    {!c.connected ? <Empty icon={favorites ? 'heart-outline' : 'tv-outline'} title={favorites ? 'Keep the good ones close' : 'Your library starts here'} message="Add a provider or explore the demo to start watching."><Button title="Connect my provider" onPress={() => c.addProfile()} /><Button title="Explore demo" variant="secondary" onPress={c.startDemo} /></Empty> : <>
      {view === 'watch' && <View style={s.segment}>{sections.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: section === item.id }} haptic={section === item.id ? undefined : 'selection'} onPress={() => set({ search: '', category: 'All', section: item.id })} style={[s.segmentItem, section === item.id && { backgroundColor: colors.selected }]}><Text style={{ color: section === item.id ? colors.selectedText : colors.text, fontWeight: section === item.id ? '700' : '500', fontSize: 14 }}>{item.title}</Text></Pressable>)}</View>}
      <View style={s.search}>
        <Icon name="search-outline" size={19} color={colors.secondary} />
        <TextInput value={state.search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} autoCapitalize="none" autoFocus={view === 'search' && Platform.OS !== 'web' && !state.search} placeholder={favorites ? 'Search your favorites' : 'Search your library'} accessibilityLabel="Search library" placeholderTextColor={colors.secondary} style={{ flex: 1, paddingVertical: 16, color: colors.text, fontSize: 16, minHeight: 52 }} autoCorrect={false} />
        {!!state.search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={s.iconAction}><Icon name="close-circle" size={19} color={colors.secondary} /></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="Library options" onPress={() => c.open({ type: 'organize', view })} style={s.iconAction}><Icon name="options-outline" size={20} color={colors.secondary} /></Pressable>
      </View>
      {searching && <SearchScopeControl value={state.scope} onChange={scope => set({ scope })} includeHidden={state.hidden} onHidden={() => set({ hidden: !state.hidden })} favorites={favorites} />}
      {!searching && <FlatList horizontal style={{ flexGrow: 0, flexShrink: 0 }} data={groups} keyExtractor={group => group} showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories} initialNumToRender={8} windowSize={5} scrollsToTop={false}
        renderItem={({ item: group }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: state.category === group }} onPress={() => set({ category: group, scope: 'category' })} style={[s.category, state.category === group && { backgroundColor: colors.selected }]}>{state.category === group && androidDesign && <Icon name="checkmark" size={16} color={colors.selectedText}/>}<Text numberOfLines={2} style={{ color: state.category === group ? colors.selectedText : colors.text, fontSize: 13, fontWeight: '600' }}>{group}</Text></Pressable>} />}
      {searching && <Text accessibilityLiveRegion="polite" style={[u.small, { paddingHorizontal: 24, paddingVertical: 8 }]}>{filtered.length} {filtered.length === 1 ? 'result' : 'results'} · {favorites ? 'Your favorites' : `${allMediaSearch ? 'All media' : sections.find(item => item.id === section)?.title}${state.scope === 'category' && state.category !== 'All' ? ` · ${state.category}` : ''}${includeHidden ? ' · Including hidden' : ''}`}</Text>}
      <View style={[u.between, { paddingHorizontal: 24, paddingBottom: 8, gap: 8 }]}>
        {c.provider && section === 'live' && (view === 'watch' || view === 'live') && <Pressable accessibilityRole="button" accessibilityLabel="Open TV guide" onPress={() => c.open({ type: 'guide' })} style={[u.row, s.textAction, { gap: 8, paddingLeft: 0 }]}><Icon name="calendar-outline" size={15} color={colors.link} /><Text style={u.link}>TV guide</Text></Pressable>}
        <Text accessibilityLiveRegion="polite" numberOfLines={compactHeader && !c.libraryNotice ? 2 : undefined} style={[u.small, { flex: 1 }]}>{compactHeader ? [countLabel, subtitle, refreshLabel].filter(Boolean).join(' · ') : refreshLabel}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh library" disabled={c.refreshing} onPress={c.refreshLibrary} style={s.iconAction}>{c.refreshing ? <ActivityIndicator size="small" color={colors.link} /> : <Icon name="refresh-outline" size={17} color={colors.secondary} />}</Pressable>
      </View>
      {c.loading ? <View style={u.center}><ActivityIndicator color={colors.link} /><Text style={u.small}>Bringing your library together…</Text></View> : c.libraryError ? <Empty icon="cloud-offline-outline" title="A little trouble connecting" message={c.libraryError}><Button title="Try again" onPress={c.refreshLibrary} /></Empty> : <RetainedList listRef={list} memory={c.scrollMemory} memoryKey={`${c.demo ? 'demo' : c.active?.id}:${view}:${filterKey}`} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        key={`${view}:${posterLayout}:${numColumns}`} numColumns={posterLayout ? numColumns : 1} columnWrapperStyle={posterLayout ? { gap: 16 } : undefined} data={filtered} keyExtractor={item => item.id}
        initialNumToRender={posterLayout ? 8 : 12} maxToRenderPerBatch={posterLayout ? 6 : 10} updateCellsBatchingPeriod={30} windowSize={11} removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={[{ paddingHorizontal: 24, paddingBottom: 112 }, !filtered.length && { flex: 1 }]}
        ListHeaderComponent={!compactHeader && filtered.length ? <View style={[u.between, { paddingBottom: 8 }]}><Text style={u.eyebrow}>{favorites ? 'SAVED FOR YOU' : 'YOUR LIBRARY'}</Text><Text style={u.small}>{filtered.length.toLocaleString()} {section === 'live' && !favorites ? 'channels' : 'titles'}</Text></View> : undefined}
        ListEmptyComponent={<Empty icon={favorites ? 'heart-outline' : 'search-outline'} title={deferred.trim() ? 'No matching titles' : favorites ? 'Your favorites belong here' : 'Nothing here just yet'} message={deferred.trim() ? 'Try another name, or reset your search to see the library again.' : favorites ? 'Tap the heart beside a channel, movie, or series. We’ll keep it here for this profile.' : section === 'series' && (c.demo || c.provider?.kind === 'm3u') ? 'Use an Xtream Codes profile for a structured series and episode library.' : 'Try another search or category, or check the library supplied by your provider.'}>{deferred.trim() ? <Button title="Reset search" variant="secondary" onPress={() => set({ search: '', category: 'All' })} /> : favorites ? <Button title="Browse your library" onPress={() => c.browse('live')} /> : null}</Empty>}
        renderItem={renderItem} extraData={favoriteSet} />}
    </>}
  </View>;
}
