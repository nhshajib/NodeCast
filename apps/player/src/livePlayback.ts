import { httpURL, streamURL } from './provider.ts';
import type { Media, Provider } from './provider.ts';
export type LiveFormat = 'auto' | 'hls' | 'ts';
export const liveFormats: { id: LiveFormat; title: string; detail: string }[] = [
  { id: 'auto', title: 'Automatic', detail: 'Try HLS first, then MPEG-TS. VLC starts with MPEG-TS.' },
  { id: 'hls', title: 'HLS', detail: 'Usually best for the built-in iPhone player.' },
  { id: 'ts', title: 'MPEG-TS', detail: 'Some providers require this. VLC may be needed on iPhone.' },
];
// Only construct alternate paths for Xtream channels. Preserve M3U URLs exactly.
export function preparePlayback(item: Media, provider: Provider | null, format: LiveFormat = 'auto'): Media {
  if (item.kind !== 'live' || provider?.kind !== 'xtream' || !item.streamId || !/^\d+$/.test(item.streamId)) return item;
  const hls = streamURL(provider, 'live', item.streamId, 'm3u8');
  const ts = streamURL(provider, 'live', item.streamId, 'ts');
  const direct = item.url && item.url !== hls && item.url !== ts ? httpURL(item.url) : undefined;
  const urls = format === 'hls' ? [hls] : format === 'ts' ? [ts] : [direct, hls, ts].filter((url): url is string => !!url);
  const unique = [...new Set(urls)];
  return { ...item, url: unique[0], playbackURLs: unique, externalURL: format === 'auto' && !direct ? ts : unique[0] };
}
export function playbackURLs(item: Media): string[] {
  return [...new Set([item.url, ...(item.playbackURLs || [])].filter((url): url is string => !!url))];
}
export function streamFormat(url?: string): string {
  if (!url) return 'Provider stream';
  try { const path = new URL(url).pathname; return /\.m3u8$/i.test(path) ? 'HLS' : /\.ts$/i.test(path) ? 'MPEG-TS' : 'Provider stream'; }
  catch { return 'Provider stream'; }
}
