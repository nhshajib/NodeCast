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

import type { ViewingEntry } from './activity';
export function continueEpisode(episodes: Media[], history: ViewingEntry[]): Media | null {
  const playable = episodes.filter(item => { try { return item.kind === 'series' && item.id.startsWith('episode:') && !!item.url && !!httpURL(item.url); } catch { return false; } });
  const latest = history.filter(entry => playable.some(item => item.id === entry.item.id)).sort((a, b) => Date.parse(b.lastPlayedAt) - Date.parse(a.lastPlayedAt))[0];
  if (latest && !latest.completed) return playable.find(item => item.id === latest.item.id) || null;
  if (latest) {
    const completed = new Set(history.filter(entry => entry.completed).map(entry => entry.item.id));
    const index = playable.findIndex(item => item.id === latest.item.id);
    return playable.slice(index + 1).find(item => !completed.has(item.id)) || playable.find(item => !completed.has(item.id)) || null;
  }
  return playable[0] || null;
}
