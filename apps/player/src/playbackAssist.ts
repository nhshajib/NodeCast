import type { Media } from './provider.ts';
import { matchesAny } from './groups.ts';
import type { ViewingEntry } from './activity.ts';
import type { FailureKind } from './recovery.ts';

const iso3: Record<string, string> = { eng: 'en', fra: 'fr', fre: 'fr', spa: 'es', deu: 'de', ger: 'de', ita: 'it', por: 'pt', nld: 'nl', dut: 'nl', ara: 'ar', tur: 'tr', pol: 'pl', rus: 'ru', zho: 'zh', chi: 'zh', jpn: 'ja', kor: 'ko', hin: 'hi', swe: 'sv', nor: 'no', dan: 'da', fin: 'fi', ell: 'el', gre: 'el', heb: 'he', ben: 'bn', urd: 'ur' };
/** "en-US", "eng_us", "EN" → { base: "en", tag: "en-us" }. */
export function languageTag(value: string) {
  const parts = value.trim().toLowerCase().replace(/_/g, '-').split('-').filter(Boolean);
  if (!parts.length) return { base: '', tag: '' };
  const base = iso3[parts[0]] || parts[0];
  return { base, tag: [base, ...parts.slice(1)].join('-') };
}
/**
 * Exact variant first. A preference with a region or variant ("pt-BR") never silently falls back to
 * another variant ("pt-PT"); a base preference ("pt") accepts the first track in that language.
 */
export function matchTrack<T extends { language?: string | null; label?: string | null }>(available: T[], preferred: string | undefined): { track: T | null; notice: string } {
  if (!preferred) return { track: null, notice: '' };
  const want = languageTag(preferred);
  if (!want.base) return { track: null, notice: '' };
  const tagged = available.map(track => ({ track, lang: languageTag(track.language || '') }));
  const exact = tagged.find(entry => entry.lang.tag === want.tag);
  if (exact) return { track: exact.track, notice: '' };
  const sameBase = tagged.filter(entry => entry.lang.base === want.base);
  if (want.tag === want.base && sameBase.length) return { track: sameBase[0].track, notice: '' };
  if (sameBase.length) return { track: null, notice: `This stream has ${sameBase.map(entry => entry.track.label || entry.track.language).filter(Boolean).join(', ')} but not your saved ${preferred}. Choose a track if you’d like one of those.` };
  return { track: null, notice: available.length ? 'Your preferred language isn’t reported by this stream. You can choose an available track.' : '' };
}

/**
 * The live channel watched before the current one, from this profile's history only.
 * It must still be in the catalogue and visible: hidden and family-protected channels are skipped.
 */
export type ChannelAccess = { restricted?: string[]; unlocked?: boolean; hidden?: string[] };
export function previousChannel(history: ViewingEntry[], currentId: string, catalogue: Media[], { restricted = [], unlocked = false, hidden = [] }: ChannelAccess = {}): Media | null {
  const byId = new Map(catalogue.map(item => [item.id, item]));
  const recent = history.filter(entry => entry.item.kind === 'live' && entry.item.id !== currentId).sort((a, b) => Date.parse(b.lastPlayedAt) - Date.parse(a.lastPlayedAt));
  for (const entry of recent) {
    const item = byId.get(entry.item.id);
    if (!item || hidden.includes(item.id)) continue;
    if (!unlocked && (matchesAny(item.group, restricted) || (!!item.accessGroup && restricted.includes(item.accessGroup)))) continue;
    return item;
  }
  return null;
}
/** Recently watched live channels for a quick picker (most recent first, current excluded). */
export function recentChannelPicker(history: ViewingEntry[], currentId: string, catalogue: Media[], options: ChannelAccess = {}, limit = 8): Media[] {
  const result: Media[] = [], byId=new Map(catalogue.map(item=>[item.id,item]));
  const hidden=new Set(options.hidden||[]),seen=new Set<string>([currentId]);
  const recent=history.filter(entry=>entry.item.kind==='live').sort((a,b)=>Date.parse(b.lastPlayedAt)-Date.parse(a.lastPlayedAt));
  for(const entry of recent){
   if(result.length>=limit)break;
   if(seen.has(entry.item.id)||hidden.has(entry.item.id))continue;
   const item=byId.get(entry.item.id);if(!item)continue;
   if(!options.unlocked&&(matchesAny(item.group,options.restricted||[])||!!item.accessGroup&&options.restricted?.includes(item.accessGroup)))continue;
   seen.add(item.id);result.push(item);
  }
  return result;
}

/**
 * Expandable help for a failed stream. Only known failure kinds get specific advice; anything else
 * stays "unknown". The text never claims to know whether the provider or the player is at fault.
 */
export function playbackHelp(kind: FailureKind): { title: string; steps: string[]; uncertainty: string } {
  const uncertainty = 'GlowTV can’t always tell whether the provider or this player caused it. The steps below are the ones most likely to help.';
  switch (kind) {
    case 'access': return { title: 'The provider refused this stream', steps: ['Check that your subscription is active.', 'Close GlowTV on other devices if your plan limits simultaneous streams.', 'Try again in a minute.'], uncertainty };
    case 'missing': return { title: 'This channel’s address no longer works', steps: ['Refresh your playlist; the provider may have moved the channel.', 'Try another channel.'], uncertainty };
    case 'stalled': return { title: 'The channel didn’t start', steps: ['Try again.', 'Try the other player.', 'Go to the next channel; this one may be offline or blocked in your region.'], uncertainty };
    case 'network': return { title: 'The connection dropped or the provider didn’t answer', steps: ['Check your Wi‑Fi or mobile data.', 'Try again.', 'If other channels play, this channel may be offline at the provider.'], uncertainty };
    case 'format': return { title: 'This player couldn’t open the stream’s format', steps: ['Try built-in VLC, if it’s available.', 'Or choose an external player.'], uncertainty };
    case 'server': return { title: 'The server answered in a way this engine can’t use', steps: ['Try built-in VLC, if it’s available.', 'Or choose an external player such as VLC.'], uncertainty };
    default: return { title: 'The reason wasn’t reported', steps: ['Try again.', 'Try another channel to see whether the problem is only this one.', 'Try another player.'], uncertainty };
  }
}
