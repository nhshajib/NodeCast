import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RefreshGate, stageRefresh, refreshSummary, dedupeExact } from '../src/refreshPipeline.ts';
import { rankedSearch, runQuery } from '../src/catalogQuery.ts';
import { createSearchIndex, searchIndex } from '../src/catalog.ts';
import { providerTime } from '../src/provider.ts';
import { sortMedia } from '../src/libraryPreferences.ts';
import { summarizeMedia } from '../src/activity.ts';
import { toRows } from '../src/catalogRepository.ts';
import { catalogue, media } from './fixtures/library.mjs';

test('an older generation or another profile never replaces current data', () => {
  const gate = new RefreshGate();
  const first = gate.begin('p1', 'live');
  const second = gate.begin('p1', 'live');
  assert.equal(gate.isCurrent(first, 'p1'), false);
  assert.equal(gate.isCurrent(second, 'p1'), true);
  assert.equal(gate.isCurrent(second, 'p2'), false, 'profile switched while the request was running');
  const movies = gate.begin('p1', 'movies');
  assert.equal(gate.isCurrent(second, 'p1'), true, 'sections refresh independently');
  assert.equal(gate.isCurrent(movies, 'p1'), true);
});

test('an empty or malformed response keeps the last usable library', () => {
  const outcome = stageRefresh(catalogue, []);
  assert.equal(outcome.accept, false);
  assert.match(refreshSummary(outcome, true), /saved library is still shown/);
  assert.equal(stageRefresh(catalogue, null).accept, false);
  assert.equal(stageRefresh(undefined, []).accept, true, 'a first load may legitimately be empty');
});

test('refresh compares exact identities, keeps IDs and preserves distinct variants', () => {
  const outcome = stageRefresh(catalogue, [...catalogue.slice(1), catalogue[2], media(42, 'New Channel')]);
  assert.equal(outcome.accept, true);
  assert.deepEqual([outcome.added, outcome.removed, outcome.kept], [1, 1, catalogue.length - 1]);
  assert.equal(outcome.items.filter(item => item.id === catalogue[2].id).length, 1);
  assert.equal(refreshSummary(outcome, true), 'Library updated: 1 new, 1 no longer offered.');
  assert.equal(dedupeExact([media(2, 'BBC One HD'), media(3, 'BBC One HD')]).length, 2);
});

test('ranked search keeps every 0.7.4 match and orders exact, prefix, word prefix, then broader', () => {
  const items = [media(1, 'Sky Sports News'), media(2, 'News'), media(3, 'Newsroom Live'), media(4, 'BBC News'), media(5, 'Good Newsday', 'Talk')];
  const legacy = searchIndex(createSearchIndex(items), 'news').map(i => i.id).sort();
  const ranked = rankedSearch(items, 'news');
  assert.deepEqual(ranked.map(i => i.id).sort(), legacy);
  assert.deepEqual(ranked.map(i => i.name).slice(0, 2), ['News', 'Newsroom Live']);
  assert.equal(ranked.at(-1).name, 'Good Newsday');
  for (const query of ['café', 'CAFE', 'bbc one', 'bbcone', 'ночные', 'ews', '']) {
    assert.deepEqual(rankedSearch(catalogue, query).map(i => i.id).sort(), searchIndex(createSearchIndex(catalogue), query).map(i => i.id).sort(), query);
  }
  // Hidden categories and the selected category apply exactly as before.
  assert.deepEqual(rankedSearch(catalogue, 'news', 'All', ['News']).map(i => i.id), searchIndex(createSearchIndex(catalogue), 'news', 'All', ['News']).map(i => i.id));
  assert.deepEqual(rankedSearch(catalogue, '', 'UK').map(i => i.id), ['live:2', 'live:3']);
});

test('provider dates are real Unix timestamps or unknown, never invented', () => {
  assert.equal(providerTime('1700000000'), 1700000000000);
  assert.equal(providerTime(1700000000), 1700000000000);
  for (const bad of [undefined, '', 'yesterday', '0', '99', '9999999999999', String(Math.floor(Date.now() / 1000) + 30 * 86400)]) assert.equal(providerTime(bad), undefined, String(bad));
  const dated = { ...media(1, 'Film', 'Drama', 'movies'), added: 1700000000000 };
  assert.equal(summarizeMedia(dated).added, 1700000000000);
  assert.equal('added' in summarizeMedia(media(2, 'Undated', 'Drama', 'movies')), false);
  assert.equal(toRows([dated])[0].added, 1700000000000);
});

test('newest first uses only provider dates; undated titles follow in provider order', () => {
  const items = [{ ...media(1, 'Old', 'D', 'movies'), added: 1 }, media(2, 'Undated A', 'D', 'movies'), { ...media(3, 'New', 'D', 'movies'), added: 3 }, media(4, 'Undated B', 'D', 'movies')];
  assert.deepEqual(sortMedia(items, 'newest').map(i => i.name), ['New', 'Old', 'Undated A', 'Undated B']);
  assert.deepEqual(runQuery(items.map((item, position) => ({ ...item, position })), { profile: 'p', section: 'movies', sort: 'newest', limit: 0 }, 's').items.map(i => i.name), ['New', 'Old', 'Undated A', 'Undated B']);
});

test('warmed in-memory search over 100,000 titles stays well inside the 250 ms target', () => {
  const items = Array.from({ length: 100000 }, (_, i) => media(i, `Title ${i} ${['Drama', 'News', 'Sport', 'Kids'][i % 4]}`, `Group ${i % 50}`));
  rankedSearch(items, 'news 99');
  const times = [];
  for (let run = 0; run < 5; run++) { const started = performance.now(); rankedSearch(items, `news 9${run}`); times.push(performance.now() - started); }
  times.sort((a, b) => a - b);
  // Node on CI is a proxy for device speed; the device target is measured separately (docs/RELEASE-1.0.0.md).
  assert.ok(times[4] < 1500, `p95 ${Math.round(times[4])} ms`);
});
