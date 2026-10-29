import type { Media } from './provider';
export type MediaSummary = Pick<Media, 'id' | 'name' | 'group' | 'kind' | 'streamId' | 'containerExtension' | 'description' | 'rating' | 'seriesId' | 'epgId' | 'accessGroup'>;
export type ViewingEntry = { item: MediaSummary; position: number; duration: number; lastPlayedAt: string; completed: boolean; watchedOverride?: boolean };
export type PlaybackSnapshot = { position: number; duration: number; ended?: boolean };
export function summarizeMedia(item: Media): MediaSummary {
  // Explicit allowlist. URLs, artwork URLs, and provider credentials never enter history/catalog storage.
  const text = (value: unknown, limit = 12000) => typeof value === 'string' ? value.slice(0, limit) : undefined;
  return { id: text(item.id, 300) || '', name: text(item.name, 500) || 'Unnamed title', group: text(item.group, 300) || 'Uncategorized',
    kind: item.kind, streamId: text(item.streamId, 100), containerExtension: text(item.containerExtension, 10), description: text(item.description), rating: text(item.rating, 20), seriesId: text(item.seriesId, 300), epgId: text(item.epgId, 300), accessGroup: text(item.accessGroup, 300) };
}
// Keep ordinary recents small, retaining up to 2,000 older episode states for series continuity.
function boundViewing(entries: ViewingEntry[]): ViewingEntry[] {
  return [...entries.slice(0, 60), ...entries.slice(60).filter(entry => entry.item.kind === 'series' && entry.item.id.startsWith('episode:')).slice(0, 2000)];
}
export function recordViewing(entries: ViewingEntry[], item: Media, snapshot: PlaybackSnapshot, now = new Date().toISOString()): ViewingEntry[] {
  const duration = Number.isFinite(snapshot.duration) && snapshot.duration > 0 ? snapshot.duration : 0;
  const position = item.kind === 'live' ? 0 : Math.max(0, Number.isFinite(snapshot.position) ? snapshot.position : 0);
  const previous = entries.find(entry => entry.item.id === item.id);
  const completed = item.kind !== 'live' && (!!snapshot.ended || (duration > 0 && position / duration >= .95));
  const next: ViewingEntry = { item: summarizeMedia(item), position: duration ? Math.min(position, duration) : position, duration, lastPlayedAt: now, completed: previous?.watchedOverride ?? completed, watchedOverride: previous?.watchedOverride };
  return boundViewing([next, ...entries.filter(entry => entry.item.id !== item.id)]);
}
export function resumePosition(entry?: ViewingEntry): number {
  if (!entry || entry.item.kind === 'live' || entry.completed || entry.position < 10 || entry.duration <= 0 || entry.position >= entry.duration - 5) return 0;
  return entry.position;
}
export function parseViewing(value: unknown): ViewingEntry[] {
  if (!Array.isArray(value)) return [];
  return boundViewing(value.slice(0, 2060).flatMap(entry => {
    if (!entry || !entry.item || !['live', 'movies', 'series'].includes(entry.item.kind) || typeof entry.item.id !== 'string' ||
      typeof entry.item.name !== 'string' || typeof entry.item.group !== 'string' || !Number.isFinite(entry.position) || !Number.isFinite(entry.duration) ||
      entry.position < 0 || entry.duration < 0 || typeof entry.lastPlayedAt !== 'string' || !Number.isFinite(Date.parse(entry.lastPlayedAt))) return [];
    return [{ item: summarizeMedia(entry.item), position: entry.position, duration: entry.duration, lastPlayedAt: entry.lastPlayedAt, completed: entry.watchedOverride === true || (entry.watchedOverride !== false && entry.completed === true), watchedOverride: typeof entry.watchedOverride === 'boolean' ? entry.watchedOverride : undefined }];
  }));
}
export function progressPercent(position: number, duration: number): number {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, position / duration * 100));
}
export function timeLabel(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

/** Video controls need seconds, while the library's timeLabel stays a compact minute label. */
export function playbackClock(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}

export function markWatched(entries: ViewingEntry[], item: Media, watched: boolean): ViewingEntry[] {
  const previous = entries.find(entry => entry.item.id === item.id);
  return boundViewing([{ item: summarizeMedia(item), position: watched ? previous?.position || 0 : 0, duration: previous?.duration || 0,
    lastPlayedAt: new Date().toISOString(), completed: watched, watchedOverride: watched ? true : undefined }, ...entries.filter(entry => entry.item.id !== item.id)]);
}
