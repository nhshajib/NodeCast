import type { Media } from './provider.ts';
import type { ViewingEntry } from './activity.ts';

/** A named list stores references to media IDs only, never copies of streams. */
export type MediaList = { id: string; name: string; items: string[]; createdAt: string };
export type SeriesDisplay = { latestFirst?: boolean; unwatchedOnly?: boolean };
export const listLimits = { lists: 50, items: 5000, name: 60, hidden: 10000 } as const;

export function validateLists(value: unknown): MediaList[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > listLimits.lists) throw new Error('Invalid lists.');
  const ids = new Set<string>();
  return value.map(raw => {
    const list = raw as MediaList;
    if (!list || typeof list.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(list.id) || ids.has(list.id) || typeof list.name !== 'string' || !list.name.trim() || list.name.length > listLimits.name ||
      typeof list.createdAt !== 'string' || list.createdAt.length > 40 || !Number.isFinite(Date.parse(list.createdAt)) ||
      !Array.isArray(list.items) || list.items.length > listLimits.items || list.items.some(id => typeof id !== 'string' || !id || id.length > 300)) throw new Error('Invalid list.');
    ids.add(list.id);
    return { id: list.id, name: list.name.trim(), items: [...new Set(list.items)], createdAt: list.createdAt };
  });
}
export function validateHiddenItems(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > listLimits.hidden || value.some(id => typeof id !== 'string' || !id || id.length > 300)) throw new Error('Invalid hidden items.');
  return [...new Set(value as string[])];
}
export function validateSeriesDisplay(value: unknown): SeriesDisplay | undefined {
  if (value === undefined) return undefined;
  const v = value as SeriesDisplay;
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(key => !['latestFirst', 'unwatchedOnly'].includes(key)) || Object.values(v).some(flag => typeof flag !== 'boolean')) throw new Error('Invalid series display.');
  return { ...(v.latestFirst !== undefined ? { latestFirst: v.latestFirst } : {}), ...(v.unwatchedOnly !== undefined ? { unwatchedOnly: v.unwatchedOnly } : {}) };
}

export function createList(lists: MediaList[] = [], name: string, id: string, now = new Date().toISOString()): MediaList[] {
  const clean = name.trim().slice(0, listLimits.name);
  if (!clean) throw new Error('Name your list.');
  if (lists.length >= listLimits.lists) throw new Error(`You can keep up to ${listLimits.lists} lists.`);
  if (lists.some(list => list.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) throw new Error('A list with this name already exists.');
  return [...lists, { id, name: clean, items: [], createdAt: now }];
}
export function renameList(lists: MediaList[], id: string, name: string): MediaList[] {
  const clean = name.trim().slice(0, listLimits.name);
  if (!clean) throw new Error('Name your list.');
  if (lists.some(list => list.id !== id && list.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) throw new Error('A list with this name already exists.');
  return lists.map(list => list.id === id ? { ...list, name: clean } : list);
}
export const deleteList = (lists: MediaList[], id: string) => lists.filter(list => list.id !== id);
export function toggleInList(lists: MediaList[], listId: string, mediaId: string): MediaList[] {
  return lists.map(list => {
    if (list.id !== listId) return list;
    if (list.items.includes(mediaId)) return { ...list, items: list.items.filter(id => id !== mediaId) };
    if (list.items.length >= listLimits.items) throw new Error(`A list can hold up to ${listLimits.items.toLocaleString()} titles.`);
    return { ...list, items: [...list.items, mediaId] };
  });
}
export function toggleHidden(hidden: string[] = [], mediaId: string): string[] {
  if (hidden.includes(mediaId)) return hidden.filter(id => id !== mediaId);
  if (hidden.length >= listLimits.hidden) throw new Error('Too many hidden titles. Unhide some first.');
  return [...hidden, mediaId];
}

/**
 * Resolves saved references against the current catalogue. Items a refresh temporarily omits are
 * reported as unavailable (kept, never silently deleted or replaced). Family restrictions win.
 */
export function resolveSaved(ids: string[], catalogue: Media[], restricted: string[] = [], unlocked = false) {
  const byId = new Map(catalogue.map(item => [item.id, item]));
  const available: Media[] = [], unavailable: string[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (!item) { unavailable.push(id); continue; }
    if (!unlocked && (restricted.includes(item.group) || (!!item.accessGroup && restricted.includes(item.accessGroup)))) continue;
    available.push(item);
  }
  return { available, unavailable };
}
/** Hidden titles leave normal browsing and search; explicit lists and favourites keep them. */
export const withoutHidden = <T extends { id: string }>(items: T[], hidden: string[] = []) => {
  if (!hidden.length) return items;
  const set = new Set(hidden);
  return items.filter(item => !set.has(item.id));
};

/**
 * Display order is separate from canonical order: latest-first only reverses what is shown,
 * while continuation and next-episode keep using the provider's canonical order.
 */
export function seriesDisplay(canonical: Media[], options: SeriesDisplay, history: ViewingEntry[]) {
  const watched = new Set(history.filter(entry => entry.completed).map(entry => entry.item.id));
  const shown = options.unwatchedOnly ? canonical.filter(item => !watched.has(item.id)) : canonical;
  return options.latestFirst ? [...shown].reverse() : shown;
}
/** Seasons in display order (latest first when asked), from canonical episode order. */
export function seasonOrder(canonical: Media[], latestFirst = false) {
  const seasons = [...new Set(canonical.map(item => item.group))];
  return latestFirst ? seasons.reverse() : seasons;
}
