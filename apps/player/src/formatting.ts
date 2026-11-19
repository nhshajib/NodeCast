const rules=new Intl.PluralRules();
/** Complete count label, with locale-aware singular selection. */
export function plural(count:number,singular:string,pluralForm=`${singular}s`){return `${count.toLocaleString()} ${rules.select(count)==='one'?singular:pluralForm}`;}
export function refreshInterval(minutes:number){return minutes===1440?'Daily':minutes>=60?`Every ${minutes/60} hours`:`Every ${minutes} minutes`;}
