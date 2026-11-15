import type { Media } from './provider.ts';
import { playbackURLs } from './livePlayback.ts';
export type LiveEngine = 'auto' | 'native' | 'vlc';
export function chooseEngine(kind: Media['kind'], preference: LiveEngine, available: boolean): 'native' | 'vlc' | 'unavailable' {
  if (kind !== 'live' || preference === 'native') return 'native';
  if (available) return 'vlc';
  return preference === 'vlc' ? 'unavailable' : 'native';
}
export function compatibilityURLs(item: Media): string[] {
  // Automatic Xtream URLs carry a TS externalURL; use the same proven endpoint internally.
  return [...new Set([item.externalURL, ...playbackURLs(item)].filter((url): url is string => !!url))];
}

export function compatibilityOptions(item: Media): string[] {
  const options = [':network-caching=1500', ':live-caching=1500'];
  for (const [name, value] of Object.entries(item.headers || {})) {
    if (!value || value.length > 1000 || /[\r\n]/.test(value)) continue;
    if (name.toLowerCase() === 'user-agent') options.push(`:http-user-agent=${value}`);
    if (name.toLowerCase() === 'referer') options.push(`:http-referrer=${value}`);
  }
  return options;
}
