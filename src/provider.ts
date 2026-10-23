export type Provider = { kind: 'xtream' | 'm3u'; name: string; address: string; username: string; password: string };
export type Section = 'live' | 'movies' | 'series';
export type Media = {
  id: string; name: string; group: string; logo?: string; artwork?: number; url?: string;
  kind: Section; containerExtension?: string; streamId?: string; description?: string; rating?: string;
};
export class ProviderError extends Error {}

export function httpURL(value: string, base?: string): string {
  try {
    const url = base ? new URL(value.trim(), base) : new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error();
    return url.href;
  } catch { throw new ProviderError('Enter a complete HTTP or HTTPS URL.'); }
}
function artwork(value: unknown, base?: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return;
  try { return httpURL(value, base); } catch { return; }
}
export function normalizeProvider(provider: Provider): Provider {
  const address = new URL(httpURL(provider.address));
  if (provider.kind === 'xtream') {
    if (!provider.username.trim() || !provider.password) throw new ProviderError('Enter your provider username and password.');
    address.pathname = address.pathname.replace(/\/(player_api|get)\.php\/?$/i, '').replace(/\/$/, '');
    address.search = '';
    address.hash = '';
  }
  return { ...provider, address: address.href, name: provider.name.trim() || (provider.kind === 'm3u' ? 'My playlist' : 'My IPTV'), username: provider.username.trim() };
}

// Recognize a provider export link only when the user explicitly chooses to use it.
export function importXtreamLink(value: string): Pick<Provider, 'address' | 'username' | 'password'> | null {
  try {
    const url = new URL(httpURL(value));
    if (!/\/(get|player_api)\.php\/?$/i.test(url.pathname)) return null;
    const username = url.searchParams.get('username'), password = url.searchParams.get('password');
    if (!username || !password) return null;
    url.pathname = url.pathname.replace(/\/(get|player_api)\.php\/?$/i, ''); url.search = ''; url.hash = '';
    return { address: url.href, username, password };
  } catch { return null; }
}

// Stable non-secret identifier for UI preferences; never persist playlist URLs in AsyncStorage.
function opaqueID(value: string): string {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ value.charCodeAt(i); }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

export function parseM3U(text: string, base: string): Media[] {
  const items: Media[] = [];
  let metadata: { name: string; group: string; logo?: string; id?: string } | undefined;
  let groupOverride: string | undefined;
  if (!text.trimStart().replace(/^\uFEFF/, '').startsWith('#EXTM3U')) {
    throw new ProviderError('This link did not return an M3U playlist. Use the full playlist URL.');
  }
  if (/^#EXT-X-(TARGETDURATION|STREAM-INF|MEDIA-SEQUENCE|MEDIA):/m.test(text)) {
    throw new ProviderError('This is a single HLS stream, not a channel playlist. Add your provider’s M3U channel list instead.');
  }
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) {
      const attrs: Record<string, string> = {};
      for (const match of line.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) attrs[match[1]] = match[2];
      let quoted = false, delimiter = -1;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') quoted = !quoted;
        if (line[i] === ',' && !quoted) { delimiter = i; break; }
      }
      metadata = { name: (delimiter >= 0 ? line.slice(delimiter + 1) : attrs['tvg-name'])?.trim() || 'Unnamed channel',
        group: attrs['group-title'] || 'Uncategorized', logo: artwork(attrs['tvg-logo'], base), id: attrs['tvg-id'] };
      groupOverride = undefined;
    } else if (line.startsWith('#EXTGRP:')) {
      groupOverride = line.slice(8).trim();
    } else if (line && !line.startsWith('#')) {
      try {
        const url = httpURL(line, base);
        const kind: Section = /\.(mp4|mkv|mov|avi|m4v)(\?|$)/i.test(url) ? 'movies' : 'live';
        items.push({ id: `m3u:${opaqueID(url)}`, name: metadata?.name || 'Unnamed stream',
          group: groupOverride || metadata?.group || 'Uncategorized', logo: metadata?.logo, url, kind });
      } catch { /* Non-HTTP media is unsupported by the native player. */ }
      metadata = undefined; groupOverride = undefined;
    }
  }
  // Duplicate entries otherwise create duplicate React keys and favourites.
  return [...new Map(items.map(item => [item.id, item])).values()];
}

