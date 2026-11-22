import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProviderDetails, maskSecret, maskAddress } from '../src/providerPaste.ts';
import { validateBackup, previewImport, planImportWithChoices, planImport, encryptBackup, decryptBackup, mergeProfile } from '../src/backupModel.ts';
import { commitTransfer } from '../src/backupTransaction.ts';
import { profile, xtream, remoteM3U, localM3U, v1Backup } from './fixtures/library.mjs';
import { webcrypto, randomBytes } from 'node:crypto';

test('pasted provider details are recognised, never invented, and shown masked', () => {
  assert.deepEqual(parseProviderDetails('Your link: http://tv.example:8080/get.php?username=amy&password=s3cret&type=m3u_plus&output=ts'), { kind: 'xtream', address: 'http://tv.example:8080/', username: 'amy', password: 's3cret' });
  assert.deepEqual(parseProviderDetails('Server: tv.example:8080\nUsername: amy\nPassword: s3cret.'), { kind: 'xtream', address: 'http://tv.example:8080/', username: 'amy', password: 's3cret' });
  assert.deepEqual(parseProviderDetails('Playlist https://lists.example/my.m3u8?token=abc'), { kind: 'm3u', address: 'https://lists.example/my.m3u8?token=abc', username: '', password: '' });
  for (const nothing of ['', 'hello there', 'Username: amy', 'ftp://bad.example/x.m3u']) assert.equal(parseProviderDetails(nothing), null, nothing);
  assert.equal(maskSecret('s3cret'), '••••et');
  assert.equal(maskAddress('https://lists.example/my.m3u8?token=abc&x=1'), 'https://lists.example/my.m3u8?token=••••&x=1');
});

const v2 = () => { const b = v1Backup(); b.version = 2; b.vault.profiles[0] = { ...b.vault.profiles[0], lists: [{ id: 'list-a', name: 'Kids', items: ['live:5'], createdAt: '2026-11-22T00:00:00.000Z' }], hiddenItems: ['live:4'], seriesDisplay: { latestFirst: true }, autoplayNext: true, guide: { url: 'https://g.example/x.xml', offsetMinutes: 30 } }; return b; };

test('version 2 carries lists and new preferences; version 1 still imports', async () => {
  const restored = validateBackup(v2()).vault.profiles[0];
  assert.deepEqual([restored.lists[0].name, restored.hiddenItems, restored.seriesDisplay, restored.autoplayNext, restored.guide.offsetMinutes], ['Kids', ['live:4'], { latestFirst: true }, true, 30]);
  const old = validateBackup(v1Backup());
  assert.equal(old.version, 1);
  assert.equal(old.vault.profiles[0].lists, undefined);
  const crypto = { random: async n => new Uint8Array(randomBytes(n)), encrypt: async (data, key, nonce, aad) => { const k = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']); const sealed = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad }, k, data)); const out = new Uint8Array(12 + sealed.length); out.set(nonce); out.set(sealed, 12); return out; }, decrypt: async (sealed, key, aad) => { const k = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']); return new Uint8Array(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.slice(0, 12), additionalData: aad }, k, sealed.slice(12))); } };
  const text = await encryptBackup(v2(), 'correct horse battery', crypto);
  assert.equal(JSON.parse(text).version, 1, 'the encryption envelope is unchanged');
  assert.deepEqual((await decryptBackup(text, 'correct horse battery', crypto)).vault.profiles[0].lists, restored.lists);
  await assert.rejects(decryptBackup(text, 'wrong password here', crypto));
});

const current = () => ({ version: 2, activeId: 'd1', profiles: [profile('d1', { ...xtream, name: 'Living room' }, { favorites: ['live:9'] }), profile('d2', remoteM3U), profile('d3', { ...remoteM3U, name: 'Same list again' })] });

test('import preview suggests Update for one explicit match and requires a choice when ambiguous', () => {
  const rows = previewImport(v2(), current());
  assert.deepEqual(rows.map(r => [r.sourceId, r.suggested, r.needsChoice]), [
    ['p1', { action: 'update', targetId: 'd1' }, false],
    ['p2', { action: 'add' }, true],
    ['p3', { action: 'add' }, false],
  ]);
  assert.deepEqual(rows[1].matches.map(m => m.id), ['d2', 'd3']);
  assert.equal(rows[2].server, 'Playlist file', 'local files never match automatically');
  assert.throws(() => planImportWithChoices(v2(), current(), null, 'a'.repeat(16), false, { p1: rows[0].suggested, p3: { action: 'add' } }), /Choose whether/);
});

test('Update keeps the profile ID and history and combines favourites; Add creates a journaled copy', async () => {
  const plan = planImportWithChoices(v2(), current(), null, 'b'.repeat(16), false, { p1: { action: 'update', targetId: 'd1' }, p2: { action: 'update', targetId: 'd3' }, p3: { action: 'add' } });
  const d1 = plan.vault.profiles.find(p => p.id === 'd1');
  assert.equal(d1.provider.name, 'Living room', 'the local name is kept');
  assert.deepEqual(d1.favorites, ['live:9', 'live:1', 'live:6']);
  assert.equal(d1.lists[0].name, 'Kids');
  assert.deepEqual(plan.updated, ['d1', 'd3']);
  assert.equal(plan.ids.length, 1, 'only the added profile is journaled');
  assert.equal(plan.vault.profiles.length, 4, 'no duplicates were created');
  assert.ok(!('d1' in plan.history), 'device history for updated profiles is left alone');
  assert.throws(() => planImportWithChoices(v2(), current(), null, 'c'.repeat(16), false, { p1: { action: 'update', targetId: 'd2' }, p2: { action: 'update', targetId: 'd2' }, p3: { action: 'add' } }), /same profile/);
  // The existing transaction journal commits the add and the updates together in the final vault write.
  const saved = {}; let vault = current();
  const store = { vault: async () => vault, preferences: async () => ({ onboarded: true, player: 'internal', theme: 'light', baseline: null }), family: async () => null, journal: async () => saved.journal ?? null, saveJournal: async v => { saved.journal = v; }, saveVault: async v => { vault = v; }, savePreferences: async () => {}, saveFamily: async () => {}, saveHistory: async () => {} };
  await commitTransfer(plan, store);
  assert.equal(vault.profiles.length, 4);
  assert.equal(saved.journal, null);
});

test('without choices, import behaves exactly as before (adds copies)', () => {
  const plan = planImport(v1Backup(), current(), null, 'd'.repeat(16));
  assert.equal(plan.vault.profiles.length, 6);
  assert.ok(plan.ids.every(id => id.startsWith('transfer-')));
  assert.equal(mergeProfile(current().profiles[0], { ...current().profiles[0], favorites: ['live:9'] }).favorites.length, 1);
  assert.equal(localM3U.kind, 'm3u');
});
