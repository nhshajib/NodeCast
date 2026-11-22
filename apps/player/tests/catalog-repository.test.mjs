import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogRepository, MemoryCatalogStore, SQLiteCatalogStore, toRows } from '../src/catalogRepository.ts';
import { runQuery } from '../src/catalogQuery.ts';
import { createSearchIndex, searchIndex } from '../src/catalog.ts';
import { nodeSQLite } from './sqlite-adapter.mjs';
import { catalogue, media, xtream } from './fixtures/library.mjs';

const stores = () => [['memory', () => new MemoryCatalogStore()], ['sqlite', () => new SQLiteCatalogStore(async () => sqlite)]];
let sqlite = nodeSQLite();

test('rows are credential-free summaries and exact duplicate identities are dropped', () => {
  const rows = toRows([{ ...media(1, 'A'), url: 'https://provider.example/live/demo/secret-pass/1.m3u8', headers: { Referer: 'x' }, logo: 'https://img/1.png' }, media(1, 'A again'), media(2, 'B')]);
  assert.deepEqual(rows.map(row => row.id), ['live:1', 'live:2']);
  assert.equal(JSON.stringify(rows).includes('secret-pass'), false);
  assert.equal('url' in rows[0] || 'headers' in rows[0] || 'logo' in rows[0], false);
  // Distinct variants with different identities are preserved.
  assert.equal(toRows([media(2, 'BBC One HD'), media(3, 'BBC One HD')]).length, 2);
});

for (const [name, makeStore] of stores()) {
  test(`${name}: query returns items, total, snapshot ID and a cursor, and keeps 0.7.4 search results`, async () => {
    sqlite = nodeSQLite(); const store = makeStore();
    const repo = new CatalogRepository(store);
    await repo.save('p1', 'live', catalogue);
    const first = await repo.query({ profile: 'p1', section: 'live', limit: 3 });
    assert.equal(first.total, catalogue.length);
    assert.deepEqual(first.items.map(row => row.id), ['live:1', 'live:2', 'live:3']);
    assert.ok(first.snapshotId && first.nextCursor);
    const second = await repo.query({ profile: 'p1', section: 'live', limit: 3, cursor: first.nextCursor });
    assert.deepEqual(second.items.map(row => row.id), ['live:4', 'live:5', 'live:6']);
    for (const text of ['news', 'bbc one', 'cafe', 'Café', 'ews', 'bbcone', 'ночные', 'zz']) {
      const legacy = searchIndex(createSearchIndex(catalogue), text).map(row => row.id).sort();
      const now = (await repo.query({ profile: 'p1', section: 'live', text, limit: 1000 })).items.map(row => row.id).sort();
      assert.deepEqual(now, legacy, `search “${text}”`);
    }
  });
  test(`${name}: restrictions, hidden categories and hidden items apply before counts and pages`, async () => {
    sqlite = nodeSQLite(); const store = makeStore();
    const repo = new CatalogRepository(store);
    await repo.save('p1', 'live', catalogue);
    const page = await repo.query({ profile: 'p1', section: 'live', restrictedGroups: ['Adult'], hiddenGroups: ['World'], hiddenItems: ['live:4'], limit: 2 });
    assert.equal(page.total, 5);
    assert.ok(!page.items.some(row => ['live:6', 'live:8', 'live:4'].includes(row.id)));
    const unlocked = await repo.query({ profile: 'p1', section: 'live', restrictedGroups: ['Adult'], unlocked: true, limit: 100 });
    assert.ok(unlocked.items.some(row => row.id === 'live:6'));
    // A named list keeps access to hidden categories and items, but never to family-protected ones.
    const list = await repo.query({ profile: 'p1', section: 'live', ids: ['live:8', 'live:4', 'live:6'], hiddenGroups: ['World'], hiddenItems: ['live:4'], restrictedGroups: ['Adult'] });
    assert.deepEqual(list.items.map(row => row.id), ['live:8', 'live:4']);
  });
  test(`${name}: profiles and sections stay separate, and clear removes only that profile`, async () => {
    sqlite = nodeSQLite(); const store = makeStore();
    const repo = new CatalogRepository(store);
    await repo.save('p1', 'live', catalogue);
    await repo.save('p2', 'live', [media(99, 'Other')]);
    await repo.save('p1', 'movies', [media(50, 'Film', 'Drama', 'movies')]);
    assert.equal((await repo.query({ profile: 'p2', section: 'live' })).total, 1);
    assert.equal((await repo.query({ profile: 'p1', section: 'live', text: 'film' })).total, 0);
    assert.equal((await repo.query({ profile: 'p1', section: 'live', text: 'film', allSections: true })).total, 1);
    await repo.clear('p1');
    const fresh = new CatalogRepository(store);
    assert.equal(await fresh.read('p1', 'live', xtream), null);
    assert.equal((await fresh.read('p2', 'live', xtream)).items.length, 1);
  });
}

