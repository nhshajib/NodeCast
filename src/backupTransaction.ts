import {familyRecord,transferPreferences} from './backupModel.ts';
import type {FamilyRecord,TransferPlan,TransferPreferences} from './backupModel.ts';
import type {Vault} from './vault.ts';
import type {ViewingEntry} from './activity.ts';
export type TransferJournal={version:1;ids:string[];preferences:TransferPreferences;family:FamilyRecord|null};
export type TransferStore={vault:()=>Promise<Vault>;preferences:()=>Promise<TransferPreferences>;family:()=>Promise<FamilyRecord|null>;journal:()=>Promise<unknown>;saveJournal:(value:TransferJournal|null)=>Promise<void>;saveVault:(value:Vault)=>Promise<void>;savePreferences:(value:TransferPreferences)=>Promise<void>;saveFamily:(value:FamilyRecord|null)=>Promise<void>;saveHistory:(id:string,value:ViewingEntry[]|null)=>Promise<void>};
export async function recoverTransfer(store:TransferStore):Promise<void>{
 const raw=await store.journal();if(raw===null)return;const j=raw as TransferJournal;
 if(j.version!==1||!Array.isArray(j.ids)||!j.ids.length||j.ids.length>30||j.ids.some(id=>typeof id!=='string'||!/^transfer-[a-f0-9]{16}-\d{1,2}$/.test(id))||new Set(j.ids).size!==j.ids.length)throw new Error('Could not recover a pending device transfer.');
 const preferences=transferPreferences(j.preferences),family=familyRecord(j.family);const vault=await store.vault();const present=j.ids.filter(id=>vault.profiles.some(p=>p.id===id)).length;
 if(present&&present!==j.ids.length)throw new Error('Device transfer needs recovery before changing profiles.');
 if(!present){await store.savePreferences(preferences);await store.saveFamily(family);for(const id of j.ids)await store.saveHistory(id,null);}
 await store.saveJournal(null);
}
export async function commitTransfer(plan:TransferPlan,store:TransferStore):Promise<void>{
 await recoverTransfer(store);if(!plan.ids.length)throw new Error('This backup has no profiles to import.');
 const journal:TransferJournal={version:1,ids:plan.ids,preferences:await store.preferences(),family:await store.family()};
 await store.saveJournal(journal);let committed=false;
 try{for(const id of plan.ids)await store.saveHistory(id,plan.history[id]||[]);await store.savePreferences(plan.preferences);await store.saveFamily(plan.family);await store.saveVault(plan.vault);committed=true;}catch(error){const vault=await store.vault();const complete=plan.ids.every(id=>vault.profiles.some(p=>p.id===id));await recoverTransfer(store);if(!complete)throw error;}
 finally{if(committed){try{await store.saveJournal(null)}catch{/* Startup sees the committed vault and finishes journal cleanup. */}}}
}
