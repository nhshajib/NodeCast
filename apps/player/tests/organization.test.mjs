import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createList, renameList, deleteList, toggleInList, toggleHidden, resolveSaved, withoutHidden, seriesDisplay, seasonOrder, validateLists, validateHiddenItems, validateSeriesDisplay, listLimits } from '../src/organization.ts';
import { validateVault } from '../src/vault.ts';
import { continueEpisode, followingEpisode } from '../src/episodes.ts';
import { rankedSearch } from '../src/catalogQuery.ts';
import { catalogue, media, profile, xtream } from './fixtures/library.mjs';

test('lists hold references in order, refuse duplicates and enforce limits', () => {
  let lists = createList([], 'Weekend', 'l1', '2026-11-22T00:00:00.000Z');
  assert.throws(() => createList(lists, ' weekend ', 'l2'), /already exists/);
  assert.throws(() => createList(lists, '   ', 'l2'), /Name your list/);
  lists = toggleInList(lists, 'l1', 'live:2'); lists = toggleInList(lists, 'l1', 'live:1');
  assert.deepEqual(lists[0].items, ['live:2', 'live:1']);
  assert.equal(JSON.stringify(lists).includes('http'), false, 'no stream URLs are copied');
  lists = toggleInList(lists, 'l1', 'live:2');
  assert.deepEqual(lists[0].items, ['live:1']);
  lists = renameList(lists, 'l1', 'Sunday');
  assert.equal(lists[0].name, 'Sunday');
  assert.deepEqual(deleteList(lists, 'l1'), []);
  const full = [{ id: 'l1', name: 'Full', items: Array.from({ length: listLimits.items }, (_, i) => `live:${i}`), createdAt: '2026-11-22T00:00:00.000Z' }];
  assert.throws(() => toggleInList(full, 'l1', 'live:x'), /up to/);
});

test('items a refresh omits stay saved and are reported unavailable; family restrictions win', () => {
  const ids = ['live:6', 'live:404', 'live:1'];
  const { available, unavailable } = resolveSaved(ids, catalogue, ['Adult']);
  assert.deepEqual(available.map(i => i.id), ['live:1']);
  assert.deepEqual(unavailable, ['live:404']);
  assert.deepEqual(resolveSaved(ids, catalogue, ['Adult'], true).available.map(i => i.id), ['live:6', 'live:1']);
});

test('hidden titles leave browsing and search but not lists, and IDs never change', () => {
  const hidden = toggleHidden([], 'live:4');
  assert.deepEqual(toggleHidden(hidden, 'live:4'), []);
  const browsing = rankedSearch(withoutHidden(catalogue, hidden), 'news');
  assert.ok(!browsing.some(i => i.id === 'live:4'));
  assert.ok(resolveSaved(['live:4'], catalogue).available.some(i => i.id === 'live:4'));
  assert.deepEqual(withoutHidden(catalogue, hidden).map(i => i.id), catalogue.filter(i => i.id !== 'live:4').map(i => i.id));
});

test('latest-first only changes display; continuation and next episode keep canonical order', () => {
  const ep = (id, season = 1) => ({ id: `episode:${id}`, name: `E${id}`, kind: 'series', group: `Season ${season}`, url: `https://cdn.example/${id}.mp4` });
  const canonical = [ep(1), ep(2), ep(3), ep(4, 2)];
  const history = [{ item: { id: 'episode:1', name: 'E1', group: 'Season 1', kind: 'series' }, position: 10, duration: 10, lastPlayedAt: '2026-11-21T00:00:00.000Z', completed: true }];
  assert.deepEqual(seriesDisplay(canonical, { latestFirst: true }, history).map(i => i.id), ['episode:4', 'episode:3', 'episode:2', 'episode:1']);
  assert.deepEqual(seriesDisplay(canonical, { unwatchedOnly: true }, history).map(i => i.id), ['episode:2', 'episode:3', 'episode:4']);
  assert.deepEqual(seasonOrder(canonical, true), ['Season 2', 'Season 1']);
  assert.equal(continueEpisode(canonical, history).id, 'episode:2');
  assert.equal(followingEpisode(canonical, canonical[1]).id, 'episode:3');
  assert.equal(followingEpisode(canonical, canonical[3]), null, 'autoplay stops at the final episode');
});

test('new profile fields are validated and old profiles stay valid', () => {
  const base = profile('p1', xtream);
  assert.doesNotThrow(() => validateVault({ version: 2, activeId: 'p1', profiles: [base] }));
  const rich = { ...base, lists: [{ id: 'list-a', name: 'Kids', items: ['live:5'], createdAt: '2026-11-22T00:00:00.000Z' }], hiddenItems: ['live:4'], seriesDisplay: { latestFirst: true }, autoplayNext: false };
  assert.doesNotThrow(() => validateVault({ version: 2, activeId: 'p1', profiles: [rich] }));
  for (const bad of [{ lists: [{ id: 'BAD ID', name: 'x', items: [], createdAt: '2026-11-22T00:00:00.000Z' }] }, { lists: [{ id: 'a', name: '', items: [], createdAt: '2026-11-22T00:00:00.000Z' }] }, { hiddenItems: [5] }, { seriesDisplay: { latestFirst: 'yes' } }, { seriesDisplay: { other: true } }, { autoplayNext: 'on' }]) {
    assert.throws(() => validateVault({ version: 2, activeId: 'p1', profiles: [{ ...base, ...bad }] }), JSON.stringify(bad));
  }
  assert.equal(validateLists(undefined), undefined);
  assert.deepEqual(validateHiddenItems(['a', 'a']), ['a']);
  assert.deepEqual(validateSeriesDisplay({ unwatchedOnly: true }), { unwatchedOnly: true });
  assert.equal(media(1, 'x').id, 'live:1');
});