type Row = Record<string, unknown>;
const asRows = (value: unknown): Row[] => {
  if (!Array.isArray(value)) throw new ProviderError('The provider returned an unexpected library response.');
  return value.filter((item): item is Row => !!item && typeof item === 'object' && !Array.isArray(item));
};
async function request(url: string, signal?: AbortSignal, format: 'json' | 'text' = 'json', timeoutMs = 30000): Promise<any> {
  const timeout = new AbortController();
  const abort = () => timeout.abort();
  if (signal?.aborted) timeout.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { signal: timeout.signal });
    if (!response.ok) throw new ProviderError(`The provider returned HTTP ${response.status}. Check your connection details.`);
    return format === 'text' ? await response.text() : await response.json();
  } catch (error) {
    if (signal?.aborted) throw new ProviderError('Connection cancelled.');
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(timeout.signal.aborted ? 'The provider took too long to respond. Try again.' : 'Could not read the provider response. Check the URL, internet connection, or VPN required by your provider.');
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
  }
}
export function apiURL(provider: Provider, action?: string, extras: Record<string, string> = {}): string {
  const url = new URL(provider.address);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/player_api.php`;
  url.search = '';
  url.searchParams.set('username', provider.username);
  url.searchParams.set('password', provider.password);
  if (action) url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(extras)) url.searchParams.set(key, value);
  return url.href;
}
export function streamURL(provider: Provider, type: 'live' | 'movie' | 'series', id: string, ext: string): string {
  const url = new URL(provider.address);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${[type, provider.username, provider.password, `${id}.${ext}`].map(encodeURIComponent).join('/')}`;
  url.search = ''; url.hash = '';
  return url.href;
}
export async function authenticate(provider: Provider, signal?: AbortSignal): Promise<void> {
  if (provider.kind === 'm3u') return;
  const response = await request(apiURL(provider), signal);
  if (String(response?.user_info?.auth) !== '1' || String(response?.user_info?.status).toLowerCase() !== 'active') {
    throw new ProviderError('Login rejected or account inactive. Check your username and password.');
  }
}
export async function loadLibrary(provider: Provider, section: Section, signal?: AbortSignal): Promise<Media[]> {
  if (provider.kind === 'm3u') {
    const text = await request(provider.address, signal, 'text');
    const items = parseM3U(text, provider.address);
    if (!items.length) throw new ProviderError('No supported HTTP streams were found in this playlist.');
    return items;
  }
  const prefix = section === 'movies' ? 'vod' : section;
  const action = section === 'series' ? 'get_series' : `get_${prefix}_streams`;
  const [rawCategories, rawStreams] = await Promise.all([
    // Category lookup is optional; a category endpoint failure should not hide playable content.
    request(apiURL(provider, `get_${prefix}_categories`), signal).catch(() => []),
    request(apiURL(provider, action), signal),
  ]);
  const categories = new Map(asRows(rawCategories).map(row => [String(row.category_id), String(row.category_name || 'Uncategorized')]));
  return asRows(rawStreams).flatMap(row => {
    const id = row[section === 'series' ? 'series_id' : 'stream_id'];
    if (id == null || typeof row.name !== 'string') return [];
    const ext = typeof row.container_extension === 'string' && /^[a-z\d]+$/i.test(row.container_extension) ? row.container_extension : 'mp4';
    return [{ id: `${section}:${id}`, name: row.name, group: categories.get(String(row.category_id)) || 'Uncategorized',
      logo: artwork(row.stream_icon || row.cover), kind: section, streamId: String(id),
      description: typeof row.plot === 'string' ? row.plot : undefined,
      rating: row.rating ? String(row.rating) : undefined, containerExtension: section === 'live' ? 'm3u8' : ext,
      url: section === 'series' ? undefined : streamURL(provider, section === 'live' ? 'live' : 'movie', String(id), section === 'live' ? 'm3u8' : ext),
    }];
  });
}
export async function loadEpisodes(provider: Provider, series: Media, signal?: AbortSignal): Promise<Media[]> {
  const response = await request(apiURL(provider, 'get_series_info', { series_id: series.streamId || '' }), signal);
  if (!response?.episodes || typeof response.episodes !== 'object') throw new ProviderError('No episodes were returned for this series.');
  return Object.entries(response.episodes).sort(([a], [b]) => Number(a) - Number(b)).flatMap(([season, episodes]) =>
    asRows(episodes).sort((a,b) => Number(a.episode_num) - Number(b.episode_num)).flatMap(row => {
      if (row.id == null) return [];
      const ext = typeof row.container_extension === 'string' && /^[a-z\d]+$/i.test(row.container_extension) ? row.container_extension : 'mp4';
      return [{ id: `episode:${row.id}`, name: String(row.title || `Episode ${row.episode_num || ''}`), group: `Season ${season}`,
        logo: series.logo, kind: 'series' as const, streamId: String(row.id), containerExtension: ext, url: streamURL(provider, 'series', String(row.id), ext) }];
    }));
}

export async function loadNowNext(provider: Provider, streamId: string, signal?: AbortSignal) {
  if (provider.kind !== 'xtream' || !/^\d+$/.test(streamId)) throw new ProviderError('This profile does not provide Xtream guide data.');
  const response = await request(apiURL(provider, 'get_short_epg', { stream_id: streamId, limit: '8' }), signal, 'json', 8000);
  return response?.epg_listings;
}
