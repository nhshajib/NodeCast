import type { Media, Provider, Section } from './provider.ts';
import { streamURL } from './provider.ts';
import { summarizeMedia } from './activity.ts';
import type { MediaSummary } from './activity.ts';
export type CatalogSnapshot = { version: 1; savedAt: string; items: MediaSummary[] };
export function serializeCatalog(items: Media[], now = new Date().toISOString()): CatalogSnapshot {
  return { version: 1, savedAt: now, items: items.map(summarizeMedia) };
}
export function restoreCatalog(value: unknown, provider: Provider): { savedAt: string; items: Media[] } | null {
  const raw = value as CatalogSnapshot;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.items) || raw.items.length > 150000 || !Number.isFinite(Date.parse(raw.savedAt))) return null;
  const items = raw.items.flatMap(item => {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.group !== 'string' || !['live', 'movies', 'series'].includes(item.kind)) return [];
    return [hydrateMedia(summarizeMedia(item), provider)];
  });
  return { savedAt: raw.savedAt, items };
}
export function hydrateMedia(item: MediaSummary, provider: Provider): Media {
  const result: Media = { ...item, ...(provider.headers ? { headers: provider.headers } : {}) };
  if (provider.kind === 'xtream' && item.streamId && /^\d+$/.test(item.streamId) && (item.kind !== 'series' || item.id.startsWith('episode:'))) {
    result.url = streamURL(provider, item.kind === 'live' ? 'live' : item.kind === 'movies' ? 'movie' : 'series', item.streamId,
      item.kind === 'live' ? 'm3u8' : /^[a-z\d]+$/i.test(item.containerExtension || '') ? item.containerExtension! : 'mp4');
  }
  return result;
}
export const catalogSections: Section[] = ['live', 'movies', 'series'];
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
export function createSearchIndex(items: Media[]) { return items.map(item => ({ item, text: normalizeSearch(`${item.name} ${item.group}`), compactName: normalizeSearch(item.name).replace(/ /g, '') })); }
export function searchIndex(index: ReturnType<typeof createSearchIndex>, query: string, group = 'All', hidden: string[] = [], includeHidden = false): Media[] {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  const excluded = new Set(hidden);
  return index.filter(({ item, text, compactName }) => (includeHidden || !excluded.has(item.group)) && (group === 'All' || item.group === group) && (terms.every(term => text.includes(term)) || (!!terms.length && compactName.includes(terms.join(''))))).map(row => row.item);
}
