import {strToU8} from 'fflate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Media, Provider, Section } from './provider';
import { restoreCatalog, serializeCatalog } from './catalog';
import { parseViewing } from './activity';
import type { ViewingEntry } from './activity';
const key = (profile: string, suffix: string) => `nodecast.local.v1.${encodeURIComponent(profile)}.${suffix}`;
export async function readCatalog(profile: string, section: Section, provider: Provider) {
  try { const value = await AsyncStorage.getItem(key(profile, section)); return value ? restoreCatalog(JSON.parse(value), provider) : null; } catch { return null; }
}
const catalogWrites = new Map<string, Promise<void>>();
export function writeCatalog(profile: string, section: Section, items: Media[]) {
  const data = JSON.stringify(serializeCatalog(items));
  const operation = (catalogWrites.get(profile) || Promise.resolve()).then(() => AsyncStorage.setItem(key(profile, section), data));
  catalogWrites.set(profile, operation.catch(() => {}));
  return operation;
}
export async function clearCatalog(profile: string) { await (catalogWrites.get(profile) || Promise.resolve()); await AsyncStorage.multiRemove(['live', 'movies', 'series'].map(section => key(profile, section))); }
export async function readViewing(profile: string): Promise<ViewingEntry[]> {
  const raw = await AsyncStorage.getItem(key(profile, 'viewing'));
  return raw ? parseViewing(JSON.parse(raw)) : [];
}
const queues = new Map<string, Promise<void>>();
export function writeViewing(profile: string, entries: ViewingEntry[]): Promise<void> {
  const data = JSON.stringify(parseViewing(entries));
  const operation = (queues.get(profile) || Promise.resolve()).then(() => AsyncStorage.setItem(key(profile, 'viewing'), data));
  queues.set(profile, operation.catch(() => {}));
  return operation;
}
export async function clearProfileData(profile: string) {
  await (queues.get(profile) || Promise.resolve());
  await clearCatalog(profile);
  const { clearGuide }=await import('./guideStore');await clearGuide(profile);
  await AsyncStorage.removeItem(key(profile, 'viewing'));
  queues.delete(profile);
}

export async function cacheSize(profile: string): Promise<number> {
  const rows = await AsyncStorage.multiGet(['live','movies','series'].map(section => key(profile, section)));
  return rows.reduce((sum, [, value]) => sum + (value ? strToU8(value).length : 0), 0);
}
