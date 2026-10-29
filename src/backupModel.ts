import {strToU8,strFromU8} from 'fflate';
import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils.js';
import {httpURL,normalizeProvider} from './provider.ts';
import {validateVault} from './vault.ts';
import type {Vault,Profile} from './vault.ts';
import {parseViewing} from './activity.ts';
import type {ViewingEntry} from './activity.ts';
import {isIP} from './network.ts';
export const backupLimit=12*1024*1024;
export const familyKey='nodecast.family.pin.v1';
export type FamilyRecord={salt:string;hash:string;failures:number;until:number};
export type TransferPreferences={onboarded:boolean;player:'internal'|'ask'|'vlc'|'infuse';theme:'light'|'dark'|'system';baseline:{ip:string;savedAt:string}|null;homeIPSetup?:'saved'|'skipped'};
export type Backup={format:'nodecast-backup';version:1;createdAt:string;vault:Vault;preferences:TransferPreferences;history:Record<string,ViewingEntry[]>;family:FamilyRecord|null};
export function familyRecord(value:unknown):FamilyRecord|null{if(value===null)return null;const p=value as FamilyRecord;if(!p||!/^[a-f0-9]{32}$/.test(p.salt)||!/^[a-f0-9]{64}$/.test(p.hash)||!Number.isInteger(p.failures)||p.failures<0||p.failures>10000||!Number.isFinite(p.until)||p.until<0)throw new Error('Invalid family protection in backup.');return{salt:p.salt,hash:p.hash,failures:p.failures,until:p.until};}
export function transferPreferences(value:unknown):TransferPreferences{const p=value as TransferPreferences;if(!p||!['internal','ask','vlc','infuse'].includes(p.player)||!['light','dark','system'].includes(p.theme||'light'))throw new Error('Unsupported backup settings.');if(p.baseline&&(!isIP(p.baseline.ip)||typeof p.baseline.savedAt!=='string'||p.baseline.savedAt.length>40||!Number.isFinite(Date.parse(p.baseline.savedAt))))throw new Error('Invalid home IP reference.');return{onboarded:p.onboarded===true,player:p.player,theme:p.theme||'light',baseline:p.baseline?{ip:p.baseline.ip,savedAt:p.baseline.savedAt}:null,homeIPSetup:p.homeIPSetup==='saved'?'saved':p.homeIPSetup==='skipped'?'skipped':undefined};}
export function validateBackup(value:unknown):Backup{
 const b=value as Backup;if(!b||b.format!=='nodecast-backup'||b.version!==1||typeof b.createdAt!=='string'||b.createdAt.length>40||!Number.isFinite(Date.parse(b.createdAt)))throw new Error('This is not a supported NodeCast backup.');
 validateVault(b.vault);const profiles=b.vault.profiles.map(p=>{
  if(p.id.length>100||typeof p.createdAt!=='string'||!Number.isFinite(Date.parse(p.createdAt))||p.createdAt.length>40||p.provider.name.length>500||p.provider.address.length>8000||p.provider.username.length>4000||p.provider.password.length>4000||p.favorites.length>10000||p.favorites.some(id=>id.length>300))throw new Error('Invalid profile in backup.');
  for(const groups of [p.hiddenGroups,p.restrictedGroups])if(groups&&(groups.length>2000||groups.some(g=>g.length>300)))throw new Error('Too many categories in backup.');
  const provider=normalizeProvider({kind:p.provider.kind,name:p.provider.name,address:p.provider.address,username:p.provider.username,password:p.provider.password,headers:p.provider.headers,localText:p.provider.localText});
  return {id:p.id,createdAt:p.createdAt,provider,favorites:p.favorites,hiddenGroups:p.hiddenGroups,library:p.library,restrictedGroups:p.restrictedGroups,guide:p.guide?{url:p.guide.url?httpURL(p.guide.url):'',mapping:p.guide.mapping}:undefined,displayFit:p.displayFit,channelPlayback:p.channelPlayback,liveFormat:p.liveFormat,liveEngine:p.liveEngine,tracks:p.tracks} satisfies Profile;
 });
 if(!b.history||typeof b.history!=='object'||Array.isArray(b.history))throw new Error('Invalid viewing data.');
 const history=Object.fromEntries(profiles.map(p=>{const entries=b.history[p.id]??[];if(!Array.isArray(entries)||entries.length>2060)throw new Error('Invalid viewing data.');const parsed=parseViewing(entries);if(parsed.length!==entries.length)throw new Error('Some viewing data is invalid.');return[p.id,parsed]}));
 const family=familyRecord(b.family);
 return{format:'nodecast-backup',version:1,createdAt:b.createdAt,vault:{version:2,activeId:b.vault.activeId,profiles},preferences:transferPreferences(b.preferences),history,family};
}
export type BackupCrypto={random:(length:number)=>Promise<Uint8Array>;encrypt:(data:Uint8Array,key:Uint8Array,nonce:Uint8Array,aad:Uint8Array)=>Promise<Uint8Array>;decrypt:(sealed:Uint8Array,key:Uint8Array,aad:Uint8Array)=>Promise<Uint8Array>};
const iterations=100000;
const aad=strToU8('NodeCast backup v1;PBKDF2-SHA256:100000;AES-256-GCM');
export function validBackupPassword(value:string){return value.length>=12&&value.length<=256&&value.trim().length>=12;}
async function keyFor(password:string,salt:Uint8Array){const bytes=strToU8(password);try{return await pbkdf2Async(sha256,bytes,salt,{c:iterations,dkLen:32,asyncTick:16})}finally{bytes.fill(0)}}
export async function encryptBackup(value:Backup,password:string,crypto:BackupCrypto):Promise<string>{
 if(!validBackupPassword(password))throw new Error('Use a backup password of 12–256 characters.');
 const data=strToU8(JSON.stringify(validateBackup(value)));if(data.length>5*1024*1024)throw new Error('Backup is too large. Try excluding viewing history.');
 const salt=await crypto.random(16),nonce=await crypto.random(12);let key:Uint8Array|undefined;
 try{key=await keyFor(password,salt);const sealed=await crypto.encrypt(data,key,nonce,aad);return JSON.stringify({format:'nodecast-encrypted',version:1,kdf:'PBKDF2-SHA256',iterations,cipher:'AES-256-GCM',salt:bytesToHex(salt),sealed:bytesToHex(sealed)});}finally{data.fill(0);key?.fill(0)}
}
export async function decryptBackup(text:string,password:string,crypto:BackupCrypto):Promise<Backup>{
 if(text.length>backupLimit||!validBackupPassword(password))throw new Error('Check the backup password and file.');let key:Uint8Array|undefined;let plain:Uint8Array|undefined;
 try{const b=JSON.parse(text);if(b.format!=='nodecast-encrypted'||b.version!==1||b.kdf!=='PBKDF2-SHA256'||b.iterations!==iterations||b.cipher!=='AES-256-GCM'||typeof b.salt!=='string'||!/^[a-f0-9]{32}$/.test(b.salt)||typeof b.sealed!=='string'||b.sealed.length<58||b.sealed.length>10*1024*1024+56||b.sealed.length%2||!/^[a-f0-9]+$/.test(b.sealed))throw new Error();key=await keyFor(password,hexToBytes(b.salt));plain=await crypto.decrypt(hexToBytes(b.sealed),key,aad);if(plain.length>5*1024*1024)throw new Error();return validateBackup(JSON.parse(strFromU8(plain)));}catch{throw new Error('Could not unlock this backup. Check the password and use an unmodified NodeCast backup.');}finally{key?.fill(0);plain?.fill(0)}
}
export type TransferPlan={vault:Vault;preferences:TransferPreferences;history:Record<string,ViewingEntry[]>;family:FamilyRecord|null;ids:string[]};
export function planImport(backup:Backup,current:Vault,currentPIN:FamilyRecord|null,token:string,android=false):TransferPlan{
 const b=validateBackup(backup);if(!/^[a-f0-9]{16}$/.test(token))throw new Error('Invalid transfer identifier.');if(current.profiles.length+b.vault.profiles.length>30)throw new Error('Import would exceed the 30-profile limit. Remove unused profiles first.');
 const ids=b.vault.profiles.map((_,i)=>`transfer-${token}-${i}`);if(ids.some(id=>current.profiles.some(p=>p.id===id)))throw new Error('Try the import again.');const idMap=new Map(b.vault.profiles.map((p,i)=>[p.id,ids[i]]));
 const profiles=b.vault.profiles.map((p,i)=>({...p,id:ids[i],provider:{...p.provider,name:current.profiles.some(c=>c.provider.name===p.provider.name)?`${p.provider.name.slice(0,480)} (imported)`:p.provider.name},channelPlayback:p.channelPlayback&&Object.fromEntries(Object.entries(p.channelPlayback).map(([id,v])=>[id,android&&v.player==='infuse'?{...v,player:'internal' as const}:v]))}));
 const vault=validateVault({version:2,activeId:current.activeId||idMap.get(b.vault.activeId||'')||ids[0]||null,profiles:[...current.profiles,...profiles]});
 return{vault,ids,history:Object.fromEntries(b.vault.profiles.map((p,i)=>[ids[i],b.history[p.id]])),preferences:{...b.preferences,onboarded:true,player:android&&b.preferences.player==='infuse'?'internal':b.preferences.player},family:currentPIN||b.family};
}
