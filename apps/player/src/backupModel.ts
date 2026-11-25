import {strToU8,strFromU8} from 'fflate';
import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils.js';
import {httpURL,normalizeProvider} from './provider.ts';
import {validateVault} from './vault.ts';
import type {Vault,Profile} from './vault.ts';
import {parseViewing} from './activity.ts';
import type {ViewingEntry} from './activity.ts';
import {isIP} from './ipAddress.ts';
import {validateHiddenItems,validateLists,validateSeriesDisplay} from './organization.ts';
export const backupLimit=12*1024*1024;
export const familyKey='nodecast.family.pin.v1';
export type FamilyRecord={salt:string;hash:string;failures:number;until:number};
export type TransferPreferences={onboarded:boolean;player:'internal'|'ask'|'vlc'|'infuse';theme:'light'|'dark'|'system';baseline:{ip:string;savedAt:string}|null;homeIPSetup?:'saved'|'skipped'};
export type Backup={format:'nodecast-backup';version:1|2;createdAt:string;vault:Vault;preferences:TransferPreferences;history:Record<string,ViewingEntry[]>;family:FamilyRecord|null};
export function familyRecord(value:unknown):FamilyRecord|null{if(value===null)return null;const p=value as FamilyRecord;if(!p||!/^[a-f0-9]{32}$/.test(p.salt)||!/^[a-f0-9]{64}$/.test(p.hash)||!Number.isInteger(p.failures)||p.failures<0||p.failures>10000||!Number.isFinite(p.until)||p.until<0)throw new Error('Invalid family protection in backup.');return{salt:p.salt,hash:p.hash,failures:p.failures,until:p.until};}
export function transferPreferences(value:unknown):TransferPreferences{const p=value as TransferPreferences;if(!p||!['internal','ask','vlc','infuse'].includes(p.player)||!['light','dark','system'].includes(p.theme||'light'))throw new Error('Unsupported backup settings.');if(p.baseline&&(!isIP(p.baseline.ip)||typeof p.baseline.savedAt!=='string'||p.baseline.savedAt.length>40||!Number.isFinite(Date.parse(p.baseline.savedAt))))throw new Error('Invalid home IP reference.');return{onboarded:p.onboarded===true,player:p.player,theme:p.theme||'light',baseline:p.baseline?{ip:p.baseline.ip,savedAt:p.baseline.savedAt}:null,homeIPSetup:p.homeIPSetup==='saved'?'saved':p.homeIPSetup==='skipped'?'skipped':undefined};}
export function validateBackup(value:unknown):Backup{
 const b=value as Backup;if(!b||b.format!=='nodecast-backup'||(b.version!==1&&b.version!==2)||typeof b.createdAt!=='string'||b.createdAt.length>40||!Number.isFinite(Date.parse(b.createdAt)))throw new Error('This is not a supported GlowTV backup.');
 validateVault(b.vault);const profiles=b.vault.profiles.map(p=>{
  if(p.id.length>100||typeof p.createdAt!=='string'||!Number.isFinite(Date.parse(p.createdAt))||p.createdAt.length>40||p.provider.name.length>500||p.provider.address.length>8000||p.provider.username.length>4000||p.provider.password.length>4000||p.favorites.length>10000||p.favorites.some(id=>id.length>300))throw new Error('Invalid profile in backup.');
  for(const groups of [p.hiddenGroups,p.restrictedGroups])if(groups&&(groups.length>2000||groups.some(g=>g.length>300)))throw new Error('Too many categories in backup.');
  const provider=normalizeProvider({kind:p.provider.kind,name:p.provider.name,address:p.provider.address,username:p.provider.username,password:p.provider.password,headers:p.provider.headers,localText:p.provider.localText});
  return {id:p.id,createdAt:p.createdAt,provider,favorites:p.favorites,hiddenGroups:p.hiddenGroups,library:p.library,restrictedGroups:p.restrictedGroups,guide:p.guide?{url:p.guide.url?httpURL(p.guide.url):'',mapping:p.guide.mapping,...(p.guide.offsetMinutes?{offsetMinutes:p.guide.offsetMinutes}:{})}:undefined,displayFit:p.displayFit,channelPlayback:p.channelPlayback,liveFormat:p.liveFormat,liveEngine:p.liveEngine,tracks:p.tracks,
   // Version 2 adds lists, hidden titles, series display and autoplay. Version 1 backups simply omit them.
   ...(b.version===2?{lists:validateLists(p.lists),hiddenItems:validateHiddenItems(p.hiddenItems),seriesDisplay:validateSeriesDisplay(p.seriesDisplay),autoplayNext:typeof p.autoplayNext==='boolean'?p.autoplayNext:undefined}:{})} satisfies Profile;
 });
 if(!b.history||typeof b.history!=='object'||Array.isArray(b.history))throw new Error('Invalid viewing data.');
 const history=Object.fromEntries(profiles.map(p=>{const entries=b.history[p.id]??[];if(!Array.isArray(entries)||entries.length>2060)throw new Error('Invalid viewing data.');const parsed=parseViewing(entries);if(parsed.length!==entries.length)throw new Error('Some viewing data is invalid.');return[p.id,parsed]}));
 const family=familyRecord(b.family);
 return{format:'nodecast-backup',version:b.version,createdAt:b.createdAt,vault:{version:2,activeId:b.vault.activeId,profiles},preferences:transferPreferences(b.preferences),history,family};
}
export type BackupCrypto={random:(length:number)=>Promise<Uint8Array>;encrypt:(data:Uint8Array,key:Uint8Array,nonce:Uint8Array,aad:Uint8Array)=>Promise<Uint8Array>;decrypt:(sealed:Uint8Array,key:Uint8Array,aad:Uint8Array)=>Promise<Uint8Array>};
const iterations=100000;
const aad=strToU8('GlowTV backup v1;PBKDF2-SHA256:100000;AES-256-GCM');
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
 try{const b=JSON.parse(text);if(b.format!=='nodecast-encrypted'||b.version!==1||b.kdf!=='PBKDF2-SHA256'||b.iterations!==iterations||b.cipher!=='AES-256-GCM'||typeof b.salt!=='string'||!/^[a-f0-9]{32}$/.test(b.salt)||typeof b.sealed!=='string'||b.sealed.length<58||b.sealed.length>10*1024*1024+56||b.sealed.length%2||!/^[a-f0-9]+$/.test(b.sealed))throw new Error();key=await keyFor(password,hexToBytes(b.salt));plain=await crypto.decrypt(hexToBytes(b.sealed),key,aad);if(plain.length>5*1024*1024)throw new Error();return validateBackup(JSON.parse(strFromU8(plain)));}catch{throw new Error('Could not unlock this backup. Check the password and use an unmodified GlowTV backup.');}finally{key?.fill(0);plain?.fill(0)}
}
export type TransferPlan={vault:Vault;preferences:TransferPreferences;history:Record<string,ViewingEntry[]>;family:FamilyRecord|null;ids:string[]};
export function planImport(backup:Backup,current:Vault,currentPIN:FamilyRecord|null,token:string,android=false):TransferPlan{
 const b=validateBackup(backup);if(!/^[a-f0-9]{16}$/.test(token))throw new Error('Invalid transfer identifier.');if(current.profiles.length+b.vault.profiles.length>30)throw new Error('Import would exceed the 30-profile limit. Remove unused profiles first.');
 const ids=b.vault.profiles.map((_,i)=>`transfer-${token}-${i}`);if(ids.some(id=>current.profiles.some(p=>p.id===id)))throw new Error('Try the import again.');const idMap=new Map(b.vault.profiles.map((p,i)=>[p.id,ids[i]]));
 const profiles=b.vault.profiles.map((p,i)=>({...p,id:ids[i],provider:{...p.provider,name:current.profiles.some(c=>c.provider.name===p.provider.name)?`${p.provider.name.slice(0,480)} (imported)`:p.provider.name},channelPlayback:p.channelPlayback&&Object.fromEntries(Object.entries(p.channelPlayback).map(([id,v])=>[id,android&&v.player==='infuse'?{...v,player:'internal' as const}:v]))}));
 const vault=validateVault({version:2,activeId:current.activeId||idMap.get(b.vault.activeId||'')||ids[0]||null,profiles:[...current.profiles,...profiles]});
 return{vault,ids,history:Object.fromEntries(b.vault.profiles.map((p,i)=>[ids[i],b.history[p.id]])),preferences:{...b.preferences,onboarded:true,player:android&&b.preferences.player==='infuse'?'internal':b.preferences.player},family:currentPIN||b.family};
}

