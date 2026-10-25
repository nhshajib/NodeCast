export const appVersion = '0.2.5';
export const releases = [
  { version: '0.2.5', date: 'October 24, 2026', title: 'A little support, always optional.', changes: [
    'Added Buy me a coffee in Settings. NodeCast stays free, with no features locked behind support.',
  ] },
  { version: '0.2.4', date: 'October 23, 2026', title: 'A calmer, clearer NodeCast.', changes: [
    'Refined typography, contrast, spacing and touch targets throughout the app.',
    'A cleaner Home, readable connection card and layouts that handle long names.',
    'Simpler Playback settings with advanced live options tucked away until needed.',
    'Compact, expandable version history and clearer form focus states.',
  ] },
  { version: '0.2.3', date: 'October 23, 2026', title: 'A new engine for live TV.', changes: [
    'Added an embedded VLC engine for live TV in new custom NodeCast builds; Automatic selects it when available.',
    'Expo Go keeps its native player and clearly explains when a custom build is required.',
    'Added a saved built-in engine choice, live playback controls, stream track selection and bounded recovery.',
    'HTTP 405 and incompatible byte-range responses now show server compatibility guidance instead of repeated retries.',
  ] },
  { version: '0.2.2', date: 'October 23, 2026', title: 'Ready for native testing.', changes: [
    'Added a custom development-client workflow to test native settings outside Expo Go.',
    'Separate development, standalone preview and App Store build profiles.',
    'Expo Go remains available for quick checks. Custom iPhone builds require Apple signing.',
  ] },
  { version: '0.2.1', date: 'October 23, 2026', title: 'Clearer navigation. More flexible live TV.', changes: [
    'Visible Back and Close controls on full-screen pages, with safe-area handling for iPhone modals.',
    'Back to library and external-player controls stay available during loading and playback failures.',
    'Xtream live playback can try HLS and MPEG-TS; VLC uses MPEG-TS by default in Automatic mode. A per-profile format choice is available in Playback.',
    'Corrected retry scheduling and source replacement; failed streams show recovery actions instead of a stalled video surface.',
    'Provider-supplied direct live URLs are preserved. M3U stream links remain unchanged.',
    'Channel search spans visible categories and handles punctuation, accents and spacing such as BBC1 / BBC 1.',
    'Version history is now available in Settings.',
  ] },
  { version: '0.2.0', date: 'October 23, 2026', title: 'Your personal TV space.', changes: [
    'Lavender and cream design, local profiles, Xtream Codes and M3U libraries.',
    'Favorites, Continue watching, cached browsing, category organization and now/next schedules.',
    'Public IP and approximate location, external-player choice and audio/subtitle preferences.',
  ] },
];
