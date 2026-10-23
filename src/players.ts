import { httpURL } from './provider.ts';
export type ExternalPlayer = 'vlc' | 'infuse';
export type PlayerChoice = 'internal' | 'ask' | ExternalPlayer;
export const players: { id: PlayerChoice; name: string; detail: string }[] = [
  { id: 'internal', name: 'NodeCast player', detail: 'Play here with native iPhone controls' },
  { id: 'ask', name: 'Ask each time', detail: 'Choose a player when you tap a title' },
  { id: 'vlc', name: 'VLC', detail: 'Requires VLC installed on this iPhone' },
  { id: 'infuse', name: 'Infuse', detail: 'Requires Infuse installed; format support varies' },
];
export function externalPlayerURL(player: ExternalPlayer, stream: string): string {
  const url = httpURL(stream);
  if (player === 'vlc') return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`;
  if (player === 'infuse') return `infuse://x-callback-url/play?url=${encodeURIComponent(url)}`;
  throw new Error('Unsupported external player.');
}
