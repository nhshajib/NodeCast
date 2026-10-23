import test from 'node:test';
import assert from 'node:assert/strict';
import { recordViewing, resumePosition, parseViewing, summarizeMedia } from '../src/activity.ts';
import { serializeCatalog, restoreCatalog, createSearchIndex, searchIndex } from '../src/catalog.ts';
import { classifyFailure, recoveryDelay, RecoveryCoordinator } from '../src/recovery.ts';
import { importXtreamLink } from '../src/provider.ts';
const movie={id:'movies:1',name:'Café World News',group:'Drama',kind:'movies',streamId:'1',containerExtension:'mkv',url:'https://example.com/movie/USER/PASSWORD/1.mkv?token=SECRET',logo:'https://example.com/art?secret=SECRET'};
const provider={kind:'xtream',name:'Home',address:'https://example.com',username:'USER',password:'PASSWORD'};

test('history uses an allowlist that excludes every credential-bearing URL',()=>{
 const value=JSON.stringify(recordViewing([],movie,{position:60,duration:1000}));
 for(const secret of ['PASSWORD','SECRET','https://','logo','"url"'])assert.ok(!value.includes(secret));
 assert.equal(JSON.parse(value)[0].item.containerExtension,'mkv');
});
test('resume applies to started VOD only; live, completed, unknown-duration and near-end items do not resume',()=>{
 const entry=recordViewing([],movie,{position:60,duration:1000})[0];assert.equal(resumePosition(entry),60);
 assert.equal(resumePosition({...entry,completed:true}),0);
 assert.equal(resumePosition({...entry,duration:0}),0);
 assert.equal(resumePosition({...entry,position:2}),0);
 assert.equal(resumePosition({...entry,position:999}),0);
 assert.equal(resumePosition({...entry,item:{...entry.item,kind:'live'}}),0);
});
test('completed films leave Continue watching; explicitly replayed items can be tracked again',()=>{
 let entries=recordViewing([],movie,{position:960,duration:1000});assert.equal(entries[0].completed,true);assert.equal(resumePosition(entries[0]),0);
 entries=recordViewing(entries,movie,{position:15,duration:1000});assert.equal(entries.length,1);assert.equal(entries[0].completed,false);assert.equal(resumePosition(entries[0]),15);
 entries=recordViewing(entries,movie,{position:200,duration:1000,ended:true});assert.equal(entries[0].completed,true);
});
test('history is bounded, recent-first and independent for each profile',()=>{
 let entries=[];for(let i=0;i<75;i++)entries=recordViewing(entries,{...movie,id:`movies:${i}`},{position:30,duration:1000});
 assert.equal(entries.length,60);assert.equal(entries[0].item.id,'movies:74');
 const other=recordViewing([],{...movie,name:'Other profile'},{position:20,duration:1000});assert.notEqual(entries[0].item.name,other[0].item.name);
});
test('live channels are recent items without a seek position',()=>{
 const entry=recordViewing([],{...movie,kind:'live'},{position:100,duration:Infinity})[0];assert.equal(entry.position,0);assert.equal(entry.duration,0);assert.equal(resumePosition(entry),0);
});
test('corrupt history is discarded and unexpected secret properties do not survive loading',()=>{
 assert.deepEqual(parseViewing([{item:movie,position:NaN,duration:12,lastPlayedAt:'no'}]),[]);
 const raw=recordViewing([],movie,{position:60,duration:1000});raw[0].item.url=movie.url;
 assert.ok(!JSON.stringify(parseViewing(raw)).includes('PASSWORD'));
 assert.equal(summarizeMedia({...movie,description:{secret:'bad'}}).description,undefined);
});
test('cached catalog contains metadata only and reconstructs Xtream paths only in memory',()=>{
 const snapshot=serializeCatalog([movie]);const data=JSON.stringify(snapshot);
 assert.ok(!data.includes('PASSWORD'));assert.ok(!data.includes('SECRET'));assert.ok(!data.includes('https://'));
 const restored=restoreCatalog(snapshot,provider);assert.match(restored.items[0].url,/movie\/USER\/PASSWORD\/1.mkv$/);assert.equal(restored.items[0].logo,undefined);
});
test('M3U cache never persists or reconstructs its access-token URL',()=>{
 const snapshot=serializeCatalog([{...movie,id:'m3u:opaque'}]);const restored=restoreCatalog(snapshot,{...provider,kind:'m3u'});
 assert.equal(restored.items[0].url,undefined);
});
test('catalog rejects unsupported schemas and invalid timestamps',()=>{
 assert.equal(restoreCatalog({version:2,items:[],savedAt:new Date().toISOString()},provider),null);
 assert.equal(restoreCatalog({version:1,items:[],savedAt:'bad'},provider),null);
});
test('search is accent-insensitive, multi-word, order independent and explicit about hidden categories',()=>{
 const index=createSearchIndex([movie,{...movie,id:'live:2',name:'Evening sport',group:'Sports',kind:'live'}]);
 assert.equal(searchIndex(index,'WORLD cafe').length,1);
 assert.equal(searchIndex(index,'news drama').length,1);
 assert.equal(searchIndex(index,'sport','All',['Sports']).length,0);
 assert.equal(searchIndex(index,'sport','All',['Sports'],true).length,1);
 assert.equal(searchIndex(index,'news','Sports').length,0);
});
test('large library indexing returns correct matches without requiring credentials or network',()=>{
 const items=Array.from({length:30000},(_,i)=>({...movie,id:`movies:${i}`,name:`Film ${i}`,group:i%2?'Drama':'Comedy'}));
 const started=performance.now();const index=createSearchIndex(items);const result=searchIndex(index,'Film 29999');
 assert.equal(result.length,1);assert.equal(result[0].id,'movies:29999');
 console.log(`30,000-title index and query: ${Math.round(performance.now()-started)} ms (informational, this environment).`);
});
test('provider export import is explicit, decodes special characters and removes query credentials from base URL',()=>{
 const result=importXtreamLink('https://example.com/prefix/get.php?username=a%2Fb&password=p%40ss%26word&type=m3u_plus');
 assert.deepEqual(result,{address:'https://example.com/prefix',username:'a/b',password:'p@ss&word'});
 assert.equal(importXtreamLink('https://example.com/a.m3u'),null);assert.equal(importXtreamLink('file:///secret'),null);
});
test('known access/codec failures are actionable and not retried automatically',()=>{
 assert.equal(classifyFailure('HTTP 403 forbidden'),'access');assert.equal(classifyFailure('Unsupported codec'),'format');
 assert.equal(classifyFailure('Connection timed out'),'network');assert.equal(recoveryDelay(0,'access'),null);assert.equal(recoveryDelay(0,'format'),null);
 assert.equal(recoveryDelay(0,'network'),1000);assert.equal(recoveryDelay(1,'network'),3000);assert.equal(recoveryDelay(2,'network'),null);
});
function scheduler(){const tasks=new Map();let counter=0;return {tasks,schedule:(fn,delay)=>{const id=++counter;tasks.set(id,{fn,delay});return id;},cancel:id=>tasks.delete(id),run:()=>{const [id,task]=tasks.entries().next().value;tasks.delete(id);task.fn();}};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('recovery deduplicates errors, caps retries, and releases its budget only on explicit reset',async()=>{
 const timers=scheduler(),states=[];let calls=0;const recovery=new RecoveryCoordinator(async()=>{calls++;throw Error('fail');},state=>states.push(state),timers.schedule,timers.cancel);
 recovery.request('network');recovery.request('network');assert.equal(timers.tasks.size,1);
 timers.run();await tick();assert.equal(calls,1);assert.equal(timers.tasks.size,1);
 timers.run();await tick();assert.equal(calls,2);assert.equal(timers.tasks.size,0);assert.equal(states.at(-1).mode,'failed');
 recovery.reset();recovery.request('network');assert.equal(timers.tasks.size,1);recovery.dispose();
});
test('closing playback cancels queued recovery; no new stream opens after disposal',async()=>{
 const timers=scheduler();let calls=0;const recovery=new RecoveryCoordinator(async()=>{calls++;},()=>{},timers.schedule,timers.cancel);
 recovery.request('network');recovery.dispose();assert.equal(timers.tasks.size,0);recovery.request('network');await tick();assert.equal(calls,0);
});

import { guideText, parseProgrammes, nowAndNext } from '../src/guide.ts';
test('guide decodes UTF-8 titles and retains valid plain text',()=>{
 assert.equal(guideText('V29ybGQgTmV3cw=='),'World News');assert.equal(guideText('Q2Fmw6k='),'Café');assert.equal(guideText('News at ten'),'News at ten');
});
test('guide uses epoch timestamps and chooses now/next at programme boundaries',()=>{
 const entries=parseProgrammes([{id:1,title:'TmV3cw==',start_timestamp:1700000000,stop_timestamp:1700003600},{id:2,title:'TmV4dA==',start_timestamp:1700003600,stop_timestamp:1700007200}]);
 assert.equal(nowAndNext(entries,1700000000000).current.title,'News');assert.equal(nowAndNext(entries,1700000000000).next.title,'Next');
 assert.equal(nowAndNext(entries,1700003600000).current.title,'Next');
});
test('guide never guesses a provider timezone from unzoned strings',()=>{
 assert.deepEqual(parseProgrammes([{title:'News',start:'2026-10-23 10:00:00',end:'2026-10-23 11:00:00'}]),[]);
 assert.equal(parseProgrammes([{title:'News',start:'2026-10-23T10:00:00Z',end:'2026-10-23T11:00:00Z'}]).length,1);
});
test('a native error reported during reconnect is not lost while the operation is in flight',async()=>{
 const timers=scheduler();let finish;const operation=new Promise(resolve=>finish=resolve);
 const recovery=new RecoveryCoordinator(()=>operation,()=>{},timers.schedule,timers.cancel);
 recovery.request('network');timers.run();recovery.request('network');assert.equal(timers.tasks.size,0);
 finish();await tick();assert.equal(timers.tasks.size,1);recovery.dispose();
});
test('native recovery cancels an unnecessary scheduled reconnect without restoring the retry budget',()=>{
 const timers=scheduler();const states=[];const recovery=new RecoveryCoordinator(async()=>{},s=>states.push(s),timers.schedule,timers.cancel);
 recovery.request('network');recovery.ready();assert.equal(timers.tasks.size,0);
 recovery.request('network');recovery.ready();recovery.request('network');assert.equal(states.at(-1).mode,'failed');recovery.dispose();
});
