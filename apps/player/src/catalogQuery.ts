import type { Section } from './provider.ts';
import type { MediaSummary } from './activity.ts';
import { normalizeSearch } from './catalog.ts';

/** One stored catalogue row: a credential-free summary plus provider order and an optional real provider timestamp. */
export type CatalogRow = MediaSummary & { position: number; added?: number };
export type CatalogSort = 'provider' | 'az' | 'za' | 'newest';
export type CatalogQuery = {
  profile: string; section: Section;
  category?: string; text?: string; sort?: CatalogSort;
  /** Restrict to these IDs (a named list or favourites), in this order when sort is 'provider'. */
  ids?: string[];
  hiddenGroups?: string[]; hiddenItems?: string[]; includeHidden?: boolean;
  /** Family-protected categories. Always applied, even inside lists, unless the caller has unlocked them. */
  restrictedGroups?: string[]; unlocked?: boolean;
  /** Search across every section instead of `section`. */
  allSections?: boolean;
  rank?: boolean; cursor?: string | null; limit?: number;
};
export type CatalogPage = { items: CatalogRow[]; total: number; snapshotId: string; nextCursor: string | null };

export const searchText = (row: Pick<MediaSummary, 'name' | 'group'>) => normalizeSearch(`${row.name} ${row.group}`);
export const compactName = (name: string) => normalizeSearch(name).replace(/ /g, '');

/** The same matching rules as 0.7.4: every term is a substring, or the joined terms appear in the name without spaces. */
export function matches(row: Pick<MediaSummary, 'name' | 'group'>, terms: string[]) {
  if (!terms.length) return true;
  const text = searchText(row);
  return terms.every(term => text.includes(term)) || compactName(row.name).includes(terms.join(''));
}
/** 0 exact name, 1 name starts with the query, 2 a name word starts with a term, 3 broader match. */
export function rankOf(row: Pick<MediaSummary, 'name'>, terms: string[]) {
  const name = normalizeSearch(row.name), query = terms.join(' ');
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  const words = name.split(' ');
  if (terms.every(term => words.some(word => word.startsWith(term)))) return 2;
  return 3;
}
const blocked = (row: CatalogRow, q: CatalogQuery) => !q.unlocked && !!q.restrictedGroups?.length && (q.restrictedGroups.includes(row.group) || (!!row.accessGroup && q.restrictedGroups.includes(row.accessGroup)));

export function encodeCursor(snapshotId: string, offset: number) { return `${snapshotId}~${offset}`; }
export function decodeCursor(cursor: string | null | undefined, snapshotId: string) {
  if (!cursor) return 0;
  const [id, raw] = cursor.split('~');
  const offset = Number(raw);
  // A cursor from an older snapshot restarts at the top instead of skipping or repeating rows.
  return id === snapshotId && Number.isInteger(offset) && offset >= 0 ? offset : 0;
}

/**
 * Filters, ranks, sorts and pages rows. Restrictions, hidden rules and scope are
 * applied before counting, so totals and pages never include rows the user can't see.
 */
export function runQuery(rows: CatalogRow[], q: CatalogQuery, snapshotId: string): CatalogPage {
  const terms = normalizeSearch(q.text || '').split(' ').filter(Boolean);
  const hiddenGroups = new Set(q.includeHidden ? [] : q.hiddenGroups || []);
  const hiddenItems = new Set(q.includeHidden || q.ids ? [] : q.hiddenItems || []);
  const listOrder = q.ids ? new Map(q.ids.map((id, index) => [id, index])) : null;
  const category = q.category && q.category !== 'All' ? q.category : null;
  const kept = rows.filter(row =>
    (q.allSections || row.kind === q.section) &&
    !blocked(row, q) &&
    (!listOrder || listOrder.has(row.id)) &&
    // Lists keep explicit access to items in hidden categories, like favourites do today.
    (listOrder || !hiddenGroups.has(row.group)) &&
    !hiddenItems.has(row.id) &&
    (!category || row.group === category) &&
    matches(row, terms));
  const sort = q.sort || 'provider';
  const base = (a: CatalogRow, b: CatalogRow) => {
    if (sort === 'az' || sort === 'za') return (sort === 'az' ? 1 : -1) * a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.position - b.position;
    // Only genuine provider timestamps order "newest". Unknown dates follow, in provider order.
    if (sort === 'newest') return (b.added ?? -Infinity) - (a.added ?? -Infinity) || a.position - b.position;
    if (listOrder) return listOrder.get(a.id)! - listOrder.get(b.id)!;
    return a.position - b.position;
  };
  const ranked = q.rank && terms.length ? kept.map(row => ({ row, rank: rankOf(row, terms) })).sort((a, b) => a.rank - b.rank || base(a.row, b.row)).map(entry => entry.row) : kept.sort(base);
  const offset = decodeCursor(q.cursor, snapshotId);
  const limit = Math.max(1, Math.min(q.limit || 200, 1000));
  const items = ranked.slice(offset, offset + limit);
  return { items, total: ranked.length, snapshotId, nextCursor: offset + limit < ranked.length ? encodeCursor(snapshotId, offset + limit) : null };
}
