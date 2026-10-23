import type { Media } from './provider';
// Public player test streams; no paid IPTV content is bundled.
const sample = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
export const demoLibrary: Media[] = [
  { id: 'demo:1', name: 'Discover the world', group: 'Documentary', kind: 'live', url: sample },
  { id: 'demo:2', name: 'The great outdoors', group: 'Lifestyle', kind: 'live', url: sample },
  { id: 'demo:3', name: 'Cinema preview', group: 'Entertainment', kind: 'live', url: sample },
  { id: 'demo:4', artwork: require('../assets/demo/BigBuckBunny.jpg'), name: 'Big Buck Bunny', group: 'Animation', kind: 'movies', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', description: 'A short animated film by the Blender Foundation. A public sample for testing your player.' },
  { id: 'demo:5', artwork: require('../assets/demo/Sintel.jpg'), name: 'Sintel', group: 'Animation', kind: 'movies', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', description: 'A public sample film by the Blender Foundation.' },
];
