/**
 * Playlists often pack several categories into one group-title, e.g. "News;Public".
 * The raw value stays the item's identity (hidden groups, restrictions and saved data keep
 * working); these helpers split it so a channel belongs to every category it lists.
 */
const cache = new Map<string, string[]>();
export const OTHER_GROUP = 'Other';

export function categoriesOf(group: string | undefined | null): string[] {
  const key = group ?? '';
  const hit = cache.get(key);
  if (hit) return hit;
  const parts = [...new Set(key.split(';').map(part => part.trim()).filter(part => part && !/^(undefined|null)$/i.test(part)))];
  const result = parts.length ? parts : [OTHER_GROUP];
  if (cache.size > 5000) cache.clear();
  cache.set(key, result);
  return result;
}
/** "News;Public" → "News · Public"; empty or "undefined" → "Other". */
export const groupLabel = (group: string | undefined | null) => categoriesOf(group).join(' · ');
/** True when the item's group is the category itself or lists it among several. */
export function inCategory(group: string | undefined | null, category: string) {
  if ((group ?? '') === category) return true;
  return categoriesOf(group).includes(category);
}
/** True when the raw group, or any category it lists, is in the set. */
export function matchesAny(group: string | undefined | null, set: ReadonlySet<string> | readonly string[]) {
  const has = (value: string) => Array.isArray(set) ? (set as readonly string[]).includes(value) : (set as ReadonlySet<string>).has(value);
  if (has(group ?? '')) return true;
  return categoriesOf(group).some(has);
}
/** Unique categories across items, in first-seen order. */
export function categoryList(groups: Iterable<string | undefined | null>) {
  const seen = new Set<string>();
  for (const group of groups) for (const category of categoriesOf(group)) seen.add(category);
  return [...seen];
}
