import test from 'node:test';
import assert from 'node:assert/strict';
import {cachedTVSection, favoriteSections, moveTVFavorite, sortTVMedia} from '../android-tv/library.ts';
import {emptyVault,validateVault} from '../src/vault.ts';
const provider={kind:'xtream',name:'Fixture',address:'https://fixture.example',username:'fixture',password:'fixture'};
const profile={id:'tv',createdAt:new Date().toISOString(),provider,favorites:[]};
const item=(id,name)=>({id,name,kind:'live',group:'News'});
test('a disk-only catalogue hydrates TV memory and is reused without another read',async()=>{
 const memory=new Map();let reads=0;const snapshot={items:[item('live:1','News')],savedAt:new Date().toISOString()};
 const read=async(id,section)=>{reads++;assert.equal(id,'tv');assert.equal(section,'live');return snapshot;};
 assert.equal(await cachedTVSection(memory,'tv','live',provider,read),snapshot);
 assert.equal(memory.get('tv:live'),snapshot);
 assert.equal(await cachedTVSection(memory,'tv','live',provider,read),snapshot);assert.equal(reads,1);
 assert.equal(memory.has('tv:movies'),false);assert.equal(memory.has('tv:series'),false);
});
test('missing or different-profile caches do not borrow another profile catalogue',async()=>{
 const memory=new Map([['other:live',{items:[item('live:2','Other')],savedAt:new Date().toISOString()}]]);
 assert.equal(await cachedTVSection(memory,'tv','live',provider,async()=>null),null);assert.equal(memory.has('tv:live'),false);
});
test('TV numeric alphabetical ordering is stable and never changes provider order in place',()=>{
 const items=[item('a','News 10'),item('b','News 2'),item('c','news 2'),item('d','ÁBC')];
 assert.equal(sortTVMedia(items,'provider'),items);
 assert.deepEqual(sortTVMedia(items,'az').map(i=>i.id),['d','b','c','a']);
 assert.deepEqual(sortTVMedia(items,'za').map(i=>i.id),['a','b','c','d']);assert.equal(items[0].id,'a');
});
test('large TV catalogue ordering retains every channel and uses natural channel numbers',()=>{
 const items=Array.from({length:10000},(_,i)=>item(`live:${i+1}`,`Channel ${10000-i}`));
 const sorted=sortTVMedia(items,'az');assert.equal(sorted.length,10000);assert.equal(sorted[0].name,'Channel 1');assert.equal(sorted.at(-1).name,'Channel 10000');assert.equal(new Set(sorted.map(item=>item.id)).size,10000);
});
test('favorite moves preserve the complete global order and reject boundary moves',()=>{
 const ids=['live:1','movies:2','series:3'];assert.deepEqual(moveTVFavorite(ids,'movies:2',-1),['movies:2','live:1','series:3']);
 assert.equal(moveTVFavorite(ids,'live:1',-1),ids);assert.equal(moveTVFavorite(ids,'series:3',1),ids);assert.equal(moveTVFavorite(ids,'missing',1),ids);assert.deepEqual(ids,['live:1','movies:2','series:3']);
});
test('organization only requests media types that actually contain favorites',()=>{
 assert.deepEqual(favoriteSections(['live:1','live:2']),['live']);assert.deepEqual(favoriteSections([]),[]);assert.deepEqual(favoriteSections(['series:2','movies:1','movies:3']),['movies','series']);
});
test('TV-only layout and logo preferences survive local profiles and reject invalid values',()=>{
 const vault={...emptyVault(),activeId:'tv',profiles:[{...profile,library:{tvLiveLayout:'list',tvChannelLogos:false,tvSearchScope:{live:'category',movies:'all'}}}]};
 assert.deepEqual(validateVault(vault).profiles[0].library,{tvLiveLayout:'list',tvChannelLogos:false,tvSearchScope:{live:'category',movies:'all'}});
 for(const invalid of [{tvLiveLayout:'touch'},{tvChannelLogos:'yes'},{tvSearchScope:{unknown:'all'}},{tvSearchScope:{live:'global'}}])assert.throws(()=>validateVault({...vault,profiles:[{...profile,library:invalid}]}));
});
