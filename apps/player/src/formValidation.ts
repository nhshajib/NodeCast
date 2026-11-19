import type {Provider} from './provider';
/** UI validation only; normalization/authentication remain in the existing provider flow. */
export function providerFormProblem(form:Provider,source:'xtream'|'m3u'|'file'){
 if(!form.name.trim())return 'Enter a profile name.';
 if(source==='file')return form.localText?'':'Import a playlist file first.';
 try{const url=new URL(form.address.trim());if(!['http:','https:'].includes(url.protocol)||!url.hostname)throw Error();}catch{return 'Enter a complete HTTP or HTTPS server address or playlist link.';}
 if(source==='xtream'&&!form.username.trim())return 'Enter your provider username.';
 if(source==='xtream'&&!form.password)return 'Enter your provider password.';
 return '';
}
