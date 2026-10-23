import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readSecureVault, writeSecureVault, emptyVault } from './vault';
import type { SecretStore, Vault } from './vault';
import type { PlayerChoice } from './players';

const webSession = new Map<string, string>();
const store: SecretStore = {
  get: async key => Platform.OS === 'web' ? webSession.get(key) ?? null : SecureStore.getItemAsync(key),
  set: async (key, value) => {
    if (Platform.OS === 'web') { webSession.set(key, value); return; }
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  remove: async key => { if (Platform.OS === 'web') webSession.delete(key); else await SecureStore.deleteItemAsync(key); },
};
export async function loadVault(): Promise<Vault> {
  if (await store.get('nodecast.vault.v2')) return readSecureVault(store);
  const legacy = await store.get('nodecast.provider.v1');
  if (!legacy) return emptyVault();
  const provider = JSON.parse(legacy);
  const oldFavorites = JSON.parse(await AsyncStorage.getItem('nodecast.favorites.v1') || '[]');
  const vault: Vault = { version: 2, activeId: 'imported-profile', profiles: [{ id: 'imported-profile', provider,
    createdAt: new Date().toISOString(), favorites: Array.isArray(oldFavorites) ? oldFavorites.filter(id => typeof id === 'string') : [] }] };
  await writeSecureVault(store, vault);
  await store.remove('nodecast.provider.v1');
  await AsyncStorage.removeItem('nodecast.favorites.v1');
  return vault;
}
let writes: Promise<void> = Promise.resolve();
export function saveVault(vault: Vault): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(vault)) as Vault;
  const write = writes.then(() => writeSecureVault(store, snapshot));
  writes = write.catch(() => {});
  return write;
}
export type Preferences = { onboarded: boolean; player: PlayerChoice; baseline: { ip: string; savedAt: string } | null };
const defaults: Preferences = { onboarded: false, player: 'internal', baseline: null };
export async function loadPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem('nodecast.preferences.v2');
  if (!raw) return { ...defaults };
  const value = JSON.parse(raw);
  return { onboarded: value.onboarded === true, player: ['internal', 'ask', 'vlc', 'infuse'].includes(value.player) ? value.player : 'internal',
    baseline: value.baseline && typeof value.baseline.ip === 'string' && typeof value.baseline.savedAt === 'string' ? value.baseline : null };
}
let preferenceWrites: Promise<void> = Promise.resolve();
export function savePreferences(preferences: Preferences): Promise<void> {
  const data = JSON.stringify(preferences);
  const write = preferenceWrites.then(() => AsyncStorage.setItem('nodecast.preferences.v2', data));
  preferenceWrites = write.catch(() => {});
  return write;
}
