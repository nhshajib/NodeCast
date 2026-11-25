import {categoryList} from '../src/groups.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {orderFavoriteGroups,toggleFavoriteGroup} from '../src/favoriteGroups.ts';
import {favoriteLiveChannel,homeGreeting} from '../src/homePresentation.ts';
import {validateVault,readSecureVault,writeSecureVault} from '../src/vault.ts';
import {validateBackup} from '../src/backupModel.ts';

test('pins are unique, follow saved order and never reveal an unavailable category',()=>{
 assert.deepEqual(orderFavoriteGroups(['All','News','Sport','News','Movies'],['Sport','Hidden','Sport','News']),['All','Sport','News','Movies']);
 assert.deepEqual(orderFavoriteGroups([],['Hidden']),['All']);
});
test('unpin preserves other pins; All cannot be pinned and input arrays stay untouched',()=>{
 const original=['News','Sport'];
 assert.deepEqual(toggleFavoriteGroup(original,'News'),['Sport']);
 assert.deepEqual(toggleFavoriteGroup(original,'Kids'),['News','Sport','Kids']);
 assert.deepEqual(toggleFavoriteGroup(original,'All'),original);
 assert.deepEqual(original,['News','Sport']);
});
test('Home hero uses a favorite live channel only, in saved order',()=>{
 const items=[{id:'live:1',kind:'live'},{id:'movies:2',kind:'movies'},{id:'live:3',kind:'live'}];
 assert.equal(favoriteLiveChannel(items,['movies:2','missing','live:3','live:1']),items[2]);
 assert.equal(favoriteLiveChannel(items,[]),undefined);
 assert.equal(favoriteLiveChannel(items,['missing','movies:2']),undefined);
});
test('Home greeting follows morning, afternoon and evening boundaries',()=>{
 assert.equal(homeGreeting(0),'Good morning.');assert.equal(homeGreeting(11),'Good morning.');
 assert.equal(homeGreeting(12),'Good afternoon.');assert.equal(homeGreeting(18),'Good evening.');
});
const profile=()=>({id:'one',createdAt:'2026-11-25T00:00:00Z',favorites:['live:1'],provider:{kind:'xtream',name:'Home',address:'https://example.com',username:'demo',password:'demo'},library:{favoriteGroups:['Sport','News']}});
test('favorite categories survive the existing secure vault storage',async()=>{
 const data=new Map();const store={get:async k=>data.get(k)??null,set:async(k,v)=>{data.set(k,v)},remove:async k=>{data.delete(k)}};
 const vault={version:2,activeId:'one',profiles:[profile()]};
 await writeSecureVault(store,vault);assert.deepEqual((await readSecureVault(store)).profiles[0].library.favoriteGroups,['Sport','News']);
});
test('favorite category validation rejects oversized or malformed data and accepts legacy profiles',()=>{
 const vault={version:2,activeId:'one',profiles:[profile()]};
 assert.doesNotThrow(()=>validateVault(vault));delete vault.profiles[0].library;assert.doesNotThrow(()=>validateVault(vault));
 for(const favoriteGroups of ['Sport',[4],[''],Array(301).fill('Sport')]){
  vault.profiles[0].library={favoriteGroups};assert.throws(()=>validateVault(vault),/favorite categories/);
 }
});

test('existing backup payload keeps category pins and accepts legacy IP settings without a lookup',()=>{
 const value={format:'nodecast-backup',version:2,createdAt:'2026-11-25T00:00:00Z',vault:{version:2,activeId:'one',profiles:[profile()]},preferences:{onboarded:true,player:'internal',theme:'dark',baseline:{ip:'2001:db8::1',savedAt:'2026-11-25T00:00:00Z'}},history:{},family:null};
 const restored=validateBackup(JSON.parse(JSON.stringify(value)));
 assert.deepEqual(restored.vault.profiles[0].library.favoriteGroups,['Sport','News']);
 assert.equal(restored.preferences.baseline.ip,'2001:db8::1');
});

test('pins work with individual categories in multi-category provider groups',()=>{assert.deepEqual(orderFavoriteGroups(categoryList(['News;Public','Sport']),['Public']),['All','Public','News','Sport']);});
