import { normalizeSearch } from './catalog.ts';
import type { GuideChannel, GuideProgramme } from './xmltv.ts';

type Channel = { id: string; name: string; epgId?: string };
export type GuideSettings = { url: string; mapping?: Record<string, string>; offsetMinutes?: number };
export type MatchSource = 'manual' | 'epg' | 'name';
export type GuideMatch = { guideId: string; source: MatchSource } | null;

/** Builds lookups once per guide: known IDs and names that appear exactly once. */
export function guideIndex(guideChannels: GuideChannel[]) {
  const ids = new Set(guideChannels.map(channel => channel.id));
  const byName = new Map<string, string[]>();
  for (const channel of guideChannels) {
    const name = normalizeSearch(channel.name);
    if (!name) continue;
    byName.set(name, [...(byName.get(name) || []), channel.id]);
  }
  return { ids, byName };
}

/**
 * Manual choices first, then the provider's exact EPG ID, then a normalized exact name that is
 * unique on both sides. Approximate names are never applied automatically.
 */
export function resolveGuideId(channel: Channel, settings: GuideSettings | undefined, index: ReturnType<typeof guideIndex>, nameCounts?: Map<string, number>): GuideMatch {
  const manual = settings?.mapping?.[channel.id];
  if (manual) return { guideId: manual, source: 'manual' };
  if (channel.epgId && index.ids.has(channel.epgId)) return { guideId: channel.epgId, source: 'epg' };
  const name = normalizeSearch(channel.name);
  const candidates = index.byName.get(name);
  // Two playlist channels with the same name (for example regional feeds) are ambiguous too.
  if (candidates?.length === 1 && (!nameCounts || (nameCounts.get(name) || 0) <= 1)) return { guideId: candidates[0], source: 'name' };
  return null;
}
export const playlistNameCounts = (channels: Channel[]) => channels.reduce((counts, channel) => { const name = normalizeSearch(channel.name); counts.set(name, (counts.get(name) || 0) + 1); return counts; }, new Map<string, number>());

const quality = new Set(['hd', 'fhd', 'uhd', 'sd', '4k', '8k', 'hevc', 'h265', '1080p', '720p', 'backup', 'raw']);
const tokens = (value: string) => new Set(normalizeSearch(value).split(' ').filter(token => token && !quality.has(token)));
/** Suggestions for manual repair, best first. Region and language words still count, so variants stay apart. */
export function guideSuggestions(channel: Channel, guideChannels: GuideChannel[], limit = 5) {
  const mine = tokens(channel.name);
  if (!mine.size) return [];
  return guideChannels.map(candidate => {
    const theirs = tokens(candidate.name);
    const shared = [...mine].filter(token => theirs.has(token)).length;
    const score = shared / new Set([...mine, ...theirs]).size;
    return { channel: candidate, score };
  }).filter(entry => entry.score >= 0.5).sort((a, b) => b.score - a.score || a.channel.name.localeCompare(b.channel.name)).slice(0, limit).map(entry => entry.channel);
}

export type GuideHealth = { total: number; matched: number; manual: number; epg: number; name: number; unmatched: Channel[] };
export function guideHealth(channels: Channel[], settings: GuideSettings | undefined, guideChannels: GuideChannel[]): GuideHealth {
  const index = guideIndex(guideChannels), counts = playlistNameCounts(channels);
  const health: GuideHealth = { total: channels.length, matched: 0, manual: 0, epg: 0, name: 0, unmatched: [] };
  for (const channel of channels) {
    const match = resolveGuideId(channel, settings, index, counts);
    if (!match) { health.unmatched.push(channel); continue; }
    health.matched++; health[match.source]++;
  }
  return health;
}

/** Offsets are whole quarter hours within ±12 hours. */
export const validOffset = (value: unknown) => value === undefined || (Number.isInteger(value) && Math.abs(value as number) <= 720 && (value as number) % 15 === 0);
/** Applied exactly once, when deriving display and archive times. Stored programmes keep raw UTC. */
export function shiftProgrammes(programmes: GuideProgramme[], offsetMinutes = 0): GuideProgramme[] {
  if (!offsetMinutes) return programmes;
  const shift = offsetMinutes * 60000;
  return programmes.map(programme => ({ ...programme, start: programme.start + shift, end: programme.end + shift }));
}
/** The window to query in raw UTC for a displayed window. */
export const rawWindow = (from: number, to: number, offsetMinutes = 0) => ({ from: from - offsetMinutes * 60000, to: to - offsetMinutes * 60000 });
export const offsetLabel = (minutes = 0) => {
  if (!minutes) return 'No correction';
  const sign = minutes > 0 ? '+' : '−', abs = Math.abs(minutes), h = Math.floor(abs / 60), m = abs % 60;
  return `${sign}${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`;
};

/**
 * Keeps legitimate past schedules when a refresh omits them: an old programme survives only if it
 * ended inside the archive window and no incoming programme on that channel overlaps it.
 * Incoming data always wins where they overlap; nothing is invented.
 */
export function mergeHistory(existing: GuideProgramme[], incoming: GuideProgramme[], now: number, lookbackDays = 1): GuideProgramme[] {
  const floor = now - Math.max(1, Math.min(7, lookbackDays)) * 86400000;
  const byChannel = new Map<string, GuideProgramme[]>();
  for (const programme of incoming) byChannel.set(programme.channel, [...(byChannel.get(programme.channel) || []), programme]);
  const kept = existing.filter(old => old.end <= now && old.end > floor && !(byChannel.get(old.channel) || []).some(fresh => fresh.start < old.end && fresh.end > old.start));
  return [...kept, ...incoming].sort((a, b) => a.channel.localeCompare(b.channel) || a.start - b.start);
}

export type GuideState = 'download-failed' | 'unmatched' | 'empty-window' | 'no-history' | 'ok';
/** Distinct, honest explanations for an empty guide row. */
export function guideRowState({ matched, programmes, from, now, archiveDays = 0, failed = false }: { matched: boolean; programmes: number; from: number; now: number; archiveDays?: number; failed?: boolean }): GuideState {
  if (failed && !programmes) return 'download-failed';
  if (!matched) return 'unmatched';
  if (programmes) return 'ok';
  if (from < now - Math.max(1, archiveDays) * 86400000) return 'no-history';
  return 'empty-window';
}
export const guideRowMessage: Record<Exclude<GuideState, 'ok'>, string> = {
  'download-failed': 'The guide couldn’t be downloaded. Saved schedules are shown when available.',
  unmatched: 'No guide channel matched. Use Guide settings to choose one.',
  'empty-window': 'Your guide has no programmes for this time.',
  'no-history': 'Your guide doesn’t keep schedules this far back.',
};
