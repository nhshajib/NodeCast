import type {Section} from './provider';
export function detailRoute(type:unknown,id:unknown,section:unknown):{type:'details'|'series';id:string;section:Section}|null{
 if((type!=='details'&&type!=='series')||typeof id!=='string'||!id||id.length>512||id.includes('://')||/[\u0000-\u001f]/.test(id))return null;
 if(section!=='live'&&section!=='movies'&&section!=='series')return null;
 if(type==='series'&&section!=='series')return null;
 return {type,id,section};
}