// ── 1.0.0: import preview with Add or Update ────────────────────────────────
export type ImportChoice={action:'add'}|{action:'update';targetId:string};
export type ImportPreviewRow={sourceId:string;name:string;kind:'xtream'|'m3u';server:string;matches:{id:string;name:string}[];suggested:ImportChoice;needsChoice:boolean};
/** Same provider origin: kind, server address and username. Local playlist files never match automatically. */
export function originKey(profile:Profile){
 if(profile.provider.localText!==undefined)return null;
 try{const url=new URL(profile.provider.address);return `${profile.provider.kind}|${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/+$/,'')}|${profile.provider.username.trim().toLowerCase()}`;}catch{return null}
}
const serverLabel=(profile:Profile)=>{if(profile.provider.localText!==undefined)return 'Playlist file';try{return new URL(profile.provider.address).host}catch{return 'Unknown server'}};
/** One row per imported profile. A single explicit match suggests Update; several matches need the user to choose. */
export function previewImport(backup:Backup,current:Vault):ImportPreviewRow[]{
 const b=validateBackup(backup);
 return b.vault.profiles.map(p=>{
  const key=originKey(p);const matches=key?current.profiles.filter(c=>originKey(c)===key).map(c=>({id:c.id,name:c.provider.name})):[];
  return{sourceId:p.id,name:p.provider.name,kind:p.provider.kind,server:serverLabel(p),matches,suggested:matches.length===1?{action:'update',targetId:matches[0].id}:{action:'add'},needsChoice:matches.length>1};
 });
}
/** Imported settings win; favorites, lists and hidden titles are combined so nothing on this device is lost. */
export function mergeProfile(target:Profile,incoming:Profile):Profile{
 const lists=[...(target.lists||[])];for(const list of incoming.lists||[]){const at=lists.findIndex(l=>l.id===list.id);if(at>=0)lists[at]=list;else lists.push(list);}
 const union=(a:string[]=[],b:string[]=[])=>[...new Set([...a,...b])];
 return{...target,...incoming,id:target.id,createdAt:target.createdAt,favorites:union(target.favorites,incoming.favorites),...(lists.length?{lists:lists.slice(0,50)}:{}),...(target.hiddenItems||incoming.hiddenItems?{hiddenItems:union(target.hiddenItems,incoming.hiddenItems)}:{})};
}
export type ChoicePlan=TransferPlan&{updated:string[]};
/**
 * Add or Update per imported profile. Added profiles go through the existing transaction journal
 * (planImport/commitTransfer). Updated profiles keep their ID and this device's viewing history,
 * and change only inside the same single vault write. Ambiguous matches must be chosen explicitly.
 */
