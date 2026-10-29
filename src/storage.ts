import {recoverTransfer,commitTransfer} from './backupTransaction';
import type {TransferStore} from './backupTransaction';
import {familyKey,familyRecord,transferPreferences} from './backupModel';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readSecureVault, writeSecureVault, emptyVault } from './vault';
import type { SecretStore, Vault } from './vault';
import { isIP } from './network';
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
async function loadVaultRaw(): Promise<Vault> {
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
export type Preferences = { onboarded: boolean; player: PlayerChoice; baseline: { ip: string; savedAt: string } | null; theme?: 'light' | 'dark' | 'system'; homeIPSetup?: 'saved' | 'skipped' };
const defaults: Preferences = { onboarded: false, player: 'internal', baseline: null };
async function loadPreferencesRaw(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem('nodecast.preferences.v2');
  if (!raw) return { ...defaults };
  const value = JSON.parse(raw);
  return { theme: ['light','dark','system'].includes(value.theme) ? value.theme : 'light', onboarded: value.onboarded === true, player: ['internal', 'ask', 'vlc', 'infuse'].includes(value.player) ? value.player : 'internal',
    baseline: value.baseline && isIP(value.baseline.ip) && typeof value.baseline.savedAt === 'string' ? value.baseline : null,
    homeIPSetup: value.homeIPSetup === 'saved' || value.homeIPSetup === 'skipped' ? value.homeIPSetup : undefined };
}
let preferenceWrites: Promise<void> = Promise.resolve();
export function savePreferences(preferences: Preferences): Promise<void> {
  const data = JSON.stringify(preferences);
  const write = preferenceWrites.then(() => AsyncStorage.setItem('nodecast.preferences.v2', data));
  preferenceWrites = write.catch(() => {});
  return write;
}

export const privateStore = store;

const transferJournalKey='nodecast.transfer.pending.v1';
export const transferStore:TransferStore={
 vault:loadVaultRaw,preferences:async()=>transferPreferences(await loadPreferencesRaw()),
 family:async()=>{const raw=await store.get(familyKey);return familyRecord(raw?JSON.parse(raw):null)},
 journal:async()=>{const raw=await store.get(transferJournalKey);return raw?JSON.parse(raw):null},
 saveJournal:async journal=>{if(journal)await store.set(transferJournalKey,JSON.stringify(journal));else await store.remove(transferJournalKey)},
 saveVault,savePreferences,saveFamily:async record=>{if(record)await store.set(familyKey,JSON.stringify(record));else await store.remove(familyKey)},
 saveHistory:async(id,entries)=>{if(entries){const {writeViewing}=await import('./libraryStore');await writeViewing(id,entries)}else await AsyncStorage.removeItem(`nodecast.local.v1.${encodeURIComponent(id)}.viewing`)},
};
let transferRecovery:Promise<void>|null=null;
export function recoverPendingTransfer(force=false):Promise<void>{if(force)transferRecovery=null;if(!transferRecovery)transferRecovery=recoverTransfer(transferStore).catch(error=>{transferRecovery=null;throw error});return transferRecovery;}
export async function loadVault():Promise<Vault>{await recoverPendingTransfer();return loadVaultRaw()}
export async function loadPreferences():Promise<Preferences>{await recoverPendingTransfer();return loadPreferencesRaw()}
export async function flushSettings(){await writes;await preferenceWrites;}
export {commitTransfer};
