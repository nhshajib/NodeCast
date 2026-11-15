import {Platform} from 'react-native';
import {bytesToHex} from '@noble/hashes/utils.js';
import {backupCrypto} from './backupCrypto';
import {commitTransfer,flushSettings,loadVault,loadPreferences,recoverPendingTransfer,transferStore} from './storage';
import {readViewing} from './libraryStore';
import {planImport,transferPreferences,validateBackup} from './backupModel';
import type {Backup} from './backupModel';
export async function snapshotBackup(includeHistory:boolean,authorized:()=>boolean):Promise<Backup>{
 if(!authorized())throw new Error('Unlock family controls first.');await flushSettings();
 const vault=await loadVault();const history=Object.fromEntries(await Promise.all(vault.profiles.map(async p=>[p.id,includeHistory?await readViewing(p.id):[]])));
 if(!authorized())throw new Error('Unlock family controls and try again.');
 return validateBackup({format:'nodecast-backup',version:1,createdAt:new Date().toISOString(),vault,preferences:transferPreferences(await loadPreferences()),history,family:await transferStore.family()});
}
let importing=false;
export async function restoreBackup(backup:Backup,authorized:()=>boolean):Promise<void>{
 if(importing)throw new Error('Another import is running. Wait for it to finish.');importing=true;try{
 await flushSettings();await recoverPendingTransfer(true);const current=await loadVault();const pin=await transferStore.family();const token=bytesToHex(await backupCrypto.random(8));const plan=planImport(backup,current,pin,token,Platform.OS==='android');
 if(!authorized())throw new Error('Unlock family controls before importing.');await commitTransfer(plan,transferStore);
 }finally{importing=false}
}
