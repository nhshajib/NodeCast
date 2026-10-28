import {normalizeSearch} from './catalog';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GuideData, GuideProgramme, GuideChannel } from './xmltv';
import type { SQLiteDatabase } from 'expo-sqlite';
let opening:Promise<SQLiteDatabase>|null=null;
async function db(){if(!opening)opening=(async()=>{const {openDatabaseAsync}=await import('expo-sqlite');const database=await openDatabaseAsync('nodecast-guide.db');await database.execAsync('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS guide(profile TEXT PRIMARY KEY, updated INTEGER NOT NULL, channels TEXT NOT NULL); CREATE TABLE IF NOT EXISTS programme(profile TEXT NOT NULL, channel TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, start INTEGER NOT NULL, end INTEGER NOT NULL, normalized TEXT NOT NULL); CREATE INDEX IF NOT EXISTS programme_window ON programme(profile,channel,start,end);');return database})();return opening;}
const key=(profile:string)=>`nodecast.guide.v1.${encodeURIComponent(profile)}`;
const queues=new Map<string,Promise<unknown>>();
export function replaceGuide(profile:string,data:GuideData){const operation=(queues.get(profile)||Promise.resolve()).catch(()=>{}).then(async()=>{
 if(Platform.OS==='web'){await AsyncStorage.setItem(key(profile),JSON.stringify(data));return;}
 const database=await db();await database.withExclusiveTransactionAsync(async tx=>{await tx.runAsync('DELETE FROM programme WHERE profile=?',profile);for(let index=0;index<data.programmes.length;index+=100){const batch=data.programmes.slice(index,index+100);await tx.runAsync('INSERT INTO programme(profile,channel,title,description,start,end,normalized) VALUES '+batch.map(()=>'(?,?,?,?,?,?,?)').join(','),batch.flatMap(p=>[profile,p.channel,p.title,p.description,p.start,p.end,normalizeSearch(p.title)]));}await tx.runAsync('INSERT OR REPLACE INTO guide(profile,updated,channels) VALUES(?,?,?)',profile,data.updatedAt,JSON.stringify(data.channels));});
});queues.set(profile,operation.catch(()=>{}));return operation;}
export async function guideMetadata(profile:string):Promise<{channels:GuideChannel[];updatedAt:number}|null>{
 if(Platform.OS==='web'){const raw=await AsyncStorage.getItem(key(profile));if(!raw)return null;const d=JSON.parse(raw) as GuideData;return{channels:d.channels,updatedAt:d.updatedAt};}
 const row=await(await db()).getFirstAsync<{channels:string;updated:number}>('SELECT channels,updated FROM guide WHERE profile=?',profile);return row?{channels:JSON.parse(row.channels),updatedAt:row.updated}:null;
}
export async function guideProgrammes(profile:string,channels:string[],query:string,from:number,to:number):Promise<GuideProgramme[]>{
 if(!channels.length)return[];const ids=channels.slice(0,30000);const term=normalizeSearch(query.slice(0,100));
 if(Platform.OS==='web'){const raw=await AsyncStorage.getItem(key(profile));if(!raw)return[];return (JSON.parse(raw) as GuideData).programmes.filter(p=>ids.includes(p.channel)&&p.end>from&&p.start<to&&normalizeSearch(p.title).includes(term)).sort((a,b)=>a.start-b.start).slice(0,1000);}
 const escaped=term.replace(/[\\%_]/g,'\\$&');return(await db()).getAllAsync<GuideProgramme>(`SELECT channel,title,description,start,end FROM programme WHERE profile=? AND channel IN (SELECT value FROM json_each(?)) AND end>? AND start<? AND normalized LIKE ? ESCAPE '\\' ORDER BY start LIMIT 1000`,[profile,JSON.stringify(ids),from,to,`%${escaped}%`]);
}
export async function clearGuide(profile:string){await(queues.get(profile)||Promise.resolve());if(Platform.OS==='web'){await AsyncStorage.removeItem(key(profile));return;}const database=await db();await database.withExclusiveTransactionAsync(async tx=>{await tx.runAsync('DELETE FROM programme WHERE profile=?',profile);await tx.runAsync('DELETE FROM guide WHERE profile=?',profile);});}
