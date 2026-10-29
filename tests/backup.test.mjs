import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {encryptBackup,decryptBackup,validateBackup,planImport,validBackupPassword} from '../src/backupModel.ts';
import {commitTransfer,recoverTransfer} from '../src/backupTransaction.ts';
import {clearRecents,recordViewing,parseViewing,resumePosition,markWatched} from '../src/activity.ts';
const crypto={random:async length=>webcrypto.getRandomValues(new Uint8Array(length)),encrypt:async(data,bytes,nonce,aad)=>{const key=await webcrypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt']);const ciphertext=new Uint8Array(await webcrypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:aad},key,data));return new Uint8Array([...nonce,...ciphertext]);},decrypt:async(sealed,bytes,aad)=>{const key=await webcrypto.subtle.importKey('raw',bytes,'AES-GCM',false,['decrypt']);return new Uint8Array(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:sealed.slice(0,12),additionalData:aad},key,sealed.slice(12)));}};
const prefs={onboarded:true,player:'infuse',theme:'dark',baseline:null,homeIPSetup:'skipped'};
const profile={id:'p1',createdAt:new Date().toISOString(),provider:{kind:'xtream',name:'Living room',address:'https://provider.example',username:'secret-user',password:'private-server-password'},favorites:['live:1'],hiddenGroups:['News'],restrictedGroups:['Adults'],channelPlayback:{'live:1':{player:'infuse'}},guide:{url:'https://provider.example/guide.xml?token=private-guide'}};
const pin={salt:'ab'.repeat(16),hash:'cd'.repeat(32),failures:0,until:0};
const item={id:'episode:1',name:'Episode',kind:'series',group:'Season 1',accessGroup:'Drama'};
const history=parseViewing(recordViewing([],item,{position:30,duration:300}));
const fixture=()=>validateBackup({format:'nodecast-backup',version:1,createdAt:new Date().toISOString(),vault:{version:2,activeId:'p1',profiles:[profile]},preferences:prefs,history:{p1:history},family:pin});
const password='long backup passphrase 123';
test('encrypted transfer round trip keeps profiles/settings/guide/PIN/progress without plaintext secrets',async()=>{
 const source=fixture(),encrypted=await encryptBackup(source,password,crypto);for(const secret of ['secret-user','private-server-password','private-guide','Living room'])assert.equal(encrypted.includes(secret),false);
 const restored=await decryptBackup(encrypted,password,crypto);assert.deepEqual(restored,source);
 const again=await encryptBackup(source,password,crypto);assert.notEqual(encrypted,again);
});
test('wrong passwords, modified ciphertext and unbounded KDF parameters are rejected',async()=>{
 const text=await encryptBackup(fixture(),password,crypto);await assert.rejects(decryptBackup(text,'wrong password 123',crypto),/Could not unlock/);
 const altered=JSON.parse(text);altered.sealed=altered.sealed.slice(0,-2)+(altered.sealed.endsWith('00')?'01':'00');await assert.rejects(decryptBackup(JSON.stringify(altered),password,crypto),/Could not unlock/);
 altered.iterations=999999999;let calls=0;await assert.rejects(decryptBackup(JSON.stringify(altered),password,{...crypto,decrypt:async()=>{calls++;throw Error()}}));assert.equal(calls,0);assert.equal(validBackupPassword('123456'),false);
});
test('backup validation rejects unknown schemas, invalid provider URLs and invalid viewing data',()=>{
 assert.throws(()=>validateBackup({...fixture(),version:2}));const b=fixture();b.vault.profiles[0].provider.address='file:///private';assert.throws(()=>validateBackup(b));
 const c=fixture();c.history.p1=[{invalid:true}];assert.throws(()=>validateBackup(c));
});
test('import adds fresh IDs, keeps existing profiles/PIN, maps history and adapts Apple-only player choices',()=>{
 const current={version:2,activeId:'p1',profiles:[profile]};const currentPin={...pin,salt:'ef'.repeat(16)};const plan=planImport(fixture(),current,currentPin,'01'.repeat(8),true);
 assert.equal(plan.vault.profiles.length,2);assert.deepEqual(plan.vault.profiles[0],profile);assert.equal(plan.vault.activeId,'p1');assert.notEqual(plan.ids[0],'p1');assert.deepEqual(plan.history[plan.ids[0]],history);assert.deepEqual(plan.family,currentPin);assert.equal(plan.preferences.player,'internal');assert.equal(plan.vault.profiles[1].channelPlayback['live:1'].player,'internal');
});
function memoryStore(){let vault={version:2,activeId:null,profiles:[]},preferences={...prefs,player:'internal',theme:'light'},family=null,journal=null;const histories={};return{vault:async()=>structuredClone(vault),preferences:async()=>structuredClone(preferences),family:async()=>family,journal:async()=>journal,saveJournal:async v=>{journal=v},saveVault:async v=>{vault=structuredClone(v)},savePreferences:async v=>{preferences=structuredClone(v)},saveFamily:async v=>{family=v},saveHistory:async(id,v)=>{if(v===null)delete histories[id];else histories[id]=structuredClone(v)},histories};}
test('import commits settings, PIN and history before publishing the atomic vault pointer',async()=>{
 const store=memoryStore(),plan=planImport(fixture(),await store.vault(),null,'02'.repeat(8));const save=store.saveVault;store.saveVault=async v=>{assert.equal((await store.preferences()).theme,'dark');assert.deepEqual(await store.family(),pin);assert.ok(store.histories[plan.ids[0]]);await save(v)};
 await commitTransfer(plan,store);assert.equal((await store.vault()).profiles.length,1);assert.equal(await store.journal(),null);
});
test('a failed import rolls back prior settings/PIN and staged history while retaining the old vault',async()=>{
 const store=memoryStore(),before=await store.preferences(),plan=planImport(fixture(),await store.vault(),null,'03'.repeat(8));store.saveVault=async()=>{throw Error('storage unavailable')};await assert.rejects(commitTransfer(plan,store));assert.deepEqual(await store.preferences(),before);assert.equal(await store.family(),null);assert.deepEqual((await store.vault()).profiles,[]);assert.deepEqual(store.histories,{});assert.equal(await store.journal(),null);
});
test('startup recovers interrupted imports and retains a fully committed transfer',async()=>{
 const store=memoryStore(),before=await store.preferences(),plan=planImport(fixture(),await store.vault(),null,'04'.repeat(8));const journal={version:1,ids:plan.ids,preferences:before,family:null};await store.saveJournal(journal);await store.savePreferences(plan.preferences);await store.saveFamily(pin);await store.saveHistory(plan.ids[0],history);await recoverTransfer(store);assert.deepEqual(await store.preferences(),before);assert.equal(await store.family(),null);assert.deepEqual(store.histories,{});
 await store.saveJournal(journal);await store.savePreferences(plan.preferences);await store.saveFamily(pin);await store.saveVault(plan.vault);await recoverTransfer(store);assert.equal((await store.preferences()).theme,'dark');assert.deepEqual(await store.family(),pin);assert.equal((await store.vault()).profiles.length,1);
});
test('clear recents preserves progress and watched marks; actual playback adds a title back',()=>{
 const watched=markWatched(history,item,true),cleared=clearRecents(watched);assert.equal(cleared[0].hiddenFromRecents,true);assert.equal(cleared[0].completed,true);assert.equal(cleared[0].position,watched[0].position);assert.deepEqual(parseViewing(cleared),cleared);assert.equal(resumePosition(clearRecents(history)[0]),30);assert.equal(recordViewing(cleared,item,{position:31,duration:300})[0].hiddenFromRecents,undefined);assert.equal(markWatched(cleared,item,false)[0].hiddenFromRecents,true);
});
