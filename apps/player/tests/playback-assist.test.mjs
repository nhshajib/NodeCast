import { test } from 'node:test';
import assert from 'node:assert/strict';
import { languageTag, matchTrack, previousChannel, recentChannelPicker, playbackHelp } from '../src/playbackAssist.ts';
import { classifyFailure } from '../src/recovery.ts';
import { catalogue } from './fixtures/library.mjs';

const track = (language, label = language) => ({ language, label });

test('language preferences match the exact variant and explain when only another variant exists', () => {
  assert.deepEqual(languageTag('ENG_us'), { base: 'en', tag: 'en-us' });
  const tracks = [track('en-GB', 'English (UK)'), track('en-US', 'English (US)'), track('pt-PT', 'Português')];
  assert.equal(matchTrack(tracks, 'en-US').track.label, 'English (US)');
  assert.equal(matchTrack(tracks, 'eng').track.label, 'English (UK)', 'a base preference accepts the first track in that language');
  const variant = matchTrack(tracks, 'pt-BR');
  assert.equal(variant.track, null, 'never silently switches pt-BR to pt-PT');
  assert.match(variant.notice, /Português.*pt-BR/);
  assert.match(matchTrack(tracks, 'ja').notice, /isn’t reported/);
  assert.deepEqual(matchTrack([], 'ja'), { track: null, notice: '' });
  assert.deepEqual(matchTrack(tracks, undefined), { track: null, notice: '' });
});

const entry = (item, minutesAgo) => ({ item: { id: item.id, name: item.name, group: item.group, kind: item.kind }, position: 0, duration: 0, lastPlayedAt: new Date(Date.UTC(2026, 10, 22, 12) - minutesAgo * 60000).toISOString(), completed: false });

test('previous channel comes from this profile’s history and rechecks access', () => {
  const [news, bbc, , sky, , adult] = catalogue;
  const history = [entry(news, 1), entry(adult, 2), entry(sky, 3), entry(bbc, 4), entry({ id: 'live:404', name: 'Gone', group: 'X', kind: 'live' }, 0)];
  assert.equal(previousChannel(history, news.id, catalogue, { restricted: ['Adult'] }).id, sky.id, 'skips the current, missing and protected channels');
  assert.equal(previousChannel(history, news.id, catalogue, { restricted: ['Adult'], unlocked: true }).id, adult.id);
  assert.equal(previousChannel(history, news.id, catalogue, { restricted: ['Adult'], hidden: [sky.id] }).id, bbc.id);
  assert.deepEqual(recentChannelPicker(history, news.id, catalogue, { restricted: ['Adult'] }).map(i => i.id), [sky.id, bbc.id]);
  assert.equal(previousChannel([], news.id, catalogue), null);
  const movies = [{ ...entry({ id: 'movies:1', name: 'Film', group: 'Drama', kind: 'movies' }, 1) }];
  assert.equal(previousChannel(movies, news.id, [...catalogue, { id: 'movies:1', name: 'Film', group: 'Drama', kind: 'movies' }]), null, 'only live channels');
});

test('playback help is specific for known failures and honest about unknown ones', () => {
  for (const kind of ['access', 'network', 'format', 'server', 'unknown']) {
    const help = playbackHelp(kind);
    assert.ok(help.title && help.steps.length >= 2);
    assert.match(help.uncertainty, /can’t always tell whether the provider or this player/);
  }
  assert.equal(playbackHelp(classifyFailure('weird provider code 777')).title, 'The reason wasn’t reported');
  assert.match(playbackHelp(classifyFailure('HTTP 403 Forbidden')).title, /refused/);
});
