import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideIndex, resolveGuideId, playlistNameCounts, guideSuggestions, guideHealth, shiftProgrammes, rawWindow, mergeHistory, guideRowState, offsetLabel, validOffset } from '../src/guideMatching.ts';
import { validateVault } from '../src/vault.ts';
import { validateBackup } from '../src/backupModel.ts';
import { catchupMedia } from '../src/catchup.ts';
import { profile, xtream, v1Backup } from './fixtures/library.mjs';

const guide = [{ id: 'bbc1.uk', name: 'BBC One' }, { id: 'bbc1.ni', name: 'BBC One Northern Ireland' }, { id: 'sky.news', name: 'Sky News' }, { id: 'dup.a', name: 'Movies' }, { id: 'dup.b', name: 'Movies' }, { id: 'cafe', name: 'Café Cartoons' }];
const ch = (id, name, epgId) => ({ id: `live:${id}`, name, epgId });

test('matching order: manual, exact EPG ID, then unique exact name', () => {
  const index = guideIndex(guide);
  assert.deepEqual(resolveGuideId(ch(1, 'Anything', 'sky.news'), { url: '', mapping: { 'live:1': 'bbc1.uk' } }, index), { guideId: 'bbc1.uk', source: 'manual' });
  assert.deepEqual(resolveGuideId(ch(2, 'Other name', 'sky.news'), undefined, index), { guideId: 'sky.news', source: 'epg' });
  assert.deepEqual(resolveGuideId(ch(3, 'cafe cartoons'), undefined, index), { guideId: 'cafe', source: 'name' });
  assert.equal(resolveGuideId(ch(4, 'Movies'), undefined, index), null, 'ambiguous guide names are not matched');
  assert.equal(resolveGuideId(ch(5, 'BBC One HD'), undefined, index), null, 'approximate names are never applied automatically');
  assert.equal(resolveGuideId(ch(6, 'Unknown', 'missing.id'), undefined, index), null);
  const playlist = [ch(7, 'Sky News'), ch(8, 'Sky News')];
  assert.equal(resolveGuideId(playlist[0], undefined, index, playlistNameCounts(playlist)), null, 'duplicate playlist names are ambiguous');
});

test('suggestions rank close names but keep regional variants apart', () => {
  const suggestions = guideSuggestions(ch(1, 'BBC One HD'), guide).map(c => c.id);
  assert.equal(suggestions[0], 'bbc1.uk');
  assert.ok(!suggestions.includes('sky.news'));
  assert.deepEqual(guideSuggestions(ch(2, 'HD'), guide), []);
});

test('guide health counts matches by source and lists unmatched channels', () => {
  const channels = [ch(1, 'Anything', 'sky.news'), ch(2, 'BBC One'), ch(3, 'Movies'), ch(4, 'Mystery')];
  const health = guideHealth(channels, { url: '', mapping: { 'live:4': 'cafe' } }, guide);
  assert.deepEqual({ total: health.total, matched: health.matched, manual: health.manual, epg: health.epg, name: health.name }, { total: 4, matched: 3, manual: 1, epg: 1, name: 1 });
  assert.deepEqual(health.unmatched.map(c => c.id), ['live:3']);
});

test('offsets shift display and archive times once; stored data stays raw UTC', () => {
  const raw = [{ channel: 'a', title: 'News', description: '', start: Date.UTC(2026, 10, 22, 18), end: Date.UTC(2026, 10, 22, 19) }];
  const shifted = shiftProgrammes(raw, 60);
  assert.equal(shifted[0].start, Date.UTC(2026, 10, 22, 19));
  assert.equal(raw[0].start, Date.UTC(2026, 10, 22, 18), 'the source rows are not mutated');
  assert.deepEqual(rawWindow(1000 * 3600000, 1012 * 3600000, 60), { from: 999 * 3600000, to: 1011 * 3600000 });
  const clip = catchupMedia(xtream, { id: 'live:7', name: 'News', group: 'News', kind: 'live', streamId: '7', archiveDays: 3 }, shifted[0], 'UTC', Date.UTC(2026, 10, 22, 21));
  assert.match(clip.url, /2026-11-22:19-00/, 'catch-up uses the corrected time exactly once');
  assert.equal(offsetLabel(-90), '−1 h 30 min');
  assert.equal(offsetLabel(0), 'No correction');
  for (const bad of [7, 1000, 1.5, '15']) assert.equal(validOffset(bad), false);
  assert.doesNotThrow(() => validateVault({ version: 2, activeId: 'p1', profiles: [profile('p1', xtream, { guide: { url: 'https://g.example/x.xml', offsetMinutes: -45 } })] }));
  assert.throws(() => validateVault({ version: 2, activeId: 'p1', profiles: [profile('p1', xtream, { guide: { url: 'https://g.example/x.xml', offsetMinutes: 10 } })] }));
  const backup = v1Backup(); backup.vault.profiles[0].guide = { url: 'https://g.example/x.xml', offsetMinutes: 30 };
  assert.equal(validateBackup(backup).vault.profiles[0].guide.offsetMinutes, 30);
});

test('history survives a refresh that omits it; overlapping new data wins; nothing is invented', () => {
  const now = Date.UTC(2026, 10, 22, 12), h = 3600000;
  const p = (channel, title, start, end) => ({ channel, title, description: '', start: now + start * h, end: now + end * h });
  const existing = [p('a', 'Old morning', -6, -5), p('a', 'Old corrected', -3, -2), p('a', 'Too old', -60, -59), p('b', 'Future old', 1, 2)];
  const incoming = [p('a', 'New corrected', -3, -2), p('a', 'Now', 0, 1), p('b', 'Fresh', 1, 2)];
  const merged = mergeHistory(existing, incoming, now, 1).map(x => x.title);
  assert.deepEqual(merged, ['Old morning', 'New corrected', 'Now', 'Fresh']);
});

test('empty guide rows explain why', () => {
  const now = Date.UTC(2026, 10, 22, 12);
  assert.equal(guideRowState({ matched: false, programmes: 0, from: now, now }), 'unmatched');
  assert.equal(guideRowState({ matched: true, programmes: 0, from: now, now }), 'empty-window');
  assert.equal(guideRowState({ matched: true, programmes: 0, from: now - 3 * 86400000, now, archiveDays: 1 }), 'no-history');
  assert.equal(guideRowState({ matched: true, programmes: 0, from: now, now, failed: true }), 'download-failed');
  assert.equal(guideRowState({ matched: true, programmes: 4, from: now, now, failed: true }), 'ok');
});
