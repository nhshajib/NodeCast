import {safeHeaders} from './libraryPreferences.ts';
import { SaxesParser } from 'saxes';
import { Gunzip, DecodeUTF8 } from 'fflate';
export type GuideChannel = { id: string; name: string };
export type GuideProgramme = { channel: string; title: string; description: string; start: number; end: number };
export type GuideData = { channels: GuideChannel[]; programmes: GuideProgramme[]; updatedAt: number };
export function xmltvTime(value: string): number | null {
  const m=value.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?\s*([+-])(\d\d)(\d\d)$/);
  if(!m)return null;
  const [,y,mo,d,h,mi,se,sign,oh,om]=m;
  if(+mo<1||+mo>12||+d<1||+d>31||+h>23||+mi>59||+(se||0)>59||+oh>23||+om>59)return null;
  const utc=Date.UTC(+y,+mo-1,+d,+h,+mi,+(se||0));
  const check=new Date(utc);if(check.getUTCMonth()!==+mo-1||check.getUTCDate()!==+d)return null;
  return utc-(sign==='+'?1:-1)*(+oh*60 + +om)*60000;
}
export class XMLTVParser {
  private parser = new SaxesParser({ xmlns: false });
  private stack:string[]=[]; private text=''; private channel:GuideChannel|null=null; private programme:GuideProgramme|null=null;
  private bytes=0; private seen=0; private channels=new Map<string,GuideChannel>(); private programmes:GuideProgramme[]=[];
  private now:number; private lookbackDays:number;
  constructor(now=Date.now(),lookbackDays=1) {
    this.now=now;this.lookbackDays=Number.isFinite(lookbackDays)?Math.max(1,Math.min(7,Math.floor(lookbackDays))):1;
    this.parser.on('doctype',value=>{if(/\[|<!ENTITY/i.test(value))throw new Error('XML internal entities are not supported.');});
    this.parser.on('error',()=>{throw new Error('The guide contains invalid XML.')});
    this.parser.on('opentag',tag=>{
      this.stack.push(tag.name);this.text='';const attrs=tag.attributes as Record<string,string>;
      if(tag.name==='channel')this.channel={id:String(attrs.id||'').slice(0,300),name:''};
      if(tag.name==='programme') { const start=xmltvTime(attrs.start||''),end=xmltvTime(attrs.stop||'');this.programme=start!==null&&end!==null&&end>start ? {channel:String(attrs.channel||'').slice(0,300),title:'',description:'',start,end}:null; }
      if(this.stack.length>40)throw new Error('The guide nesting is too deep.');
    });
    this.parser.on('text',text=>{this.text=(this.text+text).slice(0,4000)});this.parser.on('cdata',text=>{this.text=(this.text+text).slice(0,4000)});
    this.parser.on('closetag',tag=>{
      const name=tag.name;
      if(name==='display-name'&&this.channel&&!this.channel.name)this.channel.name=this.text.trim().slice(0,300);
      if(name==='title'&&this.programme&&!this.programme.title)this.programme.title=this.text.trim().slice(0,500);
      if(name==='desc'&&this.programme)this.programme.description=this.text.trim().slice(0,2000);
      if(name==='channel'&&this.channel){if(this.channel.id)this.channels.set(this.channel.id,this.channel);this.channel=null;if(this.channels.size>30000)throw new Error('Guide has too many channels. Use a filtered guide feed.');}
      if(name==='programme'){
        this.seen++;if(this.seen>1000000)throw new Error('Guide is too large. Use a filtered feed.');
        const p=this.programme;if(p?.channel&&p.title&&p.end>this.now-this.lookbackDays*86400000&&p.start<this.now+3*86400000){this.programmes.push(p);if(this.programmes.length>150000)throw new Error('Guide window has too many programmes. Use a filtered feed.');}this.programme=null;
      }
      this.stack.pop();this.text='';
    });
  }
  write(text:string){this.bytes+=text.length;if(this.bytes>32*1024*1024)throw new Error('Guide exceeds the 32 MB expanded limit.');this.parser.write(text);}
  finish():GuideData {this.parser.close();return{channels:[...this.channels.values()],programmes:this.programmes,updatedAt:this.now};}
}
export async function downloadGuide(address:string,signal:AbortSignal,now=Date.now(),headers?:Record<string,string>,transport:typeof globalThis.fetch=globalThis.fetch,lookbackDays=1):Promise<GuideData>{
  let url:URL;try{url=new URL(address);if(!['https:','http:'].includes(url.protocol))throw new Error()}catch{throw new Error('Enter a complete HTTP/HTTPS XMLTV URL.')}
  const controller=new AbortController();const abort=()=>controller.abort();if(signal.aborted)controller.abort();else signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,60000);
  try{
    const response=await transport(url.href,{signal:controller.signal,headers:safeHeaders(headers)});if(!response.ok)throw new Error(`Guide server returned HTTP ${response.status}.`);
    if(Number(response.headers.get('content-length')||0)>8*1024*1024)throw new Error('Guide download exceeds 8 MB. Use a filtered or compressed feed.');
    const parser=new XMLTVParser(now,lookbackDays);const decoder=new DecodeUTF8(text=>parser.write(text));let prefix:Uint8Array<ArrayBufferLike>=new Uint8Array();let total=0;let gunzip:Gunzip|null=null;let started=false;
    const consume=(bytes:Uint8Array,final=false)=>{
      if(controller.signal.aborted)throw new Error('Guide refresh cancelled.');total+=bytes.length;if(total>8*1024*1024)throw new Error('Guide download exceeds 8 MB.');
      if(!started){const joined=new Uint8Array(prefix.length+bytes.length);joined.set(prefix);joined.set(bytes,prefix.length);bytes=joined;if(bytes.length<2&&!final){prefix=bytes;return;}started=true;if(bytes[0]===31&&bytes[1]===139)gunzip=new Gunzip((chunk,last)=>decoder.push(chunk,last));}
      if(gunzip)gunzip.push(bytes,final);else decoder.push(bytes,final);
    };
    // Native fetch may not expose a reader; the bounded buffer fallback still validates size.
    if(response.body?.getReader){const reader=response.body.getReader();try{while(true){const {value,done}=await reader.read();if(done){consume(new Uint8Array(),true);break}for(let offset=0;offset<value.length;offset+=4096)consume(value.subarray(offset,offset+4096));await new Promise<void>(resolve=>setTimeout(resolve,0));}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
    else {const bytes=new Uint8Array(await response.arrayBuffer());for(let offset=0;offset<bytes.length;offset+=4096){consume(bytes.subarray(offset,offset+4096));await new Promise<void>(resolve=>setTimeout(resolve,0));}consume(new Uint8Array(),true);}
    return parser.finish();
  }catch(error){if(controller.signal.aborted)throw new Error('Guide request cancelled or timed out.');if(error instanceof Error&&/^(Guide |Enter |XML |The guide)/.test(error.message))throw error;throw new Error('Could not load this XMLTV guide. Check the source or try a smaller feed.');}
  finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}
}