test('sqlite: a reopened store restores the same snapshot and hydrates Xtream playback URLs', async () => {
  sqlite = nodeSQLite();
  const store = new SQLiteCatalogStore(async () => sqlite);
  const snapshotId = await new CatalogRepository(store).save('p1', 'live', catalogue, '2026-11-20T10:00:00.000Z');
  const restored = await new CatalogRepository(new SQLiteCatalogStore(async () => sqlite)).read('p1', 'live', xtream);
  assert.equal(restored.snapshotId, snapshotId);
  assert.equal(restored.savedAt, '2026-11-20T10:00:00.000Z');
  assert.equal(restored.items.length, catalogue.length);
  assert.match(restored.items[0].url, /^https:\/\/provider\.example\/live\/demo\/secret-pass\/1\.m3u8$/);
  // A truncated snapshot is refused instead of being shown as complete.
  sqlite.raw.exec("DELETE FROM catalog_item WHERE id='live:8'");
  assert.equal(await new CatalogRepository(new SQLiteCatalogStore(async () => sqlite)).read('p1', 'live', xtream), null);
});

test('a cursor from an older snapshot restarts at the top', () => {
  const rows = toRows(catalogue);
  const page = runQuery(rows, { profile: 'p1', section: 'live', limit: 2 }, 'old');
  assert.deepEqual(runQuery(rows, { profile: 'p1', section: 'live', limit: 2, cursor: page.nextCursor }, 'new').items.map(r => r.id), ['live:1', 'live:2']);
});

test('legacy JSON caches migrate only after a verified copy, and stay as the fallback', async () => {
  const { readWithMigration } = await import('../src/catalogRepository.ts');
  sqlite = nodeSQLite();
  const repo = new CatalogRepository(new SQLiteCatalogStore(async () => sqlite));
  let legacyReads = 0;
  const legacy = async () => { legacyReads++; return { savedAt: '2026-11-01T00:00:00.000Z', items: catalogue }; };
  const first = await readWithMigration(repo, 'p1', 'live', xtream, legacy);
  assert.equal(first.source, 'migrated');
  assert.equal(first.items.length, catalogue.length);
  const second = await readWithMigration(repo, 'p1', 'live', xtream, legacy);
  assert.equal(second.source, 'repository');
  assert.equal(legacyReads, 1);
  // When the new store can't be written, the legacy data is served unchanged.
  const broken = new CatalogRepository({ save: async () => { throw new Error('disk full'); }, load: async () => null, clear: async () => {} });
  const fallback = await readWithMigration(broken, 'p1', 'live', xtream, legacy);
  assert.equal(fallback.source, 'legacy');
  assert.equal(fallback.items, catalogue);
  assert.equal(await readWithMigration(broken, 'p9', 'live', xtream, async () => null), null);
});

test('sqlite: a large catalogue saves in batches and searches quickly', async () => {
  sqlite = nodeSQLite();
  const repo = new CatalogRepository(new SQLiteCatalogStore(async () => sqlite));
  const big = Array.from({ length: 30000 }, (_, i) => media(i, `Channel ${i} ${i % 7 ? 'Sports' : 'News'}`, `Group ${i % 40}`));
  await repo.save('p1', 'live', big);
  const fresh = new CatalogRepository(new SQLiteCatalogStore(async () => sqlite));
  const started = performance.now();
  const page = await fresh.query({ profile: 'p1', section: 'live', text: 'news 2999', limit: 50 });
  const elapsed = performance.now() - started;
  assert.ok(page.items.every(row => /news/i.test(row.name) && row.name.includes('2999')));
  assert.ok(page.total >= 1);
  assert.ok(elapsed < 2000, `search took ${Math.round(elapsed)} ms`);
});
