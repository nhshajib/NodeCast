import type { Media, Section } from './provider.ts';
export type SortOrder = 'provider' | 'az' | 'za';
export type LibraryPreferences = { sort?: Partial<Record<Section, SortOrder>>; refreshMinutes?: 30 | 60 | 360 | 1440 };
export function sortMedia(items: Media[], order: SortOrder = 'provider'): Media[] {
  if (order === 'provider') return items;
  const direction = order === 'az' ? 1 : -1;
  return items.map((item, index) => ({ item, index })).sort((a, b) => direction * a.item.name.localeCompare(b.item.name, undefined, { numeric: true, sensitivity: 'base' }) || a.index - b.index).map(row => row.item);
}
export function safeHeaders(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request headers.');
  const headers: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!['User-Agent', 'Referer'].includes(key) || typeof raw !== 'string' || raw.length > 1000 || /[\r\n]/.test(raw)) throw new Error('Use a valid User-Agent or Referer without line breaks.');
    if (raw.trim()) headers[key] = raw.trim();
  }
  return headers;
}
