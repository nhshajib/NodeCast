import test from 'node:test';
import assert from 'node:assert/strict';
import { categoriesOf, groupLabel, inCategory, matchesAny, categoryList, OTHER_GROUP } from '../src/groups.ts';
import { safeLogo, logoMap, withLogos } from '../src/logoCache.ts';
import { searchIndex, createSearchIndex } from '../src/catalog.ts';
import { runQuery } from '../src/catalogQuery.ts';
import { contentAllowed } from '../src/familyPolicy.ts';
import { classifyFailure, failureMessage, recoveryDelay } from '../src/recovery.ts';

const channel = (id, group) => ({ id: String(id), name: `Channel ${id}`, group, kind: 'live', url: `https://x/${id}` });

test('multi-category groups split on semicolons and label as "A · B"', () => {
  assert.deepEqual(categoriesOf('News;Public'), ['News', 'Public']);
  assert.deepEqual(categoriesOf(' Entertainment ; Family;General;Family '), ['Entertainment', 'Family', 'General']);
  assert.equal(groupLabel('Classic;Comedy;Public;Series'), 'Classic · Comedy · Public · Series');
  assert.equal(groupLabel('Undefined'), OTHER_GROUP);
  assert.equal(groupLabel(''), OTHER_GROUP);
  assert.equal(groupLabel(undefined), OTHER_GROUP);
  assert.deepEqual(categoryList(['News;Public', 'News', 'Sports', 'undefined']), ['News', 'Public', 'Sports', OTHER_GROUP]);
});

test('a channel appears under every category it lists, in both search paths', () => {
  const items = [channel(1, 'News;Public'), channel(2, 'News'), channel(3, 'Sports')];
  assert.deepEqual(searchIndex(createSearchIndex(items), '', 'News').map(i => i.id), ['1', '2']);
  assert.deepEqual(searchIndex(createSearchIndex(items), '', 'Public').map(i => i.id), ['1']);
  const rows = items.map((item, position) => ({ ...item, position }));
  assert.deepEqual(runQuery(rows, { profile: 'p', section: 'live', category: 'News', limit: 0 }, 's').items.map(i => i.id), ['1', '2']);
  assert.ok(inCategory('News;Public', 'Public') && inCategory('News;Public', 'News;Public') && !inCategory('News', 'Public'));
});

test('hidden and family-restricted categories apply to multi-category channels', () => {
  const items = [channel(1, 'News;Adult'), channel(2, 'News')];
  assert.deepEqual(searchIndex(createSearchIndex(items), '', 'All', ['Adult']).map(i => i.id), ['2']);
  const rows = items.map((item, position) => ({ ...item, position }));
  assert.deepEqual(runQuery(rows, { profile: 'p', section: 'live', restrictedGroups: ['Adult'], limit: 0 }, 's').items.map(i => i.id), ['2']);
  const profile = { restrictedGroups: ['Adult'] };
  assert.equal(contentAllowed(profile, items[0], false), false);
  assert.equal(contentAllowed(profile, items[1], false), true);
  assert.equal(contentAllowed(profile, items[0], true), true);
  assert.ok(matchesAny('News;Adult', new Set(['Adult'])));
});

test('only plain logo URLs are kept; credentials never reach the logo store', () => {
  const provider = { username: 'alice99', password: 's3cretpw' };
  assert.equal(safeLogo('https://cdn.example/logos/bbc.png', provider), 'https://cdn.example/logos/bbc.png');
  assert.equal(safeLogo('http://img.example/a.png?size=200', provider), 'http://img.example/a.png?size=200');
  assert.equal(safeLogo('https://user:pass@img.example/a.png'), undefined);
  assert.equal(safeLogo('https://img.example/a.png?token=abc'), undefined);
  assert.equal(safeLogo('https://img.example/a.png?auth_key=abc'), undefined);
  assert.equal(safeLogo('https://provider.example/alice99/s3cretpw/logo.png', provider), undefined);
  assert.equal(safeLogo('file:///sdcard/a.png'), undefined);
  assert.equal(safeLogo('not a url'), undefined);
  const items = [{ ...channel(1, 'News'), logo: 'https://cdn.example/1.png' }, { ...channel(2, 'News'), logo: 'https://cdn.example/2.png?token=x' }, channel(3, 'News')];
  const map = logoMap(items, provider);
  assert.deepEqual(map, { 1: 'https://cdn.example/1.png' });
  assert.equal(JSON.stringify(map).includes('token'), false);
  const restored = withLogos([channel(1, 'News'), channel(3, 'News')], map);
  assert.equal(restored[0].logo, 'https://cdn.example/1.png');
  assert.equal(restored[1].logo, undefined);
});

test('playback failures name 404s, region blocks and stalls, and none retry automatically', () => {
  assert.equal(classifyFailure('HTTP 404 Not Found'), 'missing');
  assert.equal(classifyFailure('Server returned 410'), 'missing');
  assert.equal(classifyFailure('HTTP 403 Forbidden'), 'access');
  assert.match(failureMessage('access'), /region/);
  assert.match(failureMessage('missing'), /404/);
  assert.match(failureMessage('stalled'), /15 seconds/);
  for (const kind of ['missing', 'stalled', 'access']) assert.equal(recoveryDelay(0, kind), null);
});
