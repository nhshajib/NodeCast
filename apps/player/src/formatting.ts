// Some Hermes builds omit PluralRules. English UI labels must still load.
const rules=typeof Intl!=='undefined'&&typeof Intl.PluralRules==='function'?new Intl.PluralRules('en'):null;
/** Localized numbers, English noun selection, and a Hermes-safe fallback. */
export function plural(count:number,singular:string,pluralForm=`${singular}s`){return `${count.toLocaleString()} ${(rules?rules.select(count)==='one':Math.abs(count)===1)?singular:pluralForm}`;}
export function refreshInterval(minutes:number){return minutes===1440?'Daily':minutes===60?'Every hour':minutes>60?`Every ${minutes/60} hours`:`Every ${minutes} minutes`;}
/** "Today, 3:37 – 4:17 AM" or "Sat 22 Nov, 3:37 – 4:17 AM", in the device's locale. */
export function programmeWhen(start:number,end:number,now=Date.now()){
 const day=(value:number)=>{const d=new Date(value);d.setHours(0,0,0,0);return d.getTime();};
 const diff=Math.round((day(start)-day(now))/86400000);
 const date=diff===0?'Today':diff===1?'Tomorrow':diff===-1?'Yesterday':new Date(start).toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'});
 const time=(value:number)=>new Date(value).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 return `${date}, ${time(start)} – ${time(end)}`;
}
