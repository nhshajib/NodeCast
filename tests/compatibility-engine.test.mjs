import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEngine, compatibilityURLs } from '../src/playbackPolicy.ts';
import { preparePlayback } from '../src/livePlayback.ts';
import { classifyFailure, recoveryDelay, failureMessage } from '../src/recovery.ts';
import { validateVault, emptyVault } from '../src/vault.ts';
const provider={kind:'xtream',name:'Fixture',address:'https://fixture.example',username:'fixture',password:'test-only'};
const live={id:'live:1',name:'News',group:'News',kind:'live',streamId:'1',url:'https://fixture.example/live/fixture/test-only/1.m3u8'};
test('automatic live engine uses native when no module exists and VLC only in a compatible binary',()=>{
 assert.equal(chooseEngine('live','auto',false),'native');
 assert.equal(chooseEngine('live','auto',true),'vlc');
});
test('explicit engine preference never disguises an unavailable engine as native VLC',()=>{
 assert.equal(chooseEngine('live','vlc',false),'unavailable');
 assert.equal(chooseEngine('live','vlc',true),'vlc');
 assert.equal(chooseEngine('live','native',true),'native');
});
test('movie and episode progress/track support remain on the existing native engine',()=>{
 for(const kind of ['movies','series']) for(const available of [false,true]) assert.equal(chooseEngine(kind,'vlc',available),'native');
});
test('embedded VLC uses the proven external TS endpoint first with bounded distinct alternatives',()=>{
 const item=preparePlayback(live,provider,'auto');
 const candidates=compatibilityURLs(item);
 assert.deepEqual(candidates,['https://fixture.example/live/fixture/test-only/1.ts',live.url]);
 assert.equal(new Set(candidates).size,candidates.length);
});
test('M3U and provider-supplied direct URLs retain tokens with no fabricated TS route',()=>{
 const signed={...live,url:'https://edge.example/stream?token=fixture&output=ts'};
 assert.deepEqual(compatibilityURLs(preparePlayback(signed,{...provider,kind:'m3u'})),[signed.url]);
 assert.equal(compatibilityURLs(preparePlayback(signed,provider))[0],signed.url);
});
test('observed Apple byte-range and HTTP 405 errors are server compatibility failures with no blind retry',()=>{
 for(const message of ['CoreMediaErrorDomain error -16845 - HTTP 405: (unhandled)','byte range and no content length - error code is 200','CoreMediaErrorDomain error -12939']) {
  assert.equal(classifyFailure(message),'server');assert.equal(recoveryDelay(0,classifyFailure(message)),null);
 }
 assert.match(failureMessage('server'),/VLC/);
});
test('failure UI text does not expose credential-bearing native errors',()=>{
 const message='HTTP 405 https://private.example/live/SECRET/PASSWORD/1.m3u8';
 assert.ok(!failureMessage(classifyFailure(message)).includes('SECRET'));
 assert.ok(!failureMessage(classifyFailure(message)).includes('private.example'));
});
test('engine profile preference remains optional and validates known values',()=>{
 const profile={id:'one',createdAt:new Date().toISOString(),provider,favorites:[]};
 for(const liveEngine of [undefined,'auto','native','vlc']) assert.equal(validateVault({...emptyVault(),activeId:'one',profiles:[{...profile,liveEngine}]}).profiles[0].liveEngine,liveEngine);
 assert.throws(()=>validateVault({...emptyVault(),activeId:'one',profiles:[{...profile,liveEngine:'fake'}]}));
});
