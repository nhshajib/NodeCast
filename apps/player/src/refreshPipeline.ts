import type { Media, Section } from './provider.ts';

/**
 * Catalogue refresh: capture profile/section/generation → fetch → validate → stage → compare →
 * commit atomically → notify. A response from an older generation or another profile never wins.
 */
export type RefreshTicket = { profile: string; section: Section; generation: number };
export class RefreshGate {
  private latest = new Map<string, number>();
  private counter = 0;
  begin(profile: string, section: Section): RefreshTicket {
    const generation = ++this.counter;
    this.latest.set(`${profile}\u0000${section}`, generation);
    return { profile, section, generation };
  }
  isCurrent(ticket: RefreshTicket, activeProfile: string | null | undefined) {
    return activeProfile === ticket.profile && this.latest.get(`${ticket.profile}\u0000${ticket.section}`) === ticket.generation;
  }
}

export type RefreshOutcome =
  | { accept: true; items: Media[]; added: number; removed: number; kept: number }
  | { accept: false; reason: string };

/** Deduplicates exact identities only; distinct variants (HD/SD, regional feeds) keep their own IDs. */
export function dedupeExact(items: Media[]) {
  const seen = new Set<string>();
  return items.filter(item => !!item && typeof item.id === 'string' && !seen.has(item.id) && !!seen.add(item.id));
}

/** Validates and compares a fetched catalogue against the last usable one. Never empties a working library. */
export function stageRefresh(previous: Media[] | undefined, incoming: Media[]): RefreshOutcome {
  const items = dedupeExact(Array.isArray(incoming) ? incoming : []);
  if (!items.length && previous?.length) return { accept: false, reason: 'Your provider returned an empty list, so your saved library is still shown.' };
  const before = new Set((previous || []).map(item => item.id));
  const after = new Set(items.map(item => item.id));
  let added = 0, kept = 0;
  for (const id of after) { if (before.has(id)) kept++; else added++; }
  return { accept: true, items, added, removed: [...before].filter(id => !after.has(id)).length, kept };
}

/** A short, honest status line for the refresh that just finished. */
export function refreshSummary(outcome: RefreshOutcome, hadPrevious: boolean) {
  if (!outcome.accept) return outcome.reason;
  if (!hadPrevious) return '';
  const parts = [outcome.added ? `${outcome.added.toLocaleString()} new` : '', outcome.removed ? `${outcome.removed.toLocaleString()} no longer offered` : ''].filter(Boolean);
  return parts.length ? `Library updated: ${parts.join(', ')}.` : '';
}
