import test from 'node:test';
import assert from 'node:assert/strict';
import { externalPlayerURL } from '../src/players.ts';
import { compareIP, isIP, lookupExitIP } from '../src/network.ts';
import { emptyVault, removeProfile, validateVault, readSecureVault, writeSecureVault } from '../src/vault.ts';
function memoryStore() {
 const data = new Map();
 return { data, get: async key => data.get(key) ?? null, set: async (key, value) => { data.set(key, value); }, remove: async key => { data.delete(key); } };
}
const vault = () => ({ version: 2, activeId: 'one', profiles: [{ id: 'one', createdAt: new Date().toISOString(), favorites: ['live:1'], provider: { kind:'xtream', name:'Home', address:'https://example.com', username:'user', password:'sëcret🔐' } }] });
test('external player links encode the full credential-bearing stream URL', () => {
 const stream='https://example.com/live/u/p%40ss/1.m3u8?token=a%26b&test=hello';
 for (const player of ['vlc','infuse']) {
  const url=new URL(externalPlayerURL(player, stream));
  assert.equal(url.searchParams.get('url'),stream);
  assert.equal(url.protocol, player === 'vlc' ? 'vlc-x-callback:' : 'infuse:');
 }
 assert.throws(()=>externalPlayerURL('vlc','file:///private/password'));
});
test('IP comparison is unknown when stale, even if a previous IP differs', () => {
 assert.equal(compareIP({ip:'1.2.3.4'},'1.2.3.4'),'same');
 assert.equal(compareIP({ip:'1.2.3.4'},'5.6.7.8'),'changed');
 assert.equal(compareIP({ip:'1.2.3.4'},null),'no-baseline');
 assert.equal(compareIP({ip:'1.2.3.4'},'5.6.7.8',true),'unknown');
 assert.equal(compareIP(null,'5.6.7.8'),'unknown');
});
test('IP service data must contain valid IPv4 or IPv6', () => {
 for (const ip of ['1.2.3.4','2001:db8::1','::1']) assert.ok(isIP(ip));
 for (const ip of ['999.1.2.3','hello','https://example.com','::::',null]) assert.ok(!isIP(ip));
});
test('IP lookup exposes no IPTV credentials and parses service fields', async t => {
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async (url, options)=>{
  assert.equal(url,'https://ipwho.is/');assert.equal(options.credentials,'omit');
  return new Response(JSON.stringify({success:true,ip:'1.2.3.4',city:'Test City',country:'Test Country',connection:{isp:'Test ISP'}}));
 };
 const result=await lookupExitIP();assert.equal(result.city,'Test City');assert.equal(result.isp,'Test ISP');
});
test('IP lookup rejects a service error rather than displaying false connection status', async t => {
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async ()=>new Response(JSON.stringify({success:false,ip:'1.2.3.4'}));
 await assert.rejects(lookupExitIP(), /Couldn’t check/);
});
test('empty profile storage has no active account or provider', async () => {
 assert.deepEqual(await readSecureVault(memoryStore()),emptyVault());
});
test('secure vault roundtrips multiple profiles and Unicode passwords', async () => {
 const store=memoryStore();const value=vault();
 value.profiles.push({...value.profiles[0],id:'two',provider:{...value.profiles[0].provider,kind:'m3u',address:'https://example.com/?token='+ '🔐'.repeat(1600)}});
 await writeSecureVault(store,value);assert.deepEqual(await readSecureVault(store),value);
 for (const [key,chunk] of store.data) if(key!=='nodecast.vault.v2') assert.ok(Buffer.byteLength(chunk,'utf8')<=1600);
});
test('a failed chunk write preserves the previously committed vault', async () => {
 const store=memoryStore();const old=vault();await writeSecureVault(store,old);
 const original=store.set;let count=0;
 store.set=async (key,value)=>{if(++count===2)throw Error('Storage full');await original(key,value);};
 const next=vault();next.profiles[0].provider.password='x'.repeat(5000);
 await assert.rejects(writeSecureVault(store,next));
 assert.deepEqual(await readSecureVault(store),old);
});
test('a failed pointer switch preserves the previous vault', async () => {
 const store=memoryStore();const old=vault();await writeSecureVault(store,old);
 const original=store.set;
 store.set=async (key,value)=>{if(key==='nodecast.vault.v2')throw Error('Pointer failed');await original(key,value);};
 const next=vault();next.profiles[0].provider.name='Changed';
 await assert.rejects(writeSecureVault(store,next));assert.deepEqual(await readSecureVault(store),old);
});
test('committed revisions clean up old secure chunks', async () => {
 const store=memoryStore();await writeSecureVault(store,vault());const old=JSON.parse(store.data.get('nodecast.vault.v2'));
 await writeSecureVault(store,emptyVault());
 assert.ok(![...store.data.keys()].some(key=>key.includes(old.revision)));
 assert.deepEqual(await readSecureVault(store),emptyVault());
});
test('profile deletion is isolated and removes the active selection when necessary', () => {
 const value=vault();value.profiles.push({...value.profiles[0],id:'two',favorites:['movies:3']});
 const removed=removeProfile(value,'one');assert.equal(removed.activeId,null);assert.deepEqual(removed.profiles.map(p=>p.id),['two']);assert.deepEqual(removed.profiles[0].favorites,['movies:3']);
 assert.equal(removeProfile(value,'two').activeId,'one');
});
test('malformed or incomplete secure storage is surfaced instead of silently reset', async () => {
 assert.throws(()=>validateVault({...vault(),activeId:'missing'}));
 const store=memoryStore();await writeSecureVault(store,vault());
 const key=[...store.data.keys()].find(key=>key!=='nodecast.vault.v2');store.data.delete(key);
 await assert.rejects(readSecureVault(store),/missing/);
});
