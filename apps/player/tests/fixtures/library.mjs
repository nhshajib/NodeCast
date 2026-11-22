// Shared 1.0.0 fixtures: Xtream, remote M3U, local file, multiple profiles,
// protected categories and an old (version 1) backup. Credentials are fake.
export const xtream = { kind: 'xtream', name: 'Fixture Xtream', address: 'https://provider.example', username: 'demo', password: 'secret-pass' };
export const remoteM3U = { kind: 'm3u', name: 'Fixture M3U', address: 'https://lists.example/playlist.m3u', username: '', password: '' };
export const localM3U = { kind: 'm3u', name: 'Fixture file', address: 'https://import.invalid/local.m3u', username: '', password: '', localText: '#EXTM3U\n#EXTINF:-1 group-title="News",Local News\nhttps://cdn.example/local.m3u8\n' };

export const m3uText = [
  '#EXTM3U',
  '#EXTINF:-1 tvg-id="bbc1.uk" group-title="UK",BBC One HD',
  'https://cdn.example/bbc1.m3u8',
  '#EXTINF:-1 tvg-id="bbc1.uk" group-title="UK",BBC One HD',
  'https://cdn.example/bbc1.m3u8',
  '#EXTINF:-1 tvg-id="bbc1.ni" group-title="UK",BBC One NI',
  'https://cdn.example/bbc1-ni.m3u8',
  '#EXTINF:-1 group-title="Kids",Café Cartoons',
  'https://cdn.example/cafe.m3u8',
  '#EXTINF:-1 group-title="Adult",Late Night',
  'https://cdn.example/late.m3u8',
].join('\n');

/** Xtream rows as returned by player_api.php, including `added` timestamps. */
export const xtreamMovies = [
  { stream_id: 11, name: 'The Long Night', category_id: '1', container_extension: 'mkv', added: '1700000000' },
  { stream_id: 12, name: 'Night Shift', category_id: '1', container_extension: 'mp4', added: '1710000000' },
  { stream_id: 13, name: 'Nightingale', category_id: '2', container_extension: 'mp4' },
  { stream_id: 14, name: 'Ночной дозор', category_id: '2', container_extension: 'mp4', added: '1690000000' },
];
export const xtreamCategories = [{ category_id: '1', category_name: 'Drama' }, { category_id: '2', category_name: 'World' }];

export const media = (id, name, group = 'News', kind = 'live', extra = {}) => ({ id: `${kind}:${id}`, name, group, kind, streamId: String(id), ...extra });
export const catalogue = [
  media(1, 'BBC News', 'News'), media(2, 'BBC One HD', 'UK'), media(3, 'BBC One NI', 'UK'), media(4, 'Sky News', 'News'),
  media(5, 'Café Cartoons', 'Kids'), media(6, 'Late Night', 'Adult'), media(7, 'Newsroom Live', 'News'), media(8, 'Ночные новости', 'World'),
];

export const profile = (id, provider = xtream, extra = {}) => ({ id, provider, createdAt: '2026-11-01T10:00:00.000Z', favorites: [], ...extra });
export const profiles = [
  profile('p1', xtream, { favorites: ['live:1', 'live:6'], hiddenGroups: ['World'], restrictedGroups: ['Adult'] }),
  profile('p2', remoteM3U),
  profile('p3', localM3U),
];

export const v1Backup = () => ({
  format: 'nodecast-backup', version: 1, createdAt: '2026-11-02T10:00:00.000Z',
  vault: { version: 2, activeId: 'p1', profiles: profiles.map(p => JSON.parse(JSON.stringify(p))) },
  preferences: { onboarded: true, player: 'internal', theme: 'system', baseline: null },
  history: { p1: [], p2: [], p3: [] }, family: null,
});
