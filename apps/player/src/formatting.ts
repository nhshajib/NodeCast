// Some Hermes builds omit PluralRules. English UI labels must still load.
const rules=typeof Intl!=='undefined'&&typeof Intl.PluralRules==='function'?new Intl.PluralRules('en'):null;
/** Localized numbers, English noun selection, and a Hermes-safe fallback. */
export function plural(count:number,singular:string,pluralForm=`${singular}s`){return `${count.toLocaleString()} ${(rules?rules.select(count)==='one':Math.abs(count)===1)?singular:pluralForm}`;}
export function refreshInterval(minutes:number){return minutes===1440?'Daily':minutes>=60?`Every ${minutes/60} hours`:`Every ${minutes} minutes`;}
