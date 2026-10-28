import { safeHeaders } from './libraryPreferences.ts';
import type { LibraryPreferences } from './libraryPreferences.ts';
import type { ChannelPlayback } from './viewingPreferences';
import type { Provider } from './provider';

export type Profile = { id: string; provider: Provider; createdAt: string; favorites: string[]; hiddenGroups?: string[]; library?: LibraryPreferences; restrictedGroups?: string[]; guide?: { url: string; mapping?: Record<string, string> }; displayFit?: 'contain' | 'cover'; channelPlayback?: Record<string, ChannelPlayback>; liveFormat?: 'auto' | 'hls' | 'ts'; liveEngine?: 'auto' | 'native' | 'vlc'; tracks?: { audio?: string; subtitles?: string } };
export type Vault = { version: 2; activeId: string | null; profiles: Profile[] };
export const emptyVault = (): Vault => ({ version: 2, activeId: null, profiles: [] });
export function validateVault(value: unknown): Vault {
  const v = value as Vault;
  if (!v || v.version !== 2 || !Array.isArray(v.profiles) || v.profiles.length > 30) throw new Error('Invalid profile vault.');
  const ids = new Set<string>();
  for (const p of v.profiles) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || !p.provider ||
      !['xtream', 'm3u'].includes(p.provider.kind) ||
      !['name', 'address', 'username', 'password'].every(key => typeof p.provider[key as keyof Provider] === 'string') ||
      !Array.isArray(p.favorites) || p.favorites.some(id => typeof id !== 'string')) throw new Error('Invalid saved profile.');
    if (p.liveEngine !== undefined && !['auto', 'native', 'vlc'].includes(p.liveEngine)) throw new Error('Invalid playback engine.');
    if (p.liveFormat !== undefined && !['auto', 'hls', 'ts'].includes(p.liveFormat)) throw new Error('Invalid live format.');
    if (p.hiddenGroups && (!Array.isArray(p.hiddenGroups) || p.hiddenGroups.some(group => typeof group !== 'string'))) throw new Error('Invalid category preferences.');
    if (p.tracks && (typeof p.tracks !== 'object' || Object.values(p.tracks).some(value => value !== undefined && (typeof value !== 'string' || value.length > 30)))) throw new Error('Invalid language preferences.');
    if (p.channelPlayback !== undefined) {
      if (!p.channelPlayback || typeof p.channelPlayback !== 'object' || Array.isArray(p.channelPlayback) || Object.keys(p.channelPlayback).length > 1000) throw new Error('Invalid channel playback preferences.');
      for (const [id, choice] of Object.entries(p.channelPlayback)) {
        if (!id || id.length > 300 || !choice || typeof choice !== 'object' || Array.isArray(choice) || Object.keys(choice).some(key => !['player', 'engine', 'format'].includes(key)) ||
          choice.player !== undefined && !['internal', 'ask', 'vlc', 'infuse'].includes(choice.player) ||
          choice.engine !== undefined && !['auto', 'native', 'vlc'].includes(choice.engine) ||
          choice.format !== undefined && !['auto', 'hls', 'ts'].includes(choice.format)) throw new Error('Invalid channel playback choice.');
      }
    }
    safeHeaders(p.provider.headers);
    if (p.provider.localText !== undefined && (p.provider.kind !== 'm3u' || typeof p.provider.localText !== 'string' || p.provider.localText.length > 400000)) throw new Error('Imported playlist is too large for secure storage. Use a URL for larger playlists.');
    if (p.library?.sort && Object.entries(p.library.sort).some(([key, value]) => !['live', 'movies', 'series'].includes(key) || !['provider', 'az', 'za'].includes(value!))) throw new Error('Invalid sort order.');
    if (p.library?.refreshMinutes !== undefined && ![30,60,360,1440].includes(p.library.refreshMinutes)) throw new Error('Invalid refresh interval.');
    if (p.restrictedGroups && (!Array.isArray(p.restrictedGroups) || p.restrictedGroups.some(group => typeof group !== 'string'))) throw new Error('Invalid restricted categories.');
    if (p.displayFit !== undefined && !['contain', 'cover'].includes(p.displayFit)) throw new Error('Invalid display fit.');
    if (p.guide && (typeof p.guide.url !== 'string' || p.guide.url.length > 4000 || p.guide.mapping && (typeof p.guide.mapping !== 'object' || Object.entries(p.guide.mapping).some(([key,value]) => key.length > 300 || typeof value !== 'string' || value.length > 300)))) throw new Error('Invalid guide settings.');
    ids.add(p.id);
  }
  if (v.activeId !== null && !ids.has(v.activeId)) throw new Error('Invalid active profile.');
  return v;
}
export function removeProfile(vault: Vault, id: string): Vault {
  return { ...vault, profiles: vault.profiles.filter(p => p.id !== id), activeId: vault.activeId === id ? null : vault.activeId };
}
export interface SecretStore { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void>; remove(key: string): Promise<void> }
const pointerKey = 'nodecast.vault.v2';
type Pointer = { revision: string; count: number };
function pointer(raw: string): Pointer {
  const p = JSON.parse(raw);
  if (!/^[a-z0-9-]+$/.test(p.revision) || !Number.isInteger(p.count) || p.count < 1 || p.count > 3000) throw new Error('Invalid secure storage index.');
  return p;
}
const chunkKey = (p: Pointer, index: number) => `${pointerKey}.${p.revision}.${index}`;
export async function readSecureVault(store: SecretStore): Promise<Vault> {
  const raw = await store.get(pointerKey);
  if (!raw) return emptyVault();
  const p = pointer(raw);
  const parts: string[] = [];
  for (let i = 0; i < p.count; i++) {
    const part = await store.get(chunkKey(p, i));
    if (part === null) throw new Error('A secure storage chunk is missing.');
    parts.push(part);
  }
  return validateVault(JSON.parse(parts.join('')));
}
// Write chunks first, then atomically switch one small Keychain pointer. A failed write
// leaves the old vault readable. Callers serialize writes to prevent revision races.
export async function writeSecureVault(store: SecretStore, vault: Vault): Promise<void> {
  validateVault(vault);
  const characters = Array.from(JSON.stringify(vault));
  const parts: string[] = [];
  // At most 1,600 UTF-8 bytes per item, including emoji; avoids Keychain item limits.
  for (let i = 0; i < characters.length; i += 400) parts.push(characters.slice(i, i + 400).join(''));
  if (parts.length > 3000) throw new Error('Saved profiles are too large.');
  const previous = await store.get(pointerKey);
  const next: Pointer = { revision: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count: parts.length };
  try {
    for (let i = 0; i < parts.length; i++) await store.set(chunkKey(next, i), parts[i]);
    await store.set(pointerKey, JSON.stringify(next));
  } catch (error) {
    await Promise.allSettled(parts.map((_, i) => store.remove(chunkKey(next, i))));
    throw error;
  }
  if (previous) {
    try { const old = pointer(previous); await Promise.allSettled(Array.from({ length: old.count }, (_, i) => store.remove(chunkKey(old, i)))); } catch { /* A committed vault remains authoritative. */ }
  }
}
