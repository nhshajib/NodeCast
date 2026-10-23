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
