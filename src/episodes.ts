import type { Media } from './provider.ts';
import { httpURL } from './provider.ts';
/** Uses the provider's numerically ordered season/episode list, never stream-ID arithmetic. */
export function followingEpisode(episodes: Media[], current: Media | null): Media | null {
  if (!current || current.kind !== 'series' || !current.id.startsWith('episode:')) return null;
  const seen = new Set<string>();
  const ordered = episodes.filter(item => {
    if (item.kind !== 'series' || !item.id.startsWith('episode:') || seen.has(item.id)) return false;
    seen.add(item.id); return true;
  });
  const index = ordered.findIndex(item => item.id === current.id);
  if (index < 0) return null;
  for (const candidate of ordered.slice(index + 1)) {
    try { if (candidate.url && httpURL(candidate.url)) return candidate; } catch { /* Skip incomplete provider rows. */ }
  }
  return null;
}
