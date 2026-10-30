import {httpURL} from './provider.ts';
import type {Media,Provider} from './provider.ts';
import type {GuideProgramme} from './xmltv.ts';
export type CatchupAvailability={available:boolean;reason:string};
export function catchupAvailability(provider:Provider,item:Media,programme:GuideProgramme,now=Date.now()):CatchupAvailability{
 if(provider.kind!=='xtream'||item.kind!=='live'||!/^\d{1,20}$/.test(item.streamId||'')||!Number.isInteger(item.archiveDays)||item.archiveDays!<1)return{available:false,reason:'This channel does not advertise a supported archive.'};
 if(!Number.isFinite(programme.start)||!Number.isFinite(programme.end)||programme.end<=programme.start||programme.end-programme.start>12*3600000)return{available:false,reason:'This programme has no supported archive time range.'};
 if(programme.end>now)return{available:false,reason:programme.start>now?'This programme has not started yet.':'This programme is still live. Choose Watch channel live.'};
 if(programme.start<now-item.archiveDays!*86400000)return{available:false,reason:'This programme is outside your provider’s archive window.'};
 return{available:true,reason:`Provider advertises ${item.archiveDays} day${item.archiveDays===1?'':'s'} of catch-up. Availability is controlled by your provider.`};
}
export function validTimeZone(value:unknown):value is string {
 if(typeof value!=='string'||!value||value.length>100)return false;
 try{new Intl.DateTimeFormat('en-GB',{timeZone:value}).format(0);return true}catch{return false}
}
export function catchupMedia(provider:Provider,item:Media,programme:GuideProgramme,timeZone:string,now=Date.now()):Media{
 const state=catchupAvailability(provider,item,programme,now);if(!state.available)throw new Error(state.reason);
 if(!validTimeZone(timeZone))throw new Error('Your provider did not report a supported server time zone. Catch-up cannot be opened safely.');
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(programme.start);
 const part=(name:string)=>parts.find(p=>p.type===name)?.value;
 const stamp=`${part('year')}-${part('month')}-${part('day')}:${part('hour')}-${part('minute')}`;
 if(!/^\d{4}-\d\d-\d\d:\d\d-\d\d$/.test(stamp))throw new Error('Could not format your provider’s archive time.');
 const minutes=Math.max(1,Math.ceil((programme.end-Math.floor(programme.start/60000)*60000)/60000));
 const url=new URL(httpURL(provider.address));url.pathname=`${url.pathname.replace(/\/$/,'')}/timeshift/${encodeURIComponent(provider.username)}/${encodeURIComponent(provider.password)}/${minutes}/${stamp}/${item.streamId}.ts`;url.search='';url.hash='';
 return{id:`catchup:${item.streamId}:${programme.start}`,name:programme.title,kind:'movies',group:item.group,accessGroup:item.accessGroup||item.group,logo:item.logo,url:url.href,headers:provider.headers,description:programme.description,catchup:true,containerExtension:'ts'};
}
