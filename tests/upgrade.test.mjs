import test from 'node:test';
import assert from 'node:assert/strict';
import { loadM3U, loadLibrary, parseM3U, ProviderError } from '../src/provider.ts';
import { compatibilityOptions } from '../src/playbackPolicy.ts';
import { compareIP } from '../src/network.ts';
function mock(t, fetch) { const old = globalThis.fetch; globalThis.fetch = fetch; t.after(() => globalThis.fetch = old); }
test('missing M3U endpoint preserves HTTP 404 and explains Xtream without revealing credentials', async t => {
  let calls = 0; mock(t, async () => { calls++; return new Response('', { status: 404 }); });
  await assert.rejects(loadM3U('https://example.com/get.php?password=secret'), error => error instanceof ProviderError && error.status === 404 && /Xtream/.test(error.message) && !/secret/.test(error.message));
  assert.equal(calls, 1);
});
test('M3U redirects resolve relative stream paths against the final playlist URL', async t => {
  mock(t, async () => { const response = new Response('#EXTM3U\n#EXTINF:-1,News\nchannel.m3u8'); Object.defineProperty(response, 'url', { value: 'https://cdn.example.com/export/list.m3u' }); return response; });
  const items = await loadLibrary({ kind: 'm3u', name: 'Home', address: 'https://provider.example/get.php', username: '', password: '' }, 'live');
  assert.equal(items[0].url, 'https://cdn.example.com/export/channel.m3u8');
});
test('a rejected generic playlist request tries VLC once and stops on failure', async t => {
  const calls = []; mock(t, async (_, options) => { calls.push(options); return new Response('', { status: 403 }); });
  await assert.rejects(loadM3U('https://example.com/list.m3u'), /HTTP 403/);
  assert.equal(calls.length, 2); assert.match(calls[1].headers['User-Agent'], /VLC/);
});
test('playlist quote styles, CR-only lines and per-stream headers survive parsing without leaking to the next channel', () => {
  const items = parseM3U("#EXTM3U\r#EXTINF:-1 group-title='News, local',Channel one\r#EXTVLCOPT:http-user-agent=Example Player\r#EXTVLCOPT:http-referrer=https://example.com/\rone.m3u8\r#EXTINF:-1,Channel two\rtwo.m3u8", 'https://example.com/list.m3u');
  assert.equal(items[0].group, 'News, local'); assert.equal(items[0].name, 'Channel one');
  assert.deepEqual(items[0].headers, { 'User-Agent': 'Example Player', Referer: 'https://example.com/' }); assert.equal(items[1].headers, undefined);
  assert.ok(compatibilityOptions(items[0]).includes(':http-user-agent=Example Player'));
  assert.ok(!compatibilityOptions({ ...items[0], headers: { 'User-Agent': 'invalid\r\nHeader: x' } }).some(value => /invalid/.test(value)));
});
test('equivalent IPv6 spellings match home IP and stale checks never warn', () => {
  const current = { ip: '2001:db8::1' };
  assert.equal(compareIP(current, '2001:0db8:0000:0000:0000:0000:0000:0001'), 'same');
  assert.equal(compareIP(current, current.ip, true), 'unknown');
});
