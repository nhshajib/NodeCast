import type { Profile } from './vault';
import type { PlayerChoice } from './players';
export type ChannelPlayback = { player?: PlayerChoice; engine?: 'auto' | 'native' | 'vlc'; format?: 'auto' | 'hls' | 'ts' };
export function resolvePlayback(profile: Profile | null | undefined, id: string, defaultPlayer: PlayerChoice = 'internal') {
  const override = profile?.channelPlayback?.[id];
  return { player: override?.player ?? defaultPlayer, engine: override?.engine ?? profile?.liveEngine ?? 'auto', format: override?.format ?? profile?.liveFormat ?? 'auto' };
}
export function setChannelPlayback(profile: Profile, id: string, value?: ChannelPlayback): Profile {
  const channelPlayback = { ...profile.channelPlayback };
  if (value && Object.keys(value).length) channelPlayback[id] = value; else delete channelPlayback[id];
  return { ...profile, channelPlayback };
}
// Only fixed vocabulary and numbers cross this boundary. Never accept native error messages or URLs.
export type PlaybackInfo = { engine: 'native' | 'vlc'; format?: 'HLS' | 'MPEG-TS' | 'Video'; state?: 'loading' | 'playing' | 'paused' | 'failed' | 'ready'; audioTracks?: number; subtitleTracks?: number; attempts?: number };
export function diagnosticReport(info: PlaybackInfo) {
  const safe = (value: unknown, values: string[]) => typeof value === 'string' && values.includes(value) ? value : 'Not reported';
  const count = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 10000 ? String(value) : 'Not reported';
  return ['NodeCast playback information', `Engine: ${safe(info.engine, ['native', 'vlc'])}`, `Format: ${safe(info.format, ['HLS', 'MPEG-TS', 'Video'])}`, `State: ${safe(info.state, ['loading', 'playing', 'paused', 'failed', 'ready'])}`, `Audio tracks: ${count(info.audioTracks)}`, `Subtitle tracks: ${count(info.subtitleTracks)}`, `Recovery attempts: ${count(info.attempts)}`].join('\n');
}
