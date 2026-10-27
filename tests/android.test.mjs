import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { externalPlayerURL } from '../src/players.ts';
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
test('Android VLC intent retains encoded credentials, query and HTTP scheme', () => {
  const result = externalPlayerURL('vlc', 'http://example.test/live/user/p%40ss/4.ts?token=hello%20world', 'android');
  assert.equal(result, 'intent://example.test/live/user/p%40ss/4.ts?token=hello%20world#Intent;scheme=http;package=org.videolan.vlc;type=video/*;end');
  assert.match(externalPlayerURL('vlc', 'https://example.test/a.m3u8', 'android'), /scheme=https;/);
  assert.match(externalPlayerURL('vlc', 'https://example.test/a.m3u8'), /^vlc-x-callback:/);
});
