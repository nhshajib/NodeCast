import type { Media, Provider, Section } from './provider.ts';
import { summarizeMedia } from './activity.ts';
import { hydrateMedia } from './catalog.ts';
import { compactName, matches, runQuery, searchText } from './catalogQuery.ts';
import type { CatalogPage, CatalogQuery, CatalogRow } from './catalogQuery.ts';
import { normalizeSearch } from './catalog.ts';

export type CatalogSnapshotRows = { snapshotId: string; savedAt: string; rows: CatalogRow[] };
/** Storage behind the repository. Rows never contain stream URLs, artwork URLs, headers or credentials. */
export interface CatalogStore {
  save(profile: string, section: Section, rows: CatalogRow[], savedAt: string): Promise<string>;
  load(profile: string, section: Section): Promise<CatalogSnapshotRows | null>;
  /** Optional indexed prefilter. It may return extra rows, never fewer than the real matches. */
  candidates?(profile: string, sections: Section[], terms: string[]): Promise<CatalogRow[] | null>;
  clear(profile: string): Promise<void>;
  size?(profile: string): Promise<number>;
}

let sequence = 0;
export const newSnapshotId = () => `${Date.now().toString(36)}${(sequence++).toString(36)}`;

/** Credential-free rows in provider order. Exact duplicate identities keep their first occurrence only. */
export function toRows(items: Media[]): CatalogRow[] {
  const seen = new Set<string>(), rows: CatalogRow[] = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) continue;
    seen.add(item.id);
    const added = (item as Media & { added?: number }).added;
    rows.push({ ...summarizeMedia(item), position: rows.length, ...(Number.isFinite(added) && added! > 0 ? { added } : {}) });
  }
  return rows;
}
export const rowsToMedia = (rows: CatalogRow[], provider: Provider): Media[] => rows.map(({ position: _p, added, ...row }) => ({ ...hydrateMedia(row, provider), ...(added ? { added } : {}) }) as Media);

/** One query interface for phone and TV. Phone, TV and tests share the matching rules in catalogQuery. */
export class CatalogRepository {
  private cache = new Map<string, CatalogSnapshotRows>();
  private store: CatalogStore;
  constructor(store: CatalogStore) { this.store = store; }
  private key(profile: string, section: Section) { return `${profile}\u0000${section}`; }
  async save(profile: string, section: Section, items: Media[], savedAt = new Date().toISOString()) {
    const rows = toRows(items);
    const snapshotId = await this.store.save(profile, section, rows, savedAt);
    this.cache.set(this.key(profile, section), { snapshotId, savedAt, rows });
    return snapshotId;
  }
  async snapshot(profile: string, section: Section) {
    const key = this.key(profile, section);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const loaded = await this.store.load(profile, section);
    if (loaded) this.cache.set(key, loaded);
    return loaded;
  }
  async read(profile: string, section: Section, provider: Provider) {
    const snapshot = await this.snapshot(profile, section);
    return snapshot ? { savedAt: snapshot.savedAt, snapshotId: snapshot.snapshotId, items: rowsToMedia(snapshot.rows, provider) } : null;
  }
  async query(q: CatalogQuery): Promise<CatalogPage> {
    const sections: Section[] = q.allSections ? ['live', 'movies', 'series'] : [q.section];
    const terms = normalizeSearch(q.text || '').split(' ').filter(Boolean);
    const snapshots = (await Promise.all(sections.map(section => this.snapshot(q.profile, section)))).filter((value): value is CatalogSnapshotRows => !!value);
    const snapshotId = snapshots.map(s => s.snapshotId).join('.') || 'empty';
    let rows: CatalogRow[] | null = null;
    if (terms.length && this.store.candidates) rows = await this.store.candidates(q.profile, sections, terms).catch(() => null);
    if (!rows) rows = snapshots.flatMap(s => s.rows);
    return runQuery(rows, q, snapshotId);
  }
  async clear(profile: string) { for (const key of [...this.cache.keys()]) if (key.startsWith(`${profile}\u0000`)) this.cache.delete(key); await this.store.clear(profile); }
  async size(profile: string) { return this.store.size ? this.store.size(profile) : 0; }
  forget(profile: string) { for (const key of [...this.cache.keys()]) if (key.startsWith(`${profile}\u0000`)) this.cache.delete(key); }
}

