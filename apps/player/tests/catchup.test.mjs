import test from 'node:test';
import assert from 'node:assert/strict';
import {catchupAvailability,catchupMedia} from '../src/catchup.ts';
import {loadLibrary,loadServerTimeZone} from '../src/provider.ts';
import {serializeCatalog,restoreCatalog} from '../src/catalog.ts';
import {recordViewing} from '../src/activity.ts';
import {contentAllowed} from '../src/familyPolicy.ts';
import {XMLTVParser} from '../src/xmltv.ts';
const now=Date.parse('2026-10-29T16:00:00Z');
const provider={kind:'xtream',address:'https://example.test/prefix/',name:'Fixture',username:'user @',password:'p/word',headers:{'User-Agent':'Fixture'}};
const channel={id:'live:123',kind:'live',streamId:'123',name:'Original channel',group:'Protected',epgId:'guide-id',archiveDays:3};
const programme={channel:'guide-id',title:'Earlier programme',description:'Details',start:now-2*3600000,end:now-3600000};
test('catch-up requires explicit Xtream channel capability and a completed in-window programme',()=>{
 assert.equal(catchupAvailability(provider,channel,programme,now).available,true);
 for(const [p,c,g] of [[{...provider,kind:'m3u'},channel,programme],[provider,{...channel,archiveDays:0},programme],[provider,{...channel,streamId:'../bad'},programme],[provider,channel,{...programme,end:now+1000}],[provider,channel,{...programme,start:now-4*86400000}],[provider,channel,{...programme,start:NaN}]])assert.equal(catchupAvailability(p,c,g,now).available,false);
});
test('archive URL uses provider timezone, credentials encoding and the real stream ID',()=>{
 const item=catchupMedia(provider,channel,programme,'America/New_York',now);
 assert.equal(item.url,'https://example.test/prefix/timeshift/user%20%40/p%2Fword/60/2026-10-29:10-00/123.ts');
 assert.equal(item.catchup,true);assert.equal(item.kind,'movies');assert.equal(item.accessGroup,'Protected');assert.deepEqual(item.headers,provider.headers);
 assert.throws(()=>catchupMedia(provider,channel,programme,'Invalid/Zone',now));
 assert.equal(contentAllowed({restrictedGroups:['Protected']},item,false),false);
 assert.equal(contentAllowed({restrictedGroups:['Protected']},item,true),true);
 const entries=[];assert.equal(recordViewing(entries,item,{position:20,duration:3600}),entries);
});
test('server timezone formatting follows DST and minute durations cover sub-minute starts',()=>{
 const summer=Date.parse('2026-07-03T12:15:30Z');
 const p={...programme,start:summer,end:summer+3600000};
 const clip=catchupMedia(provider,channel,p,'Europe/London',summer+7200000);
 assert.ok(clip.url.includes('/61/2026-07-03:13-15/123.ts'));
});
test('archive capabilities survive credential-free cache snapshots',()=>{
 for(const archiveDays of [0,3]){
  const snapshot=serializeCatalog([{...channel,archiveDays}],new Date(now).toISOString());
  assert.ok(!JSON.stringify(snapshot).includes('https://'));
  assert.equal(restoreCatalog(snapshot,provider).items[0].archiveDays,archiveDays);
 }
});
test('Xtream archive flags are opt-in; server metadata rejects missing zones and inactive accounts',async()=>{
 const original=global.fetch;
 try{
  global.fetch=async url=>new Response(JSON.stringify(String(url).includes('categories')?[]:[{stream_id:1,name:'Supported',tv_archive:1,tv_archive_duration:'3'},{stream_id:2,name:'Unsupported',tv_archive:0,tv_archive_duration:7}]));
  assert.deepEqual((await loadLibrary(provider,'live')).map(x=>x.archiveDays),[3,0]);
  global.fetch=async()=>new Response(JSON.stringify({user_info:{auth:1,status:'Active'},server_info:{timezone:'UTC'}}));assert.equal(await loadServerTimeZone(provider),'UTC');
  global.fetch=async()=>new Response(JSON.stringify({user_info:{auth:1,status:'Active'}}));await assert.rejects(()=>loadServerTimeZone(provider),/time zone/);
  global.fetch=async()=>new Response(JSON.stringify({user_info:{auth:0,status:'Disabled'},server_info:{timezone:'UTC'}}));await assert.rejects(()=>loadServerTimeZone(provider),/inactive/);
 }finally{global.fetch=original}
});
test('TV catch-up guide retention is bounded to seven days while normal imports keep one day',()=>{
 const stamp=n=>new Date(n).toISOString().replace(/[-:T]/g,'').slice(0,14)+' +0000';
 const old=now-3*86400000;const xml=`<tv><programme channel="a" start="${stamp(old)}" stop="${stamp(old+3600000)}"><title>Archive programme</title></programme></tv>`;
 const normal=new XMLTVParser(now);normal.write(xml);assert.equal(normal.finish().programmes.length,0);
 const archive=new XMLTVParser(now,7);archive.write(xml);assert.equal(archive.finish().programmes.length,1);
});
