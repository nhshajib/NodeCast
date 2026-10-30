import type { Media, Provider, Section } from '../src/provider.ts';
import type { SortOrder } from '../src/libraryPreferences.ts';
export type TVCatalog = { items: Media[]; savedAt: string; artworkFresh?: boolean };
/** Hydrate memory even when an on-disk snapshot is fresh and no request is made. */
export async function cachedTVSection(memory: Map<string, TVCatalog>, profile: string, section: Section, provider: Provider, read: (profile: string, section: Section, provider: Provider) => Promise<TVCatalog | null>) {
  const key = `${profile}:${section}`;
  const existing = memory.get(key);
  if (existing) return existing;
  const saved = await read(profile, section, provider);
  if (saved) memory.set(key, saved);
  return saved;
}
let collator: Intl.Collator | undefined;
export function sortTVMedia(items: Media[], order: SortOrder = 'provider') {
  if (order === 'provider') return items;
  collator ||= new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const compare = collator.compare;
  const direction = order === 'az' ? 1 : -1;
  return items.map((item,index)=>({item,index})).sort((a,b)=>direction*compare(a.item.name,b.item.name)||a.index-b.index).map(row=>row.item);
}
export function moveTVFavorite(ids: string[], id: string, direction: -1 | 1) {
  const index=ids.indexOf(id), target=index+direction;
  if(index<0 || target<0 || target>=ids.length)return ids;
  const next=[...ids];[next[index],next[target]]=[next[target],next[index]];return next;
}
export function favoriteSections(ids: string[]): Section[] {
  const kinds=new Set(ids.map(id=>id.split(':')[0]));
  return (['live','movies','series'] as Section[]).filter(section=>kinds.has(section));
}

/** Artwork URLs stay out of disk snapshots. Rich views request them only when needed. */
export function needsTVArtwork(page: string, sections: Section[], saved: (TVCatalog | null)[], layout: 'list' | 'grid' = 'list', logos = false) {
  const rich = page === 'movies' || page === 'series' || page === 'favorites' && sections.some(section => section !== 'live') || layout === 'grid' || logos;
  return rich && saved.some(row => row && !row.artworkFresh);
}