/** Plain in-memory store for the browser preview, development and tests. */
export class MemoryCatalogStore implements CatalogStore {
  data = new Map<string, CatalogSnapshotRows>();
  async save(profile: string, section: Section, rows: CatalogRow[], savedAt: string) { const snapshotId = newSnapshotId(); this.data.set(`${profile}\u0000${section}`, { snapshotId, savedAt, rows }); return snapshotId; }
  async load(profile: string, section: Section) { return this.data.get(`${profile}\u0000${section}`) || null; }
  async clear(profile: string) { for (const key of [...this.data.keys()]) if (key.startsWith(`${profile}\u0000`)) this.data.delete(key); }
}

/** The subset of expo-sqlite's async database API the store uses (also implemented by the Node test adapter). */
export type SQLiteLike = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  withExclusiveTransactionAsync(task: (tx: SQLiteLike) => Promise<void>): Promise<void>;
};
const quote = (term: string) => `"${term.replace(/"/g, '""')}"`;
/** Native catalogue store: indexed rows plus an FTS5 trigram index for substring search where SQLite supports it. */
export class SQLiteCatalogStore implements CatalogStore {
  private ready: Promise<boolean> | null = null;
  private open: () => Promise<SQLiteLike>;
  constructor(open: () => Promise<SQLiteLike>) { this.open = open; }
  private async db() {
    const database = await this.open();
    if (!this.ready) this.ready = (async () => {
      await database.execAsync(`PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS catalog_snapshot(profile TEXT NOT NULL, section TEXT NOT NULL, snapshot TEXT NOT NULL, saved_at TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(profile, section));
        CREATE TABLE IF NOT EXISTS catalog_item(profile TEXT NOT NULL, section TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, grp TEXT NOT NULL, added INTEGER, search TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(profile, section, id));
        CREATE INDEX IF NOT EXISTS catalog_item_group ON catalog_item(profile, section, grp, position);`);
      try { await database.execAsync(`CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(search, profile UNINDEXED, section UNINDEXED, id UNINDEXED, tokenize='trigram');`); return true; }
      catch { return false; }
    })();
    const fts = await this.ready;
    return { database, fts };
  }
  async save(profile: string, section: Section, rows: CatalogRow[], savedAt: string) {
    const { database, fts } = await this.db();
    const snapshotId = newSnapshotId();
    await database.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync('DELETE FROM catalog_item WHERE profile=? AND section=?', profile, section);
      if (fts) await tx.runAsync('DELETE FROM catalog_fts WHERE profile=? AND section=?', profile, section);
      // Batched multi-row inserts keep a 100,000-title refresh to a few thousand native calls.
      for (let index = 0; index < rows.length; index += 100) {
        const batch = rows.slice(index, index + 100).map(row => ({ row, search: `${searchText(row)} ${compactName(row.name)}` }));
        await tx.runAsync(`INSERT INTO catalog_item(profile,section,id,position,grp,added,search,data) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?)').join(',')}`, ...batch.flatMap(({ row, search }) => [profile, section, row.id, row.position, row.group, row.added ?? null, search, JSON.stringify(row)]));
        if (fts) await tx.runAsync(`INSERT INTO catalog_fts(search,profile,section,id) VALUES ${batch.map(() => '(?,?,?,?)').join(',')}`, ...batch.flatMap(({ row, search }) => [search, profile, section, row.id]));
      }
      await tx.runAsync('INSERT OR REPLACE INTO catalog_snapshot(profile,section,snapshot,saved_at,count) VALUES(?,?,?,?,?)', profile, section, snapshotId, savedAt, rows.length);
    });
    return snapshotId;
  }
  async load(profile: string, section: Section) {
    const { database } = await this.db();
    const meta = await database.getFirstAsync<{ snapshot: string; saved_at: string; count: number }>('SELECT snapshot, saved_at, count FROM catalog_snapshot WHERE profile=? AND section=?', profile, section);
    if (!meta) return null;
    const rows = (await database.getAllAsync<{ data: string }>('SELECT data FROM catalog_item WHERE profile=? AND section=? ORDER BY position', profile, section)).map(row => JSON.parse(row.data) as CatalogRow);
    // A partial snapshot is never shown as complete; the caller falls back to the legacy cache.
    if (rows.length !== meta.count) return null;
    return { snapshotId: meta.snapshot, savedAt: meta.saved_at, rows };
  }
  async candidates(profile: string, sections: Section[], terms: string[]) {
    const { database, fts } = await this.db();
    const joined = terms.join('');
    const placeholders = sections.map(() => '?').join(',');
    let data: { data: string }[];
    if (fts && terms.every(term => term.length >= 3) && joined.length >= 3) {
      const expression = `(${terms.map(quote).join(' AND ')}) OR ${quote(joined)}`;
      data = await database.getAllAsync<{ data: string }>(`SELECT i.data FROM catalog_fts f JOIN catalog_item i ON i.profile=f.profile AND i.section=f.section AND i.id=f.id WHERE catalog_fts MATCH ? AND f.profile=? AND f.section IN (${placeholders})`, expression, profile, ...sections);
    } else {
      const like = (term: string) => `%${term.replace(/[\\%_]/g, '\\$&')}%`;
      data = await database.getAllAsync<{ data: string }>(`SELECT data FROM catalog_item WHERE profile=? AND section IN (${placeholders}) AND ((${terms.map(() => "search LIKE ? ESCAPE '\\'").join(' AND ')}) OR search LIKE ? ESCAPE '\\')`, profile, ...sections, ...terms.map(like), like(joined));
    }
    // Exact 0.7.4 matching on the narrowed set keeps results identical to the in-memory rules.
    return data.map(row => JSON.parse(row.data) as CatalogRow).filter(row => matches(row, terms));
  }
  async clear(profile: string) {
    const { database, fts } = await this.db();
    await database.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync('DELETE FROM catalog_item WHERE profile=?', profile);
      await tx.runAsync('DELETE FROM catalog_snapshot WHERE profile=?', profile);
      if (fts) await tx.runAsync('DELETE FROM catalog_fts WHERE profile=?', profile);
    });
  }
  async size(profile: string) {
    const { database } = await this.db();
    const row = await database.getFirstAsync<{ bytes: number | null }>('SELECT SUM(LENGTH(data)+LENGTH(search)) AS bytes FROM catalog_item WHERE profile=?', profile);
    return row?.bytes || 0;
  }
}

export type LegacyCatalog = { savedAt: string; items: Media[] } | null;
/**
 * Reads the new store first. When only a legacy JSON cache exists, copies it, verifies the copy
 * row-for-row, and only then serves it from the new store. The legacy cache is never deleted, so it
 * stays a recovery path. Any failure returns the legacy data unchanged.
 */
export async function readWithMigration(repo: CatalogRepository, profile: string, section: Section, provider: Provider, legacy: () => Promise<LegacyCatalog>) {
  try {
    const current = await repo.read(profile, section, provider);
    if (current) return { savedAt: current.savedAt, items: current.items, source: 'repository' as const };
  } catch { /* Fall through to the legacy cache. */ }
  const old = await legacy();
  if (!old) return null;
  try {
    await repo.save(profile, section, old.items, old.savedAt);
    repo.forget(profile);
    const copy = await repo.read(profile, section, provider);
    const expected = toRows(old.items);
    if (copy && copy.items.length === expected.length && copy.items.every((item, index) => item.id === expected[index].id)) return { savedAt: copy.savedAt, items: copy.items, source: 'migrated' as const };
  } catch { /* Keep serving the legacy cache. */ }
  return { ...old, source: 'legacy' as const };
}
