import type { Media } from './provider';
import { Image, Platform } from 'react-native';
// Original GlowTV test scene; no provider, broadcaster or third-party content.
const asset = require('../assets/demo/glow-study.mp4');
const sample: string = Platform.OS === 'web' ? asset : Image.resolveAssetSource(asset)!.uri;
export const demoLibrary: Media[] = [
  { id: 'demo:evening', name: 'Evening studio', group: 'Original demos', kind: 'live', url: sample, artwork: require('../assets/demo/Evening.png') },
  { id: 'demo:north', name: 'Wild North', group: 'Original demos', kind: 'live', url: sample, artwork: require('../assets/demo/WildNorth.png') },
  { id: 'demo:quiet', name: 'Quiet studio', group: 'Original demos', kind: 'live', url: sample, artwork: require('../assets/demo/Quiet.png') },
  { id: 'demo:tidewater', name: 'Tidewater', group: 'Original demos', kind: 'movies', url: sample, artwork: require('../assets/demo/Tidewater.png'), description: 'An original abstract scene made for the GlowTV player demo.' },
  { id: 'demo:evening-film', name: 'Evening light', group: 'Original demos', kind: 'movies', url: sample, artwork: require('../assets/demo/Evening.png'), description: 'An original GlowTV test scene.' },
];
