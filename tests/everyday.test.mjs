import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlayback, setChannelPlayback, diagnosticReport } from '../src/viewingPreferences.ts';
import { validateVault } from '../src/vault.ts';
import { markWatched, parseViewing, recordViewing, summarizeMedia } from '../src/activity.ts';
import { continueEpisode } from '../src/episodes.ts';
import { createSearchIndex, searchIndex, serializeCatalog } from '../src/catalog.ts';
const provider = {kind:'xtream',name:'Example',address:'https://example.test',username:'private',password:'secret'};
const profile = {id:'one',provider,createdAt:new Date().toISOString(),favorites:[],liveEngine:'vlc',liveFormat:'ts'};
const episode = (id, seriesId='series:1') => ({id:`episode:${id}`,name:`Episode ${id}`,kind:'series',group:'Season 1',seriesId,streamId:String(id),url:`https://private:secret@example.test/series/${id}.mp4`});
test('channel override inherits defaults, wins only within its profile and resets cleanly',()=>{
 assert.deepEqual(resolvePlayback(profile,'live:1','ask'),{player:'ask',engine:'vlc',format:'ts'});
 const changed=setChannelPlayback(profile,'live:1',{player:'vlc',format:'hls'});
 assert.deepEqual(resolvePlayback(changed,'live:1','ask'),{player:'vlc',engine:'vlc',format:'hls'});
 assert.deepEqual(resolvePlayback(changed,'live:2'),{player:'internal',engine:'vlc',format:'ts'});
 assert.equal(resolvePlayback(profile,'live:1').player,'internal');
 assert.deepEqual(resolvePlayback(setChannelPlayback(changed,'live:1'),'live:1'),{player:'internal',engine:'vlc',format:'ts'});
});
test('legacy vault and valid overrides roundtrip while malformed or URL-bearing settings are rejected',()=>{
 const vault={version:2,activeId:'one',profiles:[profile]};assert.deepEqual(validateVault(vault),vault);
 const updated={...vault,profiles:[setChannelPlayback(profile,'live:1',{engine:'native',format:'auto',player:'internal'})]};
 assert.deepEqual(validateVault(JSON.parse(JSON.stringify(updated))),updated);
 for (const value of [{engine:'unknown'},{player:'https://secret.test'},{url:'https://secret.test'},{format:'mp4'},[]]) assert.throws(()=>validateVault({...vault,profiles:[{...profile,channelPlayback:{'live:1':value}}]}));
});
test('diagnostic allowlist excludes injected URLs, tokens, errors, IP and invalid counters',()=>{
 const report=diagnosticReport({engine:'vlc',format:'MPEG-TS',state:'playing',attempts:1,audioTracks:2,subtitleTracks:0,url:'https://private:secret@host.test',ip:'192.0.2.1',error:'token=secret'});
 assert.match(report,/Engine: vlc/);assert.doesNotMatch(report,/secret|private|192\.0\.2|host\.test|token=/);
 const malicious=diagnosticReport({engine:'https://secret.test',format:'password',state:'token',audioTracks:Infinity,attempts:-1});
 assert.doesNotMatch(malicious,/https|password|token|Infinity/);
});
test('series continues the latest unfinished episode then crosses seasons and stops at the final episode',()=>{
 const first=episode(401),second={...episode(905),group:'Season 2'},queue=[first,second];
 assert.equal(continueEpisode(queue,[]),first);
 let history=recordViewing([],first,{position:30,duration:100});assert.equal(continueEpisode(queue,history),first);
 history=recordViewing(history,first,{position:99,duration:100});assert.equal(continueEpisode(queue,history),second);
 history=recordViewing(history,second,{position:100,duration:100,ended:true});assert.equal(continueEpisode(queue,history),null);
 assert.equal(continueEpisode(queue,recordViewing([],episode(999,'series:other'),{position:30,duration:100})),first);
});
test('watched state survives serialization and final player flush; unwatched resets progress without inventing external progress',()=>{
 const item=episode(401);let history=markWatched([],item,true);
 history=recordViewing(history,item,{position:20,duration:100});assert.equal(history[0].completed,true);
 history=parseViewing(JSON.parse(JSON.stringify(history)));assert.equal(history[0].watchedOverride,true);
 history=markWatched(history,item,false);assert.equal(history[0].completed,false);assert.equal(history[0].position,0);
 history=recordViewing(history,item,{position:99,duration:100});assert.equal(history[0].completed,true);
 assert.equal(summarizeMedia(item).seriesId,'series:1');
 assert.doesNotMatch(JSON.stringify(serializeCatalog([item])),/private|secret|https/);
});
test('search scopes can retain category and exclude hidden categories even across all media',()=>{
 const rows=[{id:'1',name:'News HD',group:'US',kind:'live'},{id:'2',name:'News HD',group:'UK',kind:'live'},{id:'3',name:'News film',group:'Hidden',kind:'movies'}];
 const index=createSearchIndex(rows);
 assert.deepEqual(searchIndex(index,'news','US',['Hidden']).map(row=>row.id),['1']);
 assert.deepEqual(searchIndex(index,'news','All',['Hidden']).map(row=>row.id),['1','2']);
 assert.deepEqual(searchIndex(index,'news','All',['Hidden'],true).map(row=>row.id),['1','2','3']);
});

test('older episode watched state survives more than sixty ordinary plays and remains bounded',()=>{
 const item=episode(401);let history=markWatched([],item,true);
 for(let i=0;i<90;i++)history=recordViewing(history,{id:`movies:${i}`,name:'Film',kind:'movies',group:'Films'},{position:20,duration:100});
 assert.equal(parseViewing(JSON.parse(JSON.stringify(history))).find(row=>row.item.id===item.id).completed,true);
 assert.equal(history.length,61);
});
test('continue skips episodes already marked watched and does not offer a completed series',()=>{
 const queue=[episode(401),episode(905),episode(1002)];
 let history=markWatched([],queue[2],true);history=markWatched(history,queue[0],true);
 assert.equal(continueEpisode(queue,history).id,'episode:905');
 history=markWatched(history,queue[1],true);assert.equal(continueEpisode(queue,history),null);
});
