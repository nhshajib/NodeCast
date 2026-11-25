import {haptic} from './haptics';
import React,{useDeferredValue,useRef,useState} from 'react';
import {FlatList,View} from 'react-native';
import Pressable,{isTVBuild} from './FocusPressable';
import {Text} from './Typography';
import {Button,Empty,Field,Icon,Notice,colors,u} from './ui';
import {groupLabel} from './groups';

/** Shared native-page / TV-sheet content; one remote focus stop per category. */
export default function FavoriteCategories({groups,favorites,onToggle}:{groups:string[];favorites:readonly string[];onToggle:(group:string)=>Promise<void>}) {
 const running=useRef(false);
 const [query,setQuery]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const deferred=useDeferredValue(query.trim().toLocaleLowerCase());
 const available=groups.filter(group=>group!=='All'&&groupLabel(group).toLocaleLowerCase().includes(deferred));
 async function toggle(group:string){if(running.current)return;running.current=true;setBusy(true);setError('');try{await onToggle(group);haptic('selection')}catch(error){setError(error instanceof Error?error.message:'Couldn’t save this category. Try again.')}finally{running.current=false;setBusy(false)}}
 return <View style={{flex:1,gap:16,padding:24}}>
  <Text style={u.body}>Pin categories to the start of Live TV.</Text>
  <Field nativeID="tv-preferred:favorite-categories-search" label="Find category" value={query} onChangeText={setQuery} returnKeyType="search" disableFullscreenUI={!isTVBuild}/>
  {!!error&&<Notice danger>{error}</Notice>}
  <FlatList style={isTVBuild?{flex:1}:{flexGrow:0,borderRadius:16,overflow:'hidden'}} data={available} keyExtractor={group=>group} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:isTVBuild?8:0,padding:isTVBuild?8:0}} initialNumToRender={12} extraData={{favorites,busy}}
   ListEmptyComponent={<Empty icon="search-outline" title="No categories found" message={query?'Try another name.':'Your available Live TV categories will appear here.'}>{!!query&&<Button title="Clear search" onPress={()=>setQuery('')}/>}</Empty>}
   renderItem={({item:group})=>{const selected=favorites.includes(group);return <Pressable nativeID={`tv-control:favorite-category:${group}`} accessibilityRole="checkbox" accessibilityState={{checked:selected,busy}} accessibilityLabel={`${groupLabel(group)}, favorite category`} onPress={()=>{void toggle(group)}} style={[u.row,{minHeight:56,padding:16,borderRadius:isTVBuild?16:0,borderBottomWidth:isTVBuild?0:1,borderBottomColor:colors.line,backgroundColor:selected?colors.selected:colors.panel,gap:16}]}><Text style={[u.label,{flex:1,color:selected?colors.selectedText:colors.text}]}>{groupLabel(group)}</Text><Icon name={selected?'heart':'heart-outline'} color={selected?colors.selectedText:colors.secondary}/></Pressable>}}/>
 </View>;
}
