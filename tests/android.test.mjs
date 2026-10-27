import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { androidVLCIntent, externalPlayerURL } from '../src/players.ts';
const require = createRequire(import.meta.url);
const config = require('../app.config.js');
test('Android editions have separate packages and TV is landscape', () => {
  const before = process.env.NODECAST_TARGET;
  try {
    process.env.NODECAST_TARGET = 'mobile'; const mobile = config();
    process.env.NODECAST_TARGET = 'tv'; const tv = config();
    assert.equal(mobile.android.package, 'com.nhshajib.nodecast');
    assert.equal(tv.android.package, 'com.nhshajib.nodecast.tv');
    assert.equal(tv.orientation, 'landscape');
    assert.equal(mobile.ios.bundleIdentifier, tv.ios.bundleIdentifier);
  } finally { if (before === undefined) delete process.env.NODECAST_TARGET; else process.env.NODECAST_TARGET = before; }
});
test('Android VLC uses an explicit video activity and preserves the full stream URL', () => {
  const stream = 'http://example.test/live/user/p%40ss/4.ts?token=hello%20world';
  assert.deepEqual(androidVLCIntent(stream), { data: stream, type: 'video/*', packageName: 'org.videolan.vlc', className: 'org.videolan.vlc.gui.video.VideoPlayerActivity' });
  assert.throws(() => androidVLCIntent('javascript:alert(1)'));
  assert.match(externalPlayerURL('vlc', 'https://example.test/a.m3u8'), /^vlc-x-callback:/);
});
