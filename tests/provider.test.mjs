import test from 'node:test';
import assert from 'node:assert/strict';
import { httpURL, normalizeProvider, parseM3U, apiURL, streamURL, authenticate, loadLibrary, loadEpisodes } from '../src/provider.ts';
const base = 'https://provider.example/folder/list.m3u';
const provider = { kind: 'xtream', name: 'Test', address: 'https://provider.example:8080/prefix/', username: 'user/name', password: 'p@ss&?/%' };
function withFetch(t, handler) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler;
  t.after(() => { globalThis.fetch = previous; });
}
const json = value => new Response(JSON.stringify(value), { status: 200 });

test('only complete HTTP and HTTPS addresses are accepted', () => {
  for (const url of ['file:///secret', 'ftp://example.com/a', 'example.com', 'javascript:alert(1)']) assert.throws(() => httpURL(url));
  assert.equal(httpURL(' http://192.168.1.10:8080 '), 'http://192.168.1.10:8080/');
});
test('Xtream normalization removes API suffix and imported query credentials', () => {
  const result = normalizeProvider({ ...provider, address: 'https://provider.example/prefix/player_api.php?username=old' });
  assert.equal(result.address, 'https://provider.example/prefix');
  assert.throws(() => normalizeProvider({ ...provider, username: '' }));
});
test('M3U link query credentials are preserved', () => {
  const url = 'https://provider.example/get.php?username=a&password=b&type=m3u_plus';
  assert.equal(normalizeProvider({ ...provider, kind: 'm3u', address: url }).address, url);
});
test('M3U handles quoted commas, relative streams and relative logos', () => {
  const items = parseM3U('#EXTM3U\n#EXTINF:-1 tvg-name="News, World" group-title="News" tvg-logo="logo.png",World, Today\nchannel.m3u8', base);
  assert.equal(items[0].name, 'World, Today');
  assert.equal(items[0].group, 'News');
  assert.equal(items[0].url, 'https://provider.example/folder/channel.m3u8');
  assert.equal(items[0].logo, 'https://provider.example/folder/logo.png');
  assert.ok(!items[0].id.includes('https'));
});
test('M3U resets metadata after unsupported URLs, accepts BOM/CRLF and EXTGRP', () => {
  const text = '\uFEFF#EXTM3U\r\n#EXTINF:-1,Bad\r\nfile:///secret\r\n#EXTINF:-1,Good\r\n#EXTGRP:Sports\r\nhttps://provider.example/live.m3u8';
  const items = parseM3U(text, base);
  assert.equal(items.length, 1); assert.equal(items[0].name, 'Good'); assert.equal(items[0].group, 'Sports');
});
test('M3U deduplicates streams and classifies obvious movie file extensions', () => {
  const items = parseM3U('#EXTM3U\n#EXTINF:-1,Film\nhttps://provider.example/movie.mp4?token=secret\n#EXTINF:-1,Film\nhttps://provider.example/movie.mp4?token=secret', base);
  assert.equal(items.length, 1); assert.equal(items[0].kind, 'movies'); assert.ok(!items[0].id.includes('secret'));
});
test('HLS media/manifests and HTML error pages are rejected as channel lists', () => {
  assert.throws(() => parseM3U('<html>Forbidden</html>', base));
  assert.throws(() => parseM3U('#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nsegment.ts', base));
});
test('Xtream API URL correctly escapes credentials and preserves path prefix', () => {
  const url = new URL(apiURL(provider, 'get_series_info', { series_id: '44' }));
  assert.equal(url.pathname, '/prefix/player_api.php');
  assert.equal(url.searchParams.get('username'), provider.username);
  assert.equal(url.searchParams.get('password'), provider.password);
  assert.equal(url.searchParams.get('series_id'), '44');
});
test('stream URLs encode each credential segment once', () => {
  const url = new URL(streamURL(provider, 'live', '55', 'm3u8'));
  const parts = url.pathname.split('/').slice(3).map(decodeURIComponent);
  assert.deepEqual(parts, [provider.username, provider.password, '55.m3u8']);
  assert.equal(url.search, '');
});
test('authentication accepts active account and rejects inactive account', async t => {
  withFetch(t, async () => json({ user_info: { auth: 1, status: 'Active' } }));
  await authenticate(provider);
  globalThis.fetch = async () => json({ user_info: { auth: 1, status: 'Expired' } });
  await assert.rejects(authenticate(provider), /inactive/);
});
test('live library maps categories, produces HLS URL, and skips malformed entries', async t => {
  withFetch(t, async url => new URL(url).searchParams.get('action') === 'get_live_categories'
    ? json([{ category_id: '2', category_name: 'Sports' }])
    : json([{ stream_id: 8, name: 'Sports One', category_id: '2' }, { name: 'Missing ID' }]));
  const items = await loadLibrary(provider, 'live');
  assert.equal(items.length, 1); assert.equal(items[0].group, 'Sports'); assert.match(items[0].url, /8\.m3u8$/);
});
test('optional category endpoint failure does not prevent library access', async t => {
  withFetch(t, async url => new URL(url).searchParams.get('action').includes('categories')
    ? new Response('', { status: 404 }) : json([{ stream_id: 9, name: 'Film', container_extension: 'mp4' }]));
  const items = await loadLibrary(provider, 'movies'); assert.equal(items[0].group, 'Uncategorized');
});
test('series episodes sort seasons numerically and produce provider stream URLs', async t => {
  withFetch(t, async () => json({ episodes: { 10: [{ id: 2, title: 'Later', episode_num: 1 }], 2: [{ id: 1, title: 'Earlier', episode_num: 1, container_extension: 'mkv' }] } }));
  const episodes = await loadEpisodes(provider, { streamId: '3' });
  assert.equal(episodes[0].name, 'Earlier'); assert.equal(episodes[0].group, 'Season 2'); assert.match(episodes[0].url, /1\.mkv$/);
});
test('network errors never expose provider URLs or credentials', async t => {
  withFetch(t, async () => { throw new Error(`Network failed ${apiURL(provider)}`); });
  await assert.rejects(authenticate(provider), error => !error.message.includes(provider.password) && !error.message.includes('provider.example'));
});
test('already cancelled requests are stopped', async t => {
  withFetch(t, async (_url, { signal }) => { signal.throwIfAborted(); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(authenticate(provider, controller.signal), /cancelled/);
});
