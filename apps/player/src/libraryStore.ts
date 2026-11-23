import {strToU8} from 'fflate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Media, Provider, Section } from './provider';
import { restoreCatalog, serializeCatalog } from './catalog';
import { parseViewing } from './activity';
import type { ViewingEntry } from './activity';
import { Platform } from 'react-native';
import { features } from './featureFlags';
import { CatalogRepository, SQLiteCatalogStore, readWithMigration } from './catalogRepository';
import type { SQLiteLike } from './catalogRepository';
const key = (profile: string, suffix: string) => `nodecast.local.v1.${encodeURIComponent(profile)}.${suffix}`;
async function readLegacy(profile: string, section: Section, provider: Provider) {
  try { const value = await AsyncStorage.getItem(key(profile, section)); return value ? restoreCatalog(JSON.parse(value), provider) : null; } catch { return null; }
}
let repository: CatalogRepository | null = null;
/** Native SQLite catalogue (phase 1). The browser preview keeps the JSON cache, which has no SQLite FTS. */
export function catalogRepository(): CatalogRepository | null {
  if (!features.catalogRepository || Platform.OS === 'web') return null;
  if (!repository) {
    let opening: Promise<SQLiteLike> | null = null;
    repository = new CatalogRepository(new SQLiteCatalogStore(() => {
      if (!opening) opening = import('expo-sqlite').then(sqlite => sqlite.openDatabaseAsync('glowtv-catalog.db') as unknown as Promise<SQLiteLike>);
      return opening;
    }));
  }
  return repository;
}
export async function readCatalog(profile: string, section: Section, provider: Provider) {
  const repo = catalogRepository();
  if (!repo) return readLegacy(profile, section, provider);
  const result = await readWithMigration(repo, profile, section, provider, () => readLegacy(profile, section, provider)).catch(() => null);
  return result ? { savedAt: result.savedAt, items: result.items } : readLegacy(profile, section, provider);
}
const catalogWrites = new Map<string, Promise<void>>();
export function writeCatalog(profile: string, section: Section, items: Media[]) {
  const repo = catalogRepository();
  if (repo) {
    const operation = (catalogWrites.get(profile) || Promise.resolve()).then(() => repo.save(profile, section, items).then(() => undefined)).catch(() => writeLegacy(profile, section, items));
    catalogWrites.set(profile, operation.catch(() => {}));
    return operation;
  }
  return writeLegacy(profile, section, items);
}
function writeLegacy(profile: string, section: Section, items: Media[]) {
  const data = JSON.stringify(serializeCatalog(items));
  const operation = (catalogWrites.get(profile) || Promise.resolve()).then(() => AsyncStorage.setItem(key(profile, section), data));
  catalogWrites.set(profile, operation.catch(() => {}));
  return operation;
}
export async function clearCatalog(profile: string) { await (catalogWrites.get(profile) || Promise.resolve()); await catalogRepository()?.clear(profile).catch(() => {}); await AsyncStorage.multiRemove(['live', 'movies', 'series'].map(section => key(profile, section))); }
export async function readViewing(profile: string): Promise<ViewingEntry[]> {
  await (queues.get(profile) || Promise.resolve());
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
  await clearLogos(profile).catch(() => {});
  const { clearGuide }=await import('./guideStore');await clearGuide(profile);
  await AsyncStorage.removeItem(key(profile, 'viewing'));
  queues.delete(profile);
}

export async function cacheSize(profile: string): Promise<number> {
  const rows = await AsyncStorage.multiGet(['live','movies','series'].map(section => key(profile, section)));
  return rows.reduce((sum, [, value]) => sum + (value ? strToU8(value).length : 0), 0) + await repositorySize(profile);
}

async function repositorySize(profile: string) {
  const repo = catalogRepository();
  return repo ? repo.size(profile).catch(() => 0) : 0;
}

// Channel logos live in small JSON files beside the catalogue (see logoCache.ts for what is kept).
const logoSections: Section[] = ['live', 'movies', 'series'];
async function logoFile(profile: string, section: Section) {
  const { File, Paths } = await import('expo-file-system');
  return new File(Paths.document, `glowtv-logos-${encodeURIComponent(profile)}-${section}.json`);
}
export async function readLogos(profile: string, section: Section): Promise<Record<string, string> | null> {
  if (Platform.OS === 'web') return null;
  try { const file = await logoFile(profile, section); if (!file.exists) return null; const value = JSON.parse(await file.text()); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : null; } catch { return null; }
}
export async function writeLogos(profile: string, section: Section, map: Record<string, string>) {
  if (Platform.OS === 'web') return;
  try { const file = await logoFile(profile, section); if (!file.exists) file.create(); file.write(JSON.stringify(map)); } catch { /* logos are a cache; lists fall back to initials */ }
}
async function clearLogos(profile: string) {
  if (Platform.OS === 'web') return;
  for (const section of logoSections) { const file = await logoFile(profile, section); if (file.exists) file.delete(); }
}