export function planImportWithChoices(backup:Backup,current:Vault,currentPIN:FamilyRecord|null,token:string,android:boolean,choices:Record<string,ImportChoice>):ChoicePlan{
 const b=validateBackup(backup);const preview=previewImport(b,current);
 for(const row of preview){const choice=choices[row.sourceId];if(row.needsChoice&&!choice)throw new Error(`Choose whether to add or update “${row.name}”.`);if(choice?.action==='update'&&!current.profiles.some(p=>p.id===choice.targetId))throw new Error('The profile to update no longer exists.');}
 const updates=b.vault.profiles.filter(p=>choices[p.id]?.action==='update');const targets=updates.map(p=>(choices[p.id] as {targetId:string}).targetId);
 if(new Set(targets).size!==targets.length)throw new Error('Two imported profiles can’t update the same profile.');
 const adds=b.vault.profiles.filter(p=>choices[p.id]?.action!=='update');
 const merged:Vault={...current,profiles:current.profiles.map(p=>{const at=targets.indexOf(p.id);return at>=0?mergeProfile(p,{...updates[at],provider:{...updates[at].provider,name:p.provider.name}}):p;})};
 const preferences={...b.preferences,onboarded:true,player:android&&b.preferences.player==='infuse'?'internal' as const:b.preferences.player};
 if(!adds.length)return{vault:validateVault(merged),ids:[],history:{},preferences,family:currentPIN||b.family,updated:targets};
 const subset:Backup={...b,vault:{version:2,activeId:adds.some(p=>p.id===b.vault.activeId)?b.vault.activeId:null,profiles:adds},history:Object.fromEntries(adds.map(p=>[p.id,b.history[p.id]||[]]))};
 const plan=planImport(subset,merged,currentPIN,token,android);
 return{...plan,updated:targets};
}
